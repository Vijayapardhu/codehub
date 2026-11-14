/**
 * Rate limiting for coding platform syncs.
 * Prevents hammering external APIs with too many requests.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 syncs per minute per user

/**
 * Checks if a user is within rate limit for coding platform syncs.
 * Returns true if within limit, false if rate limited.
 */
export async function withinRateLimit(db: any, key: string): Promise<boolean> {
  try {
    const ref = db.doc(`codingRateLimits/${key}`);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    let requests: number[] = [];
    if (data?.requests) {
      requests = data.requests.filter((t: number) => t > windowStart);
    }

    if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    requests.push(now);
    await ref.set(
      {
        requests,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request to proceed
    return true;
  }
}

/**
 * Check remaining requests in current window
 */
export async function getRemainingRequests(db: any, key: string): Promise<number> {
  try {
    const ref = db.doc(`codingRateLimits/${key}`);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    let requests: number[] = [];
    if (data?.requests) {
      requests = data.requests.filter((t: number) => t > windowStart);
    }

    return Math.max(0, MAX_REQUESTS_PER_WINDOW - requests.length);
  } catch {
    return MAX_REQUESTS_PER_WINDOW;
  }
}