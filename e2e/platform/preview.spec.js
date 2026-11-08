import { test, expect } from '@playwright/test';

// Only the preview config collects these checks. They use fresh browser contexts and real routing.
test('website deep links load directly and API 404s stay JSON', async ({ page, request }) => {
  for (const path of ['/app#mentor', '/soon/safety', '/soon/impact', '/soon/seedlings']) {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('link', { name: /sprout/i }).first()).toBeVisible();
  }
  for (const path of ['/api', '/api/preview-missing-route']) {
    const missing = await request.get(path);
    expect(missing.status()).toBe(404);
    expect(missing.headers()['content-type']).toContain('application/json');
    expect((await missing.json()).error).toBe('not_found');
    expect(missing.headers()['cache-control']).toContain('no-store');
  }
});

test('real website rewrite serves uncached health and rejects unlisted browser origins', async ({ request, baseURL }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).service).toBe('sprout-server');
  expect(health.headers()['cache-control']).toContain('no-store');
  const ready = await request.get('/api/ready');
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ok:true,storage:'postgres'});
  expect(ready.headers()['cache-control']).toContain('no-store');
  const status = await request.get('/api/guardian/status?learner=A12');
  expect(status.status()).toBe(200);
  expect(status.headers()['cache-control']).toContain('no-store');
  const preflight = await request.fetch('/api/mentor/chat', { method: 'OPTIONS', headers: {
    origin: new URL(baseURL).origin, 'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type,x-learning-revision',
  } });
  expect(preflight.status()).toBe(204);
  expect(preflight.headers()['access-control-allow-origin']).toBe(new URL(baseURL).origin);
  expect(preflight.headers()['access-control-allow-headers']).toContain('x-learning-revision');
  const publication = await request.fetch('/api/ledger/publish-live', { method: 'OPTIONS', headers: {
    origin: new URL(baseURL).origin, 'access-control-request-method': 'POST',
    'access-control-request-headers': 'authorization,content-type',
  } });
  expect(publication.status()).toBe(204);
  expect(publication.headers()['access-control-allow-headers']).toContain('authorization');
  const blocked = await request.fetch('/api/mentor/chat', { method: 'OPTIONS', headers: { origin: 'https://unlisted.example' } });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).error).toBe('forbidden_origin');
});
