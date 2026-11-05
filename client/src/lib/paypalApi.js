// Talks to the server's PayPal routes (server/src/routes/paypal.ts). The server holds the PayPal
// secret and makes the real sandbox calls; the browser only ever sees order ids and receipts.
import { call, post } from './api.js';

export const paypalConfig = () => call('/api/paypal/config');
export const liveReceipts = () => call('/api/paypal/receipts');

// Donations (PayPal Orders v2): create when the donor clicks the PayPal button, capture after
// they approve it in PayPal's window.
export const createOrder = (amount) => post('/api/paypal/orders', { amount });
export const captureOrder = (orderId) => post(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`);

// Payouts (PayPal Payouts v1) to a guardian's PayPal account, after two adults approve.
export const sendPayout = (email, amount, approvals) => post('/api/paypal/payouts', { email, amount, approvals });
export const payoutStatus = (batchId) => call(`/api/paypal/payouts/${encodeURIComponent(batchId)}`);

// "$10"
export const dollars = (value) => `$${Number(value).toLocaleString('en-US')}`;
