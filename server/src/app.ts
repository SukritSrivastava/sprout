// Builds the Fastify app without starting it. Tests call buildApp() and send fake requests with
// app.inject(), so they run fast and never need a real port.
import Fastify from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { mentorRoutes } from './routes/mentor.js';
import { createGeminiModel, type MentorModel } from './mentor/model.js';
import { ledgerRoutes } from './routes/ledger.js';
import { createLedgerChain, type LedgerChain } from './ledger/chain.js';

type AppOptions = {
  logger?: boolean;
  // Tests pass a fake model; `undefined` means "use Gemini if a key is set".
  model?: MentorModel | null;
  rateLimit?: { limit: number; windowMs: number };
  // Tests pass a fake chain; `undefined` means "use the chain at CHAIN_RPC_URL".
  chain?: LedgerChain | null;
};

export function buildApp(config: Config, options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 16 * 1024, // 16KB is plenty for chat messages and blocks oversized requests.
    // Behind a host's proxy, read the user's real address from X-Forwarded-For. Off locally,
    // so nobody can fake their address to dodge the rate limit.
    trustProxy: config.TRUST_PROXY,
  });

  const model = options.model === undefined ? createGeminiModel(config) : options.model;

  const chain = options.chain === undefined ? createLedgerChain(config) : options.chain;

  app.register(healthRoutes, { config });
  app.register(ledgerRoutes, { chain, allowedOrigins: config.ALLOWED_ORIGIN });
  app.register(mentorRoutes, {
    model,
    allowedOrigins: config.ALLOWED_ORIGIN,
    hourlyLimit: config.MENTOR_HOURLY_LIMIT,
    rateLimit: options.rateLimit,
  });

  // Unknown /api paths get a clear JSON error instead of Fastify's default text.
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'not_found', message: `No route for ${request.method} ${request.url}` });
  });

  return app;
}
