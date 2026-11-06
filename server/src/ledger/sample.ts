// The SAMPLE receipts the impact-ledger preview publishes as batch 1 (amounts in rupees).
// Same list as client/src/lib/sampleReceipts.js (a test checks they match). The sample publish
// route only accepts exactly these, so the public can't write their own text to the chain.
import type { Receipt } from './merkle.js';

export const SAMPLE_BATCH_ID = 1;

export const sampleReceipts: Receipt[] = [
  { id: 'DON-2611-0042', type: 'donation', amount: 500, currency: 'INR', date: '2026-11-03', ref: 'donor-7f2' },
  { id: 'RWD-2611-0108', type: 'reward', amount: 200, currency: 'INR', date: '2026-11-03', ref: 'kid-a12' },
  { id: 'RWD-2611-0109', type: 'reward', amount: 150, currency: 'INR', date: '2026-11-04', ref: 'kid-b07' },
  { id: 'PAY-2611-0015', type: 'payout', amount: 600, currency: 'INR', date: '2026-11-04', ref: 'kid-a12' },
  { id: 'DON-2611-0043', type: 'donation', amount: 2500, currency: 'INR', date: '2026-11-05', ref: 'donor-1c9' },
  { id: 'RWD-2611-0110', type: 'reward', amount: 200, currency: 'INR', date: '2026-11-05', ref: 'kid-c33' },
];
