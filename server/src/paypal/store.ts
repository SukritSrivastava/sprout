// Remembers the real (sandbox) PayPal money that moved: the NGO's reward pool, a receipt for every
// donation and payout, payout requests and their approvals, and which receipts are sealed on the
// blockchain.
//
// Everything is saved to one JSON file (DATA_FILE in server/.env, default
// server/data/paypal-records.json) after every change, so restarting the server keeps it all.
// Tests pass no file and keep everything in memory.
//
// Receipts use the same shape as the impact ledger (ledger/merkle.ts), with coded references
// instead of people: "donor-3fa9c1d2e4b5a697" is a salted fingerprint of PayPal's payer id, and
// "guardian-…" of the guardian's email. The salt is random, saved in the file and never shared.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Receipt } from '../ledger/merkle.js';

export type LiveReceipt = Receipt & {
  currency: 'USD';
  paypalId: string; // PayPal's capture id or payout batch id ('' while unknown)
  // COMPLETED for donations. Payouts: SENDING → PENDING / SUCCESS / UNCLAIMED / FAILED…
  // UNKNOWN = PayPal may or may not have taken it (a timeout); REJECTED = PayPal said no.
  status: string;
  batchId: number | null; // the ledger batch it was published in, or null if not yet
  orderId?: string; // donations: the PayPal order it came from (private)
};

// What anyone may see: no PayPal ids (those stay with the NGO and the person who paid).
export type PublicReceipt = Omit<LiveReceipt, 'paypalId' | 'orderId'>;
// What the donor or the approving adults see about their own payment: the PayPal id too.
export type OwnerReceipt = Omit<LiveReceipt, 'orderId'>;

export type Approver = 'mentor' | 'admin' | 'guardian';

// A kid's payout request. The amount and guardian are fixed when it's made; approvals are tied to it.
export type PayoutRequest = {
  id: string; // REQ-2611-0001
  amount: number;
  email: string; // the guardian's PayPal email, from server/.env; never sent to the browser
  child: string; // who asked (sample kid)
  createdAt: string;
  sentAt?: string; // first send time; never extended by retries
  approvals: { approver: Approver; at: string }[];
  // Set once, BEFORE PayPal is called, and reused for any retry so PayPal never pays twice.
  senderBatchId: string | null;
  receiptId: string | null;
};

type State = {
  version: 1;
  salt: string;
  sequence: { DON: number; PAY: number; REQ: number };
  nextBatchId: number;
  orders: Record<string, { dollars: number; createdAt: number }>; // orders we created, not yet captured
  receipts: LiveReceipt[];
  requests: PayoutRequest[];
};

// Payout statuses that mean the money did NOT arrive, so it goes back into the pool.
const FAILED = new Set(['FAILED', 'RETURNED', 'REFUNDED', 'REVERSED', 'BLOCKED', 'DENIED', 'CANCELED', 'REJECTED']);

export const FIRST_LIVE_BATCH = 101; // batches 1–100 are sample batches; live batches start here
const ORDER_LIFETIME_MS = 24 * 60 * 60_000; // unpaid PayPal orders are forgotten after a day
export const MAX_OPEN_ORDERS = 500; // and at most this many wait at once
const PUBLIC_LIST_SIZE = 100; // GET /receipts shows the newest 100

// A failed save must not turn an unrecorded payment into spendable money.
export class PaymentStoreError extends Error {
  constructor() { super('Payment records could not be saved. Restore disk access and retry this request; do not create another payment.'); }
}

export function createPayPalStore({ file = null as string | null, now = () => new Date() } = {}) {
  let unsaved = false;
  const state: State = load() ?? {
    version: 1,
    salt: randomBytes(16).toString('hex'),
    sequence: { DON: 0, PAY: 0, REQ: 0 },
    nextBatchId: FIRST_LIVE_BATCH,
    orders: {},
    receipts: [],
    requests: [],
  };
  // A payout that was being sent when the server stopped might have reached PayPal: never assume not.
  for (const r of state.receipts) if (r.status === 'SENDING') r.status = 'UNKNOWN';

  function load(): State | null {
    if (!file || !existsSync(file)) return null;
    // A broken file stops the server instead of silently starting with an empty pool.
    const saved = JSON.parse(readFileSync(file, 'utf8')) as State;
    if (saved.version !== 1) throw new Error(`Unknown version in ${file}`);
    return saved;
  }
  // Write to a temporary file, then swap it in, so a crash never leaves half a file.
  function save() {
    if (!file) return;
    unsaved = true;
    try {
      mkdirSync(dirname(file), { recursive: true });
      const temp = `${file}.tmp`;
      writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`);
      renameSync(temp, file);
      unsaved = false;
    } catch {
      // Keep the provider's answer in memory, but block all reads and changes until saved.
      throw new PaymentStoreError();
    }
  }
  function ensureSaved() { if (unsaved) save(); }
  save();

  const code = (prefix: string, secret: string) =>
    `${prefix}-${createHash('sha256').update(state.salt).update(secret).digest('hex').slice(0, 16)}`;

  // Ids look like DON-2611-0001: type, year+month, a running number that never goes back.
  function newId(prefix: 'DON' | 'PAY' | 'REQ') {
    const date = now();
    const yymm = `${String(date.getUTCFullYear()).slice(2)}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const count = ++state.sequence[prefix];
    return `${prefix}-${yymm}-${String(count).padStart(4, '0')}`;
  }
  const today = () => now().toISOString().slice(0, 10);
  const receiptById = (id: string) => state.receipts.find((r) => r.id === id);
  const publicCopy = ({ paypalId: _p, orderId: _o, ...rest }: LiveReceipt): PublicReceipt => ({ ...rest });
  const ownerCopy = ({ orderId: _o, ...rest }: LiveReceipt): OwnerReceipt => ({ ...rest });

  // Forget unpaid orders older than a day.
  function forgetOldOrders() {
    const cutoff = now().getTime() - ORDER_LIFETIME_MS;
    for (const [id, order] of Object.entries(state.orders)) if (order.createdAt < cutoff) delete state.orders[id];
  }

  return {
    // ---------- Donations ----------
    // Returns false if too many orders are already waiting (the route says "try later").
    rememberOrder(orderId: string, dollars: number) {
      ensureSaved();
      forgetOldOrders();
      if (Object.keys(state.orders).length >= MAX_OPEN_ORDERS) return false;
      state.orders[orderId] = { dollars, createdAt: now().getTime() };
      save();
      return true;
    },
    expectedDollars(orderId: string) {
      ensureSaved();
      return state.orders[orderId]?.dollars;
    },
    donationFor(orderId: string) {
      ensureSaved();
      return state.receipts.find((r) => r.type === 'donation' && r.orderId === orderId);
    },

    // Check-and-insert in one step (no await in between), so two captures can't both add money.
    addDonation(input: { orderId: string; captureId: string; dollars: number; payerId: string }) {
      ensureSaved();
      const existing = state.receipts.find(
        (r) => r.type === 'donation' && (r.orderId === input.orderId || r.paypalId === input.captureId),
      );
      if (existing) return existing;
      const receipt: LiveReceipt = {
        id: newId('DON'),
        type: 'donation',
        amount: input.dollars,
        currency: 'USD',
        date: today(),
        ref: code('donor', input.payerId),
        paypalId: input.captureId,
        status: 'COMPLETED',
        batchId: null,
        orderId: input.orderId,
      };
      state.receipts.push(receipt);
      delete state.orders[input.orderId];
      save();
      return receipt;
    },

    // ---------- Payout requests and approvals ----------
    addRequest(input: { amount: number; email: string; child: string }) {
      ensureSaved();
      const request: PayoutRequest = {
        id: newId('REQ'),
        amount: input.amount,
        email: input.email,
        child: input.child,
        createdAt: now().toISOString(),
        approvals: [],
        senderBatchId: null,
        receiptId: null,
      };
      state.requests.push(request);
      // Keep at most 200 requests that never became payouts: drop the oldest.
      const unused = state.requests.filter((r) => !r.receiptId);
      if (unused.length > 200) state.requests.splice(state.requests.indexOf(unused[0]), 1);
      save();
      return request;
    },
    findRequest(id: string) {
      ensureSaved();
      return state.requests.find((r) => r.id === id);
    },
    approve(id: string, approver: Approver) {
      ensureSaved();
      const request = state.requests.find((r) => r.id === id);
      if (!request || request.approvals.some((a) => a.approver === approver)) return;
      request.approvals.push({ approver, at: now().toISOString() });
      save();
    },

    // ---------- Payouts ----------
    // Reserve the money and fix PayPal's batch id BEFORE calling PayPal, so the pool can't be spent
    // twice and a retry is recognised by PayPal as the same payout.
    startPayout(requestId: string) {
      ensureSaved();
      const request = state.requests.find((r) => r.id === requestId)!;
      const receipt: LiveReceipt = {
        id: newId('PAY'),
        type: 'payout',
        amount: request.amount,
        currency: 'USD',
        date: today(),
        ref: code('guardian', request.email.toLowerCase()),
        paypalId: '',
        status: 'SENDING',
        batchId: null,
      };
      state.receipts.push(receipt);
      request.receiptId = receipt.id;
      request.senderBatchId = `sprout-${receipt.id}-${randomUUID().slice(0, 8)}`;
      request.sentAt = now().toISOString();
      save();
      return { receipt, senderBatchId: request.senderBatchId };
    },
    updatePayout(receiptId: string, change: { paypalId?: string; status: string }) {
      ensureSaved();
      const receipt = receiptById(receiptId);
      if (!receipt) return undefined;
      if (change.paypalId) receipt.paypalId = change.paypalId;
      receipt.status = change.status;
      save();
      return receipt;
    },
    findPayout(paypalId: string) {
      ensureSaved();
      return state.receipts.find((r) => r.type === 'payout' && r.paypalId === paypalId);
    },
    receipt(id: string) {
      ensureSaved();
      return receiptById(id);
    },
    // A payout whose outcome we don't know blocks new payouts until it's sorted out.
    uncertainPayout() {
      ensureSaved();
      return state.receipts.find((r) => r.type === 'payout' && (r.status === 'UNKNOWN' || r.status === 'SENDING'));
    },

    // Money in the pool: donations minus payouts that haven't failed (unknown ones stay reserved).
    poolDollars() {
      ensureSaved();
      return state.receipts.reduce((sum, r) => {
        if (r.type === 'donation') return sum + r.amount;
        if (r.type === 'payout' && !FAILED.has(r.status)) return sum - r.amount;
        return sum;
      }, 0);
    },

    ownerCopy,

    // Full-history aggregates for staff reports, independent of the public list's page size.
    totals() {
      ensureSaved();
      const sum = (match: (r: LiveReceipt) => boolean) => state.receipts.filter(match).reduce((total, r) => total + r.amount, 0);
      const donated = sum((r) => r.type === 'donation' && r.status === 'COMPLETED');
      const paid = sum((r) => r.type === 'payout' && r.status === 'SUCCESS');
      const reserved = sum((r) => r.type === 'payout' && r.status !== 'SUCCESS' && !FAILED.has(r.status));
      return { donated, paid, reserved, available: donated - paid - reserved };
    },

    // ---------- The public list and the ledger ----------
    all(): PublicReceipt[] {
      ensureSaved();
      return state.receipts.slice(-PUBLIC_LIST_SIZE).map(publicCopy);
    },
    // Only settled money is sealed: completed donations and payouts PayPal says were paid.
    // A request, a pending payout or a failed attempt is not proof that money reached a guardian.
    unpublished() {
      ensureSaved();
      return state.receipts.filter(
        (r) => r.batchId === null && (r.type === 'donation' ? r.status === 'COMPLETED' : r.status === 'SUCCESS'),
      );
    },
    nextBatchId() {
      ensureSaved();
      return state.nextBatchId;
    },
    markPublished(ids: string[], batchId: number) {
      ensureSaved();
      for (const r of state.receipts) if (ids.includes(r.id)) r.batchId = batchId;
      state.nextBatchId = Math.max(state.nextBatchId, batchId + 1);
      save();
    },
  };
}

export type PayPalStore = ReturnType<typeof createPayPalStore>;
