// Tests for the PayPal sandbox integration. Two layers, both offline:
//  1. The PayPal client (paypal/client.ts) against a fake `fetch` that plays PayPal's part.
//  2. The routes (routes/paypal.ts) against a fake PayPal, a fake chain and a fake AI.
// The real sandbox is checked by hand (see VERIFICATION.md) because approving a payment needs a
// person to log in to a PayPal sandbox buyer account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createPayPal, PAYPAL_SANDBOX_API, type PayPal } from '../src/paypal/client.js';
import type { MentorModel } from '../src/mentor/model.js';
import type { LedgerChain, StoredBatch } from '../src/ledger/chain.js';
import { batchRoot } from '../src/ledger/merkle.js';

const keys = { API_PORT: '8787', PAYPAL_CLIENT_ID: 'client-abc', PAYPAL_CLIENT_SECRET: 'secret-xyz' };

// ---------- 1. The PayPal client ----------

// A pretend PayPal: answers by path and records every request.
function fakeFetch(answers: Record<string, { status?: number; body: unknown }>) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: any }[] = [];
  const impl = (async (url: string, init: any) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const path = url.replace(PAYPAL_SANDBOX_API, '');
    const key = Object.keys(answers).find((k) => path.startsWith(k));
    const answer = key ? answers[key] : { status: 404, body: { name: 'RESOURCE_NOT_FOUND' } };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const token = { '/v1/oauth2/token': { body: { access_token: 'tok-1', expires_in: 32400 } } };

test('no keys means no PayPal client', () => {
  assert.equal(createPayPal(loadConfig({ API_PORT: '8787' })), null);
  assert.equal(createPayPal(loadConfig({ API_PORT: '8787', PAYPAL_CLIENT_ID: 'only-id' })), null);
});

test('client only ever talks to the PayPal SANDBOX and reuses its access token', async () => {
  const { impl, calls } = fakeFetch({ ...token, '/v2/checkout/orders': { status: 201, body: { id: 'ORDER12345' } } });
  const paypal = createPayPal(loadConfig(keys), impl)!;
  await paypal.createOrder(10);
  await paypal.createOrder(25);
  assert.ok(calls.every((c) => c.url.startsWith('https://api-m.sandbox.paypal.com/')));
  assert.equal(calls.filter((c) => c.url.endsWith('/v1/oauth2/token')).length, 1, 'token fetched once');
  const order = JSON.parse(calls[1].body);
  assert.deepEqual(order.purchase_units[0].amount, { currency_code: 'USD', value: '10.00' });
  assert.equal(order.intent, 'CAPTURE');
  assert.ok(calls[1].headers['paypal-request-id'], 'safe to retry');
});

test('client reads a capture and a payout the way PayPal returns them', async () => {
  const { impl } = fakeFetch({
    ...token,
    '/v2/checkout/orders/ORDER12345/capture': {
      status: 201,
      body: {
        id: 'ORDER12345',
        status: 'COMPLETED',
        payer: { payer_id: 'PAYERX1', email_address: 'buyer@example.com', name: { given_name: 'Ann' } },
        purchase_units: [{ payments: { captures: [{ id: 'CAP777', status: 'COMPLETED', amount: { currency_code: 'USD', value: '10.00' } }] } }],
      },
    },
    '/v1/payments/payouts/BATCH9': { body: { batch_header: { batch_status: 'SUCCESS' }, items: [{ transaction_status: 'UNCLAIMED' }] } },
    '/v1/payments/payouts': { status: 201, body: { batch_header: { payout_batch_id: 'BATCH9', batch_status: 'PENDING' } } },
  });
  const paypal = createPayPal(loadConfig(keys), impl)!;
  assert.deepEqual(await paypal.captureOrder('ORDER12345'), {
    orderId: 'ORDER12345', captureId: 'CAP777', status: 'COMPLETED', dollars: 10, currency: 'USD', payerId: 'PAYERX1',
  });
  assert.deepEqual(await paypal.sendPayout({ email: 'g@example.com', dollars: 5, note: 'n', itemId: 'PAY-1' }), { batchId: 'BATCH9', status: 'PENDING' });
  assert.deepEqual(await paypal.getPayout('BATCH9'), { batchId: 'BATCH9', status: 'UNCLAIMED' });
});

test('client turns PayPal errors into their issue name', async () => {
  const { impl } = fakeFetch({
    ...token,
    '/v2/checkout/orders/ORDER12345/capture': { status: 422, body: { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'ORDER_NOT_APPROVED' }] } },
  });
  const paypal = createPayPal(loadConfig(keys), impl)!;
  await assert.rejects(paypal.captureOrder('ORDER12345'), (error: any) => error.issue === 'ORDER_NOT_APPROVED' && error.status === 422);
});

// ---------- 2. The routes ----------

function fakePayPal({ captureStatus = 'COMPLETED', capturedDollars }: { captureStatus?: string; capturedDollars?: number } = {}) {
  const orders = new Map<string, number>();
  const payouts: { email: string; dollars: number }[] = [];
  let n = 0;
  const paypal: PayPal = {
    clientId: 'client-abc',
    async createOrder(dollars) {
      const id = `ORDER${String(++n).padStart(6, '0')}`;
      orders.set(id, dollars);
      return { id };
    },
    async captureOrder(id) {
      return { orderId: id, captureId: `CAP${id}`, status: captureStatus, dollars: capturedDollars ?? orders.get(id)!, currency: 'USD', payerId: 'PAYERX1' };
    },
    async sendPayout({ email, dollars }) {
      payouts.push({ email, dollars });
      return { batchId: `BATCH${payouts.length}XYZ`, status: 'PENDING' };
    },
    async getPayout(batchId) {
      return { batchId, status: 'SUCCESS' };
    },
  };
  return { paypal, payouts };
}

const fakeAi = (text: string, asked: string[] = []): MentorModel => ({
  async *stream(input) {
    asked.push(input.turns[0].text);
    yield text;
  },
});

function fakeChain() {
  const stored = new Map<number, StoredBatch>();
  const chain: LedgerChain = {
    async status() { return {} as any; },
    async publish(batch) {
      const b = { ...batch, publishedAt: 1, tx: null } as StoredBatch;
      stored.set(batch.batchId, b);
      return { batch: b, alreadyPublished: false };
    },
    async readBatch(id) { return stored.get(id) ?? null; },
  };
  return { chain, stored };
}

function setup(opts: Parameters<typeof fakePayPal>[0] = {}, model: MentorModel | null = null) {
  const fake = fakePayPal(opts);
  const { chain, stored } = fakeChain();
  const app = buildApp(loadConfig(keys), { paypal: fake.paypal, model, chain });
  const post = (url: string, payload: object = {}, headers = {}) => app.inject({ method: 'POST', url, payload, headers });
  // A full donation: create the order, then capture it (the donor approving happens in PayPal).
  const donate = async (amount: number) => {
    const order = await post('/api/paypal/orders', { amount });
    return post(`/api/paypal/orders/${order.json().id}/capture`);
  };
  return { app, post, donate, payouts: fake.payouts, stored };
}
const approved = { approvals: ['mentor', 'admin'] };

test('config shares the public client id but never the secret', async () => {
  const { app } = setup();
  const response = await app.inject({ method: 'GET', url: '/api/paypal/config' });
  assert.equal(response.json().configured, true);
  assert.equal(response.json().clientId, 'client-abc');
  assert.equal(response.json().mode, 'sandbox');
  assert.ok(!response.body.includes('secret-xyz'));
});

test('without keys, PayPal routes answer 503 with how to fix it', async () => {
  const app = buildApp(loadConfig({ API_PORT: '8787' }), { paypal: null, model: null, chain: null });
  assert.equal((await app.inject({ method: 'GET', url: '/api/paypal/config' })).json().configured, false);
  const response = await app.inject({ method: 'POST', url: '/api/paypal/orders', payload: { amount: 10 } });
  assert.equal(response.statusCode, 503);
  assert.match(response.json().message, /PAYPAL_CLIENT_ID/);
});

test('only the listed donation amounts are accepted', async () => {
  const { post } = setup();
  for (const amount of [7, 0, -10, 1_000_000]) {
    assert.equal((await post('/api/paypal/orders', { amount })).statusCode, 400, `$${amount}`);
  }
  assert.equal((await post('/api/paypal/orders', { amount: 10, extra: 1 })).statusCode, 400);
});

test('a donation makes a coded receipt, fills the pool and gets an AI thank-you note', async () => {
  const asked: string[] = [];
  const { donate } = setup({}, fakeAi('Thank you for funding five rewards.', asked));
  const response = await donate(10);
  assert.equal(response.statusCode, 200);
  const { receipt, note, poolDollars } = response.json();
  assert.match(receipt.id, /^DON-\d{4}-0001$/);
  assert.match(receipt.ref, /^donor-[0-9a-f]{6}$/);
  assert.equal(receipt.amount, 10);
  assert.equal(receipt.paypalId, 'CAPORDER000001');
  assert.equal(poolDollars, 10);
  assert.deepEqual(note, { text: 'Thank you for funding five rewards.', source: 'ai' });
  // The AI got the checked facts, and nothing about the donor.
  assert.match(asked[0], /\$10/);
  assert.match(asked[0], /5 activity rewards/);
  assert.ok(!asked[0].includes('PAYERX1'));
});

test('without the AI, the donor still gets a prepared note', async () => {
  const { donate } = setup();
  const { note } = (await donate(25)).json();
  assert.equal(note.source, 'prepared');
  assert.match(note.text, /\$25 pays for 12 activity rewards/);
});

test('capturing the same order twice gives the same receipt, not double money', async () => {
  const { post } = setup();
  const id = (await post('/api/paypal/orders', { amount: 5 })).json().id;
  const first = (await post(`/api/paypal/orders/${id}/capture`)).json();
  const second = (await post(`/api/paypal/orders/${id}/capture`)).json();
  assert.equal(second.receipt.id, first.receipt.id);
  assert.equal(second.poolDollars, 5);
});

test('no receipt unless PayPal really completed the full amount', async () => {
  assert.equal((await setup({ captureStatus: 'PENDING' }).donate(10)).statusCode, 409);
  assert.equal((await setup({ capturedDollars: 1 }).donate(10)).statusCode, 409);
  // An order this server never created can't be captured into a receipt.
  assert.equal((await setup().post('/api/paypal/orders/ORDER999999/capture')).statusCode, 404);
  assert.equal((await setup().post('/api/paypal/orders/bad id/capture')).statusCode, 400);
});

test('payouts need two different adults and enough money in the pool', async () => {
  const { post, donate, payouts } = setup();
  const body = { email: 'guardian@example.com', amount: 8 };
  assert.equal((await post('/api/paypal/payouts', { ...body, approvals: ['mentor'] })).statusCode, 403);
  assert.equal((await post('/api/paypal/payouts', { ...body, approvals: ['mentor', 'mentor'] })).statusCode, 403);
  assert.equal((await post('/api/paypal/payouts', { ...body, ...approved })).json().error, 'pool_too_small');
  assert.equal(payouts.length, 0, 'nothing sent to PayPal');

  await donate(10);
  const response = await post('/api/paypal/payouts', { ...body, ...approved });
  assert.equal(response.statusCode, 200);
  assert.match(response.json().receipt.id, /^PAY-\d{4}-0001$/);
  assert.match(response.json().receipt.ref, /^guardian-[0-9a-f]{6}$/);
  assert.ok(!response.body.includes('guardian@example.com'), 'the email is not echoed into the receipt');
  assert.equal(response.json().poolDollars, 2);
  assert.deepEqual(payouts, [{ email: 'guardian@example.com', dollars: 8 }]);
});

test('payout input is checked', async () => {
  const { post, donate } = setup();
  await donate(50);
  for (const body of [
    { email: 'not-an-email', amount: 5, ...approved },
    { email: 'g@example.com', amount: 0, ...approved },
    { email: 'g@example.com', amount: 51, ...approved },
    { email: 'g@example.com', amount: 5, approvals: ['mentor', 'stranger'] },
  ]) {
    assert.equal((await post('/api/paypal/payouts', body)).statusCode, 400, JSON.stringify(body));
  }
});

test('payout status refreshes from PayPal', async () => {
  const { app, post, donate } = setup();
  await donate(10);
  const batchId = (await post('/api/paypal/payouts', { email: 'g@example.com', amount: 5, ...approved })).json().receipt.paypalId;
  const response = await app.inject({ method: 'GET', url: `/api/paypal/payouts/${batchId}` });
  assert.equal(response.json().receipt.status, 'SUCCESS');
  assert.equal((await app.inject({ method: 'GET', url: '/api/paypal/payouts/BATCHUNKNOWN1' })).statusCode, 404);
});

test('a PayPal failure during a payout leaves the pool untouched', async () => {
  const fake = fakePayPal();
  fake.paypal.sendPayout = async () => {
    const { PayPalError } = await import('../src/paypal/client.js');
    throw new PayPalError(422, 'INSUFFICIENT_FUNDS');
  };
  const app = buildApp(loadConfig(keys), { paypal: fake.paypal, model: null, chain: null });
  const id = (await app.inject({ method: 'POST', url: '/api/paypal/orders', payload: { amount: 10 } })).json().id;
  await app.inject({ method: 'POST', url: `/api/paypal/orders/${id}/capture` });
  const response = await app.inject({ method: 'POST', url: '/api/paypal/payouts', payload: { email: 'g@example.com', amount: 5, ...approved } });
  assert.equal(response.statusCode, 502);
  assert.match(response.json().message, /enough test money/);
  const receipts = (await app.inject({ method: 'GET', url: '/api/paypal/receipts' })).json();
  assert.equal(receipts.poolDollars, 10);
  assert.equal(receipts.receipts.length, 1);
});

test('live PayPal receipts are published to the ledger by the server itself', async () => {
  const { post, donate, stored } = setup();
  assert.equal((await post('/api/ledger/publish-live')).json().error, 'nothing_to_publish');
  await donate(10);
  await donate(25);
  await post('/api/paypal/payouts', { email: 'g@example.com', amount: 5, ...approved });

  const first = await post('/api/ledger/publish-live');
  assert.equal(first.statusCode, 200);
  const { batch, receipts } = first.json();
  assert.equal(batch.batchId, 101);
  assert.equal(receipts.length, 3);
  assert.equal(batch.root, batchRoot(receipts));
  assert.deepEqual([batch.donated, batch.paidOut], [35, 5]);
  assert.ok(!JSON.stringify(stored.get(101)).includes('g@example.com'));

  // Already published receipts aren't published again; new ones go in the next batch.
  assert.equal((await post('/api/ledger/publish-live')).json().error, 'nothing_to_publish');
  await donate(5);
  assert.equal((await post('/api/ledger/publish-live')).json().batch.batchId, 102);
});

test('other websites cannot start donations or payouts', async () => {
  const { post } = setup();
  const evil = { origin: 'https://evil.example' };
  assert.equal((await post('/api/paypal/orders', { amount: 10 }, evil)).statusCode, 403);
  assert.equal((await post('/api/paypal/payouts', { email: 'g@example.com', amount: 5, ...approved }, evil)).statusCode, 403);
});
