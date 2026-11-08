// Shared language behavior across routes, forms, speech/learning and streamed mentor replies.
import { test, expect } from '../support/fixtures.js';

test.use({ reducedMotion: 'reduce' });
const choose = (page, language) => page.locator('.site-header .language-switch').getByRole('button', { name: language === 'hi' ? 'हिन्दी' : 'English', exact: true }).click();

test('header choice survives navigation/reload and reaches another open tab', async ({ page, context }) => {
  await page.goto('/');
  await choose(page, 'hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('h1')).toContainText('पैसों की समझ');
  const tab = await context.newPage();
  await tab.goto('/soon');
  await expect(tab.locator('html')).toHaveAttribute('lang', 'hi');
  // A real tab switch brings the original page to the foreground before clicking it.
  await page.bringToFront();
  await choose(page, 'en');
  await tab.bringToFront();
  await expect(tab.locator('html')).toHaveAttribute('lang', 'en');
  await page.bringToFront();
  await choose(page, 'hi');
  await page.locator('.site-header a[href="/soon/safety"]').evaluate((link) => link.click());
  await expect(page.locator('h1')).toHaveText('अभिभावक की सहमति और सुरक्षा');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await tab.close();
});

for (const [route, title] of [
  ['/app', 'यह आपका sprout.io है।'], ['/soon/donate', 'PayPal से दान करें'],
  ['/soon/payout', 'अभिभावक को भुगतान'], ['/soon/impact', 'असर का सार्वजनिक बहीखाता'],
  ['/soon/ngo', 'NGO और मेंटर डैशबोर्ड'], ['/soon/seedlings', 'छोटे सबक। बढ़ता बगीचा।'],
  ['/soon/hindi', 'हर जगह हिंदी'], ['/soon/classroom', 'कक्षा और ऑफ़लाइन मोड'],
  ['/soon/certificates', 'सीखने के प्रमाणपत्र'], ['/not-a-page', 'यह पेज नहीं मिला।'],
]) {
  test(`Hindi route and phone layout: ${route}`, async ({ page }) => {
    await page.goto('/'); await choose(page, 'hi'); await page.goto(route);
    await expect(page.locator('main h1')).toContainText(title);
    await expect(page.locator('.site-header .language-switch button[lang="hi"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('main')).not.toContainText(/\{\d+\}/);
  });
}

test('lesson switch updates the website and keeps selected answers; validation is Hindi', async ({ page }) => {
  await page.goto('/soon/seedlings');
  const choice = page.locator('input[name="needs-0"][value="need"]');
  await choice.check(); await choose(page, 'hi');
  await expect(choice).toBeChecked();
  await page.locator('.seedlings-submit').click();
  await expect(page.getByRole('alert')).toContainText('पहले हर तस्वीर का जवाब चुनें');
  await expect(page.locator('fieldset').nth(1)).toBeFocused();
  await page.getByRole('group', { name: 'सबक की भाषा' }).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(choice).toBeChecked();
});

test('switching preserves calculator choices and sends the next mentor question in Hindi', async ({ page }) => {
  const requests = [];
  await page.route('**/api/health', (route) => route.fulfill({ json: { ok: true, mentor: { aiConfigured: true } } }));
  await page.route('**/api/mentor/chat', (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/x-ndjson', body: [
      { type: 'start', source: 'ai', flagged: false }, { type: 'delta', text: 'थोड़ी बचत करें।' }, { type: 'done', suggestions: [] },
    ].map(JSON.stringify).join('\n') + '\n' });
  });
  await page.goto('/app');
  await page.locator('[data-present="goal-headphones"]').click();
  await page.locator('[data-present="monthly-500"]').click();
  await choose(page, 'hi');
  await expect(page.locator('[data-present="goal-headphones"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.goal-eta')).toContainText('महीने');
  await page.locator('#mentor-input').fill('बचत कैसे करूँ?');
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator('.chat-log')).toContainText('थोड़ी बचत करें।');
  expect(requests[0]).toMatchObject({ language: 'hi', context: { goal: { label: 'Headphones', monthly: 500 } } });
  await choose(page, 'en');
  await expect(page.locator('.chat-log .bubble-mentor[lang="hi"]')).toContainText('थोड़ी बचत करें।');
});

test.describe('translated API errors', () => {
  test.use({ expectedConsoleErrors: [/Failed to load resource.*403/] });
  test('guardian form and an existing error translate without submitting again', async ({ page }) => {
    let submitted = 0;
    await page.route('**/api/guardian/status?learner=A12', (route) => route.fulfill({ json: {
      configured: true, demoOpenAccess: false, consent: { learner: 'A12', status: 'pending', revision: 1 },
    } }));
    await page.route('**/api/guardian/permission', (route) => {
      submitted++; return route.fulfill({ status: 403, json: { error: 'wrong_pin', message: 'That guardian PIN is not correct.' } });
    });
    await page.goto('/soon/safety');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await page.getByLabel('Guardian PIN', { exact: true }).fill('wrong-test-pin');
    await page.getByRole('button', { name: 'Record demo permission', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('That guardian PIN is not correct.');
    await choose(page, 'hi');
    await expect(page.getByRole('alert')).toContainText('अभिभावक का PIN सही नहीं है');
    expect(submitted).toBe(1);
  });
});

test('presentation language and site language share the same setting', async ({ page }) => {
  await page.goto('/'); await choose(page, 'hi');
  await page.locator('.tour-launcher').click();
  await expect(page.locator('.tour-panel')).toContainText('खुद प्रस्तुत करें');
  await page.locator('.tour-panel').getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toContainText('Money skills');
});

test('language works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.goto('/'); await choose(page, 'hi');
  await expect(page.locator('h1')).toContainText('पैसों की समझ');
});
