// The public impact ledger API (see docs/ledger.md and docs/mentor-api.md).
//
//   GET  /api/ledger/status        Is the blockchain reachable? Which contract and wallet?
//   POST /api/ledger/publish       Seal the SAMPLE batch (only the fixed sample receipts).
//   GET  /api/ledger/batches/:id   Read a batch back from the chain ({ batch: null } if not yet).
//   POST /api/ledger/publish-live  Seal the real PayPal sandbox receipts not yet published.
//
// The server computes the batch code from the receipts itself (ledger/merkle.ts); it never
// trusts a code sent by the browser. Receipts only ever contain coded references. Batch numbers
// 1–100 are for samples, 101+ for real PayPal receipts.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { batchRoot, batchTotals } from './merkle.js';
import type { LedgerChain } from './chain.js';
import { memoryLimits, type LimitFactory } from '../../shared/http/rate-limit.js';
import { onlyOurWebsite } from '../../shared/http/origin.js';
import type { PayPalStore } from '../payments/store.js';
import { SAMPLE_BATCH_ID, sampleReceipts } from './sample.js';
import { StateConflict,StorageError } from '../../shared/storage/database.js';
import type { PublicationStore } from './postgres.js';
import type { Sessions } from '../../shared/security/postgres.js';
import { createPublisher } from './publisher.js';
import { publicJob,type LedgerIdentity,type PublicationChain } from './publication.js';

type Options = { chain: LedgerChain | null; allowedOrigins: string[]; store: PayPalStore; limiter?: LimitFactory; databaseMode?: boolean;
  publications?:PublicationStore; publicationChain?:(identity:LedgerIdentity) => PublicationChain; sessions?:Sessions };

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
const publicationUnavailable = { error: 'ledger_publication_unavailable', message: 'Ledger publishing is not available in this environment yet.' };

export async function ledgerRoutes(app: FastifyInstance, options: Options) {
  onlyOurWebsite(app, options.allowedOrigins, ['/api/ledger/publish', '/api/ledger/publish-live','/api/ledger/jobs/:id/resume'],['authorization']);
  const publications=options.publications;
  const publisher=publications && options.publicationChain?createPublisher(publications,options.publicationChain):null;
  // Publishing writes to the chain, so keep it to a few per device.
  const limits = options.limiter ?? memoryLimits;
  const publishLimit = limits({ limit: 10, windowMs: 5 * 60_000 }, 'ledger-publish');
  // Reads are limited too: each one asks the chain.
  const readLimit = limits({ limit: 60, windowMs: 60_000 }, 'ledger-read');
  // Publishes wait in line, one after another (see publish-live below).
  let publishing: Promise<unknown> = Promise.resolve();
  const onePublishAtATime = <T>(work: () => Promise<T>) => {
    const run = publishing.then(work, work);
    publishing = run.catch(() => undefined);
    return run;
  };
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control','no-store');
    if (request.method !== 'GET') return;
    const wait = await readLimit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429)
      .send({ error: 'rate_limited', message: 'Too many ledger checks. Try again shortly.' });
  });

  // Every route needs the chain; this wraps the "is it reachable?" handling in one place.
  const withChain = <T>(work: (chain: LedgerChain) => Promise<T>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!options.chain) return reply.code(503).send(chainDown);
      try {
        return await work(options.chain);
      } catch (error) {
        request.log.warn('ledger chain call failed');
        return reply.code(503).send(chainDown);
      }
    };

  const durable = <T>(work:() => Promise<T>) => async (_request:FastifyRequest,reply:FastifyReply) => {
    try { return await work(); }
    catch (error) {
      if (error instanceof StateConflict || error instanceof StorageError) throw error;
      return reply.code(503).send({ error:'chain_unreachable',message:'The configured test ledger is unavailable. Saved publication jobs remain recoverable.' });
    }
  };
  const identity = async () => {
    if (!publications || !options.publicationChain) throw new StateConflict('ledger_publication_unavailable',publicationUnavailable.message,503);
    return publications.target();
  };
  async function staff(request:FastifyRequest,reply:FastifyReply) {
    await identity();
    const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization??'')?.[1];
    const session=token?await options.sessions?.find(token):undefined;
    if (!session || session.role!=='admin' || session.expiresAt<=Date.now()) {
      reply.code(401).send({ error:'ledger_publisher_required',message:'An NGO admin must unlock ledger publishing. Public viewing remains available.' });
      return false;
    }
    const wait=await publishLimit.check(request.ip);
    if (wait) { reply.header('retry-after',String(wait)).code(429).send({ error:'rate_limited',message:`Try again in ${wait} seconds.` }); return false; }
    return true;
  }
  const sendJob=(reply:FastifyReply,result:Awaited<ReturnType<NonNullable<typeof publisher>['run']>>,target:LedgerIdentity) =>
    reply.code(result.state==='confirmed'?200:result.state==='blocked'?409:202).send({
      ...(result.state==='blocked'?{ error:'ledger_manual_review',message:'This publication needs staff review. Its saved receipts and transaction were preserved.' }:{}),
      job:result,identity:target,...(result.result?{ batch:{ ...result.result,identity:target },receipts:result.receipts,alreadyPublished:true }:{}),
    });
  app.get('/api/ledger/status', options.databaseMode?durable(async () => {
    const target=await identity(); await options.publicationChain!(target).validate();
    const overview=await publications!.overview();
    return { ok:true,...target,local:target.chainId===31337,publicationMode:'staff',
      network:target.chainId===84532?'Base Sepolia · test ETH':'Local test chain · fake ETH',
      pendingCount:overview.pendingCount,activeJob:overview.active?publicJob(overview.active):null };
  }):withChain(async (chain) => ({ ok:true,...await chain.status(),publicationMode:'local' })));

  app.get('/api/ledger/batches/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id < 1) return reply.code(400).send({ error: 'invalid_request', message: 'Bad batch number' });
    if (options.databaseMode) return durable(async () => {
      const target=await identity();
      const parsed=z.object({chainId:z.string().regex(/^\d+$/).optional(),contract:z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional()}).strict().safeParse(request.query);
      if(!parsed.success)throw new StateConflict('invalid_request','Use a valid chain ID and contract address for this proof.',400);
      const scope=parsed.data;
      if ((scope.chainId && scope.chainId!==String(target.chainId)) || (scope.contract && scope.contract.toLowerCase()!==target.contract.toLowerCase()))
        throw new StateConflict('ledger_identity_conflict','This proof belongs to a different chain or contract.');
      const saved=await publications!.forBatch(id), chain=options.publicationChain!(target);
      await chain.validate();
      const batch=await chain.readBatch(id,saved?.hash??undefined);
      return { identity:target,batch:batch?{ ...batch,identity:target }:null };
    })(request,reply);
    return withChain(async (chain) => {
      // "Not published yet" is a normal answer, not an error.
      return { batch: await chain.readBatch(id) };
    })(request, reply);
  });

  app.post('/api/ledger/publish', async (request, reply) => {
    if (options.databaseMode) return durable(async () => {
      if (!await staff(request,reply)) return reply;
      const parsed=publishSchema.safeParse(request.body);
      if (!parsed.success || parsed.data.batchId!==SAMPLE_BATCH_ID || !isTheSample(parsed.data.receipts))
        throw new StateConflict('invalid_request','Only the exact server sample batch can be published here.',400);
      return sendJob(reply,await publisher!.run('sample'),await identity());
    })(request,reply);
    const wait = await publishLimit.check(request.ip);
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
    if (options.databaseMode) return durable(async () => {
      if (!await staff(request,reply)) return reply;
      if (request.body && !z.object({}).strict().safeParse(request.body).success)
        throw new StateConflict('invalid_request','The server selects its own settled receipts.',400);
      return sendJob(reply,await publisher!.run('live'),await identity());
    })(request,reply);
    const wait = await publishLimit.check(request.ip);
    if (wait) {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
    }
    // One publish at a time: picking the receipts, the batch number, writing and marking them
    // all happen inside the queue, so two clicks can't seal the same receipts twice.
    return onePublishAtATime(async () => {
      const pending = (await options.store.unpublished()).slice(0, 64);
      if (pending.length === 0) {
        return reply.code(409).send({ error: 'nothing_to_publish', message: 'No new PayPal receipts to publish yet.' });
      }
      // Only the six receipt fields go into the code (no PayPal ids, no statuses).
      const receipts = pending.map(({ id, type, amount, currency, date, ref }) => ({ id, type, amount, currency, date, ref }));
      return withChain(async (chain) => {
        // Skip batch numbers already used on this chain (e.g. the server's records were reset).
        let batchId = await options.store.nextBatchId();
        while (await chain.readBatch(batchId)) batchId += 1;
        const input = { batchId, root: batchRoot(receipts), ...batchTotals(receipts) };
        const result = await chain.publish(input);
        // Mark receipts as published only if the chain holds exactly this batch.
        if (!sameBatch(result.batch, input)) {
          return reply.code(409).send({ error: 'batch_conflict', message: 'The blockchain returned a different batch. No receipts were marked published.' });
        }
        await options.store.markPublished(receipts.map((r) => r.id), batchId);
        return { ...result, receipts };
      })(request, reply);
    });
  });

  app.get('/api/ledger/jobs/:id',async (request,reply) => {
    if (!publications) return reply.code(404).send({ error:'unknown_publication',message:'No saved publication job in this environment.' });
    const id=(request.params as { id:string }).id;
    if (!/^JOB-[a-f0-9-]{36}$/.test(id)) throw new StateConflict('unknown_publication','No publication job with that code.',404);
    const result=await publications.get(id);
    if (!result) throw new StateConflict('unknown_publication','No publication job with that code.',404);
    return { job:publicJob(result),identity:await identity() };
  });
  app.post('/api/ledger/jobs/:id/resume',async (request,reply) => durable(async () => {
    if (!await staff(request,reply)) return reply;
    const id=(request.params as { id:string }).id;
    if (!/^JOB-[a-f0-9-]{36}$/.test(id)) throw new StateConflict('unknown_publication','No publication job with that code.',404);
    const current=await publications!.get(id);
    if (!current) throw new StateConflict('unknown_publication','No publication job with that code.',404);
    return sendJob(reply,await publisher!.run(current.kind,id),await identity());
  })(request,reply));
}
