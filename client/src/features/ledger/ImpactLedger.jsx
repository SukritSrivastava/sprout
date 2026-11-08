// Public impact ledger: local demo or a fixed shared test-chain deployment.
// - The fingerprints and checks are real (SHA-256 + Merkle proof, src/features/ledger/merkle.js).
// - "Publish" sends a real transaction to the local Hardhat chain that `npm run dev` starts; the
//   server computes the batch code itself and stores it in the ImpactLedger contract.
// - "Verify" checks a receipt against the code read back from the chain.
// - The last step shows the REAL receipts from PayPal sandbox donations and payouts and seals them.
// The first steps use sample receipts, and the "wallet" is Hardhat's built-in test account.
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Link2, Loader2, ShieldQuestion, UploadCloud } from 'lucide-react';
import Walkthrough from '../../shared/components/Walkthrough.jsx';
import ChainExplorer from './ChainExplorer.jsx';
import LivePayPalReceipts from './LivePayPalReceipts.jsx';
import { money } from '../practice/model.js';
import { buildTree, proofFor, short, verifyReceipt } from './merkle.js';
import { readBatch } from './api.js';
import { SAMPLE_BATCH_ID, sampleReceipts } from './sampleReceipts.js';
import { useLedgerAccess } from './useLedgerAccess.js';
import { LedgerAccess,PublicationProgress } from './LedgerControls.jsx';
import { ledgerPublication } from '../../content/ledger-publication.js';

const BATCH_ID = SAMPLE_BATCH_ID; // the sample batch's number on the chain
const receipts = sampleReceipts;

export default function ImpactLedger() {
  const { t,language } = useLanguage();
  const access=useLedgerAccess(), ledgerText=ledgerPublication[language];
  const fixedNote=access.network?.chainId===84532?ledgerText.baseNote:ledgerText.localFixedNote;
  const [job,setJob]=useState(null);

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
  }, []);
  useEffect(()=>{
    if(!access.network || access.network.publicationMode==='unavailable')return;
    readBatch(BATCH_ID,access.staff?access.network:undefined).then((reply) => {
      if (reply.ok)
        setOnChain(reply.batch); // null if not published yet
      else setChainNote(reply.message);
    });
    if(access.network.activeJob?.kind==='sample')setJob(access.network.activeJob);
  }, [access.network]);

  const publish = async (resume=false) => {
    setPublishing(true);
    setChainNote('');
    const reply = await access.request(resume?`jobs/${job.id}/resume`:'publish',resume?{}:{batchId:BATCH_ID,receipts});
    setPublishing(false);
    if(reply.job)setJob(reply.job);
    if (reply.ok && reply.batch) setOnChain(reply.batch);
    else setChainNote(reply.message);
  };
  useEffect(() => {
    setAmount(receipts[pick].amount);
    setResult(null);
  }, [pick]);

  // Checks against the code stored on the blockchain if published, else the local batch code.
  const check = async () => {
    if(access.staff && onChain && (onChain.identity?.chainId!==access.network.chainId || onChain.identity?.contract?.toLowerCase()!==access.network.contract?.toLowerCase())) {
      setResult(false);setChainNote(ledgerText.scope);return;
    }
    const edited = { ...receipts[pick], amount: Number(amount) };
    const root = onChain ? onChain.root : tree.root;
    setResult(await verifyReceipt(edited, proofFor(tree.levels, pick), root));
  };
  const totals = receipts.reduce(
    (sum, r) => ({ ...sum, [r.type]: (sum[r.type] ?? 0) + r.amount }),
    {},
  );

  const steps = [
    {
      title: 'Every receipt gets a fingerprint',
      render: () => (
        <div className="stack">
          <p>
            {t(
              'Each donation, reward and payout becomes a receipt. A fingerprint (SHA-256) is made from it. Kids appear only as codes like “kid-a12”.',
            )}
          </p>
          <div className="table-wrap" data-lenis-prevent>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{t('Receipt')}</th>
                  <th>{t('Type')}</th>
                  <th>{t('Amount')}</th>
                  <th>{t('Fingerprint')}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, i) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td>{t(r.type)}</td>
                    <td>{money(r.amount)}</td>
                    <td className="mono">{t(tree ? short(tree.levels[0][i]) : '…')}</td>
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
                {t(
                  'Fingerprints are paired up and fingerprinted again, until one code is left: the batch root. Only this code and the totals are published to the blockchain, where nobody can change them.',
                )}
              </p>
              <p className="root-box">
                <Link2 size={20} strokeWidth={2.75} aria-hidden="true" />
                <span className="mono" data-testid="batch-root">
                  {t(tree ? short(tree.root) : '…')}
                </span>
              </p>
            </div>
            <div className="card mini-card">
              <span>{t('Batch totals')}</span>
              <span>
                {t('Donated ')}
                {money(totals.donation)}
              </span>
              <span>
                {t('Rewarded ')}
                {money(totals.reward)}
              </span>
              <span>
                {t('Paid out ')}
                {money(totals.payout)}
              </span>
            </div>
          </div>
          {onChain ? (
            <ChainExplorer batch={onChain} network={access.label} />
          ) : (
            <div className="publish-row">
              <button className="btn btn-green" onClick={()=>publish()} disabled={publishing || !tree || !access.canPublish || Boolean(job&&job.state!=='confirmed')}>
                {publishing ? (
                  <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" />
                ) : (
                  <UploadCloud size={20} strokeWidth={2.75} aria-hidden="true" />
                )}
                {t(publishing ? 'Publishing…' : 'Publish to the blockchain')}
              </button>
              <span className="hint">
                {access.staff?fixedNote:t(
                  'Runs on a local test blockchain on this computer. The wallet is a built-in test account with fake ETH.',
                )}
              </span>
            </div>
          )}
          {(!onChain||access.unlocked)&&<LedgerAccess access={access}/>}
          <PublicationProgress job={job} access={access} busy={publishing} onResume={()=>publish(true)}/>
          {onChain && tree && onChain.root !== tree.root && (
            <p className="verify-result bad" role="status">
              <CircleX size={22} strokeWidth={2.75} aria-hidden="true" />
              {t(' The blockchain holds a different code for batch ')}
              {t(BATCH_ID)}
              {t(': these receipts were changed after publishing.')}
            </p>
          )}
          {chainNote && (
            <p className="chat-notice" role="status">
              {t(chainNote)}
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
            {t(
              'Pick a receipt. Its short proof is enough to rebuild the root. Then try changing the amount, as a cheat would, and check again.',
            )}
          </p>
          <div className="verify-row">
            <label>
              {t('Receipt')}
              <select value={pick} onChange={(event) => setPick(Number(event.target.value))}>
                {receipts.map((r, i) => (
                  <option key={r.id} value={i}>
                    {r.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Amount (₹)')}
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
              {t('Verify')}
            </button>
          </div>
          <p className="hint">
            {t('Proof: ')}
            {t(
              tree
                ? proofFor(tree.levels, pick)
                    .map((p) => short(p.hash))
                    .join(' → ')
                : '…',
            )}
          </p>
          {result !== null && (
            <p className={result ? 'verify-result ok' : 'verify-result bad'} role="status">
              {result ? (
                <>
                  <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" />
                  {t(
                    onChain && onChain.tx
                      ? t(
                          'Matches the code stored on the blockchain in block #{0}. This receipt hasn’t been changed.',
                          [onChain.tx.blockNumber],
                        )
                      : 'Matches the batch code. This receipt hasn’t been changed. (Publish it in step 2 to check against the blockchain too.)',
                  )}
                </>
              ) : (
                <>
                  <CircleX size={22} strokeWidth={2.75} aria-hidden="true" />
                  {t(' Doesn’t match. This receipt was changed after it was published.')}
                </>
              )}
            </p>
          )}
          {result===false&&chainNote&&<p className="chat-notice" role="alert">{t(chainNote)}</p>}
        </div>
      ),
    },
    {
      title: 'Now with real PayPal receipts',
      render: () => <LivePayPalReceipts network={access.label} access={access} />,
    },
    {
      title: 'What this proves, and what it doesn’t',
      render: () => (
        <div className="walk-grid">
          <div className="card mini-card proves">
            <strong>{t('Proves')}</strong>
            <span>{t('Records weren’t edited after they were published.')}</span>
            <span>{t('Totals add up to the receipts in the batch.')}</span>
          </div>
          <div className="card mini-card proves-not">
            <ShieldQuestion size={24} strokeWidth={2.5} aria-hidden="true" />
            <strong>{t('Doesn’t prove')}</strong>
            <span>{t('That an activity really happened. People still check that.')}</span>
            <span>{t('Anything about who a kid is. No personal data goes on chain.')}</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="impact"
      title={t('Public impact ledger')}
      intro={t(
        'Anyone can check that donated money went where sprout.io says it did, without seeing any kid’s details.',
      )}
      color="var(--peach)"
      steps={steps}
      realNote={
        <>
          <strong>{access.staff?fixedNote:access.network?.publicationMode==='unavailable'?ledgerText.unavailable:t('Working on a local test blockchain.')}</strong>
          {t(
            ' Real contract and transactions, fake ETH; step 4 uses your PayPal sandbox payments.',
          )}
        </>
      }
      live={access.staff?[ledgerText.publicDetail]:[
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
