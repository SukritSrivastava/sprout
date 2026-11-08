// The working NGO dashboard, on desktop and phone: real interactions, clear errors, motion safety.
import { readFile } from 'node:fs/promises';
import { test, expect } from '../support/fixtures.js';
import { fakeNgo, openNgo } from './fixtures.js';

test.describe('NGO workspace', () => {
  test.use({ expectedConsoleErrors: [/status of (401|403|503)/] });

  test('PIN unlock, saved reviews, filters, jars, CSV download and locking', async ({ page }) => {
    // Keep this long data-integrity flow deterministic; the other interaction tests run
    // with motion enabled, and the dedicated accessibility test verifies motion-off behavior.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fakeNgo(page); await page.goto('/soon/ngo');
    await expect(page.getByRole('note')).toContainText('Sample workspace');
    await page.getByLabel('Your staff PIN').fill('wrong');
    await page.getByRole('button', { name: 'Open workspace', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('not right');
    await page.getByLabel('Your staff PIN').fill('mentor-test-123');
    await page.getByRole('button', { name: 'Open workspace', exact: true }).click();
    await expect(page.getByTestId('ngo-pool')).toContainText('$37');
    await page.getByRole('button', { name: /Review queue/ }).click();
    await page.getByRole('button', { name: 'Approve: Reading hour at the learning centre' }).click();
    await expect(page.getByTestId('ngo-credits')).toContainText('200');
    await expect(page.getByRole('status')).toContainText('Decision saved');
    await page.getByRole('button', { name: 'Send back: Sorted the library shelves' }).click();
    await page.getByRole('button', { name: 'Approve: Taught counting change to a younger kid' }).click();
    await expect(page.getByTestId('ngo-credits')).toContainText('400');
    await expect(page.getByTestId('ngo-pool')).toContainText('$37');
    await expect(page.getByRole('heading', { name: 'Nothing in this tray.' })).toBeVisible();
    await page.getByRole('button', { name: 'Approved · 2', exact: true }).click();
    await expect(page.locator('.ngo-activity.approved')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Approve:/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.locator('.ngo-learner').first()).toContainText('200 credits');
    await expect(page.locator('.ngo-jars').first()).toContainText('Save100');
    await page.getByRole('button', { name: 'Report', exact: true }).first().click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV report', exact: true }).click();
    const download = await downloading;
    expect(await readFile(await download.path(), 'utf8')).toContain('learning_rewards,credits,400');
    await page.getByRole('button', { name: 'Lock workspace', exact: true }).click();
    await expect(page.getByLabel('Your staff PIN')).toBeVisible();
    await expect(page.getByTestId('ngo-credits')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('mentor-test-123');
  });

  test('reopening needs a PIN and restores server-saved reviews', async ({ page }) => {
    await fakeNgo(page); await openNgo(page);
    await page.getByRole('button', { name: /Review queue/ }).click();
    await page.getByRole('button', { name: 'Approve: Reading hour at the learning centre' }).click();
    await expect(page.getByTestId('ngo-credits')).toContainText('200');
    await page.reload();
    await expect(page.getByLabel('Your staff PIN')).toHaveValue('');
    await page.getByLabel('Your staff PIN').fill('mentor-test-123');
    await page.getByRole('button', { name: 'Open workspace', exact: true }).click();
    await expect(page.getByTestId('ngo-credits')).toContainText('200');
    await expect(page.getByTestId('ngo-pending')).toContainText('2');
  });

  test('save errors leave the activity pending and show a useful message', async ({ page }) => {
    await fakeNgo(page, { failReview: true }); await openNgo(page);
    await page.getByRole('button', { name: /Review queue/ }).click();
    await page.getByRole('button', { name: 'Approve: Reading hour at the learning centre' }).click();
    await expect(page.getByRole('alert')).toContainText('Nothing was awarded');
    await expect(page.locator('.ngo-activity.pending')).toHaveCount(3);
    await expect(page.getByTestId('ngo-credits').locator('strong')).toHaveText('0');
  });

  test('expired access locks the workspace, and setup-off is explained', async ({ page }) => {
    await fakeNgo(page); await openNgo(page);
    await page.route('**/api/ngo/dashboard', (route) => route.fulfill({ status: 401, json: { message: 'Unlock the workspace with your PIN to continue.' } }));
    await page.getByRole('button', { name: 'Refresh records', exact: true }).click();
    await expect(page.getByLabel('Your staff PIN')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Unlock');
    await page.route('**/api/ngo/config', (route) => route.fulfill({ json: { configured: false, roles: [] } }));
    await page.reload();
    await expect(page.getByRole('status')).toContainText('hasn’t been set up');
    await expect(page.getByRole('button', { name: 'Open workspace', exact: true })).toBeDisabled();
  });

  test('reduced motion, keyboard access and narrow layouts remain usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fakeNgo(page); await openNgo(page);
    await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
    await page.getByRole('button', { name: /Review queue/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Good work deserves a closer look.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const queue = await page.locator('.ngo-queue').boundingBox();
    const tabs = await page.locator('.ngo-tabs').boundingBox();
    expect(Math.abs(queue.width - tabs.width)).toBeLessThan(2);
    await page.getByRole('button', { name: 'Report', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Download CSV report', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('a late review reply cannot reopen a locked workspace', async ({ page }) => {
    const mock = await fakeNgo(page); await openNgo(page);
    let release;
    const waiting = new Promise((resolve) => { release = resolve; });
    await page.route('**/api/ngo/reviews/ACT-001', async (route) => {
      await waiting;
      await route.fulfill({ json: { dashboard: mock.dashboard() } });
    });
    await page.getByRole('button', { name: /Review queue/ }).click();
    const started = page.waitForRequest('**/api/ngo/reviews/ACT-001');
    await page.getByRole('button', { name: 'Approve: Reading hour at the learning centre' }).click();
    await started;
    await page.getByRole('button', { name: 'Lock workspace', exact: true }).click();
    await expect(page.getByLabel('Your staff PIN')).toBeVisible();
    const finished = page.waitForResponse('**/api/ngo/reviews/ACT-001');
    release(); await finished;
    await expect(page.getByTestId('ngo-credits')).toHaveCount(0);
    await expect(page.getByLabel('Your staff PIN')).toHaveValue('');
  });

  test('access can be rechecked after setup and the typed PIN can be shown without submitting', async ({ page }) => {
    await fakeNgo(page, { configured: false });
    await page.goto('/soon/ngo');
    const submit = page.getByRole('button', { name: 'Open workspace', exact: true });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Check access again', exact: true })).toBeEnabled();
    await page.route('**/api/ngo/config', (route) => route.fulfill({ json: { configured: true, roles: ['admin'] } }));
    await page.getByRole('button', { name: 'Check access again', exact: true }).click();
    await expect(page.getByLabel('Staff role')).toHaveValue('admin');
    const pin = page.getByLabel('Your staff PIN');
    await expect(pin).toBeEnabled();
    await expect(pin).toHaveAttribute('type', 'password');
    await pin.fill('mentor-test-123');
    let unlocks = 0;
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/ngo/unlock') unlocks++; });
    await page.getByRole('button', { name: 'Show PIN', exact: true }).click();
    await expect(pin).toHaveAttribute('type', 'text');
    await expect(pin).toHaveValue('mentor-test-123');
    await page.getByRole('button', { name: 'Hide PIN', exact: true }).click();
    await expect(pin).toHaveAttribute('type', 'password');
    expect(unlocks).toBe(0);
    await submit.click();
    await expect(page.getByTestId('ngo-pool')).toContainText('$37');
    await page.getByRole('button', { name: 'Lock workspace', exact: true }).click();
    await expect(pin).toHaveValue('');
    await expect(pin).toHaveAttribute('type', 'password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
