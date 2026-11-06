// The public impact ledger API (see PHASE_5_BLOCKCHAIN.md and docs/mentor-api.md).
//
//   GET  /api/ledger/status        Is the blockchain reachable? Which contract and wallet?
//   POST /api/ledger/publish       Seal the SAMPLE batch (only the fixed sample receipts).
//   GET  /api/ledger/batches/:id   Read a batch back from the chain ({ batch: null } if not yet).
//   POST /api/ledger/publish-live  Seal the real PayPal sandbox receipts not yet published.
//
// The server computes the batch code from the receipts itself (ledger/merkle.ts); it never
// trusts a code sent by the browser. Receipts only ever contain coded references. Batch numbers
// 1–100 are for samples, 101+ for real PayPal receipts.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { batchRoot, batchTotals } from '../ledger/merkle.js';
import type { LedgerChain } from '../ledger/chain.js';
import { createRateLimiter } from '../rate-limit.js';
import { onlyOurWebsite } from '../origin.js';
import type { PayPalStore } from '../paypal/store.js';
import { SAMPLE_BATCH_ID, sampleReceipts } from '../ledger/sample.js';

type Options = { chain: LedgerChain | null; allowedOrigins: string[]; store: PayPalStore };

const receiptSchema = z
  .object({
    id: z.string(),
    type: z.enum(['donation', 'reward', 'payout']),
    amount: z.number().int(),
    currency: z.enum(['INR', 'USD']),
    date: z.string(),
    ref: z.string(),
  })
  .strict();

const publishSchema = z
  .object({ batchId: z.number().int(), receipts: z.array(receiptSchema).max(64) })
  .strict();

// True only for exactly the server's own sample receipts, in order.
const isTheSample = (receipts: z.infer<typeof receiptSchema>[]) =>
  receipts.length === sampleReceipts.length &&
  receipts.every((r, i) => (Object.keys(sampleReceipts[i]) as (keyof typeof r)[]).every((key) => r[key] === sampleReceipts[i][key]));

// Same batch number, same contents? (A batch on the chain can't be changed, so anything else is a clash.)
const sameBatch = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  ['batchId', 'root', 'donated', 'rewarded', 'paidOut', 'receipts'].every((field) => a[field] === b[field]);

const chainDown = {
  error: 'chain_unreachable',
  message: 'The local blockchain isn’t running. Start everything with `npm run dev`.',
};

export async function ledgerRoutes(app: FastifyInstance, options: Options) {
  onlyOurWebsite(app, options.allowedOrigins, ['/api/ledger/publish', '/api/ledger/publish-live']);
  // Publishing writes to the chain, so keep it to a few per device.
  const publishLimit = createRateLimiter({ limit: 10, windowMs: 5 * 60_000 });
  // Reads are limited too: each one asks the chain.
  const readLimit = createRateLimiter({ limit: 60, windowMs: 60_000 });
  // Publishes wait in line, one after another (see publish-live below).
  let publishing: Promise<unknown> = Promise.resolve();
  const onePublishAtATime = <T>(work: () => Promise<T>) => {
    const run = publishing.then(work, work);
    publishing = run.catch(() => undefined);
    return run;
  };
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') return;
    const wait = readLimit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429)
      .send({ error: 'rate_limited', message: 'Too many ledger checks. Try again shortly.' });
  });

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
    if (!Number.isSafeInteger(id) || id < 1) return reply.code(400).send({ error: 'invalid_request', message: 'Bad batch number' });
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
    if (batchId !== SAMPLE_BATCH_ID || !isTheSample(receipts)) {
      return reply.code(400).send({ error: 'invalid_request', message: 'Only the sample batch can be published here.' });
    }
    return onePublishAtATime(() =>
      withChain(async (chain) => {
        const input = { batchId, root: batchRoot(receipts), ...batchTotals(receipts) };
        const existing = await chain.readBatch(batchId);
        if (existing && !sameBatch(existing, input)) {
          return reply.code(409).send({ error: 'batch_conflict', message: 'That batch number already holds different receipts. Restart `npm run dev` for a fresh local chain.' });
        }
        return chain.publish(input);
      })(request, reply),
    );
  });

  // The real PayPal receipts: the server publishes its OWN records, so the browser sends nothing.
  app.post('/api/ledger/publish-live', async (request, reply) => {
    const wait = publishLimit.check(request.ip);
    if (wait) {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
    }
    // One publish at a time: picking the receipts, the batch number, writing and marking them
    // all happen inside the queue, so two clicks can't seal the same receipts twice.
    return onePublishAtATime(async () => {
      const pending = options.store.unpublished().slice(0, 64);
      if (pending.length === 0) {
        return reply.code(409).send({ error: 'nothing_to_publish', message: 'No new PayPal receipts to publish yet.' });
      }
      // Only the six receipt fields go into the code (no PayPal ids, no statuses).
      const receipts = pending.map(({ id, type, amount, currency, date, ref }) => ({ id, type, amount, currency, date, ref }));
      return withChain(async (chain) => {
        // Skip batch numbers already used on this chain (e.g. the server's records were reset).
        let batchId = options.store.nextBatchId();
        while (await chain.readBatch(batchId)) batchId += 1;
        const input = { batchId, root: batchRoot(receipts), ...batchTotals(receipts) };
        const result = await chain.publish(input);
        // Mark receipts as published only if the chain holds exactly this batch.
        if (!sameBatch(result.batch, input)) {
          return reply.code(409).send({ error: 'batch_conflict', message: 'The blockchain returned a different batch. No receipts were marked published.' });
        }
        options.store.markPublished(receipts.map((r) => r.id), batchId);
        return { ...result, receipts };
      })(request, reply);
    });
  });
}
