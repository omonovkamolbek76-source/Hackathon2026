import { describe, expect, it } from 'vitest';
import { coachRequestLimit, rateLimit } from '@/lib/rate-limit';

describe('in-memory rate limiter', () => {
  it('allows requests up to the limit, then reports retryAfterSec', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const first = rateLimit(key, 2, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);

    const second = rateLimit(key, 2, 60_000);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);

    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it('uses a looser coach cap outside production so local demos are not blocked', () => {
    expect(coachRequestLimit()).toBeGreaterThanOrEqual(60);
  });
});
