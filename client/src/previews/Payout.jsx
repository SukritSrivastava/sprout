// Payout to a guardian: LIVE on the PayPal sandbox (test money).
// A kid asks for money from the NGO's reward pool, two of three adults approve, and our server
// sends a real PayPal Payouts call to the guardian's PayPal account. The kid never needs a bank
// account. The pool is filled by real sandbox donations (/soon/donate).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Loader2, RefreshCw, Send, ShoppingBag } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { PayPalSetupNotice } from './PayPalButton.jsx';
import { dollars, paypalConfig, payoutStatus, sendPayout } from '../lib/paypalApi.js';

const adults = [
  { id: 'mentor', who: 'Mentor', name: 'Meera (sample)' },
  { id: 'admin', who: 'NGO admin', name: 'Rahul (sample)' },
  { id: 'guardian', who: 'Guardian', name: 'Aanya’s mother (sample)' },
];
const requestAmounts = [5, 8, 12]; // what Aanya can ask for, in dollars

// PayPal payout statuses in plain words.
const statusWords = {
  PENDING: 'On its way',
  PROCESSING: 'On its way',
  SUCCESS: 'Paid',
  UNCLAIMED: 'Sent; waiting for the guardian to claim it in PayPal',
  ONHOLD: 'On hold at PayPal',
  FAILED: 'Failed; the money went back to the pool',
  RETURNED: 'Returned; the money went back to the pool',
  BLOCKED: 'Blocked by PayPal; the money went back to the pool',
};

export default function Payout() {
  const [config, setConfig] = useState(null);
  const [ask, setAsk] = useState(8);
  const [approved, setApproved] = useState([]);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [payout, setPayout] = useState(null); // { receipt, poolDollars } after PayPal accepted it
  const [problem, setProblem] = useState('');
  const enough = approved.length >= 2;
  const pool = payout?.poolDollars ?? config?.poolDollars ?? 0;

  const loadConfig = () => paypalConfig().then((reply) => setConfig(reply.ok ? reply : { configured: false, poolDollars: 0 }));
  useEffect(() => {
    loadConfig();
  }, []);

  const toggle = (id) => setApproved((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setProblem('');
    const reply = await sendPayout(email.trim(), ask, approved);
    setSending(false);
    if (reply.ok) setPayout(reply);
    else setProblem(reply.message);
  };
  const refresh = async () => {
    const reply = await payoutStatus(payout.receipt.paypalId);
    if (reply.ok) setPayout(reply);
    else setProblem(reply.message);
  };

  const steps = [
    {
      title: 'Aanya asks for her money',
      render: () => (
        <div className="stack">
          <div className="card request-card">
            <ShoppingBag size={28} strokeWidth={2.5} aria-hidden="true" />
            <div>
              <strong>{dollars(ask)} for school shoes</strong>
              <p>From her Save jar · sample request</p>
            </div>
            <span className="tag tag-yellow">
              <Clock size={16} strokeWidth={2.75} aria-hidden="true" /> Waiting for adults
            </span>
          </div>
          <div className="chips" role="group" aria-label="Amount Aanya asks for">
            {requestAmounts.map((value) => (
              <button key={value} className="chip" aria-pressed={ask === value} onClick={() => setAsk(value)} disabled={Boolean(payout)}>
                {dollars(value)}
              </button>
            ))}
          </div>
          <p className="hint" data-testid="pool">
            NGO reward pool: <strong>{dollars(pool)}</strong> in test money, from real sandbox donations.{' '}
            {pool < ask && <Link to="/soon/donate">Donate with PayPal first →</Link>}
          </p>
        </div>
      ),
    },
    {
      title: 'Two of three adults approve',
      render: () => (
        <div className="stack">
          <p>Tap to approve as each adult. Any two are enough, and no one can approve twice.</p>
          <ul className="approver-list">
            {adults.map((adult) => (
              <li key={adult.id}>
                <button className="approver" aria-pressed={approved.includes(adult.id)} onClick={() => toggle(adult.id)} disabled={Boolean(payout)}>
                  <span className="approver-check">{approved.includes(adult.id) && <Check size={18} strokeWidth={3} />}</span>
                  <span>
                    <strong>{adult.who}</strong> · {adult.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="approval-status" role="status">
            {enough ? `${approved.length} of 3 approved. The payout can go ahead.` : `${approved.length} of 3 approved. Needs 2.`}
          </p>
        </div>
      ),
    },
    {
      title: 'Paid to the guardian with PayPal',
      render: () => {
        if (config && !config.configured) return <PayPalSetupNotice />;
        if (payout) {
          const { receipt } = payout;
          return (
            <div className="stack center-block" data-testid="payout-result">
              <Send size={34} strokeWidth={2.5} aria-hidden="true" />
              <p>
                <strong>{dollars(receipt.amount)}</strong> sent to the guardian’s PayPal account. Aanya never needs a bank account.
              </p>
              <span className="tag tag-green">PayPal: {statusWords[receipt.status] ?? receipt.status}</span>
              <dl className="receipt-inline">
                <dt>Receipt</dt>
                <dd className="mono">{receipt.id}</dd>
                <dt>PayPal payout batch</dt>
                <dd className="mono">{receipt.paypalId}</dd>
                <dt>Guardian code</dt>
                <dd className="mono">{receipt.ref}</dd>
              </dl>
              <button className="btn btn-sm btn-white" onClick={refresh}>
                <RefreshCw size={18} strokeWidth={2.75} aria-hidden="true" /> Check status with PayPal
              </button>
              <p className="hint">
                Pool now {dollars(payout.poolDollars)}. <Link to="/soon/impact">Seal it on the blockchain →</Link>
              </p>
            </div>
          );
        }
        return (
          <form className="stack" onSubmit={send}>
            {!enough && <p className="chat-notice">Go back and approve as two adults first. Without two approvals, nothing is paid.</p>}
            <label className="field">
              Guardian’s PayPal email (a sandbox <em>personal</em> account)
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sb-xxxxx@personal.example.com"
                autoComplete="off"
              />
            </label>
            <p className="hint">
              Find one under Sandbox accounts at developer.paypal.com. The email only goes to PayPal; the receipt keeps a code.
            </p>
            <button className="btn btn-green" type="submit" disabled={!enough || sending || pool < ask}>
              {sending ? <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" /> : <Send size={20} strokeWidth={2.75} aria-hidden="true" />}
              {sending ? 'Sending with PayPal…' : `Send ${dollars(ask)} with PayPal Payouts`}
            </button>
            {pool < ask && (
              <p className="hint">
                The pool has {dollars(pool)}. <Link to="/soon/donate">Donate with PayPal first →</Link>
              </p>
            )}
            {problem && (
              <p className="chat-notice" role="alert">
                {problem}
              </p>
            )}
          </form>
        );
      },
    },
  ];

  return (
    <Walkthrough
      id="payout"
      title="Payout to a guardian"
      intro="Kids ask, two adults approve, and PayPal pays a guardian."
      color="var(--purple)"
      steps={steps}
      realNote={
        <>
          <strong>Live on the PayPal sandbox.</strong> A real PayPal Payouts call with test money: nothing real is paid.
        </>
      }
      live={[
        'Real PayPal Payouts (sandbox) from the NGO’s account to the guardian’s PayPal email.',
        'The server checks two different approvals and that the pool, filled by real sandbox donations, has enough money.',
        'Status comes from PayPal (on its way, paid, unclaimed, failed); a failed payout puts the money back in the pool.',
        'The receipt keeps a code instead of the guardian’s email, and can be sealed on the blockchain.',
        'Still to come: each adult approves from their own login (today the demo can’t tell who clicked).',
      ]}
    />
  );
}
