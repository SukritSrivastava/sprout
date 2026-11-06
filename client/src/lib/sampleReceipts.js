// The SAMPLE receipts sealed as batch 1 in the impact-ledger preview (amounts in rupees).
// The server keeps the same list (server/src/ledger/sample.ts) and will only publish exactly
// these, so nobody can put their own text on the blockchain through the sample button.
// A server test checks both lists match: change both together.
export const SAMPLE_BATCH_ID = 1;

export const sampleReceipts = [
  { id: 'DON-2611-0042', type: 'donation', amount: 500, currency: 'INR', date: '2026-11-03', ref: 'donor-7f2' },
  { id: 'RWD-2611-0108', type: 'reward', amount: 200, currency: 'INR', date: '2026-11-03', ref: 'kid-a12' },
  { id: 'RWD-2611-0109', type: 'reward', amount: 150, currency: 'INR', date: '2026-11-04', ref: 'kid-b07' },
  { id: 'PAY-2611-0015', type: 'payout', amount: 600, currency: 'INR', date: '2026-11-04', ref: 'kid-a12' },
  { id: 'DON-2611-0043', type: 'donation', amount: 2500, currency: 'INR', date: '2026-11-05', ref: 'donor-1c9' },
  { id: 'RWD-2611-0110', type: 'reward', amount: 200, currency: 'INR', date: '2026-11-05', ref: 'kid-c33' },
];
