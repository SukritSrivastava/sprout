// Site-wide checks: both pages load, fit the screen, link together, and respect motion settings.
import { test, expect, isPhone } from './fixtures.js';

for (const path of ['/', '/app']) {
  test(`${path} never scrolls sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('home page has its headline and every section', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Sprout/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Money skills');
  for (const id of ['home', 'how', 'meet-mentor', 'trust', 'soon']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.locator('.soon-row')).toHaveCount(5);
  await expect(page.locator('.stamp')).toHaveCount(5);
});

test('demo page has every section', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This is your Sprout');
  for (const id of ['earn', 'jars', 'grow', 'mentor', 'withdraw']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('"Open the demo" goes to /app and "Home" comes back', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero').getByRole('link', { name: 'Open the demo' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This is your Sprout');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Money skills');
});

// Regression test: with motion off, page switches used to get stuck on the old page.
test('switching pages works with motion off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('.hero').getByRole('link', { name: 'Open the demo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This is your Sprout');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Money skills');
});

test('switching pages still animates after motion is turned off and on again', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'the toggle is hidden on small screens');
  await page.goto('/app');
  const toggle = page.getByRole('button', { name: /Motion (on|off)/ });
  await toggle.click();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'false');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Money skills');
});

test('the tour button slides away while scrolling down and returns on scroll up', async ({ page }) => {
  await page.goto('/');
  const launcher = page.getByRole('button', { name: 'Start the guided tour' });
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 1500);
  await expect(launcher).toHaveCSS('pointer-events', 'none');
  // Smooth scrolling keeps gliding for a moment; wait until the page has stopped moving,
  // like a person who has finished scrolling down and then scrolls back up.
  await expect
    .poll(async () => {
      const before = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(200);
      return before === (await page.evaluate(() => window.scrollY));
    })
    .toBe(true);
  await page.mouse.wheel(0, -400);
  await expect(launcher).toHaveCSS('pointer-events', 'auto');
});

test('"Try it in the demo" opens the demo at the mentor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it in the demo' }).click();
  await expect(page).toHaveURL(/\/app#mentor$/);
  await expect(page.locator('#mentor h2')).toBeInViewport();
});

test('opening a #section link directly lands on it', async ({ page }) => {
  await page.goto('/app#grow');
  await expect(page.locator('#grow h2')).toBeInViewport();
});

test('unknown pages show a friendly 404 with a way home', async ({ page }) => {
  await page.goto('/nowhere');
  await expect(page.getByRole('heading', { name: 'This page didn’t sprout.' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the home page' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('skip link is the first thing keyboard users reach', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'keyboard navigation is a desktop concern');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main');
});

test('header links glide to their sections on the home page', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'phone navigation is covered in phone.spec.js');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const [name, id] of [
    ['How it works', 'how'],
    ['Mentor', 'meet-mentor'],
  ]) {
    await nav.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id} h2`)).toBeInViewport();
  }
});

test('header links from the demo page go back to home sections', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'phone navigation is covered in phone.spec.js');
  await page.goto('/app');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/\/#how$/);
  await expect(page.locator('#how h2')).toBeInViewport();
});

test('motion toggle switches animations and smooth scrolling off and on', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'the toggle is hidden on small screens; the OS setting applies');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Motion (on|off)/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'false');
  await expect(page.locator('html')).toHaveClass(/lenis/);
});

test('follows the operating system reduced-motion setting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});

test('body text is large enough to read on a projector', async ({ page }) => {
  for (const path of ['/', '/app']) {
    await page.goto(path);
    const share = await page.evaluate(() => {
      let small = 0;
      let total = 0;
      const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (!text || node.parentElement.closest('[aria-hidden="true"], svg')) continue;
        total += text.length;
        if (parseFloat(getComputedStyle(node.parentElement).fontSize) < 14) small += text.length;
      }
      return small / total;
    });
    expect(share, `share of text under 14px on ${path}`).toBe(0);
  }
});
