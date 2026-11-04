import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

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
  });
});

test('health says AI is configured when a key exists, and never leaks the key', async () => {
  const app = buildApp(loadConfig({ ...baseEnv, GEMINI_API_KEY: 'test-key-123' }));
  const response = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(response.json().mentor.aiConfigured, true);
  assert.ok(!response.body.includes('test-key-123'));
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
