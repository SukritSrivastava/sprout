// Judge-mode integration tests use empty PIN settings and fake providers, never real payments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import { consentPolicy } from '../../src/features/learning/store.js';
import { lessonAnswers } from '../../src/features/seedlings/answers.js';
import type { PayPal } from '../../src/features/payments/client.js';

function setup(protectedMode = false) {
  let sent = 0;
  const paypal: PayPal = {
    clientId: 'demo-test', async createOrder() { return { id: 'DEMOORDER123' }; },
    async captureOrder() { return { orderId: 'DEMOORDER123', captureId: 'DEMOCAPTURE123', dollars: 25, currency: 'USD', status: 'COMPLETED', payerId: 'sample' }; },
    async sendPayout() { sent++; return { batchId: 'DEMOBATCH123', status: 'SUCCESS' }; },
    async getPayout(batchId) { return { batchId, status: 'SUCCESS' }; },
  };
  const app = buildApp(loadConfig({ GUARDIAN_PAYPAL_EMAIL: 'judge@example.com', ...(protectedMode ? { DEMO_OPEN_ACCESS: 'false' } : {}) }), { paypal, model: null, chain: null });
  const post = (url: string, payload: object, revision?: number) => app.inject({ method: 'POST', url, payload,
    headers: revision === undefined ? {} : { 'x-learning-revision': String(revision) } });
  return { app, post, sent: () => sent };
}

test('demo defaults open: NGO reads, reviews and reports need no PIN or staff session', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  const config = (await s.app.inject('/api/ngo/config')).json();
  assert.equal(config.demoOpenAccess, true); assert.equal(config.configured, true);
  assert.equal((await s.app.inject('/api/ngo/dashboard')).statusCode, 200);
  assert.equal((await s.post('/api/ngo/reviews/ACT-001', { decision: 'approved' })).json().dashboard.totals.totalCredits, 200);
  assert.match((await s.app.inject('/api/ngo/report')).json().csv, /learning_rewards,credits,200/);
  assert.equal((await s.app.inject('/api/guardian/status')).json().consent.status, 'pending', 'opening the demo never records guardian consent');
  assert.equal(s.sent(), 0);
});

test('learning stays accessible without permission; guardian controls still save, delete and reject stale writes', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  const complete = (revision: number) => s.post('/api/seedlings/complete', { lessonId: 'needs', answers: lessonAnswers.needs }, revision);
  assert.equal((await complete(0)).statusCode, 200);
  const acknowledged = await s.post('/api/guardian/permission', { learner: 'A12', action: 'acknowledge', revision: 0, policy: consentPolicy, acknowledged: true });
  assert.equal(acknowledged.statusCode, 200);
  assert.equal((await s.post('/api/guardian/permission', { learner: 'A12', action: 'withdraw', revision: 1 })).statusCode, 200);
  const chat = await s.post('/api/mentor/chat', { language: 'en', messages: [{ role: 'user', text: 'How do I save?' }] }, 2);
  assert.equal(chat.statusCode, 200); assert.match(chat.body, /"type":"done"/);
  assert.equal((await s.post('/api/guardian/permission', { learner: 'A12', action: 'delete', revision: 2, confirm: 'A12' })).statusCode, 200);
  assert.equal((await s.app.inject({ url: '/api/seedlings', headers: { 'x-learning-revision': '3' } })).json().garden.seeds, 0);
  assert.equal((await complete(2)).statusCode, 409, 'old tabs cannot restore deleted progress');
  assert.equal((await complete(3)).statusCode, 200, 'judges can continue exploring after deletion');
});

test('sandbox payouts approve, recover and send without PINs while preserving two roles, pool checks and safe retries', async (t) => {
  const s = setup(); t.after(() => s.app.close());
  assert.equal((await s.app.inject('/api/paypal/config')).json().payouts.configured, true);
  const id = (await s.post('/api/paypal/payout-requests', { amount: 8 })).json().request.id;
  const act = (action: string, approver = 'mentor') => s.post(`/api/paypal/payout-requests/${id}/${action}`, { approver });
  assert.equal((await act('approve')).statusCode, 200);
  await act('approve');
  assert.equal((await act('send')).json().error, 'needs_approval');
  await act('approve', 'admin');
  assert.equal((await act('send', 'guardian')).json().error, 'not_an_approver');
  assert.equal((await act('send')).json().error, 'pool_too_small');
  assert.deepEqual((await act('recover')).json().request.approvals, ['mentor', 'admin']);
  await s.post('/api/paypal/orders', { amount: 25 }); await s.post('/api/paypal/orders/DEMOORDER123/capture', {});
  assert.equal((await act('send')).json().request.receipt.status, 'SUCCESS');
  assert.equal((await act('send')).statusCode, 200); assert.equal(s.sent(), 1);
});

test('switching demo access off restores staff, guardian, learning and payout protection', async (t) => {
  const s = setup(true); t.after(() => s.app.close());
  assert.equal((await s.app.inject('/api/ngo/dashboard')).statusCode, 401);
  assert.equal((await s.app.inject('/api/ngo/report')).statusCode, 401);
  assert.equal((await s.post('/api/guardian/permission', { learner: 'A12', action: 'withdraw', revision: 0 })).statusCode, 503);
  assert.equal((await s.app.inject('/api/seedlings')).statusCode, 403);
  assert.equal((await s.post('/api/paypal/payout-requests', { amount: 8 })).statusCode, 503);
  assert.equal((await s.app.inject('/api/guardian/status')).json().demoOpenAccess, false);
  assert.throws(() => loadConfig({ DEMO_OPEN_ACCESS: 'typo' }), /DEMO_OPEN_ACCESS/);
});
