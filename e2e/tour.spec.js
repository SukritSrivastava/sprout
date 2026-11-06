// Silent manual/automatic presentation, cursor actions, gaze and cleanup on desktop and phone.
import { test, expect, isPhone } from './fixtures.js';
import { tourSteps, tourDuration } from '../client/src/lib/tour.js';

const panel = (page) => page.getByRole('complementary', { name: 'Sprout guided tour' });
const heading = (page) => panel(page).getByRole('heading');
const launcher = (page) => page.getByRole('button', { name: 'Start the guided tour' });
const cursor = (page) => page.getByTestId('presentation-cursor');
const addressOf = (step) => new RegExp(`${step.path === '/' ? '' : step.path}#${step.id}$`);
async function start(page, mode = 'manual') {
  await launcher(page).click();
  await page.getByRole('button', { name: mode === 'manual' ? 'Present manually' : 'Present automatically', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-mode', mode);
}
const next = (page) => page.getByRole('button', { name: 'Next tour step' });
const expand = (page) => page.getByRole('button', { name: 'Expand presentation controls', exact: true }).click();

test('opens a silent choice, focuses Close, and Escape restores focus', async ({ page }, info) => {
  await page.goto('/'); await launcher(page).click();
  await expect(panel(page)).toHaveAttribute('data-mode', 'choose');
  await expect(heading(page)).toHaveText('Present sprout.io');
  await expect(page.getByRole('button', { name: 'Present manually', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Present automatically', exact: true })).toBeVisible();
  await expect(panel(page)).toContainText('Silent demo');
  await expect(page.getByRole('button', { name: 'Close tour' })).toBeFocused();
  await expect(launcher(page)).toBeHidden(); await expect(cursor(page)).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(panel(page)).toBeHidden();
  if (!isPhone(info)) await expect(launcher(page)).toBeFocused();
});

test('opening the chooser does not navigate or start playback before a choice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/app');
  const before = page.url(); await launcher(page).click(); await page.clock.runFor(20_000);
  await expect(page).toHaveURL(before); await expect(panel(page)).toHaveAttribute('data-mode', 'choose');
  await expect(page.locator('.tour-target')).toHaveCount(0); await expect(cursor(page)).toHaveCount(0);
});

test('manual mode waits for the speaker; fast next/previous controls stay in order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page);
  await page.clock.runFor(30_000); await expect(heading(page)).toHaveText(tourSteps[0].en.title);
  await expect(page.getByRole('button', { name: 'Previous tour step' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await expect(cursor(page)).toHaveCount(0);
  for (let i = 0; i < 3; i++) await next(page).click();
  await expect(heading(page)).toHaveText(tourSteps[3].en.title); await expect(page).toHaveURL(addressOf(tourSteps[3]));
  await expect(page.locator('#jars')).toHaveClass(/tour-target/);
  await page.getByRole('button', { name: 'Previous tour step' }).click();
  await expect(heading(page)).toHaveText(tourSteps[2].en.title);
  await expect(page.locator('[data-present="earn"]')).toBeEnabled();
});

test('captions and presentation choices switch between English and Hindi', async ({ page }) => {
  await page.goto('/'); await launcher(page).click();
  await panel(page).getByRole('button', { name: 'हिंदी', exact: true }).click();
  await expect(page.getByRole('button', { name: 'खुद प्रस्तुत करें', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'खुद प्रस्तुत करें', exact: true }).click();
  await expect(heading(page)).toHaveText(tourSteps[0].hi.title);
  await panel(page).getByRole('button', { name: 'English', exact: true }).click();
  await expect(heading(page)).toHaveText(tourSteps[0].en.title);
});

test('automatic pause freezes time and cursor; manual takeover stops both', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page, 'auto');
  await page.clock.runFor(2_000); await expect(cursor(page)).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.locator('.tour-time').textContent();
  const transform = await cursor(page).getAttribute('style');
  await page.clock.runFor(12_000); await expect(page.locator('.tour-time')).toHaveText(time);
  await expect(cursor(page)).toHaveAttribute('style', transform);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1_000); await expect(page.locator('.tour-time')).not.toHaveText(time);
  const counter = await page.locator('.tour-step-count').textContent();
  await expand(page);
  await panel(page).getByRole('button', { name: 'Manual', exact: true }).click();
  await expect(cursor(page)).toHaveCount(0); await expect(page.locator('[data-following-cursor="true"]')).toHaveCount(0);
  await page.clock.runFor(20_000); await expect(page.locator('.tour-step-count')).toHaveText(counter);
  await panel(page).getByRole('button', { name: 'Automatic', exact: true }).click();
  await page.clock.runFor(500); await expect(cursor(page)).toBeVisible();
});

test('automatic cursor demonstrates only sample earning, jar and goal controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page, 'auto');
  await expand(page);
  await next(page).click(); await next(page).click(); await page.clock.runFor(6_000);
  await expect(page.locator('[data-present="earn"]')).toBeDisabled();
  await expect(page.locator('.activity-done')).toBeVisible();
  await next(page).click(); await page.clock.runFor(7_000);
  await expect(page.locator('#save-split')).toHaveValue('65');
  await next(page).click(); await page.clock.runFor(7_000);
  await expect(page.locator('[data-present="goal-headphones"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-present="monthly-500"]')).toHaveAttribute('aria-pressed', 'true');
});

test('reference cursor moves and mascot eyes point toward it, then reset on close', async ({ page }) => {
  await page.goto('/'); await start(page, 'auto'); await expect(cursor(page)).toBeVisible();
  const first = await cursor(page).getAttribute('style');
  await expect.poll(() => cursor(page).getAttribute('style')).not.toBe(first);
  const gaze = panel(page).locator('.mascot-gaze');
  await expect(panel(page).locator('.mascot')).toHaveAttribute('data-following-cursor', 'true');
  await expect.poll(async () => gaze.evaluate((element) => {
    const transform = new DOMMatrix(getComputedStyle(element).transform);
    return Math.abs(transform.m41) + Math.abs(transform.m42);
  })).toBeGreaterThan(0.2);
  const direction = await page.evaluate(() => {
    const mascot = document.querySelector('.tour-panel .mascot').getBoundingClientRect();
    const point = document.querySelector('.presentation-cursor').getBoundingClientRect();
    const eye = new DOMMatrix(getComputedStyle(document.querySelector('.tour-panel .mascot-gaze')).transform);
    return { actual: Math.sign(eye.m42), expected: Math.sign(point.top + 12 - (mascot.top + mascot.height * (64 / 110))) };
  });
  expect(direction.actual).toBe(direction.expected);
  await page.getByRole('button', { name: 'Stop presentation', exact: true }).click();
  await expect(cursor(page)).toHaveCount(0); await expect(page.locator('[data-following-cursor="true"]')).toHaveCount(0);
  await expect(page.locator('.presentation-focus, .tour-target')).toHaveCount(0);
});

test('hidden tabs pause automatic playback and require a deliberate resume', async ({ page }) => {
  await page.goto('/'); await start(page, 'auto');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('automatic presentation visits every working feature with no audio or API writes', async ({ page }) => {
  test.setTimeout(90_000);
  const writes = [];
  await page.addInitScript(() => {
    window.__demoAudio = 0;
    HTMLMediaElement.prototype.play = () => { window.__demoAudio++; return Promise.resolve(); };
    if (window.speechSynthesis) window.speechSynthesis.speak = () => { window.__demoAudio++; };
  });
  await page.route('**/api/**', (route) => {
    if (route.request().method() === 'POST') { writes.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'presentation_must_not_write' } }); }
    return route.fallback();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page, 'auto');
  await page.clock.runFor(1000);
  for (const [i, step] of tourSteps.entries()) {
    await expect(page.locator('.tour-step-count')).toHaveText(`Step ${i + 1} of ${tourSteps.length}`);
    await expect(page).toHaveURL(addressOf(step));
    const target = step.path.startsWith('/soon/') ? page.locator(`[data-preview="${step.path.split('/').at(-1)}"]`) : page.locator(`#${step.id}`);
    await expect(target).toHaveClass(/tour-target/);
    await page.clock.runFor(step.seconds * 1000 + 150);
  }
  await page.clock.runFor(1000);
  await expect(page.locator('.tour-step-count')).toHaveText('Done');
  await expect(page.locator('.tour-time')).toHaveText(`${tourDuration} / ${tourDuration}s`);
  await expect(cursor(page)).toHaveCount(0); expect(writes).toEqual([]);
  expect(await page.evaluate(() => window.__demoAudio)).toBe(0);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.tour-step-count')).toHaveText(`Step 1 of ${tourSteps.length}`);
});

test('manual keyboard navigation and mode controls fit a narrow screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await start(page);
  await panel(page).focus(); await page.keyboard.press('ArrowRight');
  await expect(heading(page)).toHaveText(tourSteps[1].en.title);
  await panel(page).focus(); await page.keyboard.press('ArrowLeft');
  await expect(heading(page)).toHaveText(tourSteps[0].en.title);
  const box = await panel(page).boundingBox(); const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('every tour entry point opens the mode chooser and reopening resets it', async ({ page }) => {
  for (const name of ['Take the 2-minute tour', 'Tour with Sprout', 'Start the guided tour']) {
    // The floating launcher deliberately tucks away after scrolling down to the footer.
    // Start each independent entry-point check at the top, as the launcher is presented there.
    await page.goto('/');
    await page.getByRole('button', { name, exact: true }).click();
    await expect(panel(page)).toHaveAttribute('data-mode', 'choose');
    await page.getByRole('button', { name: 'Close tour' }).click(); await expect(panel(page)).toBeHidden();
  }
});

test('manual presentation leaves native learning controls in the speaker’s hands', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await start(page);
  for (let i = 0; i < 3; i++) await next(page).click();
  const slider = page.locator('#save-split');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('55');
  await expect(page.locator('.tour-step-count')).toHaveText(`Step 4 of ${tourSteps.length}`);
});

test('closing before an automatic sample action cancels it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page, 'auto');
  await expand(page);
  await next(page).click(); await next(page).click();
  await expect(page.locator('[data-present="earn"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Close tour' }).click(); await page.clock.runFor(8_000);
  await expect(page.locator('[data-present="earn"]')).toBeEnabled(); await expect(cursor(page)).toHaveCount(0);
});

test('autoplay minimises by default with small pause and stop controls at the bottom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await start(page, 'auto');
  await expect(panel(page)).toHaveAttribute('data-minimized', 'true');
  await expect(panel(page).locator('.tour-body, .tour-top, .tour-mode-switch')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop presentation', exact: true })).toBeVisible();
  const box = await panel(page).boundingBox(); const viewport = page.viewportSize();
  expect(box.height).toBeLessThanOrEqual(76); expect(box.y).toBeGreaterThan(viewport.height - 100);
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Stop presentation', exact: true }).click();
  await expect(panel(page)).toHaveCount(0); await expect(cursor(page)).toHaveCount(0);
});

test('expand and minimise preserve pause state and focus without restarting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await page.goto('/'); await start(page, 'auto');
  await page.clock.runFor(1500); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.locator('.tour-time').textContent();
  await expand(page); await expect(panel(page)).toHaveAttribute('data-minimized', 'false');
  await expect(page.getByRole('button', { name: 'Minimise presentation controls', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.clock.runFor(4000); await expect(page.locator('.tour-time')).toHaveText(time);
  await page.getByRole('button', { name: 'Minimise presentation controls', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-minimized', 'true');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
  await page.clock.runFor(4000); await expect(page.locator('.tour-time')).toHaveText(time);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(1000);
  await expect(page.locator('.tour-time')).not.toHaveText(time);
});
