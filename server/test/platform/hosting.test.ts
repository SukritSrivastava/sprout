import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { Readable } from 'node:stream';
import { rootCertificates } from 'node:tls';
import pg from 'pg';
import { hostingPolicy, trustRenderProxy } from '../../src/shared/http/hosting.js';
import { databasePoolOptions } from '../../src/shared/storage/database.js';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import { createRateLimiter } from '../../src/shared/http/rate-limit.js';
import { onlyOurWebsite } from '../../src/shared/http/origin.js';
// @ts-expect-error Build-time JavaScript is also exercised by the API test runner.
import { websiteConfig } from '../../../client/hosting.mjs';

const hosted = {
  RENDER: 'true', DATABASE_URL: 'postgresql://sample:sample@db.example/sprout?sslmode=verify-full',
  ALLOWED_ORIGIN: 'https://sprout.example,https://preview.sprout.example', TRUST_PROXY: 'render',
  CHAIN_RPC_URL: 'https://sepolia.base.org', LEDGER_CHAIN_ID: '84532',
};

test('Render fails closed on missing storage, origins, proxy mode or public-chain settings', () => {
  assert.doesNotThrow(() => loadConfig(hosted));
  for (const override of [
    { DATABASE_URL: '' }, { ALLOWED_ORIGIN: undefined }, { ALLOWED_ORIGIN: 'http://localhost:5173' },
    { TRUST_PROXY: 'true' }, { TRUST_PROXY: 'false' }, { CHAIN_RPC_URL: 'http://127.0.0.1:8545' },
    { LEDGER_CHAIN_ID: '31337' }, { CHAIN_RPC_URL: 'not-a-url' },
  ]) assert.throws(() => loadConfig({ ...hosted, ...override }), /Invalid server settings/);
  assert.throws(() => loadConfig({ TRUST_PROXY: 'render' }), /requires the Render runtime/);
  assert.throws(() => loadConfig({ TRUST_PROXY: 'vercel' }), /Invalid server settings/);
});

test('Render binds its assigned PORT on all interfaces while local ports stay independent', () => {
  assert.equal(loadConfig({ ...hosted, PORT: '12345', API_PORT: '8787', HOST: '127.0.0.1' }).API_PORT, 12345);
  assert.equal(loadConfig(hosted).API_PORT, 10000);
  assert.equal(loadConfig(hosted).HOST, '0.0.0.0');
  assert.throws(() => loadConfig({ ...hosted, PORT: 'not-a-port' }), /API_PORT/);
  assert.equal(loadConfig({ PORT: '12345' }).API_PORT, 8787);
  assert.equal(loadConfig({ PORT: '12345' }).HOST, '127.0.0.1');
});

test('Supabase CA reaches pg without URL parameters replacing verified TLS', () => {
  const DATABASE_URL = 'postgresql://postgres.sample:synthetic@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=verify-full';
  assert.throws(() => loadConfig({ ...hosted, DATABASE_URL }), /DATABASE_SSL_CA/);
  assert.throws(() => loadConfig({ DATABASE_SSL_CA: 'not-a-certificate' }), /DATABASE_SSL_CA/);
  const config = loadConfig({ ...hosted, DATABASE_URL, DATABASE_SSL_CA: rootCertificates[0].replaceAll('\n', '\\n') });
  const options = databasePoolOptions(config.DATABASE_URL!, config.DATABASE_SSL_CA);
  const client = new pg.Client(options);
  assert.equal(new URL(options.connectionString!).searchParams.has('sslmode'), false);
  assert.deepEqual(client.ssl, { rejectUnauthorized: true, ca: rootCertificates[0].trim() });
  for (const override of ['ssl=false', 'sslrootcert=unused-file', 'uselibpqcompat=true'])
    assert.throws(() => loadConfig({ DATABASE_URL: `${DATABASE_URL}&${override}`, DATABASE_SSL_CA: rootCertificates[0] }), /URL SSL overrides/);
  assert.equal(databasePoolOptions('postgresql://sample:sample@localhost/test').ssl, undefined);
});

test('origin settings accept exact origins and reject unusable or wildcard allow-lists', () => {
  for (const ALLOWED_ORIGIN of ['https://site.example/', 'https://site.example/path', 'https://*.vercel.app',
    'https://user:password@site.example', 'ftp://site.example', 'https://site.example?x=1', 'nope'])
    assert.throws(() => loadConfig({ ALLOWED_ORIGIN }), /ALLOWED_ORIGIN/);
  assert.doesNotThrow(() => loadConfig({ ALLOWED_ORIGIN: 'https://site.example,http://localhost:5173' }));
});

test('website routing requires a concrete backend and keeps the API namespace outside the SPA', () => {
  for (const origin of [undefined, '', 'http://api.example', 'https://api.example/path',
    'https://user:secret@api.example', 'https://api.example?key=value', 'https://localhost', 'https://127.0.0.1', 'https://*.vercel.app'])
    assert.throws(() => websiteConfig(origin), /SPROUT_API_ORIGIN/);
  const config = websiteConfig('https://sprout-api.onrender.com');
  assert.equal(config.rewrites[0].destination, 'https://sprout-api.onrender.com/api/:path*');
  assert.equal(config.rewrites[0].source, '/api/:path*');
  const spa = new RegExp(`^${config.rewrites[1].source}$`);
  for (const path of ['/app', '/soon/safety', '/soon/impact', '/unknown-page']) assert.ok(spa.test(path));
  for (const path of ['/api', '/api/', '/api/unknown']) assert.equal(spa.test(path), false);
});

test('Render IP budgets trust one private ingress and ignore forged earlier hops and Vercel headers', async (t) => {
  const app = Fastify({ trustProxy: trustRenderProxy });
  t.after(() => app.close());
  hostingPolicy(app, { TRUST_PROXY: 'render' });
  const budget = createRateLimiter({ limit: 1, windowMs: 60_000 });
  app.get('/ip', async (request, reply) => {
    if (budget.check(request.ip)) reply.code(429);
    return { ip: request.ip };
  });
  const send = (forwarded: string | undefined, spoof: string, remoteAddress = '10.1.0.2') => app.inject({ url: '/ip', remoteAddress, headers: {
    ...(forwarded ? { 'x-forwarded-for': forwarded } : {}), 'x-vercel-forwarded-for': spoof, 'x-real-ip': spoof,
  } });
  assert.equal((await send('198.51.100.1, 203.0.113.1', '10.0.0.1')).json().ip, '203.0.113.1');
  assert.equal((await send('198.51.100.2, 203.0.113.1', '10.0.0.2')).statusCode, 429);
  assert.equal((await send('2001:db8::1', '10.0.0.3')).json().ip, '2001:db8::1');
  assert.equal((await send(undefined, '10.0.0.4')).json().ip, '10.1.0.2');
  assert.equal((await send('not-an-ip', '10.0.0.6')).statusCode, 429);
  assert.equal((await send('203.0.113.2', '10.0.0.5', '198.51.100.9')).json().ip, '198.51.100.9');
  assert.equal(trustRenderProxy('::ffff:10.1.0.2', 0), true);
  assert.equal(trustRenderProxy('10.1.0.2', 1), false);
});

test('API success, rejection, 404 and streamed replies cannot enter shared caches', async (t) => {
  const app = buildApp(loadConfig({}), { model: null, paypal: null, chain: null });
  t.after(() => app.close());
  const replies = await Promise.all([
    app.inject('/api/health'), app.inject('/api/guardian/status?learner=A12'),
    app.inject('/api/unknown'), app.inject({ method: 'POST', url: '/api/mentor/chat',
      headers: { origin: 'https://evil.example' }, payload: {} }),
    app.inject({ method: 'POST', url: '/api/mentor/chat', headers: { 'x-learning-revision': '0' }, payload: {
      messages: [{ role: 'user', text: 'How do I save?' }], language: 'en',
    } }),
  ]);
  assert.deepEqual(replies.slice(0, 4).map((reply) => reply.statusCode), [200, 200, 404, 403]);
  const stream = replies[4];
  assert.equal(stream.statusCode, 200);
  assert.match(String(stream.headers['content-type']), /application\/x-ndjson/);
  assert.ok(stream.body.split('\n').filter(Boolean).map((line) => JSON.parse(line)).some((line) => line.type === 'done'));
  for (const reply of replies) {
    for (const key of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control'])
      assert.equal(reply.headers[key], 'no-store');
  }
});

test('trusted website preflights allow authorization/revision and preserve streaming headers', async (t) => {
  const app = Fastify();
  t.after(() => app.close());
  hostingPolicy(app, { TRUST_PROXY: false });
  onlyOurWebsite(app, ['https://sprout.example'], ['/api/probe'], ['authorization', 'x-learning-revision']);
  app.post('/api/probe', async (request, reply) => {
    assert.equal(request.headers.authorization, 'Bearer synthetic-session');
    assert.equal(request.headers['x-learning-revision'], '7');
    reply.type('application/x-ndjson').header('x-accel-buffering', 'no');
    return Readable.from(['{"type":"start"}\n', '{"type":"done"}\n']);
  });
  const options = await app.inject({ method: 'OPTIONS', url: '/api/probe', headers: {
    origin: 'https://sprout.example', 'access-control-request-method': 'POST',
    'access-control-request-headers': 'authorization,x-learning-revision,content-type',
  } });
  assert.equal(options.statusCode, 204);
  assert.equal(options.headers['access-control-allow-origin'], 'https://sprout.example');
  assert.match(String(options.headers['access-control-allow-headers']), /authorization, x-learning-revision/);
  const result = await app.inject({ method: 'POST', url: '/api/probe', headers: {
    origin: 'https://sprout.example', authorization: 'Bearer synthetic-session', 'x-learning-revision': '7',
  } });
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers['x-accel-buffering'], 'no');
  assert.equal(result.body, '{"type":"start"}\n{"type":"done"}\n');
  assert.equal((await app.inject({ method: 'OPTIONS', url: '/api/probe', headers: {
    origin: 'https://unlisted.vercel.app',
  } })).statusCode, 403);
});
