// Sprout's guided tour across both pages. A fake clock lets the 75-second tour finish in moments.
import { test, expect, isPhone } from './fixtures.js';
import { tourSteps, tourDuration } from '../client/src/lib/model.js';

const panel = (page) => page.getByRole('complementary', { name: 'Sprout guided tour' });
const heading = (page) => panel(page).getByRole('heading');
const launcher = (page) => page.getByRole('button', { name: 'Start the 75-second tour' });

test('opens on the first step, focuses Close, and Escape returns focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(heading(page)).toHaveText(tourSteps[0].title);
  await expect(page.getByRole('button', { name: 'Close tour' })).toBeFocused();
  await expect(launcher(page)).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  if (!isPhone(testInfo)) await expect(launcher(page)).toBeFocused();
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
  await expect(heading(page)).toHaveText(step.title);
  await expect(page).toHaveURL(new RegExp(`${step.path}#${step.id}$`));
  await expect(page.locator(`#${step.id}`)).toHaveClass(/tour-target/);

  await previous.click();
  await expect(heading(page)).toHaveText(tourSteps[2].title);
  await expect(page).toHaveURL(new RegExp(`/#${tourSteps[2].id}$`));
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

test('plays every step on the right page and finishes at 75 seconds', async ({ page }) => {
  // Reduced motion turns off idle animations and smooth scrolling, so fast-forwarding 75 seconds
  // doesn't have to compute thousands of animation frames. The tour's timing is the same.
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await launcher(page).click();
  // Under a fake clock we check what changes the instant a step starts: the step counter, the
  // page address and the highlighted section. (Caption text animates in; the next/previous test
  // checks captions in real time.) Each check is 3 seconds into its step, well clear of edges.
  const counter = page.locator('.tour-step-count');
  await page.clock.runFor(3000);
  for (const [i, step] of tourSteps.entries()) {
    await expect(counter).toHaveText(`Step ${i + 1} of ${tourSteps.length}`);
    await expect(page).toHaveURL(new RegExp(`${step.path === '/' ? '' : step.path}#${step.id}$`));
    await expect(page.locator(`#${step.id}`)).toHaveClass(/tour-target/);
    await page.clock.runFor(step.seconds * 1000);
  }
  await expect(counter).toHaveText('Done');
  await expect(page.locator('.tour-time')).toHaveText(`${tourDuration} / ${tourDuration}s`);

  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(counter).toHaveText(`Step 1 of ${tourSteps.length}`);
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
  for (const name of ['Take the 75-second tour', 'Tour with Sprout', 'Start the 75-second tour']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(panel(page)).toBeVisible();
    await page.getByRole('button', { name: 'Close tour' }).click();
    await expect(panel(page)).toBeHidden();
  }
});
