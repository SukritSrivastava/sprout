// Remembers the real (sandbox) PayPal money that moved while the server is running:
// the NGO's reward pool, a receipt for every donation and payout, and which receipts are
// already sealed on the blockchain. It lives in memory, so restarting the server starts fresh
// (there's no database in this demo).
//
// Receipts use the same shape as the impact ledger (ledger/merkle.ts), with coded references
// instead of people: "donor-3fa9c1" is a salted fingerprint of PayPal's payer id, and
// "guardian-81bd02" of the guardian's email. The salt is random per server start and never shared.
import { createHash, randomBytes } from 'node:crypto';
import type { Receipt } from '../ledger/merkle.js';

export type LiveReceipt = Receipt & {
  currency: 'USD';
  paypalId: string; // PayPal's capture id or payout batch id, so anyone with access can look it up
  status: string; // COMPLETED for donations; PENDING / SUCCESS / UNCLAIMED / FAILED… for payouts
  batchId: number | null; // the ledger batch it was published in, or null if not yet
};

// Payout statuses that mean the money did NOT arrive, so it goes back into the pool.
const FAILED = new Set(['FAILED', 'RETURNED', 'REFUNDED', 'REVERSED', 'BLOCKED', 'DENIED', 'CANCELED']);

export const FIRST_LIVE_BATCH = 101; // batch 1 is the sample batch; live batches start here

export function createPayPalStore(now = () => new Date()) {
  const salt = randomBytes(16);
  const receipts: LiveReceipt[] = [];
  const ordersWeCreated = new Map<string, number>(); // order id → dollars we asked for
  const donationByOrder = new Map<string, LiveReceipt>(); // so capturing twice is harmless
  let nextBatchId = FIRST_LIVE_BATCH;

  const code = (prefix: string, secret: string) =>
    `${prefix}-${createHash('sha256').update(salt).update(secret).digest('hex').slice(0, 6)}`;

  // Receipt ids look like DON-2611-0001: type, year+month, a running number.
  function newId(prefix: 'DON' | 'PAY') {
    const date = now();
    const yymm = `${String(date.getUTCFullYear()).slice(2)}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const count = receipts.filter((r) => r.id.startsWith(prefix)).length + 1;
    return `${prefix}-${yymm}-${String(count).padStart(4, '0')}`;
  }
  const today = () => now().toISOString().slice(0, 10);

  return {
    rememberOrder(orderId: string, dollars: number) {
      ordersWeCreated.set(orderId, dollars);
    },
    expectedDollars(orderId: string) {
      return ordersWeCreated.get(orderId);
    },
    donationFor(orderId: string) {
      return donationByOrder.get(orderId);
    },

    addDonation(input: { orderId: string; captureId: string; dollars: number; payerId: string }) {
      const receipt: LiveReceipt = {
        id: newId('DON'),
        type: 'donation',
        amount: input.dollars,
        date: today(),
        ref: code('donor', input.payerId),
        currency: 'USD',
        paypalId: input.captureId,
        status: 'COMPLETED',
        batchId: null,
      };
      receipts.push(receipt);
      donationByOrder.set(input.orderId, receipt);
      return receipt;
    },

    // Reserve the receipt before calling PayPal, so the pool can't be spent twice at once.
    addPayout(input: { email: string; dollars: number }) {
      const receipt: LiveReceipt = {
        id: newId('PAY'),
        type: 'payout',
        amount: input.dollars,
        date: today(),
        ref: code('guardian', input.email.toLowerCase()),
        currency: 'USD',
        paypalId: '',
        status: 'SENDING',
        batchId: null,
      };
      receipts.push(receipt);
      return receipt;
    },
    // Remove a payout PayPal refused outright (it never left, so it needs no receipt).
    dropPayout(id: string) {
      const index = receipts.findIndex((r) => r.id === id);
      if (index >= 0) receipts.splice(index, 1);
    },
    findPayout(paypalId: string) {
      return receipts.find((r) => r.type === 'payout' && r.paypalId === paypalId);
    },

    // Money in the pool: donations minus payouts that haven't failed.
    poolDollars() {
      return receipts.reduce((sum, r) => {
        if (r.type === 'donation') return sum + r.amount;
        if (r.type === 'payout' && !FAILED.has(r.status)) return sum - r.amount;
        return sum;
      }, 0);
    },

    all() {
      return receipts.map((r) => ({ ...r }));
    },
    unpublished() {
      return receipts.filter((r) => r.batchId === null && r.status !== 'SENDING');
    },
    nextBatchId() {
      return nextBatchId;
    },
    markPublished(ids: string[], batchId: number) {
      for (const r of receipts) if (ids.includes(r.id)) r.batchId = batchId;
      nextBatchId = batchId + 1;
    },
  };
}

export type PayPalStore = ReturnType<typeof createPayPalStore>;
