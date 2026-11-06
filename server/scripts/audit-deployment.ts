// Audit evidence: these checks PASS when a deployment defect is reproduced. Fake providers only.
// These are diagnostic assertions about the current baseline, not regression expectations.
// After fixing a finding, replace its diagnostic with a regression that asserts safe behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createPayPalStore, PaymentStoreError } from '../src/paypal/store.js';
import { createLearningStore } from '../src/learning/store.js';
import { lessonAnswers } from '../src/learning/seedlings.js';
import { sampleReceipts } from '../src/ledger/sample.js';
import { redactPersonal } from '../src/mentor/privacy.js';

const config = loadConfig({ PAYOUT_PIN_MENTOR: 'audit-mentor-fixture', PAYOUT_PIN_ADMIN: 'audit-admin-fixture',
  PAYOUT_PIN_GUARDIAN: 'audit-guardian-fixture', GUARDIAN_PAYPAL_EMAIL: 'synthetic@example.com', MENTOR_HOURLY_LIMIT: '1' });
const post = (app: any, url: string, payload: object, headers = {}) => app.inject({ method: 'POST', url, payload, headers });
function temporary(t: any) {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-cloud-audit-'));
  assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
  assert.ok(folder.startsWith(join(tmpdir(), 'sprout-cloud-audit-')));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
const make = (options: object = {}) => buildApp(config, { model: null, paypal: null, chain: null, ...options });
function fakeChain() {
  const batches = new Map<number, any>();
  let loseReply = false;
  return { batches, loseNextReply: () => { loseReply = true; },
    async status() { return { chainId: 84532, blockNumber: 1, contract: null, publisher: '0x' + '1'.repeat(40), local: false }; },
    async readBatch(id: number) { return batches.get(id) ?? null; },
    async publish(input: any) {
      const batch = { ...input, publishedAt: 1, tx: null }; batches.set(input.batchId, batch);
      if (loseReply) { loseReply = false; throw new Error('Simulated response lost after the chain accepted publication'); }
      return { batch, alreadyPublished: false };
    },
  };
}

test('CONFIRMED: records are written during app construction, so unavailable storage prevents startup', (t) => {
  const folder = temporary(t); const parent = join(folder, 'not-a-directory'); writeFileSync(parent, 'fixture');
  assert.throws(() => make({ dataFile: join(parent, 'payments.json') }), PaymentStoreError);
});

test('CONFIRMED: public Vercel origins are rejected by the unconfigured origin allow-list', async (t) => {
  const app = make(); t.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/guardian/status', headers: { origin: 'https://sprout-fixture.vercel.app' } })).statusCode, 403);
});

test('CONFIRMED: an NGO token issued by instance A is rejected by instance B', async (t) => {
  const a = make(), b = make(); t.after(() => a.close()); t.after(() => b.close());
  const token = (await post(a, '/api/ngo/unlock', { approver: 'admin', pin: 'audit-admin-fixture' })).json().token;
  const read = (app: any) => app.inject({ url: '/api/ngo/dashboard', headers: { authorization: `Bearer ${token}` } });
  assert.equal((await read(a)).statusCode, 200); assert.equal((await read(b)).statusCode, 401);
});

test('CONFIRMED: PIN lockout on instance A is bypassed by a request reaching instance B', async (t) => {
  const a = make(), b = make(); t.after(() => a.close()); t.after(() => b.close());
  const body = { learner: 'A12', action: 'withdraw', revision: 0 };
  for (let n = 0; n < 5; n++) await post(a, '/api/guardian/permission', { ...body, pin: 'incorrect' });
  assert.equal((await post(a, '/api/guardian/permission', { ...body, pin: 'audit-guardian-fixture' })).statusCode, 429);
  assert.equal((await post(b, '/api/guardian/permission', { ...body, pin: 'audit-guardian-fixture' })).statusCode, 200);
});

test('CONFIRMED: the shared Gemini hourly cap is independent on each function instance', async (t) => {
  let calls = 0;
  const learning = createLearningStore(); learning.changeConsent('A12', 'acknowledge');
  const model = { async *stream() { calls++; yield 'Synthetic reply'; } };
  const a = make({ learning, model }), b = make({ learning, model }); t.after(() => a.close()); t.after(() => b.close());
  const ask = (app: any) => post(app, '/api/mentor/chat', { language: 'en', messages: [{ role: 'user', text: 'How do I save?' }] }, { 'x-learning-revision': '1' });
  assert.equal((await ask(a)).statusCode, 200); assert.equal((await ask(a)).statusCode, 429);
  assert.equal((await ask(b)).statusCode, 200); assert.equal(calls, 2);
});

test('CONFIRMED: stale learning instances accept and overwrite a withdrawal saved by another instance', async (t) => {
  const file = join(temporary(t), 'learning.json');
  const first = createLearningStore(file); first.changeConsent('A12', 'acknowledge');
  const second = createLearningStore(file); second.changeConsent('A12', 'withdraw');
  const a = make({ learning: first }); t.after(() => a.close());
  const reply = await post(a, '/api/seedlings/complete', { lessonId: 'needs', answers: lessonAnswers.needs }, { 'x-learning-revision': '1' });
  assert.equal(reply.statusCode, 200);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).consents[0].status, 'active');
});

test('CONFIRMED: two stale payment instances can send $80 against one $50 pool', async (t) => {
  const file = join(temporary(t), 'payments.json');
  createPayPalStore({ file }).addDonation({ orderId: 'SYNTHETIC-ORDER', captureId: 'SYNTHETIC-CAPTURE', dollars: 50, payerId: 'fixture' });
  let paid = 0; let sends = 0;
  const paypal = { clientId: 'fixture', async createOrder() { throw new Error('unused'); }, async captureOrder() { throw new Error('unused'); },
    async getPayout() { throw new Error('unused'); }, async sendPayout(input: any) { paid += input.dollars; sends++; return { batchId: `FIXTURE-BATCH-${sends}`, status: 'PENDING' }; } };
  const a = make({ paypal, dataFile: file }), b = make({ paypal, dataFile: file }); t.after(() => a.close()); t.after(() => b.close());
  const prepare = async (app: any) => {
    const id = (await post(app, '/api/paypal/payout-requests', { amount: 40 })).json().request.id;
    await post(app, `/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: 'audit-mentor-fixture' });
    await post(app, `/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: 'audit-admin-fixture' });
    return id;
  };
  const idA = await prepare(a), idB = await prepare(b);
  const replies = await Promise.all([post(a, `/api/paypal/payout-requests/${idA}/send`, { approver: 'admin', pin: 'audit-admin-fixture' }),
    post(b, `/api/paypal/payout-requests/${idB}/send`, { approver: 'admin', pin: 'audit-admin-fixture' })]);
  assert.ok(replies.every((reply) => reply.statusCode === 200)); assert.equal(sends, 2); assert.equal(paid, 80);
});

test('CONFIRMED: anonymous callers can trigger the configured ledger publisher', async (t) => {
  const chain = fakeChain(); const app = make({ chain }); t.after(() => app.close());
  const reply = await post(app, '/api/ledger/publish', { batchId: 1, receipts: sampleReceipts });
  assert.equal(reply.statusCode, 200); assert.equal(chain.batches.size, 1);
});

test('CONFIRMED: a lost chain reply publishes the same receipt under another batch on retry', async (t) => {
  const file = join(temporary(t), 'payments.json');
  createPayPalStore({ file }).addDonation({ orderId: 'SYNTHETIC-ORDER', captureId: 'SYNTHETIC-CAPTURE', dollars: 5, payerId: 'fixture' });
  const chain = fakeChain(); chain.loseNextReply(); const app = make({ chain, dataFile: file }); t.after(() => app.close());
  assert.equal((await post(app, '/api/ledger/publish-live', {})).statusCode, 503);
  assert.equal((await post(app, '/api/ledger/publish-live', {})).statusCode, 200);
  assert.deepEqual([...chain.batches.keys()], [101, 102]);
  assert.equal(chain.batches.get(101).root, chain.batches.get(102).root);
});

test('CONFIRMED: local-chain publication markers prevent receipts publishing on a new public chain', async (t) => {
  const file = join(temporary(t), 'payments.json'); const store = createPayPalStore({ file });
  const receipt = store.addDonation({ orderId: 'SYNTHETIC-ORDER', captureId: 'SYNTHETIC-CAPTURE', dollars: 5, payerId: 'fixture' });
  store.markPublished([receipt.id], 101);
  const chain = fakeChain(); const app = make({ chain, dataFile: file }); t.after(() => app.close());
  const response = await post(app, '/api/ledger/publish-live', {});
  assert.equal(response.statusCode, 409); assert.equal(response.json().error, 'nothing_to_publish');
  assert.equal((await app.inject('/api/ledger/batches/101')).json().batch, null);
  assert.equal((await app.inject('/api/paypal/receipts')).json().receipts[0].batchId, 101);
});

test('CONFIRMED: unauthenticated request pressure can prune an already-approved payout request', () => {
  const store = createPayPalStore();
  const first = store.addRequest({ amount: 8, email: 'synthetic@example.com', child: 'sample' });
  store.approve(first.id, 'mentor'); store.approve(first.id, 'admin');
  for (let n = 0; n < 200; n++) store.addRequest({ amount: 1, email: 'synthetic@example.com', child: 'sample' });
  assert.equal(store.findRequest(first.id), undefined);
});

test('CONFIRMED: the newest-100 list can hide every still-unpublished receipt', () => {
  const store = createPayPalStore(); const newer: string[] = [];
  for (let n = 0; n < 101; n++) {
    const receipt = store.addDonation({ orderId: `FIXTURE-ORDER-${n}`, captureId: `FIXTURE-CAPTURE-${n}`, dollars: 5, payerId: 'fixture' });
    if (n > 0) newer.push(receipt.id);
  }
  store.markPublished(newer, 101);
  assert.equal(store.unpublished().length, 1); assert.equal(store.all().filter((receipt) => receipt.batchId === null).length, 0);
});

test('CONFIRMED: documented seven-digit personal numbers are not redacted', () => {
  assert.equal(redactPersonal('My code is 1234567'), 'My code is 1234567');
});
