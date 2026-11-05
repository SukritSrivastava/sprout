// The receipt maths on the server: exactly the same as client/src/lib/ledger.js (a test checks
// they agree), so the server computes the batch code itself instead of trusting the browser.
//   receipt → fingerprint (SHA-256) → pairs combined → one batch root
import { createHash } from 'node:crypto';

export type Receipt = { id: string; type: 'donation' | 'reward' | 'payout'; amount: number; date: string; ref: string };

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const receiptText = (r: Receipt) => `${r.id}|${r.type}|${r.amount}|${r.date}|${r.ref}`;

export const leafHash = (receipt: Receipt) => sha256(`leaf:${receiptText(receipt)}`);
const pairHash = (left: string, right: string) => sha256(`node:${left}${right}`);

// Returns the batch root as 64 hex characters (no 0x).
export function batchRoot(receipts: Receipt[]): string {
  let level = receipts.map(leafHash);
  while (level.length > 1) {
    const next: string[] = [];
    // An odd one out is paired with itself, same as the website.
    for (let i = 0; i < level.length; i += 2) next.push(pairHash(level[i], level[i + 1] ?? level[i]));
    level = next;
  }
  return level[0];
}

// The public totals stored next to the root.
export function batchTotals(receipts: Receipt[]) {
  const sum = (type: Receipt['type']) =>
    receipts.filter((r) => r.type === type).reduce((total, r) => total + r.amount, 0);
  return { donated: sum('donation'), rewarded: sum('reward'), paidOut: sum('payout'), receipts: receipts.length };
}
