// The /soon hub, every walkthrough, and the interactive bits inside them. Donate, Payout and the
// impact ledger are live (PayPal sandbox / local blockchain); the rest are Coming-soon previews.
// The PayPal pages have their own file: paypal.spec.js.
import { test, expect } from './fixtures.js';

const ids = ['donate', 'payout', 'ngo', 'impact', 'seedlings', 'safety', 'hindi', 'classroom', 'certificates'];
const live = ['donate', 'payout', 'impact']; // these work for real and say so
const next = (page) => page.getByRole('button', { name: /^Next/ });
const stepTitle = (page) => page.locator('.walk-title');

test('the hub lists all nine, including the working NGO dashboard', async ({ page }) => {
  await page.goto('/soon');
  await expect(page.locator('.soon-list a')).toHaveCount(9);
  await expect(page.locator('.soon-list .stamp-live')).toHaveCount(6);
  await expect(page.locator('a[href="/soon/ngo"] .stamp-live')).toContainText('Working');
  for (const id of live) await expect(page.locator(`a[href="/soon/${id}"] .stamp-live`)).toContainText('Live');
  for (const id of ids) await expect(page.locator(`.soon-list a[href="/soon/${id}"]`)).toHaveCount(1);
});

test('header "Coming soon" opens the hub; home rows open their preview', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#soon a[href="/soon/impact"]').click();
  await expect(page).toHaveURL(/\/soon\/impact$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Public impact ledger');
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Coming soon' }).click();
    await expect(page).toHaveURL(/\/soon$/);
  }
});

for (const id of ids.filter((id) => !['ngo', 'seedlings', 'safety'].includes(id))) {
  const isLive = live.includes(id);
  test(`${id}: walks every step to the last one and back to the start`, async ({ page }) => {
    await page.goto(`/soon/${id}`);
    await expect(page.getByRole('note')).toContainText(isLive ? /Live on the PayPal sandbox|Working on a local test blockchain/ : 'Nothing here is real');
    const total = Number((await page.locator('.walk-count').textContent()).match(/of (\d+)/)[1]);
    for (let step = 1; step < total; step++) {
      await expect(page.locator('.walk-count')).toHaveText(`Step ${step} of ${total}`);
      await next(page).click();
    }
    await expect(stepTitle(page)).toHaveText(isLive ? 'What’s real here' : 'What this will do when it’s live');
    await expect(page.locator('.live-panel li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(page.locator('.walk-count')).toHaveText(`Step 1 of ${total}`);
  });
}

test('step dots jump straight to a step', async ({ page }) => {
  await page.goto('/soon/impact');
  await page.getByRole('button', { name: /Go to step 5/ }).click();
  await expect(stepTitle(page)).toHaveText('What this proves, and what it doesn’t');
});

test('unknown preview shows the 404 page', async ({ page }) => {
  await page.goto('/soon/nothing-here');
  await expect(page.getByRole('heading', { name: 'This page didn’t sprout.' })).toBeVisible();
});

test.describe('impact ledger: real verification', () => {
  test('an untouched receipt verifies; a changed amount fails', async ({ page }) => {
    await page.goto('/soon/impact');
    await expect(page.locator('.ledger-table tbody tr')).toHaveCount(6);
    await expect(page.locator('.ledger-table tbody td.mono').nth(1)).toHaveText(/^[0-9a-f]{6}…[0-9a-f]{4}$/);
    await next(page).click();
    await expect(page.getByTestId('batch-root')).toHaveText(/^[0-9a-f]{6}…[0-9a-f]{4}$/);
    await next(page).click();

    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('.verify-result')).toContainText('hasn’t been changed');

    await page.getByRole('spinbutton', { name: 'Amount (₹)' }).fill('2000');
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('.verify-result')).toContainText('was changed after it was published');

    await page.getByRole('combobox', { name: 'Receipt' }).selectOption({ label: 'DON-2611-0043' });
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('.verify-result')).toContainText('hasn’t been changed');
  });
});

// These use the REAL local test blockchain (Hardhat) that Playwright starts. The sample batch can
// only be published once per chain, so the tests accept "already published" too.
test.describe('impact ledger: local blockchain', () => {
  // Only one browser at a time publishes, so the two screen sizes don't race to publish.
  test.describe.configure({ mode: 'serial' });

  async function publishedBatch(page) {
    await page.goto('/soon/impact');
    await next(page).click();
    const publishButton = page.getByRole('button', { name: 'Publish to the blockchain' });
    const explorer = page.getByTestId('chain-explorer');
    await expect(publishButton.or(explorer)).toBeVisible();
    if (await publishButton.isVisible()) await publishButton.click();
    await expect(explorer).toBeVisible({ timeout: 20_000 });
    return explorer;
  }

  test('publishing seals the batch in a real block and shows it in the explorer', async ({ page }) => {
    const explorer = await publishedBatch(page);
    await expect(explorer).toContainText('Success');
    await expect(explorer).toContainText(/Block\s*#\d+/);
    await expect(explorer).toContainText(/0x[0-9a-f]{8}…[0-9a-f]{8}/); // transaction code
    await expect(explorer).toContainText('test ETH');
    // The code stored on the chain matches the receipts on screen.
    await expect(page.getByText('these receipts were changed after publishing')).toHaveCount(0);
  });

  test('verify checks receipts against the code read back from the blockchain', async ({ page }) => {
    await publishedBatch(page);
    await next(page).click();
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('.verify-result')).toContainText(/stored on the blockchain in block #\d+/);
    await page.getByRole('spinbutton', { name: 'Amount (₹)' }).fill('2000');
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('.verify-result')).toContainText('was changed after it was published');
  });

  test('the server reports the contract and the test wallet', async ({ request }) => {
    const status = await (await request.get('/api/ledger/status')).json();
    expect(status).toMatchObject({ ok: true, chainId: 31337, local: true });
    expect(status.contract).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(status.publisher.toLowerCase()).toBe('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  });
});

test('Hindi preview switches the sample home screen language', async ({ page }) => {
  await page.goto('/soon/hindi');
  await expect(page.locator('.phone-mock')).toContainText('नमस्ते आन्या!');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('.phone-mock')).toContainText('Hi Aanya!');
});

test('classroom: pick a profile, wrong PIN, then the sample PIN', async ({ page }) => {
  await page.goto('/soon/classroom');
  await page.getByRole('button', { name: /Zoya/ }).click();
  await expect(stepTitle(page)).toHaveText('A simple PIN');
  for (const d of '9999') await page.locator('.pin-pad').getByRole('button', { name: d, exact: true }).click();
  await expect(page.locator('.walk-step [role="status"]')).toHaveText('Not quite. Clear and try again.');
  await page.getByRole('button', { name: 'Clear PIN' }).click();
  for (const d of '1234') await page.locator('.pin-pad').getByRole('button', { name: d, exact: true }).click();
  await expect(page.locator('.walk-step [role="status"]')).toHaveText('Welcome, Zoya!');
});

test('certificates: the sample code checks out, a changed one does not', async ({ page }) => {
  await page.goto('/soon/certificates');
  await next(page).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.verify-result')).toContainText('Real certificate');
  await page.getByRole('textbox', { name: 'Code' }).fill('SPR-MB1-7Q4X');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.verify-result')).toContainText('No certificate with this code');
});
