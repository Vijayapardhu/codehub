/**
 * Platform API integration utilities.
 * These functions call our own API routes which proxy to external services.
 * Includes caching to reduce redundant API calls.
 */

import type {
  Platform,
  PlatformConnection,
  LeetCodeProfile,
  CodeChefProfile,
  HackerRankProfile,
  GitHubProfile,
  PlatformStats,
} from "./types";

export type { Platform };

import { useTrackerStore } from "@/lib/store/tracker-store";
import { firebaseCache, CACHE_KEYS } from "@/lib/firebase/cache";

export class PlatformError extends Error {
  constructor(
    message: string,
    public platform: Platform,
    public code?: string
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

// In-flight request cache to prevent duplicate simultaneous calls
const inFlightRequests = new Map<string, Promise<any>>();

// Sync debounce timers to batch sync calls
const syncDebounceTimers = new Map<string, NodeJS.Timeout>();

// Cache for platform profiles (5 min TTL)
const profileCache = new Map<string, { data: any; timestamp: number }>();

function getCachedProfile(key: string): any | null {
  const entry = profileCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    profileCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedProfile(key: string, data: any): void {
  profileCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Connect a platform account. Stores the connection in the tracker store.
 */
export async function connectPlatform(
  platform: Platform,
  username: string,
  userId?: string
): Promise<PlatformConnection> {
  const cacheKey = `connect_${platform}_${username}`;
  
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    const res = await fetch("/api/platform/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username, userId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new PlatformError(
        data.error || `Failed to connect ${platform}`,
        platform,
        data.code
      );
    }

    const connection = await res.json();

    // Update client-side Zustand store
    if (typeof window !== "undefined") {
      const store = useTrackerStore.getState();
      store.setPlatformConnection(platform, connection as PlatformConnection);
    }

    return connection as PlatformConnection;
  })();

  inFlightRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Disconnect a platform account.
 */
export async function disconnectPlatform(platform: Platform): Promise<void> {
  const res = await fetch("/api/platform/connect", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new PlatformError(
      data.error || `Failed to disconnect ${platform}`,
      platform
    );
  }

  // Update client-side Zustand store
  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    store.removePlatformConnection(platform);
  }
}

/**
 * Sync platform data (fetch latest stats and update store).
 * Includes debouncing to batch rapid sync calls.
 */
export async function syncPlatform(
  platform: Platform,
  userId?: string,
  username?: string
): Promise<PlatformStats> {
  // Get username from client store if not provided as parameter
  if (!username && typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    const connection = store.platformConnections[platform];
    username = connection?.username;
  }

  // Check cache first (2 min TTL for stats)
  const cacheKey = CACHE_KEYS.PLATFORM_STATS(userId || "anonymous", platform);
  const cached = firebaseCache.get<PlatformStats>(cacheKey);
  if (cached) {
    if (typeof window !== "undefined") {
      const store = useTrackerStore.getState();
      store.setPlatformStats(platform, cached);
    }
    return cached;
  }

  const res = await fetch("/api/platform/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, userId, username }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new PlatformError(
      data.error || `Failed to sync ${platform}`,
      platform,
      data.code
    );
  }

  const stats = await res.json();

  // Cache the result
  firebaseCache.set(cacheKey, stats as PlatformStats, 2 * 60 * 1000);

  // Update client-side Zustand store
  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    store.setPlatformStats(platform, stats as PlatformStats);
  }

  return stats as PlatformStats;
}

/**
 * Sync all connected platforms.
 */
export async function syncAllPlatforms(userId?: string): Promise<PlatformStats[]> {
  const res = await fetch("/api/platform/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true, userId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new PlatformError(data.error || "Failed to sync platforms", "github");
  }

  const results = await res.json();

  // Cache results
  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    for (const stat of results as PlatformStats[]) {
      const cacheKey = CACHE_KEYS.PLATFORM_STATS(userId || "anonymous", stat.platform);
      firebaseCache.set(cacheKey, stat, 2 * 60 * 1000);
      store.setPlatformStats(stat.platform, stat);
    }
  }

  return results as PlatformStats[];
}

/**
 * Fetch a platform profile (read-only, no store update).
 * Includes caching to reduce redundant API calls.
 */
export async function fetchPlatformProfile<T>(
  platform: Platform,
  username: string
): Promise<T> {
  const cacheKey = `profile_${platform}_${username}`;
  
  // Check cache first
  const cached = getCachedProfile(cacheKey);
  if (cached) return cached as T;

  // Check in-flight request
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    const res = await fetch(
      `/api/platform/profile?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new PlatformError(
        data.error || `Failed to fetch ${platform} profile`,
        platform,
        data.code
      );
    }

    const data = await res.json();
    setCachedProfile(cacheKey, data);
    return data as T;
  })();

  inFlightRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Debounced sync - batches multiple sync calls within the debounce window
 */
export function debouncedSyncPlatform(
  platform: Platform,
  userId?: string,
  username?: string,
  delayMs: number = 3000
): Promise<PlatformStats> {
  return new Promise((resolve, reject) => {
    const key = `debounce_sync_${platform}_${userId || "anonymous"}`;

    // Clear existing timer
    const existing = syncDebounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      syncDebounceTimers.delete(key);
      try {
        const result = await syncPlatform(platform, userId, username);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delayMs);

    syncDebounceTimers.set(key, timer);
  });
}

/**
 * Platform display metadata.
 */
export const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
    url: (username: string) => string;
  }
> = {
  github: {
    label: "GitHub",
    color: "text-gray-900 dark:text-gray-100",
    bgColor: "bg-gray-900 dark:bg-gray-100",
    icon: "github",
    url: (u) => `https://github.com/${u}`,
  },
  leetcode: {
    label: "LeetCode",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-600 dark:bg-orange-400",
    icon: "leetcode",
    url: (u) => `https://leetcode.com/${u}`,
  },
  codechef: {
    label: "CodeChef",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-700 dark:bg-green-400",
    icon: "codechef",
    url: (u) => `https://www.codechef.com/users/${u}`,
  },
  hackerrank: {
    label: "HackerRank",
    color: "text-green-500 dark:text-green-400",
    bgColor: "bg-green-500 dark:bg-green-400",
    icon: "hackerrank",
    url: (u) => `https://www.hackerrank.com/${u}`,
  },
};

/**
 * Clear all caches (useful on logout)
 */
export function clearPlatformCache(): void {
  firebaseCache.clear();
  profileCache.clear();
  inFlightRequests.clear();
  syncDebounceTimers.forEach((timer) => clearTimeout(timer));
  syncDebounceTimers.clear();
}