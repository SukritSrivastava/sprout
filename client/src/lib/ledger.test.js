// Unit tests for ledger.js: real SHA-256 fingerprints, every receipt verifies against the batch
// root, and any edit to a receipt makes verification fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTree, proofFor, verifyReceipt, sha256 } from './ledger.js';

const receipts = Array.from({ length: 5 }, (_, i) => ({
  id: `R-${i + 1}`,
  type: i % 2 ? 'reward' : 'donation',
  amount: 100 * (i + 1),
  currency: 'INR',
  date: '2026-11-05',
  ref: `kid-${i}`,
}));

test('sha256 matches the known value for "abc"', async () => {
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('every receipt verifies against the root, including the odd one out', async () => {
  const { levels, root } = await buildTree(receipts);
  for (const [i, receipt] of receipts.entries()) {
    assert.equal(await verifyReceipt(receipt, proofFor(levels, i), root), true, receipt.id);
  }
});

test('changing any field of a receipt makes verification fail', async () => {
  const { levels, root } = await buildTree(receipts);
  const proof = proofFor(levels, 2);
  for (const change of [{ amount: 3000 }, { type: 'reward' }, { date: '2026-11-06' }, { ref: 'kid-9' }, { currency: 'USD' }]) {
    assert.equal(await verifyReceipt({ ...receipts[2], ...change }, proof, root), false, JSON.stringify(change));
  }
});

test('changing one receipt changes the root', async () => {
  const before = (await buildTree(receipts)).root;
  const edited = receipts.map((r, i) => (i === 4 ? { ...r, amount: r.amount + 1 } : r));
  assert.notEqual((await buildTree(edited)).root, before);
});
