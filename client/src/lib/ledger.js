// Real tamper-evidence maths for the impact-ledger preview, on sample data.
// Each receipt gets a SHA-256 "fingerprint". Fingerprints are paired and hashed again, up to a
// single "Merkle root". Publishing only the root (on a blockchain, later) lets anyone check one
// receipt with a short proof, without seeing the others, and any edit changes the root.
// Uses the Web Crypto API, which exists in browsers and in Node 20+.

const encoder = new TextEncoder();

export async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The exact text that gets fingerprinted. No names: kids appear only as a pseudonymous code.
// "v2" = this format; `currency` (INR or USD) says what the amount counts.
// Must match server/src/ledger/merkle.ts (a server test checks they agree).
export const receiptText = (r) => `v2|${r.id}|${r.type}|${r.amount}|${r.currency}|${r.date}|${r.ref}`;

export const leafHash = (receipt) => sha256(`leaf:${receiptText(receipt)}`);
const pairHash = (left, right) => sha256(`node:${left}${right}`);

// Builds every level of the tree: levels[0] = leaves, last level = [root].
export async function buildTree(receipts) {
  let level = await Promise.all(receipts.map(leafHash));
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      // An odd one out is paired with itself.
      next.push(await pairHash(level[i], level[i + 1] ?? level[i]));
    }
    levels.push(next);
    level = next;
  }
  return { levels, root: level[0] };
}

// The sibling fingerprints needed to climb from one receipt to the root.
export function proofFor(levels, index) {
  const proof = [];
  for (let depth = 0; depth < levels.length - 1; depth++) {
    const level = levels[depth];
    const isRight = index % 2 === 1;
    const sibling = isRight ? level[index - 1] : (level[index + 1] ?? level[index]);
    proof.push({ hash: sibling, side: isRight ? 'left' : 'right' });
    index = Math.floor(index / 2);
  }
  return proof;
}

// Recomputes the root from one receipt and its proof. True only if nothing was changed.
export async function verifyReceipt(receipt, proof, root) {
  let hash = await leafHash(receipt);
  for (const step of proof) {
    hash = step.side === 'left' ? await pairHash(step.hash, hash) : await pairHash(hash, step.hash);
  }
  return hash === root;
}

export const short = (hash) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;
