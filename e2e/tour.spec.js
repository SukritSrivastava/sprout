// Clicky's guided tour. A fake clock lets the 75-second tour finish in milliseconds.
import { test, expect, isPhone } from './fixtures.js';
import { tourSteps, tourDuration } from '../client/src/lib/model.js';

const panel = (page) => page.getByRole('complementary', { name: 'Sprout guided tour' });
const launcher = (page) =>
  page.getByRole('button', { name: 'Explain me: start the 75-second website tour' });

test('opens on the first step, focuses Close, and Escape returns focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole('heading')).toHaveText(tourSteps[0].title);
  await expect(page.getByRole('button', { name: 'Close tour' })).toBeFocused();
  await expect(launcher(page)).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  if (!isPhone(testInfo)) await expect(launcher(page)).toBeFocused();
});

test('next and previous move between steps, and fast clicks never skip', async ({ page }) => {
  await page.goto('/');
  await launcher(page).click();
  const next = page.getByRole('button', { name: 'Next tour step' });
  const previous = page.getByRole('button', { name: 'Previous tour step' });
  await expect(previous).toBeDisabled();

  await next.click();
  await next.click();
  await next.click();
  await expect(panel(page).getByRole('heading')).toHaveText(tourSteps[3].title);
  await expect(page.locator(`#${tourSteps[3].id}`)).toHaveClass(/tour-target/);

  await previous.click();
  await expect(panel(page).getByRole('heading')).toHaveText(tourSteps[2].title);
});

test('pause stops the clock and resume continues it', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await launcher(page).click();
  await page.clock.runFor(3_000);
  await page.getByRole('button', { name: 'Pause' }).click();
  const time = page.locator('.tour-time');
  const paused = await time.textContent();
  await page.clock.runFor(10_000);
  await expect(time).toHaveText(paused);

  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(2_000);
  await expect(time).not.toHaveText(paused);
});

test('plays through every step and finishes at 75 seconds, then replays', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await launcher(page).click();
  // Check each step half a second after it starts, safely away from the step boundaries.
  await page.clock.runFor(500);
  for (const step of tourSteps) {
    await expect(panel(page).getByRole('heading')).toHaveText(step.title);
    await page.clock.runFor(step.seconds * 1000);
  }
  await expect(panel(page).getByRole('heading')).toHaveText('You’re ready to grow.');
  await expect(page.locator('.tour-time')).toHaveText(`${tourDuration} / ${tourDuration}s`);

  await page.getByRole('button', { name: 'Replay ↻' }).click();
  await expect(panel(page).getByRole('heading')).toHaveText(tourSteps[0].title);
});

test('voice toggle switches on and off', async ({ page }) => {
  await page.goto('/');
  await launcher(page).click();
  const voice = page.getByRole('button', { name: /Voice (on|off)/ });
  test.skip(await voice.isDisabled(), 'this browser has no speech engine');
  await voice.click();
  await expect(voice).toHaveAttribute('aria-pressed', 'true');
  await voice.click();
  await expect(voice).toHaveAttribute('aria-pressed', 'false');
});

test('every tour entry point opens the tour', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Explain me 75 sec', 'Take the 75-second tour ↗', 'Meet Clicky ↗']) {
    await page.getByRole('button', { name }).click();
    await expect(panel(page)).toBeVisible();
    await page.getByRole('button', { name: 'Close tour' }).click();
    await expect(panel(page)).toBeHidden();
  }
});
