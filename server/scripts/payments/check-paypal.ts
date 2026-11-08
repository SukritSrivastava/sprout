// `npm run check:paypal -w server`: checks your PayPal SANDBOX keys work, without a browser.
//   1. Logs in to PayPal with the keys in server/.env.
//   2. Creates a $5 donation order (nobody pays it; it just expires).
//   3. Optional: sends a $1 test payout, if you pass an email:
//        npm run check:paypal -w server -- sb-xxxx@personal.example.com
// Test money only. Never prints the keys.
import { loadConfig } from '../../src/config.js';
import { createPayPal, PayPalError } from '../../src/features/payments/client.js';

const paypal = createPayPal(loadConfig());
if (!paypal) {
  console.log('✗ No PayPal keys. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to server/.env.');
  process.exit(1);
}

const explain = (error: unknown) =>
  error instanceof PayPalError ? `${error.status} ${error.issue}` : (error as Error).message;

try {
  const order = await paypal.createOrder(5);
  console.log(`✓ Keys work. Created sandbox order ${order.id} for $5 (left unpaid).`);
} catch (error) {
  console.log(`✗ Creating an order failed: ${explain(error)}`);
  process.exit(1);
}

const email = process.argv[2];
if (email) {
  try {
    const sent = await paypal.sendPayout({ email, dollars: 1, note: 'sprout.io sandbox check', itemId: `CHECK-${Date.now()}` });
    console.log(`✓ Payout accepted: batch ${sent.batchId}, status ${sent.status}.`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const later = await paypal.getPayout(sent.batchId);
    console.log(`✓ Status after 5 seconds: ${later.status}.`);
  } catch (error) {
    console.log(`✗ Payout failed: ${explain(error)}`);
    process.exit(1);
  }
} else {
  console.log('  (Add an email after -- to also test a $1 payout.)');
}
