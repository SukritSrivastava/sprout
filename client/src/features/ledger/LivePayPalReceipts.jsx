// The impact ledger's last step: the REAL receipts from PayPal sandbox donations and payouts
// made on this server, sealed on the selected test chain. The server publishes its own records
// (the browser sends nothing), then this page rebuilds the batch code from the receipts and
// checks it against the code read back from the chain.
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, CircleX, Loader2, UploadCloud } from 'lucide-react';
import ChainExplorer from './ChainExplorer.jsx';
import { buildTree } from './merkle.js';
import { publishLiveReceipts } from './api.js';
import { dollars, liveReceipts } from '../payments/api.js';
import { LedgerAccess,PublicationProgress } from './LedgerControls.jsx';
import { ledgerPublication } from '../../content/ledger-publication.js';

export default function LivePayPalReceipts({ network,access }) {
  const { t, language } = useLanguage();
  const copy = ledgerPublication[language];

  const [receipts, setReceipts] = useState(null);
  const [published, setPublished] = useState(null); // { batch, receipts } just sealed
  const [matches, setMatches] = useState(null);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState('');
  const [pendingCount,setPendingCount]=useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [job,setJob]=useState(access?.network?.activeJob?.kind==='live'?access.network.activeJob:null);

  const load = () => liveReceipts().then((reply) => {
    if(!reply.ok){setNote(reply.message);return;}
    setReceipts(reply.receipts);setPendingCount(reply.pendingCount??null);setNextCursor(reply.nextCursor??null);
  });
  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true); setNote('');
    try {
      const reply = await liveReceipts(nextCursor);
      if (!reply.ok) { setNote(reply.message); return; }
      setReceipts(current => {
        const ids = new Set(current.map(receipt => receipt.id));
        return [...reply.receipts.filter(receipt => !ids.has(receipt.id)), ...current];
      });
      setNextCursor(reply.nextCursor ?? null);
      setPendingCount(reply.pendingCount ?? null);
    } finally { setLoadingOlder(false); }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(()=>{
    if(access?.network?.activeJob?.kind==='live')setJob(access.network.activeJob);
  },[access?.network]);

  const publish = async (resume=false) => {
    setWorking(true);
    setNote('');
    const reply = access?await access.request(resume?`jobs/${job.id}/resume`:'publish-live'):await publishLiveReceipts();
    setWorking(false);
    if(reply.job)setJob(reply.job);
    if (!reply.ok) return setNote(reply.message);
    if(!reply.batch)return;
    setPublished(reply);
    // Rebuild the code from the receipts in the browser and compare with what the chain stored.
    const { root } = await buildTree(reply.receipts);
    const scoped=!access?.staff || (reply.batch.identity?.chainId===access.network.chainId && reply.batch.identity?.contract?.toLowerCase()===access.network.contract?.toLowerCase());
    setMatches(root === reply.batch.root && scoped);
    load();
  };

  if (!receipts) return <p className="hint">{t(note || 'Loading PayPal receipts…')}</p>;
  if (receipts.length === 0) {
    return (
      <p className="chat-notice" data-testid="live-empty">
        {t('No PayPal sandbox payments on this server yet. ')}
        <Link to="/soon/donate">{t('Donate with PayPal')}</Link>
        {t(' or')}
        {t(' ')}
        <Link to="/soon/payout">{t('send a payout')}</Link>
        {t(', then come back.')}
      </p>
    );
  }
  const waiting = pendingCount??receipts.filter(
    (r) =>
      r.batchId === null &&
      (r.type === 'donation' ? r.status === 'COMPLETED' : r.status === 'SUCCESS'),
  ).length;

  return (
    <div className="stack">
      <p>
        {t(
          'These came from real PayPal sandbox calls on this server: dollars are test money. People appear only as codes, and PayPal’s own ids stay private with the NGO.',
        )}
      </p>
      <div className="table-wrap" data-lenis-prevent>
        <table className="ledger-table" data-testid="live-receipts">
          <thead>
            <tr>
              <th>{t('Receipt')}</th>
              <th>{t('Type')}</th>
              <th>{t('Amount')}</th>
              <th>{t('Code')}</th>
              <th>{t('Status')}</th>
              <th>{t('Batch')}</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{t(r.type)}</td>
                <td>{dollars(r.amount)}</td>
                <td className="mono">{r.ref}</td>
                <td>{t(r.status)}</td>
                <td>{t(r.batchId ? `#${r.batchId}` : 'not yet')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="publish-row">
        <span className="hint" aria-live="polite">{t(copy.receiptCount, [receipts.length])}</span>
        {nextCursor && <button className="btn" onClick={loadOlder} disabled={loadingOlder || working}>
          {loadingOlder ? copy.loadingOlder : copy.older}
        </button>}
      </div>
      {waiting > 0 && (
        <div className="publish-row">
          <button className="btn btn-green" onClick={()=>publish()} disabled={working || loadingOlder || (access&&!access.canPublish) || Boolean(job&&job.state!=='confirmed')}>
            {working ? (
              <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" />
            ) : (
              <UploadCloud size={20} strokeWidth={2.75} aria-hidden="true" />
            )}
            {t(
              working
                ? 'Publishing…'
                : t('Publish {0} PayPal receipt{1} to the blockchain', [
                    Math.min(waiting,64),
                    waiting === 1 ? '' : 's',
                  ]),
            )}
          </button>
          <span className="hint">
            {t(
              'Only completed donations and successful payouts are sealed. Refresh payout status on the payout page first.',
            )}
          </span>
        </div>
      )}
      {access&&<LedgerAccess access={access}/>}
      <PublicationProgress job={job} access={access} busy={working} onResume={()=>publish(true)}/>
      {published && (
        <>
          <ChainExplorer batch={published.batch} network={network} />
          <p className={matches ? 'verify-result ok' : 'verify-result bad'} role="status">
            {matches ? (
              <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" />
            ) : (
              <CircleX size={22} strokeWidth={2.75} aria-hidden="true" />
            )}
            {t(
              matches
                ? t(
                    'Batch #{0}: the code rebuilt from these PayPal receipts matches the blockchain.',
                    [published.batch.batchId],
                  )
                : t('Batch #{0}: the code on the blockchain doesn’t match these receipts.', [
                    published.batch.batchId,
                  ]),
            )}
          </p>
        </>
      )}
      {note && (
        <p className="chat-notice" role="status">
          {t(note)}
        </p>
      )}
    </div>
  );
}
