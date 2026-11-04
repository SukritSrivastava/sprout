// A tiny in-memory rate limiter: at most `limit` requests per `windowMs` for each key
// (an address, or 'everyone' for the shared hourly cap).
// Good enough for one demo server; a multi-server deployment would need a shared store.
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  // Forget keys with no recent requests, so memory doesn't grow forever as new addresses appear.
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, times] of hits) {
      if (now - times[times.length - 1] >= windowMs) hits.delete(key);
    }
  }

  return {
    // Returns 0 if allowed, or the number of seconds to wait.
    check(key: string, now = Date.now()): number {
      sweep(now);
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
      }
      recent.push(now);
      hits.set(key, recent);
      return 0;
    },
    // How many keys are remembered (used by tests to prove old ones are forgotten).
    size: () => hits.size,
  };
}
