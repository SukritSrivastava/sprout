// Builds the Fastify app without starting it. Tests call buildApp() and send fake requests with
// app.inject(), so they run fast and never need a real port.
import Fastify from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './shared/http/health.js';
import { mentorRoutes } from './features/mentor/routes.js';
import { createGeminiModel, type MentorModel } from './features/mentor/model.js';
import { ledgerRoutes } from './features/ledger/routes.js';
import { createLedgerChain, type LedgerChain } from './features/ledger/chain.js';
import { paypalRoutes } from './features/payments/routes.js';
import { createPayPal, type PayPal } from './features/payments/client.js';
import { createPayPalStore, PaymentStoreError } from './features/payments/store.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createLearningStore, LearningStoreError, type LearningStore } from './features/learning/store.js';
import { guardianRoutes } from './features/guardian/routes.js';
import { createPinChecker } from './shared/security/pins.js';
import { ngoRoutes } from './features/ngo/routes.js';
import { seedlingsRoutes } from './features/seedlings/routes.js';
import { createDatabase, StorageError, StateConflict, type Database } from './shared/storage/database.js';
import { checkSchema } from './shared/storage/schema.js';
import { createPostgresPayments } from './features/payments/postgres.js';
import { createPostgresLearning } from './features/learning/postgres.js';
import { createPostgresSecurity } from './shared/security/postgres.js';
import { memoryLimits } from './shared/http/rate-limit.js';
import { createPublicationStore } from './features/ledger/postgres.js';
import { createFixedLedgerChain } from './features/ledger/fixed-chain.js';
import type { LedgerIdentity,PublicationChain } from './features/ledger/publication.js';
import { hostingPolicy, trustRenderProxy } from './shared/http/hosting.js';

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
  database?: Database;
  publicationChain?: (identity:LedgerIdentity) => PublicationChain;
};

export function buildApp(config: Config, options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ? { redact: ['req.headers.authorization', 'req.headers.cookie'] } : false,
    bodyLimit: 32 * 1024, // 32KB fits a full chat history (Hindi text is 3 bytes a letter) and blocks huge requests.
    trustProxy: config.TRUST_PROXY === 'render' ? trustRenderProxy : config.TRUST_PROXY,
  });
  hostingPolicy(app, config);

  const model = options.model === undefined ? createGeminiModel(config) : options.model;

  const paypal = options.paypal === undefined ? createPayPal(config) : options.paypal;
  // Local file paths are unused in database mode; existing local records are never imported/reset.
  const serverFolder = fileURLToPath(new URL('../', import.meta.url));
  const dataFile = options.dataFile ? resolve(serverFolder, options.dataFile) : null;
  const learningFile = options.learningDataFile ? resolve(serverFolder, options.learningDataFile) : null;
  if (dataFile && learningFile && dataFile.toLowerCase() === learningFile.toLowerCase()) {
    throw new Error('Learning records and PayPal records must use different files.');
  }
  const database = options.database ?? (config.DATABASE_URL ? createDatabase(config.DATABASE_URL, config.DATABASE_SSL_CA) : undefined);
  const chain = options.chain === undefined ? database ? null : createLedgerChain(config) : options.chain;
  if (database) {
    if (options.learning) throw new Error('A database API cannot override shared learning records with a local store.');
    app.addHook('onReady', () => checkSchema(database));
    if (!options.database) app.addHook('onClose', () => database.close());
  }
  const store = database ? createPostgresPayments(database) : createPayPalStore({ file: dataFile });
  const learning = database ? createPostgresLearning(database, config.DEMO_OPEN_ACCESS)
    : options.learning ?? createLearningStore(learningFile, undefined, config.DEMO_OPEN_ACCESS);
  const security = database ? createPostgresSecurity(database) : undefined;
  const limiter = security?.limiter ?? memoryLimits;
  const aiBudget = limiter({ limit: config.MENTOR_HOURLY_LIMIT, windowMs: 60 * 60_000 }, 'ai-budget');
  const pins = createPinChecker(config, undefined, security?.pins);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof StateConflict) return reply.code(error.status).send({ error: error.code, message: error.message });
    if (error instanceof StorageError) return reply.code(503).send({ error: 'shared_records_unavailable', message: error.message });
    if (error instanceof LearningStoreError) {
      return reply.code(503).send({ error: 'learning_records_unavailable', message: error.message });
    }
    if (error instanceof PaymentStoreError) {
      return reply.code(503).send({ error: 'payment_records_unavailable', message: error.message });
    }
    return reply.send(error);
  });

  app.register(healthRoutes, { config, database });
  app.register(ledgerRoutes, { chain, allowedOrigins: config.ALLOWED_ORIGIN, store, limiter,
    databaseMode: Boolean(database),publications:database?createPublicationStore(database):undefined,
    publicationChain:options.publicationChain??((identity:LedgerIdentity) => createFixedLedgerChain(config,identity)),sessions:security?.sessions });
  app.register(paypalRoutes, { config, pins, paypal, store, model, allowedOrigins: config.ALLOWED_ORIGIN, limiter, aiBudget });
  app.register(ngoRoutes, { config, pins, payments: store, learning, limiter, sessions: security?.sessions });
  app.register(guardianRoutes, { config, pins, learning, limiter });
  app.register(seedlingsRoutes, { learning, demoOpenAccess: config.DEMO_OPEN_ACCESS, allowedOrigins: config.ALLOWED_ORIGIN, limiter });
  app.register(mentorRoutes, {
    learning,
    demoOpenAccess: config.DEMO_OPEN_ACCESS,
    model,
    allowedOrigins: config.ALLOWED_ORIGIN,
    hourlyLimit: config.MENTOR_HOURLY_LIMIT,
    rateLimit: options.rateLimit,
    limiter,
    aiBudget,
  });

  // Unknown /api paths get a clear JSON error instead of Fastify's default text.
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'not_found', message: `No route for ${request.method} ${request.url}` });
  });

  return app;
}
