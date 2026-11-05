// The impact ledger's last step: the REAL receipts from PayPal sandbox donations and payouts
// made on this server, sealed on the local blockchain. The server publishes its own records
// (the browser sends nothing), then this page rebuilds the batch code from the receipts and
// checks it against the code read back from the chain.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, CircleX, Loader2, UploadCloud } from 'lucide-react';
import ChainExplorer from './ChainExplorer.jsx';
import { buildTree } from '../lib/ledger.js';
import { publishLiveReceipts } from '../lib/ledgerApi.js';
import { dollars, liveReceipts } from '../lib/paypalApi.js';

export default function LivePayPalReceipts({ network }) {
  const [receipts, setReceipts] = useState(null);
  const [published, setPublished] = useState(null); // { batch, receipts } just sealed
  const [matches, setMatches] = useState(null);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState('');

  const load = () => liveReceipts().then((reply) => (reply.ok ? setReceipts(reply.receipts) : setNote(reply.message)));
  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    setWorking(true);
    setNote('');
    const reply = await publishLiveReceipts();
    setWorking(false);
    if (!reply.ok) return setNote(reply.message);
    setPublished(reply);
    // Rebuild the code from the receipts in the browser and compare with what the chain stored.
    const { root } = await buildTree(reply.receipts);
    setMatches(root === reply.batch.root);
    load();
  };

  if (!receipts) return <p className="hint">{note || 'Loading PayPal receipts…'}</p>;
  if (receipts.length === 0) {
    return (
      <p className="chat-notice" data-testid="live-empty">
        No PayPal sandbox payments on this server yet. <Link to="/soon/donate">Donate with PayPal</Link> or{' '}
        <Link to="/soon/payout">send a payout</Link>, then come back.
      </p>
    );
  }
  const waiting = receipts.filter((r) => r.batchId === null && r.status !== 'SENDING').length;

  return (
    <div className="stack">
      <p>
        These came from real PayPal sandbox calls on this server: dollars are test money. People appear only as codes; the PayPal
        id lets the NGO look each one up.
      </p>
      <div className="table-wrap" data-lenis-prevent>
        <table className="ledger-table" data-testid="live-receipts">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Code</th>
              <th>PayPal id</th>
              <th>Batch</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.type}</td>
                <td>{dollars(r.amount)}</td>
                <td className="mono">{r.ref}</td>
                <td className="mono">{r.paypalId}</td>
                <td>{r.batchId ? `#${r.batchId}` : 'not yet'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {waiting > 0 && (
        <div className="publish-row">
          <button className="btn btn-green" onClick={publish} disabled={working}>
            {working ? <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" /> : <UploadCloud size={20} strokeWidth={2.75} aria-hidden="true" />}
            {working ? 'Publishing…' : `Publish ${waiting} PayPal receipt${waiting === 1 ? '' : 's'} to the blockchain`}
          </button>
          <span className="hint">The server seals its own records; nothing you send can change them.</span>
        </div>
      )}
      {published && (
        <>
          <ChainExplorer batch={published.batch} network={network} />
          <p className={matches ? 'verify-result ok' : 'verify-result bad'} role="status">
            {matches ? <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" /> : <CircleX size={22} strokeWidth={2.75} aria-hidden="true" />}
            {matches
              ? `Batch #${published.batch.batchId}: the code rebuilt from these PayPal receipts matches the blockchain.`
              : `Batch #${published.batch.batchId}: the code on the blockchain doesn’t match these receipts.`}
          </p>
        </>
      )}
      {note && (
        <p className="chat-notice" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
