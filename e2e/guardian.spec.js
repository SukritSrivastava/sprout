// Guardian UI and real API checks, with isolated records rather than the user's saved demo.
import { test, expect } from './fixtures.js';
import { startIsolatedApi, proxyApi } from './isolated-api.js';

test.use({ guardianPermission: false });
const policy = 'demo-permission-v1';
const pin = 'guardian-browser-test';
const initial = (learner = 'A12') => ({ learner, status: 'pending', revision: 0, policy, acknowledgedAt: null, changedAt: null });
const state = (page) => page.getByTestId('permission-state');
const record = (page) => page.getByRole('button', { name: 'Record demo permission', exact: true });
async function acknowledge(page) {
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page.getByLabel('Guardian PIN', { exact: true }).fill(pin); await record(page).click();
  await expect(state(page)).toHaveText('Permission recorded');
}
async function fakePermission(page, { configured = true, failLoad = false, failSave = false, stale = false } = {}) {
  const consents = Object.fromEntries(['A12', 'B07', 'C33'].map((code) => [code, initial(code)]));
  const writes = [];
  await page.route('**/api/guardian/**', async (route) => {
    if (route.request().method() === 'GET') {
      if (failLoad) return route.fulfill({ status: 503, json: { message: 'Storage is unavailable.' } });
      const learner = new URL(route.request().url()).searchParams.get('learner') || 'A12';
      return route.fulfill({ json: { configured, consent: consents[learner] } });
    }
    const body = route.request().postDataJSON(); writes.push(body);
    if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { message: 'The change could not be saved.' } }); }
    if (stale) { stale = false; consents[body.learner] = { ...consents[body.learner], status: 'withdrawn', revision: 2 }; return route.fulfill({ status: 409, json: { message: 'Permission changed in another tab. Refresh first.' } }); }
    if (body.pin !== pin) return route.fulfill({ status: 403, json: { message: 'That guardian PIN is not correct.' } });
    const consent = consents[body.learner];
    consents[body.learner] = { ...consent, status: body.action === 'acknowledge' ? 'active' : body.action === 'withdraw' ? 'withdrawn' : 'deleted', revision: consent.revision + 1,
      acknowledgedAt: body.action === 'acknowledge' ? new Date().toISOString() : null, changedAt: new Date().toISOString() };
    return route.fulfill({ json: { configured, consent: consents[body.learner] } });
  });
  return { writes, allowLoad: () => { failLoad = false; }, consents };
}

test('first entry blocks lessons and AI and links to guardian setup', async ({ page }) => {
  await fakePermission(page);
  for (const path of ['/soon/seedlings', '/app#mentor']) {
    await page.goto(path); await expect(page.getByRole('heading', { name: 'Guardian permission comes first.' })).toBeVisible();
    await expect(page.locator('.seedlings-question, .chat-card')).toHaveCount(0);
    await page.getByRole('link', { name: 'Open guardian permission' }).click();
    await expect(state(page)).toHaveText('Permission needed');
  }
});

test('all acknowledgements and a PIN are needed; PIN clears and dates survive reload', async ({ page }) => {
  const fake = await fakePermission(page); await page.goto('/soon/safety');
  await expect(page.getByRole('note')).toContainText('does not verify');
  await page.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Show PIN', exact: true }).click();
  await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveAttribute('type', 'text');
  await expect(record(page)).toBeDisabled();
  const boxes = page.getByRole('checkbox'); await boxes.nth(0).check(); await boxes.nth(1).check();
  await expect(record(page)).toBeDisabled(); await boxes.nth(2).check(); await record(page).click();
  await expect(state(page)).toHaveText('Permission recorded');
  await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveAttribute('type', 'password');
  expect(fake.writes[0]).toMatchObject({ learner: 'A12', acknowledged: true, policy, revision: 0 });
  await expect(page.locator('.guardian-state time')).toHaveCount(2);
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain(pin);
  await page.reload(); await expect(state(page)).toHaveText('Permission recorded');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('guardian can withdraw, restore and delete only the selected learner', async ({ page }) => {
  const fake = await fakePermission(page); await page.goto('/soon/safety'); await acknowledge(page);
  await page.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Withdraw permission', exact: true }).click();
  await expect(state(page)).toHaveText('Permission withdrawn');
  await page.goto('/app'); await expect(page.locator('#learning-permission')).toContainText('withdrawn');
  await page.getByRole('link', { name: 'Open guardian permission' }).click(); await acknowledge(page);
  await page.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await expect(page.getByRole('button', { name: 'Delete learning data', exact: true })).toBeDisabled();
  await page.getByLabel('Type A12 to confirm deletion', { exact: true }).fill('A12');
  await page.getByRole('button', { name: 'Delete learning data', exact: true }).click();
  await expect(state(page)).toHaveText('Learning data deleted');
  expect(fake.consents.B07.status).toBe('pending');
  await page.getByRole('combobox', { name: 'Sample learner', exact: true }).selectOption('B07');
  await expect(state(page)).toHaveText('Permission needed');
});

test('missing guardian configuration explains local setup and can recheck access', async ({ page }) => {
  await fakePermission(page, { configured: false }); await page.goto('/soon/safety');
  await expect(page.getByRole('heading', { name: 'Set up guardian access' })).toBeVisible();
  await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh permission' }).click();
  await expect(page.locator('.guardian-controls')).toContainText('Restart the API');
});

test('guardian controls work with keyboard and reduced motion at a narrow width', async ({ page }, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await fakePermission(page); await page.goto('/soon/safety');
  const first = page.getByRole('checkbox').first(); await first.focus(); await page.keyboard.press('Space'); await expect(first).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: `qa/guardian-${info.project.name}.png`, fullPage: true });
});

test.describe('recoverable failures', () => {
  test.use({ expectedConsoleErrors: [/Failed to load resource|net::ERR_FAILED/] });
  test('a wrong guardian PIN records nothing, clears the input and can recover', async ({ page }) => {
    await fakePermission(page); await page.goto('/soon/safety'); await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await page.getByLabel('Guardian PIN', { exact: true }).fill('incorrect'); await record(page).click();
    await expect(page.getByRole('alert')).toContainText('not correct'); await expect(state(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh permission' }).click(); await expect(state(page)).toHaveText('Permission needed');
    await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveValue(''); await acknowledge(page);
  });
  test('unreachable permission fails closed, then refresh recovers', async ({ page }) => {
    const fake = await fakePermission(page, { failLoad: true }); await page.goto('/app');
    await expect(page.getByRole('alert')).toContainText('couldn’t check'); await expect(page.locator('.chat-card')).toHaveCount(0);
    fake.allowLoad(); await page.getByRole('button', { name: 'Check permission again' }).click();
    await page.getByRole('link', { name: 'Open guardian permission' }).click(); await expect(state(page)).toHaveText('Permission needed');
  });
  test('failed save never announces success and requires refresh and a fresh PIN', async ({ page }) => {
    await fakePermission(page, { failSave: true }); await page.goto('/soon/safety');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await page.getByLabel('Guardian PIN', { exact: true }).fill(pin); await record(page).click();
    await expect(page.getByRole('alert')).toContainText('could not be saved'); await expect(state(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh permission' }).click(); await expect(state(page)).toHaveText('Permission needed');
    await expect(page.getByLabel('Guardian PIN', { exact: true })).toHaveValue(''); await acknowledge(page);
  });
  test('a stale guardian tab cannot silently overwrite a newer decision', async ({ page }) => {
    await fakePermission(page, { stale: true }); await page.goto('/soon/safety');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await page.getByLabel('Guardian PIN', { exact: true }).fill(pin); await record(page).click();
    await expect(page.getByRole('alert')).toContainText('another tab'); await page.getByRole('button', { name: 'Refresh permission' }).click();
    await expect(state(page)).toHaveText('Permission withdrawn');
  });
});

const realTest = test.extend({
  api: async ({ page }, use) => {
    const api = await startIsolatedApi();
    try {
      await proxyApi(page, api.address); await use(api.address);
    } finally { await api.close(); }
  },
});

realTest('real API: permission, saved lesson, withdrawal, deletion and restart of the browser', async ({ page, api }) => {
  await page.goto('/soon/safety'); await acknowledge(page);
  await page.getByRole('link', { name: 'Open Seedlings lessons' }).click();
  const answers = ['need', 'need', 'need', 'need', 'want', 'want'];
  for (const [index, value] of answers.entries()) await page.locator(`input[name="needs-${index}"][value="${value}"]`).check();
  await page.locator('.seedlings-submit').click(); await expect(page.getByTestId('seed-count')).toHaveText('1 of 3 seeds planted');
  await page.goto('/soon/safety'); await page.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Withdraw permission', exact: true }).click(); await expect(state(page)).toHaveText('Permission withdrawn');
  await page.goto('/soon/seedlings'); await expect(page.locator('#learning-permission')).toContainText('withdrawn');
  await page.goto('/soon/safety'); await page.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await page.getByLabel('Type A12 to confirm deletion', { exact: true }).fill('A12');
  await page.getByRole('button', { name: 'Delete learning data', exact: true }).click(); await expect(state(page)).toHaveText('Learning data deleted');
  await page.reload(); await expect(state(page)).toHaveText('Learning data deleted'); await acknowledge(page);
  await page.getByRole('link', { name: 'Open Seedlings lessons' }).click(); await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted');
});

realTest('real API: an open chat clears after withdrawal in another tab', async ({ page, context, api }) => {
  await page.goto('/soon/safety'); await acknowledge(page); await page.getByRole('link', { name: 'Open Paisa Mentor' }).click();
  const input = page.getByRole('textbox', { name: 'Your question' }); await input.fill('How can I save?'); await input.press('Enter');
  await expect(page.locator('.bubble-mentor').last()).toContainText(/sav/i);
  const other = await context.newPage();
  await other.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()); const response = await route.fetch({ url: `${api}${url.pathname}${url.search}` }); await route.fulfill({ response });
  });
  await other.goto('/soon/safety'); await other.getByLabel('Guardian PIN', { exact: true }).fill(pin);
  await other.getByRole('button', { name: 'Withdraw permission', exact: true }).click(); await expect(state(other)).toHaveText('Permission withdrawn');
  await page.bringToFront(); await expect(page.locator('#learning-permission')).toContainText('withdrawn');
  await expect(page.locator('.chat-card')).toHaveCount(0); await other.close();
});
