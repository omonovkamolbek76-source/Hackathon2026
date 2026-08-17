/** Simple in-memory rate limiter (per-process). For multi-instance use Redis. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

export function clientKey(request: Request, suffix: string) {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  return `${ip}:${suffix}`;
}

/** Coach chat is interactive — a tight 30/min cap makes the UI look "broken"
 * during a demo. Production stays bounded; local/dev is much looser. */
export function coachRequestLimit(): number {
  return process.env.NODE_ENV === 'production' ? 60 : 200;
}
