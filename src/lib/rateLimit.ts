/**
 * Production-grade in-memory rate limiter.
 * For distributed environments, replace with Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Use WeakRef-compatible Map with periodic cleanup
const store = new Map<string, RateLimitEntry>();

// Cleanup every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
  // Don't block process exit
  if (cleanupTimer.unref) cleanupTimer.unref();
}

startCleanup();

interface RateLimitOptions {
  max: number;        // max requests per window
  windowMs: number;  // window duration in milliseconds
  keyPrefix?: string; // prefix for the rate limit key
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { max: 30, windowMs: 60_000 },
): RateLimitResult {
  const { max, windowMs, keyPrefix = 'rl' } = options;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { success: true, remaining: max - 1, resetAt: newEntry.resetAt, retryAfterSec: 0 };
  }

  entry.count++;

  if (entry.count > max) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
    retryAfterSec: 0,
  };
}

// Preset limiters for different API endpoints
export const apiLimiter     = (ip: string) => rateLimit(ip, { max: 60,  windowMs: 60_000,  keyPrefix: 'api'     });
export const authLimiter    = (ip: string) => rateLimit(ip, { max: 10,  windowMs: 60_000,  keyPrefix: 'auth'    });
export const reportLimiter  = (ip: string) => rateLimit(ip, { max: 5,   windowMs: 300_000, keyPrefix: 'report'  });
export const uploadLimiter  = (ip: string) => rateLimit(ip, { max: 20,  windowMs: 60_000,  keyPrefix: 'upload'  });
