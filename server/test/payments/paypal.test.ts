// Tests for the PayPal sandbox integration. Two layers, both offline:
//  1. The PayPal client (paypal/client.ts) against a fake `fetch` that plays PayPal's part.
//  2. The routes (routes/paypal.ts) against a fake PayPal, a fake chain and a fake AI.
// The real sandbox is checked by hand (see VERIFICATION.md) because approving a payment needs a
// person to log in to a PayPal sandbox buyer account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../support/protected-config.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPayPal, PAYPAL_SANDBOX_API, PayPalError, type PayPal } from '../../src/features/payments/client.js';
import type { MentorModel } from '../../src/features/mentor/model.js';
import type { LedgerChain, StoredBatch } from '../../src/features/ledger/chain.js';
import { batchRoot } from '../../src/features/ledger/merkle.js';

// Sandbox keys, the three adults' payout PINs and the guardian's email, as in server/.env.
const keys = {
  API_PORT: '8787',
  PAYPAL_CLIENT_ID: 'client-abc',
  PAYPAL_CLIENT_SECRET: 'secret-xyz',
  PAYOUT_PIN_MENTOR: 'mentor-pin-1',
  PAYOUT_PIN_ADMIN: 'admin-pin-22',
  PAYOUT_PIN_GUARDIAN: 'guardian-pin-3',
  GUARDIAN_PAYPAL_EMAIL: 'sb-guardian@personal.example.com',
};
const pinOf = { mentor: 'mentor-pin-1', admin: 'admin-pin-22', guardian: 'guardian-pin-3' } as const;

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

test('batch completion never substitutes for recipient settlement on send or refresh', async () => {
  const cases = [
    { batch: 'SUCCESS', item: 'UNCLAIMED', expected: 'UNCLAIMED' },
    { batch: 'SUCCESS', item: 'ONHOLD', expected: 'ONHOLD' },
    { batch: 'SUCCESS', item: 'FAILED', expected: 'FAILED' },
    { batch: 'SUCCESS', item: 'SUCCESS', expected: 'SUCCESS' },
    { batch: 'SUCCESS', item: undefined, expected: 'PENDING' },
    { batch: 'PROCESSING', item: undefined, expected: 'PROCESSING' },
    { batch: 'DENIED', item: undefined, expected: 'DENIED' },
    { batch: 'CANCELED', item: undefined, expected: 'CANCELED' },
  ];
  for (const { batch, item, expected } of cases) {
    const body = { batch_header: { payout_batch_id: 'BATCH12345', batch_status: batch },
      ...(item ? { items: [{ transaction_status: item }] } : {}) };
    const { impl } = fakeFetch({ ...token, '/v1/payments/payouts': { body } });
    const paypal = createPayPal(loadConfig(keys), impl)!;
    assert.equal((await paypal.sendPayout({ email: 'sample@example.com', dollars: 5, note: 'test', itemId: 'stable-operation' })).status, expected);
    assert.equal((await paypal.getPayout('BATCH12345')).status, expected);
  }
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

function setup(
  opts: Parameters<typeof fakePayPal>[0] = {},
  model: MentorModel | null = null,
  extra: { dataFile?: string; paypal?: PayPal } = {},
) {
  const fake = fakePayPal(opts);
  const { chain, stored } = fakeChain();
  const app = buildApp(loadConfig(keys), { paypal: extra.paypal ?? fake.paypal, model, chain, dataFile: extra.dataFile });
  const post = (url: string, payload: object = {}, headers = {}) => app.inject({ method: 'POST', url, payload, headers });
  // A full donation: create the order, then capture it (the donor approving happens in PayPal).
  const donate = async (amount: number) => {
    const order = await post('/api/paypal/orders', { amount });
    return post(`/api/paypal/orders/${order.json().id}/capture`);
  };
  // A kid's request, approved by two adults with their PINs; returns the request id.
  const approvedRequest = async (amount: number, who: (keyof typeof pinOf)[] = ['mentor', 'admin']) => {
    const id = (await post('/api/paypal/payout-requests', { amount })).json().request.id as string;
    for (const approver of who) await post(`/api/paypal/payout-requests/${id}/approve`, { approver, pin: pinOf[approver] });
    return id;
  };
  const send = (id: string, approver: keyof typeof pinOf = 'mentor', pin: string = pinOf[approver]) =>
    post(`/api/paypal/payout-requests/${id}/send`, { approver, pin });
  return { app, post, donate, approvedRequest, send, payouts: fake.payouts, stored };
}
const receiptsOf = async (app: { inject: ReturnType<typeof setup>['app']['inject'] }) =>
  (await app.inject({ method: 'GET', url: '/api/paypal/receipts' })).json();

test('config shares the public client id but never the secret, PINs or full guardian email', async () => {
  const { app } = setup();
  const response = await app.inject({ method: 'GET', url: '/api/paypal/config' });
  assert.equal(response.json().configured, true);
  assert.equal(response.json().clientId, 'client-abc');
  assert.equal(response.json().mode, 'sandbox');
  assert.deepEqual(response.json().payouts, { configured: true, guardian: 'sb…@personal.example.com' });
  for (const hidden of ['secret-xyz', 'mentor-pin-1', 'sb-guardian@']) assert.ok(!response.body.includes(hidden), hidden);
});

test('without keys, PayPal routes return an operator-safe unavailable response', async () => {
  const app = buildApp(loadConfig({ API_PORT: '8787' }), { paypal: null, model: null, chain: null });
  assert.equal((await app.inject({ method: 'GET', url: '/api/paypal/config' })).json().configured, false);
  const response = await app.inject({ method: 'POST', url: '/api/paypal/orders', payload: { amount: 10 } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error, 'paypal_not_configured');
  assert.equal(response.json().message, 'PayPal sandbox donations are unavailable in this demo. Please try again later.');
  assert.doesNotMatch(response.body, /PAYPAL_CLIENT_ID|server\/\.env/);
});

test('without PINs and a guardian email, payouts stay switched off', async () => {
  const app = buildApp(loadConfig({ API_PORT: '8787', PAYPAL_CLIENT_ID: 'a', PAYPAL_CLIENT_SECRET: 'b' }), {
    paypal: fakePayPal().paypal,
    model: null,
    chain: null,
  });
  assert.equal((await app.inject({ method: 'GET', url: '/api/paypal/config' })).json().payouts.configured, false);
  const response = await app.inject({ method: 'POST', url: '/api/paypal/payout-requests', payload: { amount: 5 } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error, 'payouts_not_configured');
  assert.equal(response.json().message, 'PayPal sandbox payouts are unavailable in this demo. Please ask the demo operator for help.');
  assert.doesNotMatch(response.body, /PAYOUT_PIN|server\/\.env/);
});

test('PINs shorter than 6 characters are refused at startup', () => {
  assert.throws(() => loadConfig({ ...keys, PAYOUT_PIN_ADMIN: '1234' }), /PAYOUT_PIN_ADMIN/);
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
  const { app, donate } = setup({}, fakeAi('Thank you for funding five rewards.', asked));
  const response = await donate(10);
  assert.equal(response.statusCode, 200);
  const { receipt, note, poolDollars } = response.json();
  assert.match(receipt.id, /^DON-\d{4}-0001$/);
  assert.match(receipt.ref, /^donor-[0-9a-f]{16}$/);
  assert.equal(receipt.amount, 10);
  assert.equal(receipt.currency, 'USD');
  assert.equal(receipt.paypalId, 'CAPORDER000001', 'the donor sees their own PayPal capture id');
  assert.equal(poolDollars, 10);
  assert.deepEqual(note, { text: 'Thank you for funding five rewards.', source: 'ai' });
  // The AI got the checked facts, and nothing about the donor.
  assert.match(asked[0], /\$10/);
  assert.match(asked[0], /5 activity rewards/);
  assert.ok(!asked[0].includes('PAYERX1'));
  // The public list has no PayPal ids or order ids.
  const listed = (await receiptsOf(app)).receipts[0];
  assert.equal(listed.paypalId, undefined);
  assert.equal(listed.orderId, undefined);
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

test('two captures at the same moment credit the donation once', async () => {
  const fake = fakePayPal();
  const capture = fake.paypal.captureOrder;
  fake.paypal.captureOrder = async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return capture(id);
  };
  const { app, post } = setup({}, null, { paypal: fake.paypal });
  const id = (await post('/api/paypal/orders', { amount: 50 })).json().id;
  const answers = await Promise.all([post(`/api/paypal/orders/${id}/capture`), post(`/api/paypal/orders/${id}/capture`)]);
  assert.deepEqual(answers.map((a) => a.statusCode).sort(), [200, 409]);
  assert.equal((await receiptsOf(app)).poolDollars, 50);
});

test('no receipt unless PayPal really completed the full amount', async () => {
  assert.equal((await setup({ captureStatus: 'PENDING' }).donate(10)).statusCode, 409);
  assert.equal((await setup({ capturedDollars: 1 }).donate(10)).statusCode, 409);
  // An order this server never created can't be captured into a receipt.
  assert.equal((await setup().post('/api/paypal/orders/ORDER999999/capture')).statusCode, 404);
  assert.equal((await setup().post('/api/paypal/orders/bad id/capture')).statusCode, 400);
});

test('payouts need two different adults, each with their own PIN, and enough money', async () => {
  const { post, donate, send, payouts } = setup();
  const id = (await post('/api/paypal/payout-requests', { amount: 8 })).json().request.id;
  const approve = (approver: string, pin: string) => post(`/api/paypal/payout-requests/${id}/approve`, { approver, pin });
  // Approvals are worth nothing without the right PIN.
  assert.equal((await approve('mentor', 'wrong-pin')).statusCode, 403);
  assert.equal((await approve('admin', pinOf.mentor)).statusCode, 403, 'one adult’s PIN can’t approve for another');
  assert.equal((await approve('mentor', pinOf.mentor)).statusCode, 200);
  assert.equal((await approve('mentor', pinOf.mentor)).json().request.approvals.length, 1, 'no one approves twice');
  assert.equal((await send(id)).json().error, 'needs_approval');
  assert.equal((await approve('admin', pinOf.admin)).json().request.approvals.length, 2);
  // Sending needs an adult who approved, with their PIN again.
  assert.equal((await send(id, 'guardian')).json().error, 'not_an_approver');
  assert.equal((await send(id, 'mentor', 'wrong-pin')).statusCode, 403);
  assert.equal((await send(id)).json().error, 'pool_too_small');
  assert.equal(payouts.length, 0, 'nothing sent to PayPal');

  await donate(10);
  const response = await send(id);
  assert.equal(response.statusCode, 200);
  const { receipt } = response.json().request;
  assert.match(receipt.id, /^PAY-\d{4}-0001$/);
  assert.match(receipt.ref, /^guardian-[0-9a-f]{16}$/);
  assert.ok(!response.body.includes('sb-guardian@'), 'the email is never sent to the browser');
  assert.equal(response.json().poolDollars, 2);
  // The payee always comes from server/.env.
  assert.deepEqual(payouts, [{ email: 'sb-guardian@personal.example.com', dollars: 8 }]);
  // Sending the same request again doesn't pay again.
  assert.equal((await send(id)).statusCode, 200);
  assert.equal(payouts.length, 1);
  assert.equal((await approve('guardian', pinOf.guardian)).json().error, 'already_sent');
});

test('the browser cannot choose the payee or the approvals', async () => {
  const { post } = setup();
  assert.equal((await post('/api/paypal/payout-requests', { amount: 5, email: 'attacker@example.com' })).statusCode, 400);
  assert.equal((await post('/api/paypal/payout-requests', { amount: 5, approvals: ['admin', 'mentor'] })).statusCode, 400);
  // The old honour-based route is gone.
  const old = await post('/api/paypal/payouts', { email: 'attacker@example.com', amount: 5, approvals: ['admin', 'mentor'] });
  assert.equal(old.statusCode, 404);
});

test('five wrong PINs lock that adult for everyone, even with the right PIN', async () => {
  const { post } = setup();
  const id = (await post('/api/paypal/payout-requests', { amount: 5 })).json().request.id;
  for (let i = 0; i < 5; i++) await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: `guess-${i}` });
  const locked = await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: pinOf.admin });
  assert.equal(locked.statusCode, 429);
  assert.equal(locked.json().error, 'pin_locked');
  // Other adults are not affected.
  assert.equal((await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: pinOf.mentor })).statusCode, 200);
});

test('payout input is checked', async () => {
  const { post } = setup();
  for (const body of [{ amount: 0 }, { amount: 51 }, { amount: 'five' }, {}]) {
    assert.equal((await post('/api/paypal/payout-requests', body)).statusCode, 400, JSON.stringify(body));
  }
  const id = (await post('/api/paypal/payout-requests', { amount: 5 })).json().request.id;
  assert.equal((await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'stranger', pin: 'x' })).statusCode, 400);
  const unknown = await post('/api/paypal/payout-requests/REQ-0000-9999/approve', { approver: 'admin', pin: pinOf.admin });
  assert.equal(unknown.statusCode, 404);
});

test('payout status refreshes from PayPal', async () => {
  const { app, donate, approvedRequest, send } = setup();
  await donate(10);
  const batchId = (await send(await approvedRequest(5))).json().request.receipt.paypalId;
  const response = await app.inject({ method: 'GET', url: `/api/paypal/payouts/${batchId}` });
  assert.equal(response.json().receipt.status, 'SUCCESS');
  assert.equal((await app.inject({ method: 'GET', url: '/api/paypal/payouts/BATCHUNKNOWN1' })).statusCode, 404);
});

test('a clear "no" from PayPal returns the money to the pool and receipt ids never repeat', async () => {
  const fake = fakePayPal();
  fake.paypal.sendPayout = async () => {
    throw new PayPalError(422, 'INSUFFICIENT_FUNDS');
  };
  const { app, donate, approvedRequest, send } = setup({}, null, { paypal: fake.paypal });
  await donate(10);
  const response = await send(await approvedRequest(5));
  assert.equal(response.statusCode, 502);
  assert.match(response.json().message, /enough test money/);
  const listed = await receiptsOf(app);
  assert.equal(listed.poolDollars, 10);
  assert.equal(listed.receipts[1].status, 'REJECTED');
  fake.paypal.sendPayout = async () => ({ batchId: 'BATCHOK12345', status: 'PENDING' });
  const next = await send(await approvedRequest(5));
  assert.match(next.json().request.receipt.id, /^PAY-\d{4}-0002$/);
});

test('a lost PayPal answer keeps the money reserved, blocks new payouts and retries with the same ids', async () => {
  const fake = fakePayPal();
  const sent: string[] = [];
  let answer: 'lost' | 'ok' = 'lost';
  fake.paypal.sendPayout = async ({ itemId }) => {
    sent.push(itemId);
    if (answer === 'lost') throw new Error('Response lost after PayPal accepted the payout');
    return { batchId: 'BATCHFOUND123', status: 'PENDING' };
  };
  const { app, donate, approvedRequest, send } = setup({}, null, { paypal: fake.paypal });
  await donate(50);
  const first = await approvedRequest(50);
  const lost = await send(first);
  assert.equal(lost.statusCode, 502);
  assert.equal(lost.json().error, 'payout_unknown');
  assert.equal((await receiptsOf(app)).poolDollars, 0, 'the money stays reserved');
  // Nothing else can be sent until this one is settled.
  assert.equal((await send(await approvedRequest(5))).json().error, 'payout_needs_review');
  // Sending the same request again reuses the same PayPal ids, so PayPal can't pay twice.
  answer = 'ok';
  const settled = await send(first);
  assert.equal(settled.statusCode, 200);
  assert.equal(settled.json().request.receipt.status, 'PENDING');
  assert.deepEqual([sent.length, sent[0]], [2, sent[1]]);
  assert.equal((await receiptsOf(app)).receipts.filter((r: { type: string }) => r.type === 'payout').length, 1);
});

test('everything survives a restart: pool, orders, receipts, requests and unknown payouts', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-store-'));
  const dataFile = join(folder, 'records.json');
  try {
    const failing = fakePayPal();
    failing.paypal.sendPayout = async () => {
      throw new Error('timeout');
    };
    const before = setup({}, null, { dataFile, paypal: failing.paypal });
    await before.donate(25);
    const waitingOrder = (await before.post('/api/paypal/orders', { amount: 10 })).json().id;
    const request = await before.approvedRequest(8);
    await before.send(request); // outcome unknown
    const codeBefore = (await receiptsOf(before.app)).receipts[0].ref;
    await before.app.close();
    assert.ok(!readFileSync(dataFile, 'utf8').includes('secret-xyz'), 'no secrets in the file');

    // (A fresh fake PayPal; it reports the $10 the waiting order was for.)
    const after = setup({ capturedDollars: 10 }, null, { dataFile });
    const listed = await receiptsOf(after.app);
    assert.equal(listed.poolDollars, 17, 'the unknown payout is still reserved');
    assert.equal(listed.receipts[0].ref, codeBefore, 'codes stay the same');
    assert.equal(listed.receipts[1].status, 'UNKNOWN');
    // The order made before the restart can still be captured.
    assert.equal((await after.post(`/api/paypal/orders/${waitingOrder}/capture`)).statusCode, 200);
    // Retrying the unknown payout after the restart settles it, paying once.
    const retried = await after.send(request);
    assert.equal(retried.json().request.receipt.status, 'PENDING');
    assert.equal(after.payouts.length, 1);
    // New ids carry on from where they were.
    assert.match(await after.approvedRequest(5), /^REQ-\d{4}-0002$/);
    await after.app.close();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('only settled money is sealed on the ledger, by the server itself', async () => {
  const fake = fakePayPal();
  let status = 'PENDING';
  fake.paypal.getPayout = async (batchId) => ({ batchId, status });
  const { app, post, donate, approvedRequest, send, stored } = setup({}, null, { paypal: fake.paypal });
  assert.equal((await post('/api/ledger/publish-live')).json().error, 'nothing_to_publish');
  await donate(10);
  await donate(25);
  const pending = (await send(await approvedRequest(5))).json().request.receipt;

  // The pending payout is not sealed yet.
  const first = await post('/api/ledger/publish-live');
  assert.equal(first.statusCode, 200);
  const { batch, receipts } = first.json();
  assert.equal(batch.batchId, 101);
  assert.equal(receipts.length, 2);
  assert.ok(receipts.every((r: { currency: string }) => r.currency === 'USD'));
  assert.equal(batch.root, batchRoot(receipts));
  assert.deepEqual([batch.donated, batch.paidOut], [35, 0]);

  // Once PayPal says it's paid, it goes in the next batch.
  status = 'SUCCESS';
  await app.inject({ method: 'GET', url: `/api/paypal/payouts/${pending.paypalId}` });
  const second = (await post('/api/ledger/publish-live')).json();
  assert.equal(second.batch.batchId, 102);
  assert.equal(second.batch.paidOut, 5);
  assert.ok(!JSON.stringify([...stored.values()]).includes('sb-guardian'));
  assert.equal((await post('/api/ledger/publish-live')).json().error, 'nothing_to_publish');
});

test('failed payouts are never sealed as paid out', async () => {
  const fake = fakePayPal();
  fake.paypal.getPayout = async (batchId) => ({ batchId, status: 'FAILED' });
  const { app, post, donate, approvedRequest, send } = setup({}, null, { paypal: fake.paypal });
  await donate(10);
  const receipt = (await send(await approvedRequest(5))).json().request.receipt;
  await app.inject({ method: 'GET', url: `/api/paypal/payouts/${receipt.paypalId}` });
  const { receipts, batch } = (await post('/api/ledger/publish-live')).json();
  assert.deepEqual(receipts.map((r: { type: string }) => r.type), ['donation']);
  assert.equal(batch.paidOut, 0);
});

test('two publishes at once never seal the same receipts twice', async () => {
  const { post, donate } = setup();
  await donate(10);
  const answers = await Promise.all([post('/api/ledger/publish-live'), post('/api/ledger/publish-live')]);
  assert.deepEqual(answers.map((a) => a.statusCode).sort(), [200, 409]);
});

test('other websites cannot start donations or payouts', async () => {
  const { post } = setup();
  const evil = { origin: 'https://evil.example' };
  assert.equal((await post('/api/paypal/orders', { amount: 10 }, evil)).statusCode, 403);
  assert.equal((await post('/api/paypal/payout-requests', { amount: 5 }, evil)).statusCode, 403);
});

test('status checks are rate limited', async () => {
  const { app } = setup();
  let last = 0;
  for (let i = 0; i < 61; i++) last = (await app.inject({ method: 'GET', url: '/api/paypal/receipts' })).statusCode;
  assert.equal(last, 429);
});
