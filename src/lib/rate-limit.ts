// Simple in-memory rate limiter §13 — 60 req/min per IP for AI routes
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60000): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetMs: entry.resetAt - now };
}

export function rateLimitResponse(remaining: number, resetMs: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
    "Retry-After": String(Math.ceil(resetMs / 1000)),
  };
}
