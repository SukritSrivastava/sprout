// The public impact ledger API (see PHASE_5_BLOCKCHAIN.md and docs/mentor-api.md).
//
//   GET  /api/ledger/status        Is the blockchain reachable? Which contract and wallet?
//   POST /api/ledger/publish       Seal a batch of receipts and publish its code on the chain.
//   GET  /api/ledger/batches/:id   Read a batch back from the chain ({ batch: null } if not yet).
//   POST /api/ledger/publish-live  Seal the real PayPal sandbox receipts not yet published.
//
// The server computes the batch code from the receipts itself (ledger/merkle.ts); it never
// trusts a code sent by the browser. Receipts only ever contain coded kid references.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { batchRoot, batchTotals } from '../ledger/merkle.js';
import type { LedgerChain } from '../ledger/chain.js';
import { createRateLimiter } from '../rate-limit.js';
import { onlyOurWebsite } from '../origin.js';
import type { PayPalStore } from '../paypal/store.js';

type Options = { chain: LedgerChain | null; allowedOrigins: string[]; store: PayPalStore };

const receiptSchema = z
  .object({
    id: z.string().regex(/^[A-Z]{3}-\d{4}-\d{4}$/, 'Receipt ids look like RWD-2611-0108'),
    type: z.enum(['donation', 'reward', 'payout']),
    amount: z.number().int().min(0).max(10_000_000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // Coded references only (like kid-a12 or donor-7f2), never names.
    ref: z.string().regex(/^[a-z]+-[a-z0-9]{2,8}$/, 'References must be codes like kid-a12'),
  })
  .strict();

const publishSchema = z
  .object({
    batchId: z.number().int().min(1).max(1_000_000),
    receipts: z.array(receiptSchema).min(1).max(64),
  })
  .strict();

const chainDown = {
  error: 'chain_unreachable',
  message: 'The local blockchain isn’t running. Start everything with `npm run dev`.',
};

export async function ledgerRoutes(app: FastifyInstance, options: Options) {
  onlyOurWebsite(app, options.allowedOrigins, ['/api/ledger/publish', '/api/ledger/publish-live']);
  // Publishing writes to the chain, so keep it to a few per device.
  const publishLimit = createRateLimiter({ limit: 10, windowMs: 5 * 60_000 });

  // Every route needs the chain; this wraps the "is it reachable?" handling in one place.
  const withChain = <T>(work: (chain: LedgerChain) => Promise<T>) =>
    async (request: any, reply: any) => {
      if (!options.chain) return reply.code(503).send(chainDown);
      try {
        return await work(options.chain);
      } catch (error) {
        request.log.warn({ err: (error as Error).message.slice(0, 200) }, 'ledger chain call failed');
        return reply.code(503).send(chainDown);
      }
    };

  app.get('/api/ledger/status', withChain(async (chain) => ({ ok: true, ...(await chain.status()) })));

  app.get('/api/ledger/batches/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'invalid_request', message: 'Bad batch number' });
    return withChain(async (chain) => {
      // "Not published yet" is a normal answer, not an error.
      return { batch: await chain.readBatch(id) };
    })(request, reply);
  });

  app.post('/api/ledger/publish', async (request, reply) => {
    const wait = publishLimit.check(request.ip);
    if (wait) {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
    }
    const parsed = publishSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid request' });
    }
    const { batchId, receipts } = parsed.data;
    return withChain(async (chain) =>
      chain.publish({ batchId, root: batchRoot(receipts), ...batchTotals(receipts) }),
    )(request, reply);
  });

  // The real PayPal receipts: the server publishes its OWN records, so the browser sends nothing.
  app.post('/api/ledger/publish-live', async (request, reply) => {
    const wait = publishLimit.check(request.ip);
    if (wait) {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
    }
    const pending = options.store.unpublished().slice(0, 64);
    if (pending.length === 0) {
      return reply.code(409).send({ error: 'nothing_to_publish', message: 'No new PayPal receipts to publish yet.' });
    }
    // Only the five receipt fields go into the code (no PayPal ids, no statuses).
    const receipts = pending.map(({ id, type, amount, date, ref }) => ({ id, type, amount, date, ref }));
    return withChain(async (chain) => {
      // Skip batch numbers already used on this chain (e.g. the server restarted, the chain didn't).
      let batchId = options.store.nextBatchId();
      while (await chain.readBatch(batchId)) batchId += 1;
      const result = await chain.publish({ batchId, root: batchRoot(receipts), ...batchTotals(receipts) });
      options.store.markPublished(receipts.map((r) => r.id), batchId);
      return { ...result, receipts };
    })(request, reply);
  });
}
