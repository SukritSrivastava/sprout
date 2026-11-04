// A tiny in-memory rate limiter: at most `limit` requests per `windowMs` from one address.
// Good enough for one demo server; a multi-server deployment would need a shared store.
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    // Returns 0 if allowed, or the number of seconds to wait.
    check(key: string, now = Date.now()): number {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Math.ceil((windowMs - (now - recent[0])) / 1000);
      }
      recent.push(now);
      hits.set(key, recent);
      return 0;
    },
  };
}
