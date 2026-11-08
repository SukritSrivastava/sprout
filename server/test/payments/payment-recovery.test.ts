// Payment recovery regressions. Only fake PayPal calls and disposable test record files are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../support/protected-config.js';
import { createPayPal, PayPalError, type PayPal } from '../../src/features/payments/client.js';
import { createPayPalStore, PaymentStoreError } from '../../src/features/payments/store.js';

const keys = {
  PAYPAL_CLIENT_ID: 'fake-client', PAYPAL_CLIENT_SECRET: 'fake-secret',
  PAYOUT_PIN_MENTOR: 'mentor-123', PAYOUT_PIN_ADMIN: 'admin-456', PAYOUT_PIN_GUARDIAN: 'guardian-789',
  GUARDIAN_PAYPAL_EMAIL: 'guardian@example.com',
};
function temporaryRecords() {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-recovery-'));
  assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
  return { file: join(folder, 'records.json'), cleanup: () => rmSync(folder, { recursive: true, force: true }) };
}
function setup(file?: string, onSend?: PayPal['sendPayout']) {
  let sends = 0;
  const paypal: PayPal = {
    clientId: 'fake',
    async createOrder() { return { id: 'ORDER12345' }; },
    async captureOrder() { return { orderId: 'ORDER12345', captureId: 'CAPTURE123', status: 'COMPLETED', dollars: 25, currency: 'USD', payerId: 'fake' }; },
    async sendPayout(input) { sends++; return onSend ? onSend(input) : { batchId: 'BATCH12345', status: 'PENDING' }; },
    async getPayout(batchId) { return { batchId, status: 'SUCCESS' }; },
  };
  const app = buildApp(loadConfig(keys), { paypal, model: null, chain: null, dataFile: file });
  const post = (url: string, payload: object = {}) => app.inject({ method: 'POST', url, payload });
  const prepare = async () => {
    await post('/api/paypal/orders', { amount: 25 });
    await post('/api/paypal/orders/ORDER12345/capture');
    const id = (await post('/api/paypal/payout-requests', { amount: 8 })).json().request.id;
    await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'mentor', pin: keys.PAYOUT_PIN_MENTOR });
    await post(`/api/paypal/payout-requests/${id}/approve`, { approver: 'admin', pin: keys.PAYOUT_PIN_ADMIN });
    return id as string;
  };
  const act = (id: string, action: string, pin = keys.PAYOUT_PIN_MENTOR) =>
    post(`/api/paypal/payout-requests/${id}/${action}`, { approver: 'mentor', pin });
  return { app, prepare, act, sends: () => sends };
}

test('new requests cannot prune a request with any recorded approval', () => {
  const store = createPayPalStore();
  const input = { amount: 8, email: 'synthetic@example.com', child: 'sample' };
  const approved = store.addRequest(input);
  store.approve(approved.id, 'mentor');
  const abandoned = store.addRequest(input);
  for (let index = 0; index < 205; index++) store.addRequest(input);
  assert.deepEqual(store.findRequest(approved.id)?.approvals.map(item => item.approver), ['mentor']);
  assert.equal(store.findRequest(abandoned.id), undefined);
  store.approve(approved.id, 'admin');
  assert.equal(store.findRequest(approved.id)?.approvals.length, 2);
});

test('file receipt pagination retains the full history and hides provider identifiers', () => {
  const store = createPayPalStore();
  for (let index = 1; index <= 125; index++) store.addDonation({
    orderId: `PRIVATEORDER${index}`, captureId: `PRIVATECAPTURE${index}`, dollars: 1, payerId: 'synthetic',
  });
  const first = store.receiptPage(100);
  assert.equal(first.receipts.length, 100);
  assert.equal(first.nextCursor, first.receipts[0].id);
  store.addDonation({ orderId: 'NEWPRIVATEORDER', captureId: 'NEWPRIVATECAPTURE', dollars: 1, payerId: 'synthetic' });
  const older = store.receiptPage(100, first.nextCursor!);
  assert.equal(older.receipts.length, 25);
  assert.equal(older.nextCursor, null);
  assert.equal(new Set([...first.receipts, ...older.receipts].map(receipt => receipt.id)).size, 125);
  assert.doesNotMatch(JSON.stringify([...first.receipts, ...older.receipts]), /PRIVATE|paypalId|orderId/);
  assert.equal(store.pendingCount(), 126);
  assert.throws(() => store.receiptPage(100, 'DON-0000-0000'), /receipt page is unavailable/);
});

test('duplicate payout PINs are rejected without printing their values', () => {
  assert.throws(() => loadConfig({ ...keys, PAYOUT_PIN_ADMIN: keys.PAYOUT_PIN_MENTOR }), (error: Error) =>
    error.message.includes('different payout PIN') && !error.message.includes(keys.PAYOUT_PIN_MENTOR));
  assert.throws(() => loadConfig({ ...keys, PAYOUT_PIN_ADMIN: ` ${keys.PAYOUT_PIN_MENTOR} ` }), /different payout PIN/);
});

test('unsaved donations cannot be read or spent, and saving resumes without another capture', () => {
  const temp = temporaryRecords();
  try {
    const store = createPayPalStore({ file: temp.file });
    store.rememberOrder('ORDER12345', 25);
    mkdirSync(`${temp.file}.tmp`); // An empty directory blocks the next write, like an unavailable disk.
    assert.throws(() => store.addDonation({ orderId: 'ORDER12345', captureId: 'CAPTURE123', dollars: 25, payerId: 'fake' }), PaymentStoreError);
    assert.throws(() => store.poolDollars(), PaymentStoreError);
    assert.throws(() => store.startPayout('no-new-payout'), PaymentStoreError);
    assert.equal(JSON.parse(readFileSync(temp.file, 'utf8')).receipts.length, 0);
    rmdirSync(`${temp.file}.tmp`);
    assert.equal(store.poolDollars(), 25); // Flush the original provider answer first.
    assert.equal(JSON.parse(readFileSync(temp.file, 'utf8')).receipts.length, 1);
    store.addDonation({ orderId: 'ORDER12345', captureId: 'CAPTURE123', dollars: 25, payerId: 'fake' });
    assert.equal(store.all().length, 1);
    assert.equal(createPayPalStore({ file: temp.file }).poolDollars(), 25);
  } finally { temp.cleanup(); }
});

test('a reservation save failure sends nothing; after disk recovery the same request can finish', async () => {
  const temp = temporaryRecords(); const s = setup(temp.file);
  try {
    const id = await s.prepare();
    mkdirSync(`${temp.file}.tmp`);
    assert.equal((await s.act(id, 'send')).statusCode, 503);
    assert.equal(s.sends(), 0);
    assert.equal((await s.app.inject('/api/paypal/receipts')).statusCode, 503);
    rmdirSync(`${temp.file}.tmp`);
    const recovered = await s.act(id, 'recover');
    assert.equal(recovered.json().request.receipt.status, 'SENDING');
    assert.equal((await s.act(id, 'send')).json().request.receipt.status, 'PENDING');
    assert.equal(s.sends(), 1);
    assert.equal((await s.act(id, 'send')).json().poolDollars, 17);
    assert.equal(s.sends(), 1);
  } finally { await s.app.close(); temp.cleanup(); }
});

test('a provider success is not overwritten if saving its response fails', async () => {
  const temp = temporaryRecords();
  const s = setup(temp.file, async () => {
    mkdirSync(`${temp.file}.tmp`);
    return { batchId: 'BATCH12345', status: 'PENDING' };
  });
  try {
    const id = await s.prepare();
    assert.equal((await s.act(id, 'send')).statusCode, 503);
    rmdirSync(`${temp.file}.tmp`);
    const recovered = (await s.act(id, 'recover')).json();
    assert.equal(recovered.request.receipt.paypalId, 'BATCH12345');
    assert.equal(recovered.request.receipt.status, 'PENDING');
    await s.act(id, 'send');
    assert.equal(s.sends(), 1);
  } finally { await s.app.close(); temp.cleanup(); }
});

test('recovering an unknown payout needs a PIN and does not send another payment', async () => {
  const s = setup(undefined, async () => { throw new Error('response lost'); });
  try {
    const id = await s.prepare();
    const unknown = (await s.act(id, 'send')).json();
    assert.equal(unknown.poolDollars, 17);
    assert.equal(unknown.request.receipt.status, 'UNKNOWN');
    assert.equal((await s.act(id, 'recover', 'wrong')).statusCode, 403);
    const restored = (await s.act(id, 'recover')).json();
    assert.equal(restored.request.receipt.status, 'UNKNOWN');
    assert.equal(restored.request.approvals.length, 2);
    assert.ok(!JSON.stringify(restored).includes(keys.GUARDIAN_PAYPAL_EMAIL));
    assert.equal(s.sends(), 1);
  } finally { await s.app.close(); }
});

test('old unknown payouts are held for manual review rather than sent again', async () => {
  const temp = temporaryRecords();
  const store = createPayPalStore({ file: temp.file, now: () => new Date(Date.now() - 31 * 24 * 60 * 60_000) });
  store.rememberOrder('ORDER12345', 25);
  store.addDonation({ orderId: 'ORDER12345', captureId: 'CAPTURE123', dollars: 25, payerId: 'fake' });
  const request = store.addRequest({ amount: 8, email: keys.GUARDIAN_PAYPAL_EMAIL, child: 'sample' });
  store.approve(request.id, 'mentor'); store.approve(request.id, 'admin');
  const { receipt } = store.startPayout(request.id);
  store.updatePayout(receipt.id, { status: 'UNKNOWN' });
  const s = setup(temp.file);
  try {
    const result = await s.act(request.id, 'send');
    assert.equal(result.statusCode, 409);
    assert.equal(result.json().error, 'payout_manual_review');
    assert.equal(result.json().poolDollars, 17);
    assert.equal(s.sends(), 0);
  } finally { await s.app.close(); temp.cleanup(); }
});

test('a duplicate response without a usable link never releases the payout reservation', async () => {
  const s = setup(undefined, async () => { throw new PayPalError(400, 'DUPLICATE_BATCH_ID'); });
  try {
    const result = await s.act(await s.prepare(), 'send');
    assert.equal(result.json().error, 'payout_unknown');
    assert.equal(result.json().request.receipt.status, 'UNKNOWN');
    assert.equal(result.json().poolDollars, 17);
  } finally { await s.app.close(); }
});

function duplicateProvider({ link = 'https://api-m.sandbox.paypal.com/v1/payments/payouts/BATCH12345', receiver = 'guardian@example.com', lookupFails = false } = {}) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push(url);
    if (url.endsWith('/token')) return Response.json({ access_token: 'fake', expires_in: 3600 });
    if (init.method === 'POST') return Response.json({ name: 'DUPLICATE_BATCH_ID', links: [{ href: link, rel: 'self', method: 'GET' }] }, { status: 400 });
    if (lookupFails) return Response.json({ name: 'RESOURCE_NOT_FOUND' }, { status: 404 });
    return Response.json({
      batch_header: { payout_batch_id: 'BATCH12345', sender_batch_header: { sender_batch_id: 'operation-123' } },
      items: [{ transaction_status: 'SUCCESS', payout_item: { sender_item_id: 'operation-123', receiver, amount: { currency: 'USD', value: '8.00' } } }],
    });
  }) as typeof fetch;
  return { paypal: createPayPal(loadConfig(keys), fetchImpl)!, calls };
}
const payout = { email: keys.GUARDIAN_PAYPAL_EMAIL, dollars: 8, note: 'fake', itemId: 'operation-123' };
test('a PayPal duplicate response recovers the matching original batch', async () => {
  const { paypal, calls } = duplicateProvider();
  assert.deepEqual(await paypal.sendPayout(payout), { batchId: 'BATCH12345', status: 'SUCCESS' });
  assert.equal(calls.filter((url) => url.endsWith('/BATCH12345')).length, 1);
});
test('duplicate recovery rejects external links and mismatched original payments', async () => {
  const external = duplicateProvider({ link: 'https://attacker.example/v1/payments/payouts/BATCH12345' });
  await assert.rejects(external.paypal.sendPayout(payout));
  assert.equal(external.calls.length, 2, 'no follow-up request to an untrusted link');
  const mismatch = duplicateProvider({ receiver: 'someone-else@example.com' });
  await assert.rejects(mismatch.paypal.sendPayout(payout), /did not match/);
});

test('a failed original-batch lookup cannot be mistaken for a rejected send', async () => {
  const { paypal } = duplicateProvider({ lookupFails: true });
  await assert.rejects(paypal.sendPayout(payout), (error: unknown) =>
    error instanceof PayPalError && error.status === 502 && error.issue === 'DUPLICATE_BATCH_ID');
});
