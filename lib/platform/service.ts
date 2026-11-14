/**
 * Platform service: handles connecting, disconnecting, and syncing platforms.
 * Uses Firestore for server-side persistence (API routes) and localStorage for client UI state.
 * All platform connections stored in ONE document per user to reduce Firestore reads/writes.
 */

import type {
  Platform,
  PlatformConnection,
  PlatformStats,
} from "./types";
import { fetchProfile } from "./fetchers";
import { getDbInstance } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useTrackerStore } from "@/lib/store/tracker-store";

export class PlatformServiceError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "PlatformServiceError";
  }
}

/**
 * Connect a platform account - works on both client and server
 * Stores ALL connections in a single Firestore document per user
 */
export async function connectPlatform(
  platform: Platform,
  username: string,
  userId?: string
): Promise<PlatformConnection> {
  // Validate username by fetching profile (non-blocking)
  try {
    await fetchProfile(platform, username);
  } catch (error: any) {
    console.warn(`Profile validation failed for ${platform}/${username}:`, error.message);
  }

  const connection: PlatformConnection = {
    platform,
    username,
    connectedAt: new Date().toISOString(),
    enabled: true,
  };

  // Update Firestore if userId provided - store ALL connections in ONE document
  if (userId) {
    try {
      const db = getDbInstance();
      if (db) {
        const docRef = doc(db, "platformConnections", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Update existing document - add/update this platform's connection
          const existingData = docSnap.data() as { connections?: Record<string, PlatformConnection> };
          const connections = { ...(existingData.connections || {}) };
          connections[platform] = connection;
          
          await updateDoc(docRef, {
            connections,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new document with this connection
          await setDoc(docRef, {
            userId,
            connections: {
              [platform]: connection,
            },
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.warn("Failed to save platform connection to Firestore:", error);
    }
  }

  // Update client-side store if available
  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    store.setPlatformConnection(platform, connection);
  }

  return connection;
}

/**
 * Disconnect a platform account
 */
export async function disconnectPlatform(
  platform: Platform,
  userId?: string
): Promise<void> {
  // Update Firestore if userId provided
  if (userId) {
    try {
      const db = getDbInstance();
      if (db) {
        const docRef = doc(db, "platformConnections", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const existingData = docSnap.data() as { connections?: Record<string, PlatformConnection> };
          const connections = { ...(existingData.connections || {}) };
          connections[platform] = { ...connections[platform], enabled: false };
          
          await updateDoc(docRef, {
            connections,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.warn("Failed to disconnect platform in Firestore:", error);
    }
  }

  // Update client-side store if available
  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    store.removePlatformConnection(platform);
  }
}

/**
 * Sync platform data (fetch latest stats and update store/Firestore)
 * All stats stored in ONE document per user
 */
export async function syncPlatform(
  platform: Platform,
  userId?: string,
  username?: string
): Promise<PlatformStats> {
  // Get connection from client store or Firestore
  let connection: PlatformConnection | null = null;

  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    connection = store.platformConnections[platform];
  }

  // If not in client store, try Firestore
  if (!connection && userId) {
    try {
      const db = getDbInstance();
      if (db) {
        const docSnap = await getDoc(doc(db, "platformConnections", userId));
        if (docSnap.exists()) {
          const data = docSnap.data() as { connections?: Record<string, PlatformConnection> };
          connection = data.connections?.[platform] || null;
        }
      }
    } catch (error) {
      console.warn("Failed to get platform connection from Firestore:", error);
    }
  }

  // If still not connected, use the username parameter directly
  if (!connection?.enabled) {
    const syncUsername = username || connection?.username;
    
    if (!syncUsername) {
      throw new PlatformServiceError(
        `${platform} is not connected. Please connect your ${platform} account first.`,
        "NOT_CONNECTED"
      );
    }

    // Try to fetch profile directly with the username
    try {
      const profile = await fetchProfile(platform, syncUsername);
      const stats = extractStats(platform, syncUsername, profile);

      // Cache the stats in single document
      if (userId) {
        try {
          const db = getDbInstance();
          if (db) {
            const statsDocRef = doc(db, "platformStats", userId);
            const statsDocSnap = await getDoc(statsDocRef);
            
            if (statsDocSnap.exists()) {
              const existingData = statsDocSnap.data() as { stats?: Record<string, PlatformStats> };
              const allStats = { ...(existingData.stats || {}) };
              allStats[platform] = stats;
              
              await updateDoc(statsDocRef, {
                stats: allStats,
                updatedAt: serverTimestamp(),
              });
            } else {
              await setDoc(statsDocRef, {
                userId,
                stats: {
                  [platform]: stats,
                },
                updatedAt: serverTimestamp(),
              });
            }
          }
        } catch (error) {
          console.warn("Failed to save platform stats to Firestore:", error);
        }
      }

      return stats;
    } catch (profileError: any) {
      throw new PlatformServiceError(
        `Could not fetch ${platform} profile for "${syncUsername}": ${profileError.message}`,
        "USER_NOT_FOUND"
      );
    }
  }

  if (!connection?.enabled) {
    throw new PlatformServiceError(
      `${platform} is not connected`,
      "NOT_CONNECTED"
    );
  }

  try {
    const profile = await fetchProfile(platform, connection.username);

    // Extract stats based on platform
    const stats = extractStats(platform, connection.username, profile);

    // Update Firestore if userId provided - store ALL stats in ONE document
    if (userId) {
      try {
        const db = getDbInstance();
        if (db) {
          const statsDocRef = doc(db, "platformStats", userId);
          const statsDocSnap = await getDoc(statsDocRef);
          
          if (statsDocSnap.exists()) {
            const existingData = statsDocSnap.data() as { stats?: Record<string, PlatformStats> };
            const allStats = { ...(existingData.stats || {}) };
            allStats[platform] = stats;
            
            await updateDoc(statsDocRef, {
              stats: allStats,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(statsDocRef, {
              userId,
              stats: {
                [platform]: stats,
              },
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (error) {
        console.warn("Failed to save platform stats to Firestore:", error);
      }
    }

    // Update client-side store if available
    if (typeof window !== "undefined") {
      const store = useTrackerStore.getState();
      store.setPlatformStats(platform, stats);
    }

    return stats;
  } catch (error: any) {
    throw new PlatformServiceError(
      `Failed to sync ${platform}: ${error.message}`,
      "SYNC_FAILED"
    );
  }
}

/**
 * Sync all connected platforms
 */
export async function syncAllPlatforms(userId?: string): Promise<PlatformStats[]> {
  const connections: Record<Platform, PlatformConnection | null> = {
    github: null,
    leetcode: null,
    codechef: null,
    hackerrank: null,
  };

  if (typeof window !== "undefined") {
    const store = useTrackerStore.getState();
    Object.keys(connections).forEach((key) => {
      connections[key as Platform] = store.platformConnections[key as Platform];
    });
  } else if (userId) {
    try {
      const db = getDbInstance();
      if (db) {
        // Fetch ALL connections from ONE document
        const docSnap = await getDoc(doc(db, "platformConnections", userId));
        if (docSnap.exists()) {
          const data = docSnap.data() as { connections?: Record<string, PlatformConnection> };
          const connMap = data.connections || {};
          for (const platform of Object.keys(connections) as Platform[]) {
            connections[platform] = connMap[platform] || null;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to get platform connections from Firestore:", error);
    }
  }

  const results: PlatformStats[] = [];

  for (const [platform, connection] of Object.entries(connections)) {
    if (!connection?.enabled) continue;
    try {
      const stats = await syncPlatform(platform as Platform, userId);
      results.push(stats);
    } catch (error) {
      // Return partial result with 0 stats instead of failing entirely
      results.push({
        platform: platform as Platform,
        username: connections[platform as Platform]?.username || "",
        totalSolved: 0,
        currentStreak: 0,
        longestStreak: 0,
        fetchedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  return results;
}

function extractStats(
  platform: Platform,
  username: string,
  profile: any
): PlatformStats {
  switch (platform) {
    case "leetcode":
      return {
        platform,
        username,
        totalSolved: profile.totalSolved || 0,
        currentStreak: profile.streak || 0,
        longestStreak: profile.streak || 0,
        lastActiveDate: getLastActiveDate(profile.calendar),
        fetchedAt: new Date().toISOString(),
      };
    case "codechef":
      return {
        platform,
        username,
        totalSolved: profile.problemsSolved || 0,
        currentStreak: 0,
        longestStreak: 0,
        fetchedAt: new Date().toISOString(),
      };
    case "hackerrank":
      return {
        platform,
        username,
        totalSolved: profile.totalSolved || 0,
        currentStreak: 0,
        longestStreak: 0,
        fetchedAt: new Date().toISOString(),
      };
    case "github":
      return {
        platform,
        username,
        totalSolved: profile.totalCommits || 0,
        currentStreak: profile.streak || 0,
        longestStreak: profile.streak || 0,
        lastActiveDate: getLastActiveDate(profile.contributions),
        fetchedAt: new Date().toISOString(),
        totalCommits: profile.totalCommits || 0,
        totalStars: profile.totalStars || 0,
        totalForks: profile.totalForks || 0,
        publicRepos: profile.publicRepos || 0,
      };
    default:
      throw new PlatformServiceError(`Unknown platform: ${platform}`);
  }
}

function getLastActiveDate(
  calendar: Record<string, number> | undefined
): string | undefined {
  if (!calendar) return undefined;
  const dates = Object.keys(calendar).sort();
  return dates[dates.length - 1];
}