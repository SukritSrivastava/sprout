// Guardian permission must survive restarts, block stale learning and delete only learning data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createLearningStore, consentPolicy } from '../src/learning/store.js';
import { lessonAnswers } from '../src/learning/seedlings.js';
import { createPayPalStore } from '../src/paypal/store.js';

const pin = 'guardian-test-789';
const config = loadConfig({ PAYOUT_PIN_GUARDIAN: pin, PAYOUT_PIN_ADMIN: 'admin-test-456' });
const setup = (learningDataFile?: string, dataFile?: string) => buildApp(config, { model: null, chain: null, paypal: null, learningDataFile, dataFile });
const status = async (app: ReturnType<typeof setup>, learner = 'A12') => (await app.inject(`/api/guardian/status?learner=${learner}`)).json();
const change = (app: ReturnType<typeof setup>, action = 'acknowledge', revision = 0, extra: object = {}) => app.inject({
  method: 'POST', url: '/api/guardian/permission', payload: { learner: 'A12', pin, action, revision,
    ...(action === 'acknowledge' ? { policy: consentPolicy, acknowledged: true } : {}), ...extra },
});
const complete = (app: ReturnType<typeof setup>, revision = 1) => app.inject({ method: 'POST', url: '/api/seedlings/complete',
  headers: { 'x-learning-revision': String(revision) }, payload: { lessonId: 'needs', answers: lessonAnswers.needs } });
const chat = (app: ReturnType<typeof setup>, revision = 1) => app.inject({ method: 'POST', url: '/api/mentor/chat',
  headers: { 'x-learning-revision': String(revision) }, payload: { language: 'en', messages: [{ role: 'user', text: 'How do I save?' }] } });
function temporary() {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-guardian-'));
  assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
  assert.ok(folder.startsWith(join(tmpdir(), 'sprout-guardian-')));
  return { folder, learning: join(folder, 'learning.json'), payments: join(folder, 'payments.json'), cleanup: () => rmSync(folder, { recursive: true, force: true }) };
}

test('new and legacy records require explicit permission; status exposes no PIN or learning data', async (t) => {
  const app = setup(); t.after(() => app.close());
  const response = await app.inject('/api/guardian/status');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.json().consent.status, 'pending');
  assert.doesNotMatch(response.body, /guardian-test|admin-test|activities|seedlings|email/);
  assert.equal((await complete(app)).statusCode, 403);
  assert.equal((await chat(app)).statusCode, 403);
  assert.equal((await app.inject('/api/seedlings')).statusCode, 403);
  assert.equal((await app.inject('/api/paypal/receipts')).statusCode, 200);
  const temp = temporary();
  try {
    writeFileSync(temp.learning, JSON.stringify({ version: 1, activities: [], seedlings: [{ lessonId: 'needs', completedAt: '2026-11-06T00:00:00.000Z' }] }));
    const legacy = setup(temp.learning);
    try { assert.equal((await status(legacy)).consent.status, 'pending'); assert.equal((await complete(legacy)).statusCode, 403); }
    finally { await legacy.close(); }
  } finally { temp.cleanup(); }
});

test('guardian PIN, complete acknowledgement, current policy and known learner are required', async (t) => {
  const app = setup(); t.after(() => app.close());
  for (const extra of [{ pin: 'wrong' }, { pin: 'admin-test-456' }, { learner: 'OTHER' }, { policy: 'old-policy' }, { acknowledged: false }, { arbitrary: true }]) {
    assert.ok((await change(app, 'acknowledge', 0, extra)).statusCode >= 400);
  }
  assert.equal((await status(app)).consent.status, 'pending');
  assert.equal((await app.inject('/api/guardian/status?learner=OTHER')).statusCode, 400);
  const noPin = buildApp(loadConfig({}), { model: null, chain: null, paypal: null }); t.after(() => noPin.close());
  assert.equal((await change(noPin)).statusCode, 503);
});

test('saved permission unlocks only the selected learner and requires the current learning revision', async (t) => {
  const app = setup(); t.after(() => app.close());
  const saved = await change(app); assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().consent.revision, 1); assert.ok(saved.json().consent.acknowledgedAt);
  assert.equal((await status(app, 'B07')).consent.status, 'pending');
  assert.equal((await complete(app)).statusCode, 200);
  assert.equal((await chat(app)).statusCode, 200);
  assert.equal((await complete(app, 0)).statusCode, 409);
  assert.equal((await app.inject('/api/seedlings')).statusCode, 409);
});

test('blocked and stale chats never call Gemini', async (t) => {
  let calls = 0;
  const app = buildApp(config, { chain: null, paypal: null, model: { async *stream() { calls++; yield 'A little saved each week helps.'; } } });
  t.after(() => app.close());
  assert.equal((await chat(app)).statusCode, 403); assert.equal(calls, 0);
  await change(app);
  assert.equal((await chat(app, 0)).statusCode, 409); assert.equal(calls, 0);
  assert.equal((await chat(app)).statusCode, 200); assert.equal(calls, 1);
  await change(app, 'withdraw', 1);
  assert.equal((await chat(app)).statusCode, 403); assert.equal(calls, 1);
});

test('withdrawal blocks learning and NGO awards; repermission rejects old completion and chat requests', async (t) => {
  const app = setup(); t.after(() => app.close());
  await change(app); await complete(app);
  assert.equal((await change(app, 'withdraw', 1)).json().consent.status, 'withdrawn');
  assert.equal((await complete(app)).statusCode, 403); assert.equal((await chat(app)).statusCode, 403);
  const token = (await app.inject({ method: 'POST', url: '/api/ngo/unlock', payload: { approver: 'admin', pin: 'admin-test-456' } })).json().token;
  assert.equal((await app.inject({ method: 'POST', url: '/api/ngo/reviews/ACT-001', headers: { authorization: `Bearer ${token}` }, payload: { decision: 'approved' } })).statusCode, 403);
  await change(app, 'acknowledge', 2);
  assert.equal((await complete(app, 1)).statusCode, 409); assert.equal((await chat(app, 1)).statusCode, 409);
  assert.equal((await complete(app, 3)).json().alreadyCompleted, true);
});

test('concurrent stale guardian decisions cannot overwrite withdrawal or deletion', async (t) => {
  const app = setup(); t.after(() => app.close()); await change(app);
  const replies = await Promise.all([change(app, 'withdraw', 1), change(app, 'acknowledge', 1)]);
  assert.deepEqual(replies.map((r) => r.statusCode), [200, 409]);
  assert.equal((await status(app)).consent.status, 'withdrawn');
  assert.equal((await change(app, 'delete', 2, { confirm: 'B07' })).statusCode, 400);
  await change(app, 'delete', 2, { confirm: 'A12' });
  assert.equal((await change(app, 'acknowledge', 2)).statusCode, 409);
});

test('deletion removes only selected learning records, survives restart, and never changes PayPal records', async () => {
  const temp = temporary();
  const payments = createPayPalStore({ file: temp.payments });
  payments.addDonation({ orderId: 'TEST-ORDER', captureId: 'TEST-CAPTURE', dollars: 50, payerId: 'synthetic-donor' });
  let app = setup(temp.learning, temp.payments);
  try {
    await change(app); await complete(app);
    const paymentBefore = readFileSync(temp.payments, 'utf8');
    assert.equal((await app.inject('/api/paypal/receipts')).json().poolDollars, 50);
    const token = (await app.inject({ method: 'POST', url: '/api/ngo/unlock', payload: { approver: 'admin', pin: 'admin-test-456' } })).json().token;
    await app.inject({ method: 'POST', url: '/api/ngo/reviews/ACT-001', headers: { authorization: `Bearer ${token}` }, payload: { decision: 'approved' } });
    const response = await change(app, 'delete', 1, { confirm: 'A12' }); assert.equal(response.statusCode, 200);
    const disk = JSON.parse(readFileSync(temp.learning, 'utf8'));
    assert.deepEqual(disk.seedlings, []); assert.equal(disk.activities.length, 2);
    assert.ok(disk.activities.every((row: any) => row.learner !== 'A12'));
    assert.equal(disk.consents[0].acknowledgedAt, null);
    assert.equal(readFileSync(temp.payments, 'utf8'), paymentBefore);
    assert.doesNotMatch(readFileSync(temp.learning, 'utf8'), /guardian-test|admin-test/);
    await app.close(); app = setup(temp.learning, temp.payments);
    assert.equal((await status(app)).consent.status, 'deleted'); assert.equal((await complete(app)).statusCode, 403);
    assert.equal((await change(app, 'delete', 2, { confirm: 'A12' })).json().consent.revision, 2);
    await change(app, 'acknowledge', 2);
    assert.equal((await complete(app, 1)).statusCode, 409);
    assert.equal((await app.inject({ url: '/api/seedlings', headers: { 'x-learning-revision': '3' } })).json().garden.seeds, 0);
    assert.equal((await complete(app, 3)).json().garden.seeds, 1);
    assert.equal(JSON.parse(readFileSync(temp.learning, 'utf8')).activities.length, 2);
  } finally { await app.close(); temp.cleanup(); }
});

test('deleting B07 preserves the A12 garden, other activity decisions and A12 permission', async (t) => {
  const learning = createLearningStore();
  learning.changeConsent('A12', 'acknowledge'); learning.changeConsent('B07', 'acknowledge');
  learning.completeLesson('needs'); learning.review('ACT-001', 'approved', 'admin');
  const app = buildApp(config, { learning, model: null, chain: null, paypal: null }); t.after(() => app.close());
  assert.equal((await change(app, 'delete', 1, { learner: 'B07', confirm: 'B07' })).statusCode, 200);
  assert.equal(learning.consent('A12').status, 'active');
  assert.equal(learning.garden().seeds, 1);
  assert.equal(learning.snapshot().totals.totalCredits, 200);
  assert.deepEqual(learning.snapshot().activities.map((row) => row.learner), ['A12', 'C33']);
});

test('a failed deletion save blocks learning until its pending deletion is durably saved', async () => {
  const temp = temporary(); const app = setup(temp.learning);
  try {
    await change(app); await complete(app); mkdirSync(`${temp.learning}.tmp`);
    assert.equal((await change(app, 'delete', 1, { confirm: 'A12' })).statusCode, 503);
    assert.equal((await complete(app)).statusCode, 503);
    assert.equal((await chat(app)).statusCode, 503);
    assert.equal((await app.inject('/api/guardian/status')).statusCode, 503);
    rmdirSync(`${temp.learning}.tmp`);
    assert.equal((await status(app)).consent.status, 'deleted');
    assert.deepEqual(JSON.parse(readFileSync(temp.learning, 'utf8')).seedlings, []);
    assert.equal((await complete(app)).statusCode, 403);
  } finally { await app.close(); temp.cleanup(); }
});

test('guardian guessing shares its lockout with payout approvals; routes reject other origins and limit requests', async (t) => {
  const app = setup(); t.after(() => app.close());
  for (let i = 0; i < 5; i++) assert.equal((await change(app, 'acknowledge', 0, { pin: 'wrong' })).statusCode, 403);
  assert.equal((await change(app)).statusCode, 429);
  const shared = buildApp(loadConfig({ PAYOUT_PIN_MENTOR: 'mentor-test-123', PAYOUT_PIN_ADMIN: 'admin-test-456', PAYOUT_PIN_GUARDIAN: pin, GUARDIAN_PAYPAL_EMAIL: 'test@example.com' }), {
    model: null, chain: null, paypal: { clientId: 'fake', async createOrder() { throw new Error('unused'); }, async captureOrder() { throw new Error('unused'); }, async sendPayout() { throw new Error('unused'); }, async getPayout() { throw new Error('unused'); } },
  }); t.after(() => shared.close());
  for (let i = 0; i < 5; i++) await change(shared, 'acknowledge', 0, { pin: 'wrong' });
  const id = (await shared.inject({ method: 'POST', url: '/api/paypal/payout-requests', payload: { amount: 8 } })).json().request.id;
  assert.equal((await shared.inject({ method: 'POST', url: `/api/paypal/payout-requests/${id}/approve`, payload: { approver: 'guardian', pin } })).json().error, 'pin_locked');
  for (const method of ['GET', 'POST', 'OPTIONS'] as const) {
    assert.equal((await app.inject({ method, url: method === 'POST' ? '/api/guardian/permission' : '/api/guardian/status', headers: { origin: 'https://evil.example' } })).statusCode, 403);
  }
  const allowed = await app.inject({ method: 'OPTIONS', url: '/api/seedlings', headers: { origin: 'http://127.0.0.1:5173' } });
  assert.match(String(allowed.headers['access-control-allow-headers']), /x-learning-revision/);
  const limited = setup(); t.after(() => limited.close());
  for (let i = 0; i < 60; i++) assert.equal((await limited.inject('/api/guardian/status')).statusCode, 200);
  assert.equal((await limited.inject('/api/guardian/status')).statusCode, 429);
});

test('an in-flight Gemini reply stops when permission is withdrawn and cannot leak late words', async (t) => {
  const learning = createLearningStore(); learning.changeConsent('A12', 'acknowledge');
  let started!: () => void; const running = new Promise<void>((resolve) => { started = resolve; });
  let release!: () => void; const held = new Promise<void>((resolve) => { release = resolve; });
  const app = buildApp(config, { learning, chain: null, paypal: null, model: { async *stream() { started(); await held; yield 'late private reply'; } } });
  t.after(() => app.close());
  const response = chat(app); response.then(() => {}); // Start inject before waiting for the fake model.
  await running; learning.changeConsent('A12', 'withdraw'); release();
  assert.doesNotMatch((await response).body, /late private reply|"done"/);
});
