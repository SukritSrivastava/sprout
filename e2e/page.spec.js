// Page-wide checks: it loads, it fits the screen, navigation and accessibility basics work.
import { test, expect, isPhone } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads with the right title and headline', async ({ page }) => {
  await expect(page).toHaveTitle(/Sprout/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Small earnings.');
});

test('never scrolls sideways', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('every section the tour visits exists once', async ({ page }) => {
  for (const id of ['home', 'earn', 'jars', 'grow', 'mentor', 'trust', 'start']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('skip link is the first thing keyboard users reach', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'keyboard navigation is a desktop concern');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main');
});

test('header links point at their sections', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'phone navigation is covered in phone.spec.js');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#earn');
  await expect(nav.getByRole('link', { name: 'The four jars' })).toHaveAttribute('href', '#jars');
  await expect(nav.getByRole('link', { name: 'Built on trust' })).toHaveAttribute('href', '#trust');
  await nav.getByRole('link', { name: 'The four jars' }).click();
  await expect(page).toHaveURL(/#jars$/);
  await expect(page.locator('#jars')).toBeInViewport();
});

test('motion toggle switches reduced motion on and off', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'the toggle is hidden below 1150px; the OS setting applies instead');
  const toggle = page.getByRole('button', { name: /Motion (on|off)/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'false');
});

test('follows the operating system reduced-motion setting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
});
