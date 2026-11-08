// Picture lessons, honest saves, language, speech lifecycle and direct feature navigation.
import { test, expect, isPhone } from '../support/fixtures.js';
test.use({ expectedConsoleErrors: [/Failed to load resource:.*422/] });

const answers = { needs: ['need', 'need', 'need', 'need', 'want', 'want'], waiting: ['save', 'wait'], sharing: ['ask', 'share'] };
async function fakeGarden(page, { failLoad = false, failSave = false, lostReply = false } = {}) {
  const completed = [];
  const garden = () => ({ completed, seeds: completed.length, totalLessons: 3 });
  let requests = 0;
  await page.route(/\/api\/seedlings(?:\/complete)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      if (failLoad) return route.fulfill({ status: 503, json: { error: 'learning_records_unavailable' } });
      return route.fulfill({ json: { garden: garden() } });
    }
    requests++;
    if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: 'learning_records_unavailable' } }); }
    const body = route.request().postDataJSON();
    const incorrect = answers[body.lessonId].flatMap((id, index) => id === body.answers[index] ? [] : [index]);
    if (incorrect.length) return route.fulfill({ status: 422, json: { error: 'lesson_incomplete', incorrect } });
    const alreadyCompleted = completed.some((item) => item.lessonId === body.lessonId);
    if (!alreadyCompleted) completed.push({ lessonId: body.lessonId, completedAt: new Date().toISOString() });
    if (lostReply) { lostReply = false; return route.abort('failed'); }
    return route.fulfill({ json: { garden: garden(), alreadyCompleted } });
  });
  return { requests: () => requests, allowLoad: () => { failLoad = false; } };
}
async function answer(page, id = 'needs') {
  for (const [index, value] of answers[id].entries()) await page.locator(`input[name="${id}-${index}"][value="${value}"]`).check();
}
const submit = (page) => page.locator('.seedlings-submit');

test('three lessons grow a saved garden; practice and reload never duplicate seeds', async ({ page }) => {
  await fakeGarden(page); await page.goto('/soon/seedlings');
  await expect(page.getByRole('note')).toContainText('shared sample garden');
  await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted');
  await answer(page); await submit(page).click();
  await expect(page.getByTestId('seed-count')).toHaveText('1 of 3 seeds planted');
  await submit(page).click(); await expect(page.getByRole('status')).toContainText('already in your garden');
  for (const [id, title, count] of [['waiting', 'A little patience', 2], ['sharing', 'A little kindness', 3]]) {
    await page.getByRole('button', { name: new RegExp(title) }).click(); await answer(page, id); await submit(page).click();
    await expect(page.getByTestId('seed-count')).toHaveText(`${count} of 3 seeds planted`);
  }
  await page.reload(); await expect(page.getByTestId('seed-count')).toHaveText('3 of 3 seeds planted');
  await expect(page.locator('.seedlings-plot.planted')).toHaveCount(3);
});

test('missing and incorrect answers give focus and correction without a seed', async ({ page }) => {
  await fakeGarden(page); await page.goto('/soon/seedlings');
  await submit(page).click(); await expect(page.getByRole('alert')).toContainText('every picture');
  await expect(page.locator('fieldset').first()).toBeFocused();
  await answer(page); await page.locator('input[name="needs-4"][value="need"]').check(); await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('highlighted pictures');
  await expect(page.locator('fieldset').nth(4)).toBeFocused();
  await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted');
  await page.locator('input[name="needs-4"][value="want"]').check(); await submit(page).click();
  await expect(page.getByTestId('seed-count')).toHaveText('1 of 3 seeds planted');
});

test.describe('recoverable server failures', () => {
  test.use({ expectedConsoleErrors: [/Failed to load resource|net::ERR_FAILED/] });
  test('failed load retries; failed save preserves answers and awards only after retry', async ({ page }) => {
    const fake = await fakeGarden(page, { failLoad: true, failSave: true }); await page.goto('/soon/seedlings');
    await expect(page.getByRole('alert')).toContainText('couldn’t load'); fake.allowLoad();
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await answer(page); await submit(page).click(); await expect(page.getByRole('alert')).toContainText('couldn’t confirm');
    await expect(page.locator('input[value="want"]:checked')).toHaveCount(2);
    await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted');
    await submit(page).click(); await expect(page.getByTestId('seed-count')).toHaveText('1 of 3 seeds planted');
  });
  test('a lost save reply is safely retried without duplicate seeds', async ({ page }) => {
    await fakeGarden(page, { lostReply: true }); await page.goto('/soon/seedlings'); await answer(page); await submit(page).click();
    await expect(page.getByRole('alert')).toContainText('couldn’t confirm'); await submit(page).click();
    await expect(page.getByTestId('seed-count')).toHaveText('1 of 3 seeds planted');
    await expect(page.getByRole('status')).toContainText('already in your garden');
  });
});

test('Hindi lesson copy, validation and preference survive reload at phone width', async ({ page }) => {
  await fakeGarden(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/soon/seedlings');
  await page.locator('.seedlings-toolbar').getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await expect(page.locator('.seedlings-page')).toHaveAttribute('lang', 'hi');
  await submit(page).click(); await expect(page.getByRole('alert')).toContainText('पहले हर तस्वीर');
  await answer(page); await submit(page).click(); await expect(page.getByTestId('seed-count')).toHaveText('3 में से 1 बीज लगाए');
  await page.reload(); await expect(page.locator('.seedlings-toolbar').getByRole('button', { name: 'हिन्दी', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('speech uses the lesson language and stops on changes and navigation', async ({ page }) => {
  await page.addInitScript(() => {
    window.__speech = { spoken: [], cancelled: 0 };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() { window.__speech.cancelled++; }, getVoices() { return []; },
      speak(speech) { window.__speech.spoken.push({ text: speech.text, lang: speech.lang }); },
    } });
  });
  await fakeGarden(page); await page.goto('/soon/seedlings');
  await page.getByRole('button', { name: 'Read this lesson to me', exact: true }).click();
  await page.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await page.locator('.seedlings-toolbar').getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await page.getByRole('button', { name: 'यह सबक सुनाएँ', exact: true }).click();
  expect(await page.evaluate(() => window.__speech.spoken.map((speech) => speech.lang))).toEqual(['en-IN', 'hi-IN']);
  const before = await page.evaluate(() => window.__speech.cancelled);
  await page.getByRole('button', { name: /थोड़ा सा इंतज़ार/ }).click();
  expect(await page.evaluate(() => window.__speech.cancelled)).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'यह सबक सुनाएँ', exact: true }).click();
  const exiting = await page.evaluate(() => window.__speech.cancelled);
  await page.locator('.seedlings-page').getByRole('link').first().click(); await expect(page).toHaveURL(/\/soon$/);
  await expect.poll(() => page.evaluate(() => window.__speech.cancelled)).toBeGreaterThan(exiting);
});

test('read-aloud unavailable keeps lessons usable; radio controls work by keyboard', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); });
  await fakeGarden(page); await page.goto('/soon/seedlings');
  await expect(page.getByText('Read-aloud isn’t available on this device. You can still use every lesson.')).toBeVisible();
  const radio = page.locator('input[name="needs-0"]').first(); await radio.focus(); await page.keyboard.press('Space'); await expect(radio).toBeChecked();
});

test('top menu opens every working feature with honest status labels', async ({ page }, info) => {
  await fakeGarden(page); await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const [id, label, status] of [['seedlings', 'Seedlings', 'Saved learning garden'], ['donate', 'Donate', 'PayPal sandbox'], ['payout', 'Payouts', 'PayPal sandbox'], ['impact', 'Impact ledger', 'Test blockchain'], ['ngo', 'NGO workspace', 'Sample demo']]) {
    if (isPhone(info)) await page.getByRole('button', { name: 'Open navigation' }).click();
    const link = nav.getByRole('link', { name: `${label} ${status}`, exact: true });
    await expect(link).toBeVisible(); await link.click(); await expect(page).toHaveURL(new RegExp(`/soon/${id}$`));
    await expect(page.locator(`#site-navigation a[href="/soon/${id}"]`)).toHaveAttribute('aria-current', 'page');
    if (isPhone(info)) await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
