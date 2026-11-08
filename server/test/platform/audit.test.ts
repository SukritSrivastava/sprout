// Regression tests for the November 2026 security audit (SECURITY_AND_BUG_AUDIT.md).
// These once proved each defect existed; now they check each one stays fixed. Fakes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../support/consented-app.js';
import { loadConfig } from '../support/protected-config.js';
import { createPayPalStore } from '../../src/features/payments/store.js';
import { isLocal } from '../../src/features/ledger/chain.js';

const keys = {
  API_PORT: '8787',
  PAYPAL_CLIENT_ID: 'fake',
  PAYPAL_CLIENT_SECRET: 'fake',
  PAYOUT_PIN_MENTOR: 'mentor-pin-1',
  PAYOUT_PIN_ADMIN: 'admin-pin-22',
  PAYOUT_PIN_GUARDIAN: 'guardian-pin-3',
  GUARDIAN_PAYPAL_EMAIL: 'sb-guardian@personal.example.com',
};

function setup() {
  let sends = 0;
  const paypal = {
    clientId: 'fake',
    async createOrder() {
      return { id: 'ORDER12345' };
    },
    async captureOrder() {
      await new Promise((r) => setTimeout(r, 10));
      return { orderId: 'ORDER12345', captureId: 'CAPTURE123', status: 'COMPLETED', dollars: 50, currency: 'USD', payerId: 'fake' };
    },
    async sendPayout() {
      sends++;
      throw new Error('Response lost after provider accepted payout');
    },
    async getPayout() {
      return { batchId: 'BATCH12345', status: 'SUCCESS' };
    },
  };
  const app = buildApp(loadConfig(keys), { paypal, chain: null, model: null });
  const post = (url: string, payload: unknown = {}) => app.inject({ method: 'POST', url, payload: payload as object });
  const pool = async () => (await app.inject('/api/paypal/receipts')).json().poolDollars;
  return { app, post, pool, sends: () => sends };
}

test('audit 02: simultaneous captures credit a donation once', async () => {
  const s = setup();
  try {
    await s.post('/api/paypal/orders', { amount: 50 });
    await Promise.all([s.post('/api/paypal/orders/ORDER12345/capture'), s.post('/api/paypal/orders/ORDER12345/capture')]);
    assert.equal(await s.pool(), 50);
  } finally {
    await s.app.close();
  }
});

test('audit 01: caller-supplied approvals and emails no longer reach PayPal', async () => {
  const s = setup();
  try {
    await s.post('/api/paypal/orders', { amount: 50 });
    await s.post('/api/paypal/orders/ORDER12345/capture');
    await s.post('/api/paypal/payouts', { email: 'attacker@example.com', amount: 50, approvals: ['admin', 'mentor'] });
    const id = (await s.post('/api/paypal/payout-requests', { amount: 50 })).json().request.id;
    await s.post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: 'guess' });
    await s.post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: 'guess' });
    await s.post(`/api/paypal/payout-requests/${id}/send`, { approver: 'mentor', pin: 'guess' });
    assert.equal(s.sends(), 0);
    assert.equal(await s.pool(), 50);
  } finally {
    await s.app.close();
  }
});

test('audit 03: a lost payout answer keeps funds reserved and blocks another send', async () => {
  const s = setup();
  try {
    await s.post('/api/paypal/orders', { amount: 50 });
    await s.post('/api/paypal/orders/ORDER12345/capture');
    const approved = async () => {
      const id = (await s.post('/api/paypal/payout-requests', { amount: 50 })).json().request.id;
      await s.post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: 'admin-pin-22' });
      await s.post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: 'mentor-pin-1' });
      return id;
    };
    await s.post(`/api/paypal/payout-requests/${await approved()}/send`, { approver: 'mentor', pin: 'mentor-pin-1' });
    assert.equal(await s.pool(), 0);
    const second = await s.post(`/api/paypal/payout-requests/${await approved()}/send`, { approver: 'mentor', pin: 'mentor-pin-1' });
    assert.equal(second.json().error, 'payout_needs_review');
    assert.equal(s.sends(), 1);
  } finally {
    await s.app.close();
  }
});

test('audit 06: failed, pending and unknown payouts are not eligible for sealing', () => {
  const store = createPayPalStore();
  const request = store.addRequest({ amount: 8, email: 'a@example.com', child: 'kid' });
  const { receipt } = store.startPayout(request.id);
  for (const status of ['FAILED', 'PENDING', 'UNKNOWN', 'REJECTED']) {
    store.updatePayout(receipt.id, { status });
    assert.equal(store.unpublished().length, 0, status);
  }
  store.updatePayout(receipt.id, { status: 'SUCCESS' });
  assert.equal(store.unpublished().length, 1);
});

test('audit 08: receipt ids are never reused', () => {
  const store = createPayPalStore();
  const ids = [1, 2, 3].map(() => store.startPayout(store.addRequest({ amount: 1, email: 'a@example.com', child: 'kid' }).id).receipt.id);
  assert.equal(new Set(ids).size, 3);
});

test('audit 17: remote hostnames that start with "localhost" are not local', () => {
  assert.equal(isLocal('https://localhost.attacker.example/rpc'), false);
});

test('audit 19: unpaid orders are capped and old ones forgotten', () => {
  let time = Date.parse('2026-11-05T00:00:00Z');
  const store = createPayPalStore({ now: () => new Date(time) });
  for (let i = 0; i < 500; i++) assert.equal(store.rememberOrder(`ORDER${i}`, 5), true);
  assert.equal(store.rememberOrder('ONEMORE', 5), false);
  time += 25 * 60 * 60_000; // a day later
  assert.equal(store.rememberOrder('ONEMORE', 5), true);
  assert.equal(store.expectedDollars('ORDER0'), undefined);
});
