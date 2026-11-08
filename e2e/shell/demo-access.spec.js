// Real disposable API + fake PayPal: judges explore every flow without entering a PIN.
import { test as base, expect } from '../support/fixtures.js';
import { startIsolatedApi, proxyApi } from '../support/isolated-api.js';

const test = base.extend({
  guardianPermission: false,
  // Cold TypeScript startup can take longer when another browser suite runs on this machine.
  demoApi: [async ({ page }, use) => {
    const api = await startIsolatedApi('demo', 60_000);
    try { await proxyApi(page, api.address); await use(api.address); }
    finally { await api.close(); }
  }, { timeout: 75_000 }],
});
test.use({ reducedMotion: 'reduce' });
const noPins = async (page) => {
  await expect(page.locator('input[type="password"], .pin-pad')).toHaveCount(0);
  await expect(page.getByRole('note', { name: 'PIN protection · disabled for this demo' })).toBeVisible();
};

test('learning, NGO reviews, reports and classroom open directly and survive reload', async ({ page, demoApi }, info) => {
  test.setTimeout(60_000); // This covers several pages, a saved review and a real CSV download.
  await page.goto('/app');
  await expect(page.locator('#mentor')).toBeAttached(); await noPins(page);
  await page.goto('/soon/seedlings');
  await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted'); await noPins(page);
  await page.goto('/soon/ngo');
  await expect(page.getByRole('button', { name: 'Review queue', exact: false })).toBeVisible(); await noPins(page);
  await expect(page.getByRole('button', { name: 'Lock workspace', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review queue', exact: false }).click();
  await page.getByRole('button', { name: 'Approve: Reading hour at the learning centre', exact: true }).click();
  await expect(page.getByTestId('ngo-credits')).toContainText('200');
  await page.reload(); await expect(page.getByTestId('ngo-credits')).toContainText('200'); await noPins(page);
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV report', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/sprout-ngo-report/);
  await page.screenshot({ path: `qa/demo-access-ngo-${info.project.name}.png`, fullPage: true });
  await page.goto('/soon/classroom'); await page.getByRole('button', { name: /Aanya/ }).click();
  await expect(page.locator('.walk-step')).toContainText('No PIN needed for the demo'); await noPins(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('guardian records, withdraws and deletes without a PIN and learning remains open', async ({ page, demoApi }) => {
  await page.goto('/soon/safety'); await noPins(page);
  await expect(page.getByTestId('permission-state')).toHaveText('Permission needed');
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Record demo permission', exact: true }).click();
  await expect(page.getByTestId('permission-state')).toHaveText('Permission recorded');
  await page.getByRole('button', { name: 'Withdraw permission', exact: true }).click();
  await expect(page.getByTestId('permission-state')).toHaveText('Permission withdrawn');
  await page.getByLabel('Type A12 to confirm deletion', { exact: true }).fill('A12');
  await page.getByRole('button', { name: 'Delete learning data', exact: true }).click();
  await expect(page.getByTestId('permission-state')).toHaveText('Learning data deleted');
  await page.getByRole('link', { name: 'Open Seedlings lessons' }).click();
  await expect(page.getByTestId('seed-count')).toHaveText('0 of 3 seeds planted'); await noPins(page);
  await page.goto('/app'); await expect(page.locator('#mentor')).toBeAttached(); await noPins(page);
});

test('payout approval, recovery and sending need no PIN', async ({ page, demoApi }) => {
  await page.request.post(`${demoApi}/api/paypal/orders`, { data: { amount: 25 } });
  await page.request.post(`${demoApi}/api/paypal/orders/DEMOORDER123/capture`, { data: {} });
  await page.goto('/soon/payout'); await expect(page.getByTestId('pool')).toContainText('$25');
  await page.getByRole('button', { name: /^Next/ }).click(); await noPins(page);
  await page.getByRole('button', { name: 'Approve as Mentor', exact: true }).click();
  await page.getByRole('button', { name: 'Approve as NGO admin', exact: true }).click();
  await expect(page.locator('.approval-status')).toContainText('2 of 3 approved');
  await page.reload(); await noPins(page);
  await page.getByRole('button', { name: 'Recover request', exact: true }).click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.locator('.approval-status')).toContainText('2 of 3 approved');
  await page.getByRole('button', { name: /^Next/ }).click(); await noPins(page);
  await page.getByLabel('Who is sending it?').selectOption('mentor');
  await page.getByRole('button', { name: 'Send $8 with PayPal Payouts', exact: true }).click();
  await expect(page.getByTestId('payout-result')).toContainText('PayPal: Paid');
});

test('the demo notice supports Hindi', async ({ page, demoApi }) => {
  await page.goto('/app'); await noPins(page);
  await page.getByRole('group', { name: 'Website language' }).getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await expect(page.locator('.demo-access-notice')).toContainText('PIN सुरक्षा');
  await expect(page.locator('.demo-access-notice')).toContainText('हर सुविधा');
});
