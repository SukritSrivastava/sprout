// Tests for the public impact ledger. A fake chain (fakeChain) stands in for the blockchain, so
// these run offline. The real chain is covered by the browser tests and `npm run test -w chain`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import { batchRoot, batchTotals, type Receipt } from '../../src/features/ledger/merkle.js';
import { isLocal, type BatchInput, type LedgerChain, type StoredBatch } from '../../src/features/ledger/chain.js';
import { SAMPLE_BATCH_ID, sampleReceipts } from '../../src/features/ledger/sample.js';
import * as websiteSample from '../../../client/src/features/ledger/sampleReceipts.js';
// The website's version of the same maths, to prove both sides agree.
import { buildTree } from '../../../client/src/features/ledger/merkle.js';

// The real sample batch (the only one the sample route accepts) and a slice of it for maths tests.
const receipts: Receipt[] = sampleReceipts.slice(0, 5);

function fakeChain({ fail = false } = {}) {
  const published = new Map<number, StoredBatch>();
  const calls: BatchInput[] = [];
  const chain: LedgerChain = {
    async status() {
      if (fail) throw new Error('connection refused');
      return { chainId: 31337, blockNumber: 3, contract: '0xabc', publisher: '0xdef', local: true } as any;
    },
    async publish(batch) {
      if (fail) throw new Error('connection refused');
      calls.push(batch);
      const existing = published.get(batch.batchId);
      if (existing) return { batch: existing, alreadyPublished: true };
      const stored = { ...batch, publishedAt: 1, tx: null };
      published.set(batch.batchId, stored);
      return { batch: stored, alreadyPublished: false };
    },
    async readBatch(id) {
      if (fail) throw new Error('connection refused');
      return published.get(id) ?? null;
    },
  };
  return { chain, calls };
}

const appWith = (chain: LedgerChain | null, env = {}) =>
  buildApp(loadConfig({ API_PORT: '8787', ...env }), { model: null, chain });
const publish = (app: ReturnType<typeof appWith>, body: unknown, headers = {}) =>
  app.inject({ method: 'POST', url: '/api/ledger/publish', payload: body as object, headers });

test('server and website compute the same batch code', async () => {
  for (const count of [1, 2, 3, 5]) {
    const slice = receipts.slice(0, count);
    assert.equal(batchRoot(slice), (await buildTree(slice)).root, `${count} receipts`);
  }
});

test('batch totals add up by type', () => {
  assert.deepEqual(batchTotals(receipts), { donated: 3000, rewarded: 350, paidOut: 600, receipts: 5 });
});

const sample = { batchId: SAMPLE_BATCH_ID, receipts: sampleReceipts };

test('the website and the server hold the same sample receipts', () => {
  assert.equal(websiteSample.SAMPLE_BATCH_ID, SAMPLE_BATCH_ID);
  assert.deepEqual(websiteSample.sampleReceipts, sampleReceipts);
});

test('the currency is part of each fingerprint, and a batch holds one currency', () => {
  const inDollars = { ...receipts[0], currency: 'USD' as const };
  assert.notEqual(batchRoot([inDollars]), batchRoot([receipts[0]]));
  assert.throws(() => batchTotals([receipts[0], inDollars]), /one currency/);
});

test('publish computes the code itself and sends it with the totals', async () => {
  const { chain, calls } = fakeChain();
  const response = await publish(appWith(chain), sample);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().alreadyPublished, false);
  assert.deepEqual(calls[0], { batchId: 1, root: batchRoot(sampleReceipts), ...batchTotals(sampleReceipts) });
});

test('publishing the sample twice changes nothing', async () => {
  const { chain } = fakeChain();
  const app = appWith(chain);
  await publish(app, sample);
  const again = await publish(app, sample);
  assert.equal(again.json().alreadyPublished, true);
  assert.equal(again.json().batch.root, batchRoot(sampleReceipts));
});

test('a batch number already holding other receipts is a clash, not a success', async () => {
  const { chain } = fakeChain();
  // Something else already sits in batch 1 on the chain.
  await chain.publish({ batchId: 1, root: 'ab'.repeat(32), donated: 1, rewarded: 0, paidOut: 0, receipts: 1 });
  const response = await publish(appWith(chain), sample);
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error, 'batch_conflict');
});

test('only the fixed sample receipts can be published: no made-up text, ids or batch numbers', async () => {
  const app = appWith(fakeChain().chain);
  const first = sampleReceipts[0];
  const bad = [
    {},
    { batchId: 1, receipts: [] },
    { batchId: 0, receipts: sampleReceipts },
    { batchId: 2, receipts: sampleReceipts },
    { batchId: 101, receipts: sampleReceipts }, // live batch numbers belong to PayPal receipts
    { batchId: 1, receipts: sampleReceipts.slice(1) },
    { batchId: 1, receipts: [{ ...first, ref: 'alice-smith' }, ...sampleReceipts.slice(1)] },
    { batchId: 1, receipts: [{ ...first, amount: 5 }, ...sampleReceipts.slice(1)] },
    { batchId: 1, receipts: [{ ...first, currency: 'USD' }, ...sampleReceipts.slice(1)] },
    { batchId: 1, receipts: sampleReceipts, root: 'deadbeef' }, // a browser can't choose the code
  ];
  for (const body of bad) {
    const response = await publish(app, body);
    assert.equal(response.statusCode, 400, JSON.stringify(body).slice(0, 80));
  }
});

test('reads a published batch back, null if not published, 400 for nonsense', async () => {
  const { chain } = fakeChain();
  const app = appWith(chain);
  await publish(app, sample);
  assert.equal((await app.inject({ method: 'GET', url: '/api/ledger/batches/1' })).json().batch.root, batchRoot(sampleReceipts));
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/ledger/batches/4' })).json(), { batch: null });
  assert.equal((await app.inject({ method: 'GET', url: '/api/ledger/batches/abc' })).statusCode, 400);
});

test('a chain that is down gives a clear 503, never a crash', async () => {
  for (const app of [appWith(fakeChain({ fail: true }).chain), appWith(null)]) {
    for (const response of [
      await app.inject({ method: 'GET', url: '/api/ledger/status' }),
      await publish(app, sample),
      await app.inject({ method: 'GET', url: '/api/ledger/batches/1' }),
    ]) {
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'chain_unreachable');
    }
  }
});

test('only our website may publish from a browser; publishing and reading are rate limited', async () => {
  const app = appWith(fakeChain().chain);
  assert.equal((await publish(app, sample, { origin: 'https://evil.example' })).statusCode, 403);
  for (let i = 0; i < 10; i++) await publish(app, sample);
  assert.equal((await publish(app, sample)).statusCode, 429);
  let last = 0;
  for (let i = 0; i < 61; i++) last = (await app.inject({ method: 'GET', url: '/api/ledger/batches/1' })).statusCode;
  assert.equal(last, 429);
});

test('only exact loopback addresses count as a local chain', () => {
  for (const url of ['http://127.0.0.1:8545', 'http://localhost:8545', 'http://[::1]:8545']) assert.ok(isLocal(url), url);
  for (const url of ['https://localhost.attacker.example/rpc', 'http://127.0.0.1.evil.example', 'http://user:pw@localhost:8545', 'ftp://localhost']) {
    assert.ok(!isLocal(url), url);
  }
});

test('the public Hardhat test key is refused for a real chain', () => {
  assert.throws(
    () => appWith(undefined as any, { CHAIN_RPC_URL: 'https://sepolia.base.org' }),
    /PUBLISHER_PRIVATE_KEY is required/,
  );
  assert.throws(
    () =>
      appWith(undefined as any, {
        CHAIN_RPC_URL: 'https://sepolia.base.org',
        PUBLISHER_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      }),
    /must never be used/,
  );
});
