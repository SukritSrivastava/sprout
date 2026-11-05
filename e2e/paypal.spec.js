// PayPal sandbox pages: Donate (Orders v2), Payout (Payouts v1), and live receipts in the ledger.
//
// Approving a real sandbox payment needs a person to log in to a PayPal sandbox buyer account,
// so these tests stand in for PayPal: a tiny fake PayPal button replaces PayPal's script, and our
// own /api/paypal answers are faked. They check what the page does with each answer. The server's
// PayPal logic has its own tests (server/test/paypal.test.ts), and the real sandbox is checked by
// hand (VERIFICATION.md).
import { test, expect } from './fixtures.js';
import { buildTree } from '../client/src/lib/ledger.js';

const next = (page) => page.getByRole('button', { name: /^Next/ });
const stepTitle = (page) => page.locator('.walk-title');

const config = (extra = {}) => ({
  configured: true,
  clientId: 'test-client-id',
  currency: 'USD',
  mode: 'sandbox',
  amounts: [5, 10, 25, 50],
  rewardDollars: 2,
  maxPayoutDollars: 50,
  ngoName: 'Asha Learning Trust (sample NGO)',
  poolDollars: 0,
  ...extra,
});

// A stand-in for PayPal's JavaScript SDK: one "PayPal" button that runs the same createOrder →
// onApprove steps PayPal would after the donor approves.
const fakeSdk = `
  window.paypal = {
    Buttons(options) {
      return {
        render(holder) {
          const button = document.createElement('button');
          button.textContent = 'Fake PayPal';
          button.onclick = async () => {
            try {
              const orderID = await options.createOrder();
              await options.onApprove({ orderID });
            } catch (error) {
              options.onError(error);
            }
          };
          holder.appendChild(button);
          return Promise.resolve();
        },
        close() { return Promise.resolve(); },
      };
    },
  };`;

async function fakePayPal(page, { configReply = config(), orderReply, captureReply } = {}) {
  const asked = { orders: [], payouts: [] };
  await page.route('https://www.paypal.com/sdk/js**', (route) => route.fulfill({ contentType: 'text/javascript', body: fakeSdk }));
  await page.route('**/api/paypal/config', (route) => route.fulfill({ json: configReply }));
  await page.route('**/api/paypal/orders', (route) => {
    asked.orders.push(route.request().postDataJSON());
    return route.fulfill(orderReply ?? { json: { id: 'ORDER12345678' } });
  });
  await page.route('**/api/paypal/orders/*/capture', (route) =>
    route.fulfill(
      captureReply ?? {
        json: {
          receipt: { id: 'DON-2611-0001', type: 'donation', amount: 25, ref: 'donor-3fa9c1', paypalId: 'CAP9X8Y7', status: 'COMPLETED', batchId: null },
          note: { text: 'Thank you! Your $25 pays for 12 activity rewards.', source: 'ai' },
          poolDollars: 25,
        },
      },
    ),
  );
  return asked;
}

test.describe('donate with PayPal (sandbox)', () => {
  test('pick an amount, pay with the PayPal button, get a receipt and an AI thank-you', async ({ page }) => {
    const asked = await fakePayPal(page);
    await page.goto('/soon/donate');
    await expect(page.getByRole('note')).toContainText('Live on the PayPal sandbox');
    await page.getByRole('button', { name: '$25', exact: true }).click();
    await expect(page.locator('.big-number')).toHaveText('12');
    await next(page).click();
    await page.getByRole('button', { name: 'Fake PayPal' }).click();

    await expect(stepTitle(page)).toHaveText('Thank you! Here’s your receipt');
    expect(asked.orders).toEqual([{ amount: 25 }]);
    const receipt = page.getByTestId('donation-receipt');
    await expect(receipt).toContainText('$25 (test money)');
    await expect(receipt).toContainText('DON-2611-0001');
    await expect(receipt).toContainText('CAP9X8Y7');
    await expect(receipt).toContainText('donor-3fa9c1');
    const note = page.getByTestId('impact-note');
    await expect(note).toContainText('Written by AI (Gemini)');
    await expect(note).toContainText('12 activity rewards');
    // Amounts are locked once paid, so the receipt can't disagree with the chips.
    await page.getByRole('button', { name: 'Go to step 1: Choose how much to give' }).click();
    await expect(page.getByRole('button', { name: '$5', exact: true })).toBeDisabled();
  });

  test('a prepared note is labelled when the AI is offline', async ({ page }) => {
    await fakePayPal(page, {
      captureReply: {
        json: {
          receipt: { id: 'DON-2611-0002', type: 'donation', amount: 10, ref: 'donor-aa11bb', paypalId: 'CAP1', status: 'COMPLETED', batchId: null },
          note: { text: 'Thank you! Your $10 pays for 5 activity rewards.', source: 'prepared' },
          poolDollars: 10,
        },
      },
    });
    await page.goto('/soon/donate');
    await next(page).click();
    await page.getByRole('button', { name: 'Fake PayPal' }).click();
    await expect(page.getByTestId('impact-note')).toContainText('Prepared note (AI offline)');
  });

  test.describe('when the server refuses', () => {
    test.use({ expectedConsoleErrors: [/status of 409/] });
    test('a server refusal is shown, and no receipt is made', async ({ page }) => {
    await fakePayPal(page, {
      captureReply: { status: 409, json: { error: 'payment_not_completed', message: 'PayPal reports this payment as PENDING, so no receipt was made.' } },
    });
    await page.goto('/soon/donate');
    await next(page).click();
    await page.getByRole('button', { name: 'Fake PayPal' }).click();
    await expect(page.getByRole('alert')).toHaveText('PayPal reports this payment as PENDING, so no receipt was made.');
    await expect(stepTitle(page)).toHaveText('Pay with PayPal');
  });

  });

  test('without sandbox keys, the page says how to add them', async ({ page }) => {
    await fakePayPal(page, { configReply: config({ configured: false, clientId: null }) });
    await page.goto('/soon/donate');
    await next(page).click();
    await expect(page.getByTestId('paypal-setup')).toContainText('PAYPAL_CLIENT_ID');
    await expect(page.getByRole('button', { name: 'Fake PayPal' })).toHaveCount(0);
  });
});

test.describe('payout to a guardian with PayPal (sandbox)', () => {
  async function fakePayouts(page, pool = 20) {
    const asked = await fakePayPal(page, { configReply: config({ poolDollars: pool }) });
    const receipt = { id: 'PAY-2611-0001', type: 'payout', amount: 8, ref: 'guardian-81bd02', paypalId: 'BATCHQ1W2E3R4', batchId: null };
    await page.route('**/api/paypal/payouts', (route) => {
      asked.payouts.push(route.request().postDataJSON());
      return route.fulfill({ json: { receipt: { ...receipt, status: 'PENDING' }, poolDollars: pool - 8 } });
    });
    await page.route('**/api/paypal/payouts/BATCHQ1W2E3R4', (route) =>
      route.fulfill({ json: { receipt: { ...receipt, status: 'SUCCESS' }, poolDollars: pool - 8 } }),
    );
    return asked;
  }

  test('two adults approve, PayPal pays the guardian, and the status refreshes', async ({ page }) => {
    const asked = await fakePayouts(page);
    await page.goto('/soon/payout');
    await expect(page.getByTestId('pool')).toContainText('$20');
    await next(page).click();
    const status = page.locator('.approval-status');
    await page.getByRole('button', { name: /Mentor/ }).click();
    await expect(status).toHaveText('1 of 3 approved. Needs 2.');
    await next(page).click();
    await expect(page.locator('.walk-step')).toContainText('Without two approvals, nothing is paid');
    await expect(page.getByRole('button', { name: /Send \$8 with PayPal Payouts/ })).toBeDisabled();

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: /Guardian/ }).click();
    await expect(status).toHaveText('2 of 3 approved. The payout can go ahead.');
    await next(page).click();
    await page.getByLabel(/Guardian’s PayPal email/).fill('sb-guardian@personal.example.com');
    await page.getByRole('button', { name: /Send \$8 with PayPal Payouts/ }).click();

    const result = page.getByTestId('payout-result');
    await expect(result).toContainText('PayPal: On its way');
    await expect(result).toContainText('BATCHQ1W2E3R4');
    await expect(result).toContainText('guardian-81bd02');
    expect(asked.payouts).toEqual([{ email: 'sb-guardian@personal.example.com', amount: 8, approvals: ['mentor', 'guardian'] }]);
    await page.getByRole('button', { name: 'Check status with PayPal' }).click();
    await expect(result).toContainText('PayPal: Paid');
  });

  test('an empty pool sends you to donate first', async ({ page }) => {
    await fakePayouts(page, 0);
    await page.goto('/soon/payout');
    await expect(page.getByTestId('pool')).toContainText('$0');
    await page.getByRole('link', { name: 'Donate with PayPal first →' }).click();
    await expect(page).toHaveURL(/\/soon\/donate$/);
  });
});

test.describe('impact ledger: real PayPal receipts', () => {
  test('with no PayPal payments yet, step 4 points to Donate and Payout', async ({ page }) => {
    await page.route('**/api/paypal/receipts', (route) => route.fulfill({ json: { receipts: [], poolDollars: 0 } }));
    await page.goto('/soon/impact');
    await page.getByRole('button', { name: /Go to step 4/ }).click();
    await expect(stepTitle(page)).toHaveText('Now with real PayPal receipts');
    await expect(page.getByTestId('live-empty')).toContainText('Donate with PayPal');
  });

  test('publishing seals the PayPal receipts and the browser checks the code', async ({ page }) => {
    const receipts = [
      { id: 'DON-2611-0001', type: 'donation', amount: 25, date: '2026-11-05', ref: 'donor-3fa9c1' },
      { id: 'PAY-2611-0001', type: 'payout', amount: 8, date: '2026-11-05', ref: 'guardian-81bd02' },
    ];
    const { root } = await buildTree(receipts);
    let published = false;
    await page.route('**/api/paypal/receipts', (route) =>
      route.fulfill({
        json: {
          receipts: receipts.map((r, i) => ({ ...r, currency: 'USD', paypalId: i ? 'BATCHQ1' : 'CAP9X8Y7', status: 'COMPLETED', batchId: published ? 101 : null })),
          poolDollars: 17,
        },
      }),
    );
    await page.route('**/api/ledger/publish-live', (route) => {
      published = true;
      return route.fulfill({
        json: {
          alreadyPublished: false,
          receipts,
          batch: {
            batchId: 101, root, publishedAt: 1, donated: 25, rewarded: 0, paidOut: 8, receipts: 2,
            tx: {
              hash: `0x${'ab'.repeat(32)}`, blockNumber: 7, blockHash: `0x${'cd'.repeat(32)}`, timestamp: 1_790_000_000,
              from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', to: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
              gasUsed: 116000, feeEth: '0.0001', status: 'success',
            },
          },
        },
      });
    });
    await page.goto('/soon/impact');
    await page.getByRole('button', { name: /Go to step 4/ }).click();
    await expect(page.getByTestId('live-receipts').locator('tbody tr')).toHaveCount(2);
    await page.getByRole('button', { name: 'Publish 2 PayPal receipts to the blockchain' }).click();
    await expect(page.getByTestId('chain-explorer')).toContainText('#7');
    await expect(page.locator('.verify-result')).toContainText('Batch #101: the code rebuilt from these PayPal receipts matches the blockchain.');
    await expect(page.getByTestId('live-receipts')).toContainText('#101');
  });
});

test('the real server: PayPal config never exposes a secret, and donations need keys or valid amounts', async ({ request }) => {
  const reply = await request.get('/api/paypal/config');
  const body = await reply.json();
  expect(body).toMatchObject({ mode: 'sandbox', currency: 'USD', amounts: [5, 10, 25, 50] });
  expect(JSON.stringify(body)).not.toMatch(/secret/i);
  const order = await request.post('/api/paypal/orders', { data: { amount: 7 } });
  // 503 without sandbox keys; 400 with keys (7 isn't an allowed amount). Never a PayPal order.
  expect([400, 503]).toContain(order.status());
});
