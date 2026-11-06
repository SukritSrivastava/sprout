// NGO API regressions: protected reviews, atomic saves, independent credits and private reports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildApp } from './consented-app.js';
import { loadConfig } from '../src/config.js';
import type { PayPal } from '../src/paypal/client.js';

const keys = { PAYOUT_PIN_MENTOR: 'mentor-123', PAYOUT_PIN_ADMIN: 'admin-456', PAYOUT_PIN_GUARDIAN: 'guardian-789', GUARDIAN_PAYPAL_EMAIL: 'fake@example.com' };
function setup(learningDataFile?: string) {
  let sent = 0;
  const paypal: PayPal = {
    clientId: 'fake', async createOrder() { return { id: 'ORDER12345' }; },
    async captureOrder() { return { orderId: 'ORDER12345', captureId: 'CAPTURE123', dollars: 50, currency: 'USD', status: 'COMPLETED', payerId: 'private-payer' }; },
    async sendPayout() { sent++; return { batchId: 'BATCH12345', status: 'PENDING' }; },
    async getPayout(batchId) { return { batchId, status: 'SUCCESS' }; },
  };
  const app = buildApp(loadConfig(keys), { model: null, chain: null, paypal, learningDataFile });
  const post = (url: string, payload: object, token?: string) => app.inject({ method: 'POST', url, payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const unlock = async (approver = 'mentor', pin = keys.PAYOUT_PIN_MENTOR) => (await post('/api/ngo/unlock', { approver, pin })).json().token as string;
  const get = (path: string, token?: string) => app.inject({ url: `/api/ngo/${path}`, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { app, post, get, unlock, sent: () => sent };
}
function tempFile() {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-ngo-'));
  assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
  return { file: join(folder, 'learning.json'), cleanup: () => rmSync(folder, { recursive: true, force: true }) };
}

test('private workspace routes require a staff token, and a guardian cannot unlock them', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  for (const path of ['dashboard', 'report']) assert.equal((await s.get(path)).statusCode, 401);
  assert.equal((await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' })).statusCode, 401);
  assert.equal((await s.post('/api/ngo/unlock', { approver: 'guardian', pin: keys.PAYOUT_PIN_GUARDIAN })).statusCode, 400);
  assert.equal((await s.post('/api/ngo/unlock', { approver: 'mentor', pin: 'wrong' })).statusCode, 403);
  const config = await s.get('config');
  assert.equal(config.headers['cache-control'], 'no-store');
  assert.deepEqual(config.json(), { configured: true, roles: ['mentor', 'admin'] });
});

test('one admin PIN enables the workspace without PayPal keys or the other adult PINs', async (t) => {
  const app = buildApp(loadConfig({ PAYOUT_PIN_ADMIN: 'admin-demo-456' }), { model: null, chain: null, paypal: null });
  t.after(() => app.close());
  assert.deepEqual((await app.inject('/api/ngo/config')).json(), { configured: true, roles: ['admin'] });
  const response = await app.inject({ method: 'POST', url: '/api/ngo/unlock', payload: { approver: 'admin', pin: 'admin-demo-456' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().role, 'admin');
  assert.equal(response.json().dashboard.totals.pending, 3);
});

test('a saved approval awards credits once, splits jars and never spends PayPal funds', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  await s.post('/api/paypal/orders', { amount: 50 }); await s.post('/api/paypal/orders/ORDER12345/capture', {});
  const token = await s.unlock();
  const results = await Promise.all([1, 2].map(() => s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' }, token)));
  assert.ok(results.every((r) => r.statusCode === 200));
  const { dashboard } = (await s.get('dashboard', token)).json();
  assert.deepEqual(dashboard.totals, { pending: 2, approved: 1, returned: 0, totalCredits: 200 });
  assert.deepEqual(dashboard.learners[0].jars, { save: 100, spend: 60, give: 20, invest: 20 });
  assert.deepEqual(dashboard.sandbox, { donated: 50, paid: 0, reserved: 0, available: 50 });
  assert.equal(s.sent(), 0);
  assert.equal((await s.post('/api/ngo/reviews/ACT-001', { decision: 'returned' }, token)).statusCode, 409);
  assert.equal((await s.post('/api/ngo/reviews/ACT-002', { decision: 'returned' }, token)).json().dashboard.totals.totalCredits, 200);
});

test('extra reward fields, unknown activities and other websites cannot change reviews', async (t) => {
  const s = setup(); t.after(() => s.app.close()); const token = await s.unlock();
  assert.equal((await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved', credits: 9999 }, token)).statusCode, 400);
  assert.equal((await s.post('/api/ngo/reviews/ACT-999', { decision: 'approved' }, token)).statusCode, 404);
  assert.equal((await s.app.inject({ method: 'POST', url: '/api/ngo/unlock', payload: { approver: 'mentor', pin: keys.PAYOUT_PIN_MENTOR }, headers: { origin: 'https://evil.example' } })).statusCode, 403);
  const preflight = await s.app.inject({ method: 'OPTIONS', url: '/api/ngo/dashboard', headers: { origin: 'http://127.0.0.1:5173' } });
  assert.match(String(preflight.headers['access-control-allow-headers']), /authorization/);
});

test('reports match the saved totals and contain no learner codes, names, PINs or payment ids', async (t) => {
  const s = setup(); t.after(() => s.app.close()); const token = await s.unlock('admin', keys.PAYOUT_PIN_ADMIN);
  await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' }, token);
  const report = (await s.get('report', token)).json();
  assert.match(report.csv, /learning_rewards,credits,200\r\n/);
  assert.match(report.csv, /pending_activities,count,2\r\n/);
  assert.match(report.csv, /sandbox_available,USD,0\r\n/);
  assert.doesNotMatch(report.csv, /A12|mentor-123|admin-456|CAPTURE|fake@example|private-payer/);
});

test('locking or expiring a workspace invalidates its token', async (t) => {
  const s = setup(); t.after(() => s.app.close()); const token = await s.unlock();
  await s.post('/api/ngo/lock', {}, token);
  assert.equal((await s.get('dashboard', token)).statusCode, 401);
  const active = await s.unlock(); const later = Date.now() + 16 * 60_000;
  t.mock.method(Date, 'now', () => later);
  assert.equal((await s.get('dashboard', active)).statusCode, 401);
});

test('PIN lockouts are shared between workspace unlocks and payout approvals', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  const id = (await s.post('/api/paypal/payout-requests', { amount: 8 })).json().request.id;
  for (let i = 0; i < 5; i++) await s.post('/api/ngo/unlock', { approver: 'mentor', pin: 'wrong' });
  assert.equal((await s.post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: keys.PAYOUT_PIN_MENTOR })).json().error, 'pin_locked');
});

test('reviews survive restart; a failed save awards nothing and can be retried', async () => {
  const temp = tempFile(); const s = setup(temp.file);
  try {
    const token = await s.unlock();
    mkdirSync(`${temp.file}.tmp`);
    assert.equal((await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' }, token)).statusCode, 503);
    assert.equal((await s.get('dashboard', token)).json().dashboard.totals.totalCredits, 0);
    rmdirSync(`${temp.file}.tmp`);
    await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' }, token);
    await s.app.close();
    const after = setup(temp.file);
    try {
      const data = (await after.get('dashboard', await after.unlock())).json().dashboard;
      assert.equal(data.totals.totalCredits, 200);
      assert.equal(data.activities[0].reviewedBy, 'mentor');
      assert.ok(data.activities[0].reviewedAt);
    } finally { await after.app.close(); }
  } finally { await s.app.close(); temp.cleanup(); }
});

test('learning and PayPal stores cannot be pointed at the same file, even through path aliases', () => {
  const temp = tempFile();
  try {
    for (const alias of [temp.file, join(dirname(temp.file), 'unused', '..', 'learning.json')]) {
      assert.throws(() => buildApp(loadConfig(keys), { model: null, chain: null, paypal: null, dataFile: temp.file, learningDataFile: alias }), /different files/);
    }
  }
  finally { temp.cleanup(); }
});

test('small and odd credit rewards keep all jars nonnegative and conserve the full reward', async () => {
  const temp = tempFile();
  writeFileSync(temp.file, JSON.stringify({ version: 1, activities: [1, 5, 15].map((credits, i) => ({
    id: `ACT-00${i + 1}`, learner: ['A12', 'B07', 'C33'][i], title: 'Sample activity', credits,
    status: 'pending', reviewedAt: null, reviewedBy: null,
  })) }));
  const s = setup(temp.file);
  try {
    const token = await s.unlock();
    for (let i = 1; i <= 3; i++) await s.post(`/api/ngo/reviews/ACT-00${i}`, { decision: 'approved' }, token);
    const { dashboard } = (await s.get('dashboard', token)).json();
    for (const learner of dashboard.learners) {
      const jars = Object.values(learner.jars) as number[];
      assert.ok(jars.every((amount) => Number.isInteger(amount) && amount >= 0));
      assert.equal(jars.reduce((sum, amount) => sum + amount, 0), learner.credits);
    }
    assert.equal(dashboard.totals.totalCredits, 21);
  } finally { await s.app.close(); temp.cleanup(); }
});
