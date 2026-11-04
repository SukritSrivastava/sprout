// Builds the Fastify app without starting it. Tests call buildApp() and send fake requests with
// app.inject(), so they run fast and never need a real port.
import Fastify from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { mentorRoutes } from './routes/mentor.js';
import { createGeminiModel, type MentorModel } from './mentor/model.js';

type AppOptions = {
  logger?: boolean;
  // Tests pass a fake model; `undefined` means "use Gemini if a key is set".
  model?: MentorModel | null;
  rateLimit?: { limit: number; windowMs: number };
};

export function buildApp(config: Config, options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 16 * 1024, // 16KB is plenty for chat messages and blocks oversized requests.
  });

  const model = options.model === undefined ? createGeminiModel(config) : options.model;

  app.register(healthRoutes, { config });
  app.register(mentorRoutes, { model, rateLimit: options.rateLimit });

  // Unknown /api paths get a clear JSON error instead of Fastify's default text.
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'not_found', message: `No route for ${request.method} ${request.url}` });
  });

  return app;
}
