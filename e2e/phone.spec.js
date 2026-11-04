// Phone-only behaviour: the collapsible menu.
import { test, expect, isPhone } from './fixtures.js';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'the menu button only exists on small screens');
  await page.goto('/');
});

test('menu opens, navigates, and closes itself', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'The four jars' })).toBeHidden();

  await toggle.click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await nav.getByRole('link', { name: 'The four jars' }).click();
  await expect(page).toHaveURL(/#jars$/);
  await expect(nav.getByRole('link', { name: 'The four jars' })).toBeHidden();
});

test('Escape closes the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
