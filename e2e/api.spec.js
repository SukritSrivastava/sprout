// The website reaches the server through Vite's /api proxy.
import { test, expect } from './fixtures.js';

test.describe('API through the website proxy', () => {
  test('health check answers and never exposes a key', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, service: 'sprout-server' });
    expect(typeof body.mentor.aiConfigured).toBe('boolean');
    expect(JSON.stringify(body)).not.toMatch(/key/i);
  });

  test('unknown API paths return a JSON 404', async ({ request }) => {
    const response = await request.get('/api/does-not-exist');
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ error: 'not_found' });
  });
});
