// Sprout's guided tour across the home page, demo and previews. A fake clock lets the whole
// tour play in moments instead of 1½ minutes.
import { test, expect, isPhone } from './fixtures.js';
import { tourSteps, tourDuration } from '../client/src/lib/tour.js';

const panel = (page) => page.getByRole('complementary', { name: 'Sprout guided tour' });
const heading = (page) => panel(page).getByRole('heading');
const launcher = (page) => page.getByRole('button', { name: 'Start the guided tour' });
// The address a step should show. Home-page steps look like "/#how".
const addressOf = (step) => new RegExp(`${step.path === '/' ? '' : step.path}#${step.id}$`);

test('opens on the first step, focuses Close, and Escape returns focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(heading(page)).toHaveText(tourSteps[0].en.title);
  await expect(page.getByRole('button', { name: 'Close tour' })).toBeFocused();
  await expect(launcher(page)).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  if (!isPhone(testInfo)) await expect(launcher(page)).toBeFocused();
});

test('captions switch between English and Hindi', async ({ page }) => {
  await page.goto('/');
  await launcher(page).click();
  await panel(page).getByRole('button', { name: 'हिंदी' }).click();
  await expect(heading(page)).toHaveText(tourSteps[0].hi.title);
  await panel(page).getByRole('button', { name: 'English' }).click();
  await expect(heading(page)).toHaveText(tourSteps[0].en.title);
});

test('next moves to the demo page, previous comes back, fast clicks never skip', async ({ page }) => {
  await page.goto('/');
  await launcher(page).click();
  const next = page.getByRole('button', { name: 'Next tour step' });
  const previous = page.getByRole('button', { name: 'Previous tour step' });
  await expect(previous).toBeDisabled();

  await next.click();
  await next.click();
  await next.click();
  const step = tourSteps[3];
  await expect(heading(page)).toHaveText(step.en.title);
  await expect(page).toHaveURL(addressOf(step));
  await expect(page.locator(`#${step.id}`)).toHaveClass(/tour-target/);

  await previous.click();
  await expect(heading(page)).toHaveText(tourSteps[2].en.title);
  await expect(page).toHaveURL(addressOf(tourSteps[2]));
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

test('plays every step on the right page and finishes', async ({ page }) => {
  // Reduced motion turns off idle animations and smooth scrolling, so fast-forwarding the tour
  // doesn't have to compute thousands of animation frames. The tour's timing is the same.
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await launcher(page).click();
  // Under a fake clock we check what changes the instant a step starts: the step counter, the
  // page address and the highlighted section. (Caption text animates in; other tests check it.)
  const counter = page.locator('.tour-step-count');
  await page.clock.runFor(3000);
  for (const [i, step] of tourSteps.entries()) {
    await expect(counter).toHaveText(`Step ${i + 1} of ${tourSteps.length}`);
    await expect(page).toHaveURL(addressOf(step));
    await expect(page.locator(`#${step.id}`)).toHaveClass(/tour-target/);
    await page.clock.runFor(step.seconds * 1000);
  }
  await expect(counter).toHaveText('Done');
  await expect(page.locator('.tour-time')).toHaveText(`${tourDuration} / ${tourDuration}s`);

  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(counter).toHaveText(`Step 1 of ${tourSteps.length}`);
});

test('every tour entry point opens the tour', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Take the 1½-minute tour', 'Tour with Sprout', 'Start the guided tour']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(panel(page)).toBeVisible();
    await page.getByRole('button', { name: 'Close tour' }).click();
    await expect(panel(page)).toBeHidden();
  }
});
