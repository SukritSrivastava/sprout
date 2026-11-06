// Builds the Fastify app without starting it. Tests call buildApp() and send fake requests with
// app.inject(), so they run fast and never need a real port.
import Fastify from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { mentorRoutes } from './routes/mentor.js';
import { createGeminiModel, type MentorModel } from './mentor/model.js';
import { ledgerRoutes } from './routes/ledger.js';
import { createLedgerChain, type LedgerChain } from './ledger/chain.js';
import { paypalRoutes } from './routes/paypal.js';
import { createPayPal, type PayPal } from './paypal/client.js';
import { createPayPalStore, PaymentStoreError } from './paypal/store.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createLearningStore, LearningStoreError, type LearningStore } from './learning/store.js';
import { guardianRoutes } from './routes/guardian.js';
import { createPinChecker } from './paypal/pins.js';
import { ngoRoutes } from './routes/ngo.js';
import { seedlingsRoutes } from './routes/seedlings.js';

type AppOptions = {
  logger?: boolean;
  // Tests pass a fake model; `undefined` means "use Gemini if a key is set".
  model?: MentorModel | null;
  rateLimit?: { limit: number; windowMs: number };
  // Tests pass a fake chain; `undefined` means "use the chain at CHAIN_RPC_URL".
  chain?: LedgerChain | null;
  // Tests pass a fake PayPal; `undefined` means "use the sandbox keys from server/.env".
  paypal?: PayPal | null;
  // Where PayPal records are saved. index.ts passes DATA_FILE; tests leave it out (memory only).
  dataFile?: string | null;
  learningDataFile?: string | null;
  learning?: LearningStore;
};

export function buildApp(config: Config, options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 32 * 1024, // 32KB fits a full chat history (Hindi text is 3 bytes a letter) and blocks huge requests.
    // Behind a host's proxy, read the user's real address from X-Forwarded-For. Off locally,
    // so nobody can fake their address to dodge the rate limit.
    trustProxy: config.TRUST_PROXY,
  });

  const model = options.model === undefined ? createGeminiModel(config) : options.model;

  const chain = options.chain === undefined ? createLedgerChain(config) : options.chain;

  const paypal = options.paypal === undefined ? createPayPal(config) : options.paypal;
  // The live receipts, reward pool and payout requests, saved to DATA_FILE (relative to server/).
  const serverFolder = fileURLToPath(new URL('../', import.meta.url));
  const dataFile = options.dataFile ? resolve(serverFolder, options.dataFile) : null;
  const learningFile = options.learningDataFile ? resolve(serverFolder, options.learningDataFile) : null;
  if (dataFile && learningFile && dataFile.toLowerCase() === learningFile.toLowerCase()) {
    throw new Error('Learning records and PayPal records must use different files.');
  }
  const store = createPayPalStore({ file: dataFile });
  const learning = options.learning ?? createLearningStore(learningFile);
  const pins = createPinChecker(config); // One lockout counter across the workspace and payouts.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof LearningStoreError) {
      return reply.code(503).send({ error: 'learning_records_unavailable', message: error.message });
    }
    if (error instanceof PaymentStoreError) {
      return reply.code(503).send({ error: 'payment_records_unavailable', message: error.message });
    }
    return reply.send(error);
  });

  app.register(healthRoutes, { config });
  app.register(ledgerRoutes, { chain, allowedOrigins: config.ALLOWED_ORIGIN, store });
  app.register(paypalRoutes, { config, pins, paypal, store, model, allowedOrigins: config.ALLOWED_ORIGIN });
  app.register(ngoRoutes, { config, pins, payments: store, learning });
  app.register(guardianRoutes, { config, pins, learning });
  app.register(seedlingsRoutes, { learning, allowedOrigins: config.ALLOWED_ORIGIN });
  app.register(mentorRoutes, {
    learning,
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
