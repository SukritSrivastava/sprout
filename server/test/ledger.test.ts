// Tests for the public impact ledger. A fake chain (fakeChain) stands in for the blockchain, so
// these run offline. The real chain is covered by the browser tests and `npm run test -w chain`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { batchRoot, batchTotals, type Receipt } from '../src/ledger/merkle.js';
import type { BatchInput, LedgerChain, StoredBatch } from '../src/ledger/chain.js';
// The website's version of the same maths, to prove both sides agree.
import { buildTree } from '../../client/src/lib/ledger.js';

const receipts: Receipt[] = [
  { id: 'DON-2611-0042', type: 'donation', amount: 500, date: '2026-11-03', ref: 'donor-7f2' },
  { id: 'RWD-2611-0108', type: 'reward', amount: 200, date: '2026-11-03', ref: 'kid-a12' },
  { id: 'RWD-2611-0109', type: 'reward', amount: 150, date: '2026-11-04', ref: 'kid-b07' },
  { id: 'PAY-2611-0015', type: 'payout', amount: 600, date: '2026-11-04', ref: 'kid-a12' },
  { id: 'DON-2611-0043', type: 'donation', amount: 2500, date: '2026-11-05', ref: 'donor-1c9' },
];

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

test('publish computes the code itself and sends it with the totals', async () => {
  const { chain, calls } = fakeChain();
  const response = await publish(appWith(chain), { batchId: 1, receipts });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().alreadyPublished, false);
  assert.deepEqual(calls[0], { batchId: 1, root: batchRoot(receipts), donated: 3000, rewarded: 350, paidOut: 600, receipts: 5 });
});

test('publishing the same batch twice changes nothing', async () => {
  const { chain } = fakeChain();
  const app = appWith(chain);
  await publish(app, { batchId: 2, receipts });
  const again = await publish(app, { batchId: 2, receipts: receipts.slice(0, 1) });
  assert.equal(again.json().alreadyPublished, true);
  assert.equal(again.json().batch.root, batchRoot(receipts));
});

test('rejects bad receipts, including real names instead of codes', async () => {
  const app = appWith(fakeChain().chain);
  const bad = [
    {},
    { batchId: 1, receipts: [] },
    { batchId: 0, receipts },
    { batchId: 1, receipts: [{ ...receipts[0], ref: 'Aanya Sharma' }] },
    { batchId: 1, receipts: [{ ...receipts[0], id: 'hello' }] },
    { batchId: 1, receipts: [{ ...receipts[0], amount: -5 }] },
    { batchId: 1, receipts: [{ ...receipts[0], type: 'gift' }] },
    { batchId: 1, receipts, root: 'deadbeef' }, // a browser can't choose the code
  ];
  for (const body of bad) {
    const response = await publish(app, body);
    assert.equal(response.statusCode, 400, JSON.stringify(body).slice(0, 80));
  }
});

test('reads a published batch back, null if not published, 400 for nonsense', async () => {
  const { chain } = fakeChain();
  const app = appWith(chain);
  await publish(app, { batchId: 3, receipts });
  assert.equal((await app.inject({ method: 'GET', url: '/api/ledger/batches/3' })).json().batch.root, batchRoot(receipts));
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/ledger/batches/4' })).json(), { batch: null });
  assert.equal((await app.inject({ method: 'GET', url: '/api/ledger/batches/abc' })).statusCode, 400);
});

test('a chain that is down gives a clear 503, never a crash', async () => {
  for (const app of [appWith(fakeChain({ fail: true }).chain), appWith(null)]) {
    for (const response of [
      await app.inject({ method: 'GET', url: '/api/ledger/status' }),
      await publish(app, { batchId: 1, receipts }),
      await app.inject({ method: 'GET', url: '/api/ledger/batches/1' }),
    ]) {
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'chain_unreachable');
    }
  }
});

test('only our website may publish from a browser, and publishing is rate limited', async () => {
  const app = appWith(fakeChain().chain);
  assert.equal((await publish(app, { batchId: 9, receipts }, { origin: 'https://evil.example' })).statusCode, 403);
  for (let i = 0; i < 10; i++) await publish(app, { batchId: 10 + i, receipts });
  assert.equal((await publish(app, { batchId: 99, receipts })).statusCode, 429);
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
