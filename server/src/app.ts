// Builds the Fastify app without starting it. Tests call buildApp() and send fake requests with
// app.inject(), so they run fast and never need a real port.
import Fastify from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './routes/health.js';

export function buildApp(config: Config, options: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 16 * 1024, // 16KB is plenty for chat messages and blocks oversized requests.
  });

  app.register(healthRoutes, { config });
  // Phase 1 adds: app.register(mentorRoutes, { config });

  // Unknown /api paths get a clear JSON error instead of Fastify's default text.
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'not_found', message: `No route for ${request.method} ${request.url}` });
  });

  return app;
}
