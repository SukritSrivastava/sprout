// Preview: the public impact ledger. The fingerprints and checks here are REAL (SHA-256 and a
// Merkle proof, computed in your browser); only the receipts are sample data and nothing is on a
// blockchain yet. See src/lib/ledger.js for the maths.
import React, { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Link2, ShieldQuestion } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { money } from '../lib/model.js';
import { buildTree, proofFor, short, verifyReceipt } from '../lib/ledger.js';

const receipts = [
  { id: 'DON-2611-0042', type: 'donation', amount: 500, date: '2026-11-03', ref: 'donor-7f2' },
  { id: 'RWD-2611-0108', type: 'reward', amount: 200, date: '2026-11-03', ref: 'kid-a12' },
  { id: 'RWD-2611-0109', type: 'reward', amount: 150, date: '2026-11-04', ref: 'kid-b07' },
  { id: 'PAY-2611-0015', type: 'payout', amount: 600, date: '2026-11-04', ref: 'kid-a12' },
  { id: 'DON-2611-0043', type: 'donation', amount: 2500, date: '2026-11-05', ref: 'donor-1c9' },
  { id: 'RWD-2611-0110', type: 'reward', amount: 200, date: '2026-11-05', ref: 'kid-c33' },
];

export default function ImpactLedger() {
  const [tree, setTree] = useState(null);
  const [pick, setPick] = useState(1);
  const [amount, setAmount] = useState(receipts[1].amount);
  const [result, setResult] = useState(null); // null | true | false

  useEffect(() => {
    buildTree(receipts).then(setTree);
  }, []);
  useEffect(() => {
    setAmount(receipts[pick].amount);
    setResult(null);
  }, [pick]);

  const check = async () => {
    const edited = { ...receipts[pick], amount: Number(amount) };
    setResult(await verifyReceipt(edited, proofFor(tree.levels, pick), tree.root));
  };
  const totals = receipts.reduce((sum, r) => ({ ...sum, [r.type]: (sum[r.type] ?? 0) + r.amount }), {});

  const steps = [
    {
      title: 'Every receipt gets a fingerprint',
      render: () => (
        <div className="stack">
          <p>
            Each donation, reward and payout becomes a receipt. A fingerprint (SHA-256) is made from
            it. Kids appear only as codes like “kid-a12”.
          </p>
          <div className="table-wrap" data-lenis-prevent>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Fingerprint</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, i) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td>{r.type}</td>
                    <td>{money(r.amount)}</td>
                    <td className="mono">{tree ? short(tree.levels[0][i]) : '…'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'One code for the whole batch',
      render: () => (
        <div className="walk-grid">
          <div className="stack">
            <p>
              Fingerprints are paired up and fingerprinted again, until one code is left: the batch
              root. Only this root and the totals go on a public blockchain (Base Sepolia, a test
              network).
            </p>
            <p className="root-box">
              <Link2 size={20} strokeWidth={2.75} aria-hidden="true" />
              <span className="mono" data-testid="batch-root">{tree ? short(tree.root) : '…'}</span>
            </p>
            <span className="tag tag-yellow">Testnet preview · not actually published</span>
          </div>
          <div className="card mini-card">
            <span>Batch totals</span>
            <span>Donated {money(totals.donation)}</span>
            <span>Rewarded {money(totals.reward)}</span>
            <span>Paid out {money(totals.payout)}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Check a receipt yourself',
      render: () => (
        <div className="stack">
          <p>
            Pick a receipt. Its short proof is enough to rebuild the root. Then try changing the
            amount, as a cheat would, and check again.
          </p>
          <div className="verify-row">
            <label>
              Receipt
              <select value={pick} onChange={(event) => setPick(Number(event.target.value))}>
                {receipts.map((r, i) => (
                  <option key={r.id} value={i}>
                    {r.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                type="number"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setResult(null);
                }}
              />
            </label>
            <button className="btn btn-sm btn-ink" onClick={check} disabled={!tree}>
              Verify
            </button>
          </div>
          <p className="hint">Proof: {tree ? proofFor(tree.levels, pick).map((p) => short(p.hash)).join(' → ') : '…'}</p>
          {result !== null && (
            <p className={result ? 'verify-result ok' : 'verify-result bad'} role="status">
              {result ? (
                <>
                  <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" /> Matches the published
                  root. This receipt hasn’t been changed.
                </>
              ) : (
                <>
                  <CircleX size={22} strokeWidth={2.75} aria-hidden="true" /> Doesn’t match. This receipt
                  was changed after it was published.
                </>
              )}
            </p>
          )}
        </div>
      ),
    },
    {
      title: 'What this proves, and what it doesn’t',
      render: () => (
        <div className="walk-grid">
          <div className="card mini-card proves">
            <strong>Proves</strong>
            <span>Records weren’t edited after they were published.</span>
            <span>Totals add up to the receipts in the batch.</span>
          </div>
          <div className="card mini-card proves-not">
            <ShieldQuestion size={24} strokeWidth={2.5} aria-hidden="true" />
            <strong>Doesn’t prove</strong>
            <span>That an activity really happened. People still check that.</span>
            <span>Anything about who a kid is. No personal data goes on chain.</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="impact"
      title="Public impact ledger"
      intro="Anyone can check that donated money went where sprout.io says it did, without seeing any kid’s details."
      color="var(--peach)"
      steps={steps}
      live={[
        'Receipts are grouped into batches; each batch root and its totals go on Base Sepolia, then a main network.',
        'Kid references are salted codes kept on the server, so nobody can trace a kid from the chain.',
        'Donors get a link to check their own receipt, exactly like the check above.',
        'Two adults still approve payouts; the chain records, it doesn’t decide.',
      ]}
    />
  );
}
