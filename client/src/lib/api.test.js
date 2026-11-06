// Unit tests for api.js: a "successful" answer that isn't our JSON (for example an HTML page
// from a misconfigured host) counts as a failure, not as empty data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { call } from './api.js';

const answer = (body, { status = 200, type = 'application/json' } = {}) => {
  globalThis.fetch = async () => new Response(body, { status, headers: { 'content-type': type } });
};

test('a JSON answer comes back with ok: true', async () => {
  answer(JSON.stringify({ poolDollars: 10 }));
  assert.deepEqual(await call('/api/x'), { poolDollars: 10, ok: true });
});

test('an HTML page with status 200 is an invalid response, not data', async () => {
  answer('<!doctype html><p>Not the API</p>', { type: 'text/html' });
  const reply = await call('/api/x');
  assert.equal(reply.ok, false);
  assert.match(reply.message, /invalid response/);
});

test('broken JSON with status 200 is an invalid response', async () => {
  answer('{"pool', { type: 'application/json' });
  assert.equal((await call('/api/x')).ok, false);
});

test('the body can’t pretend a failure succeeded', async () => {
  answer(JSON.stringify({ ok: false, message: 'no' }));
  assert.equal((await call('/api/x')).ok, true);
  answer(JSON.stringify({ ok: true, message: 'Busy' }), { status: 429 });
  assert.deepEqual(await call('/api/x'), { ok: false, status: 429, message: 'Busy' });
});

test('no server at all gives status 0', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  assert.equal((await call('/api/x')).status, 0);
});

test('an unknown payout keeps its recovery data while remaining an HTTP failure', async () => {
  const request = { id: 'REQ-2611-0001', receipt: { status: 'UNKNOWN' } };
  answer(JSON.stringify({ error: 'payout_unknown', message: 'Funds reserved', request, poolDollars: 17, ok: true }), { status: 502 });
  assert.deepEqual(await call('/api/paypal/payout-requests/x/send'), {
    ok: false, status: 502, error: 'payout_unknown', message: 'Funds reserved', request, poolDollars: 17,
  });
});
