// Preview: the public impact ledger, working end to end on a LOCAL TEST BLOCKCHAIN.
// - The fingerprints and checks are real (SHA-256 + Merkle proof, src/lib/ledger.js).
// - "Publish" sends a real transaction to the local Hardhat chain that `npm run dev` starts; the
//   server computes the batch code itself and stores it in the ImpactLedger contract.
// - "Verify" checks a receipt against the code read back from the chain.
// - The last step shows the REAL receipts from PayPal sandbox donations and payouts and seals them.
// The first steps use sample receipts, and the "wallet" is Hardhat's built-in test account.
import React, { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Link2, Loader2, ShieldQuestion, UploadCloud } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import ChainExplorer from './ChainExplorer.jsx';
import LivePayPalReceipts from './LivePayPalReceipts.jsx';
import { money } from '../lib/model.js';
import { buildTree, proofFor, short, verifyReceipt } from '../lib/ledger.js';
import { publishBatch, readBatch } from '../lib/ledgerApi.js';

const BATCH_ID = 1; // the sample batch's number on the chain
const NETWORK = 'Local test chain · fake ETH';

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
  const [onChain, setOnChain] = useState(null); // the batch as stored on the blockchain
  const [publishing, setPublishing] = useState(false);
  const [chainNote, setChainNote] = useState(''); // e.g. "the local blockchain isn't running"

  useEffect(() => {
    buildTree(receipts).then(setTree);
    // Already published earlier? Then show it straight away.
    readBatch(BATCH_ID).then((reply) => {
      if (reply.ok) setOnChain(reply.batch); // null if not published yet
      else setChainNote(reply.message);
    });
  }, []);

  const publish = async () => {
    setPublishing(true);
    setChainNote('');
    const reply = await publishBatch(BATCH_ID, receipts);
    setPublishing(false);
    if (reply.ok) setOnChain(reply.batch);
    else setChainNote(reply.message);
  };
  useEffect(() => {
    setAmount(receipts[pick].amount);
    setResult(null);
  }, [pick]);

  // Checks against the code stored on the blockchain if published, else the local batch code.
  const check = async () => {
    const edited = { ...receipts[pick], amount: Number(amount) };
    const root = onChain ? onChain.root : tree.root;
    setResult(await verifyReceipt(edited, proofFor(tree.levels, pick), root));
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
      title: 'One code for the whole batch, sealed on a blockchain',
      render: () => (
        <div className="stack">
          <div className="walk-grid">
            <div className="stack">
              <p>
                Fingerprints are paired up and fingerprinted again, until one code is left: the
                batch root. Only this code and the totals are published to the blockchain, where
                nobody can change them.
              </p>
              <p className="root-box">
                <Link2 size={20} strokeWidth={2.75} aria-hidden="true" />
                <span className="mono" data-testid="batch-root">{tree ? short(tree.root) : '…'}</span>
              </p>
            </div>
            <div className="card mini-card">
              <span>Batch totals</span>
              <span>Donated {money(totals.donation)}</span>
              <span>Rewarded {money(totals.reward)}</span>
              <span>Paid out {money(totals.payout)}</span>
            </div>
          </div>
          {onChain ? (
            <ChainExplorer batch={onChain} network={NETWORK} />
          ) : (
            <div className="publish-row">
              <button className="btn btn-green" onClick={publish} disabled={publishing || !tree}>
                {publishing ? (
                  <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" />
                ) : (
                  <UploadCloud size={20} strokeWidth={2.75} aria-hidden="true" />
                )}
                {publishing ? 'Publishing…' : 'Publish to the blockchain'}
              </button>
              <span className="hint">
                Runs on a local test blockchain on this computer. The wallet is a built-in test
                account with fake ETH.
              </span>
            </div>
          )}
          {onChain && tree && onChain.root !== tree.root && (
            <p className="verify-result bad" role="status">
              <CircleX size={22} strokeWidth={2.75} aria-hidden="true" /> The blockchain holds a
              different code for batch {BATCH_ID}: these receipts were changed after publishing.
            </p>
          )}
          {chainNote && (
            <p className="chat-notice" role="status">
              {chainNote}
            </p>
          )}
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
                  <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" />
                  {onChain && onChain.tx
                    ? `Matches the code stored on the blockchain in block #${onChain.tx.blockNumber}. This receipt hasn’t been changed.`
                    : 'Matches the batch code. This receipt hasn’t been changed. (Publish it in step 2 to check against the blockchain too.)'}
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
      title: 'Now with real PayPal receipts',
      render: () => <LivePayPalReceipts network={NETWORK} />,
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
      realNote={
        <>
          <strong>Working on a local test blockchain.</strong> Real contract and transactions, fake ETH; step 4 uses your PayPal sandbox payments.
        </>
      }
      live={[
        'Real: the SHA-256 and Merkle maths, the ImpactLedger contract, and publishing to a local Hardhat chain.',
        'Real: PayPal sandbox donations and payouts become receipts and are sealed in their own batches (step 4).',
        'Next: rewards from a real database, sealed into a batch every day.',
        'Next: the same contract on a public network (Base Sepolia first), so anyone in the world can check, not just this computer.',
        'Kid references are salted codes kept on the server, so nobody can trace a kid from the chain.',
        'Next: donors get a link to check their own receipt, exactly like the check above.',
        'Two adults still approve payouts; the chain records, it doesn’t decide.',
      ]}
    />
  );
}
