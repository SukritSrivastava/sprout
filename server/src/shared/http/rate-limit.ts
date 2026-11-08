// Local sliding-window limits. Database mode injects the same budgets with shared persistence.
import type { FastifyInstance } from 'fastify';

export type LimitFactory = (options: { limit: number; windowMs: number }, scope: string) => { check: (key: string) => number | Promise<number> };
export const memoryLimits: LimitFactory = (options) => createRateLimiter(options);

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

// Learning and workspace routes share one IP budget per route group and never cache replies.
export function limitRequests(app: FastifyInstance, options: { limit: number; windowMs: number; message: string; limiter?: LimitFactory; scope: string }) {
  const limiter = (options.limiter ?? memoryLimits)(options, options.scope);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const wait = await limiter.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429)
      .send({ error: 'rate_limited', message: options.message });
  });
}
