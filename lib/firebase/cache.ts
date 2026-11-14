/**
 * Firebase Cache Layer - Reduces API calls by caching data locally
 * with TTL (time-to-live) expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class FirebaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.DEFAULT_TTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const firebaseCache = new FirebaseCache();

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (uid: string) => `user_profile_${uid}`,
  PLATFORM_STATS: (uid: string, platform: string) => `platform_stats_${uid}_${platform}`,
  PLATFORM_CONNECTIONS: (uid: string) => `platform_connections_${uid}`,
  COLLEGES: "colleges_list",
  DAILY_GOAL: (uid: string, date: string) => `daily_goal_${uid}_${date}`,
};