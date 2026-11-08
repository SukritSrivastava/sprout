// Tests for GET /api/health and for settings checks. app.inject() sends pretend requests straight
// into the app, so no real port or network is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import Fastify from 'fastify';
import { healthRoutes } from '../../src/shared/http/health.js';
import { schemaVersion } from '../../src/shared/storage/schema.js';
import type { Database } from '../../src/shared/storage/database.js';

// Tests pass their own settings so a real server/.env never affects the result.
const baseEnv = { API_PORT: '8787' };

test('health reports ok and that AI is not configured without a key', async () => {
  const app = buildApp(loadConfig(baseEnv));
  const response = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: 'sprout-server',
    mentor: { aiConfigured: false },
    paypal: { sandboxConfigured: false },
  });
});

test('health says AI is configured when a key exists, and never leaks the key', async () => {
  const app = buildApp(loadConfig({ ...baseEnv, GEMINI_API_KEY: 'test-key-123' }));
  const response = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(response.json().mentor.aiConfigured, true);
  assert.ok(!response.body.includes('test-key-123'));
});

test('health says PayPal is configured with both sandbox keys, and never leaks the secret', async () => {
  const app = buildApp(loadConfig({ ...baseEnv, PAYPAL_CLIENT_ID: 'client-abc', PAYPAL_CLIENT_SECRET: 'secret-xyz' }));
  const response = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(response.json().paypal.sandboxConfigured, true);
  assert.ok(!response.body.includes('secret-xyz'));
});

test('readiness shares database checks and returns a bounded, private error on outages', async t => {
  let calls = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const app = Fastify(); t.after(() => app.close());
  const database = { query: async () => {
    calls++; await pending;
    return { rows: [{ version: schemaVersion }] };
  } } as unknown as Database;
  app.register(healthRoutes, { config: loadConfig({}), database });
  const replies = Promise.all([app.inject('/api/ready'), app.inject('/api/ready')]);
  await app.ready();
  release();
  assert.ok((await replies).every(reply => reply.statusCode === 200));
  assert.equal(calls, 1);
  assert.equal((await app.inject('/api/ready')).statusCode, 200);
  assert.equal(calls, 1);

  const broken = Fastify(); t.after(() => broken.close());
  broken.register(healthRoutes, { config: loadConfig({}), database: {
    query: async () => { throw new Error('PRIVATE_CONNECTION_AND_PASSWORD'); },
  } as unknown as Database });
  const failed = await broken.inject('/api/ready');
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.json().error, 'not_ready');
  assert.doesNotMatch(failed.body, /PRIVATE/);
  assert.equal((await broken.inject('/api/health')).statusCode, 200);
});

test('readiness does not wait indefinitely for an unresponsive database', async t => {
  const app = Fastify(); t.after(() => app.close());
  app.register(healthRoutes, { config: loadConfig({}), database: {
    query: async () => new Promise(() => {}),
  } as unknown as Database });
  assert.equal((await app.inject('/api/ready')).statusCode, 503);
});

test('unknown routes return a JSON 404', async () => {
  const app = buildApp(loadConfig(baseEnv));
  const response = await app.inject({ method: 'GET', url: '/api/nope' });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, 'not_found');
});

test('bad settings fail loudly at startup', () => {
  assert.throws(() => loadConfig({ API_PORT: 'not-a-number' }), /Invalid server settings/);
  assert.throws(() => loadConfig({ ALLOWED_ORIGIN: 'nope' }), /ALLOWED_ORIGIN/);
});
