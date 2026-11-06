// Payout to a guardian: LIVE on the PayPal sandbox (test money).
// A kid asks for money from the NGO's reward pool, two of three adults approve with their own
// PIN, and one of them sends it: our server makes a real PayPal Payouts call to the guardian's
// PayPal account. The guardian's email and the adults' PINs are set in server/.env, so this page
// can't change who gets paid. The kid never needs a bank account. The pool is filled by real
// sandbox donations (/soon/donate).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Loader2, RefreshCw, Send, ShoppingBag } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { PayPalSetupNotice } from './PayPalButton.jsx';
import { approvePayout, dollars, paypalConfig, payoutStatus, recoverPayout, requestPayout, sendPayout } from '../lib/paypalApi.js';
import { payoutRecovery } from '../content/payout.js';

const savedRequestKey = 'sprout-payout-request';
const readSavedRequest = () => {
  try { return sessionStorage.getItem(savedRequestKey) ?? ''; } catch { return ''; }
};

const adults = [
  { id: 'mentor', who: 'Mentor', name: 'Meera (sample)' },
  { id: 'admin', who: 'NGO admin', name: 'Rahul (sample)' },
  { id: 'guardian', who: 'Guardian', name: 'Aanya’s mother (sample)' },
];
const requestAmounts = [5, 8, 12]; // what Aanya can ask for, in dollars

// PayPal payout statuses in plain words, and the tag colour for each.
const statusWords = {
  SENDING: 'Sending…',
  PENDING: 'On its way',
  PROCESSING: 'On its way',
  SUCCESS: 'Paid',
  UNCLAIMED: 'Sent; waiting for the guardian to claim it in PayPal',
  ONHOLD: 'On hold at PayPal',
  UNKNOWN: 'Not confirmed by PayPal yet; the money stays reserved',
  REJECTED: 'Refused by PayPal; nothing was paid',
  FAILED: 'Failed; the money went back to the pool',
  RETURNED: 'Returned; the money went back to the pool',
  BLOCKED: 'Blocked by PayPal; the money went back to the pool',
};
const tagFor = (status) => {
  if (status === 'SUCCESS') return 'tag-green';
  if (['FAILED', 'RETURNED', 'BLOCKED', 'REJECTED', 'REFUNDED', 'REVERSED', 'DENIED', 'CANCELED'].includes(status)) return 'tag-peach';
  return 'tag-yellow';
};

// Shown when PayPal keys are set but payouts aren't (no PINs or guardian email in server/.env).
function PayoutSetupNotice() {
  return (
    <div className="chat-notice" role="status" data-testid="payout-setup">
      <strong>Payouts are switched off on this computer.</strong> Add <code>PAYOUT_PIN_MENTOR</code>,{' '}
      <code>PAYOUT_PIN_ADMIN</code>, <code>PAYOUT_PIN_GUARDIAN</code> (6+ characters each) and{' '}
      <code>GUARDIAN_PAYPAL_EMAIL</code> to <code>server/.env</code>, then restart <code>npm run dev</code>. The README has the steps.
    </div>
  );
}

export default function Payout() {
  const [config, setConfig] = useState(null);
  const [ask, setAsk] = useState(8);
  const [request, setRequest] = useState(null); // the server's payout request once made
  const [pins, setPins] = useState({}); // what each adult typed (cleared after use)
  const [sender, setSender] = useState('');
  const [working, setWorking] = useState(''); // which action is running
  const [problem, setProblem] = useState('');
  const [pool, setPool] = useState(null);
  const [recoveryId, setRecoveryId] = useState(readSavedRequest);
  const [recoveryAdult, setRecoveryAdult] = useState('mentor');
  const [recoveryPin, setRecoveryPin] = useState('');

  const approvals = request?.approvals ?? [];
  const enough = approvals.length >= 2;
  const receipt = request?.receipt ?? null;
  const shownPool = pool ?? config?.poolDollars ?? 0;
  const payoutsOn = Boolean(config?.configured && config?.payouts?.configured);

  useEffect(() => {
    paypalConfig().then((reply) => setConfig(reply.ok ? reply : { configured: false, poolDollars: 0 }));
  }, []);

  // Every server answer carries the request and the pool; keep both.
  const took = (reply) => {
    if (reply.request) {
      setRequest(reply.request);
      setRecoveryId(reply.request.id);
      try { sessionStorage.setItem(savedRequestKey, reply.request.id); } catch { /* Recovery by code still works. */ }
    }
    if (typeof reply.poolDollars === 'number') setPool(reply.poolDollars);
  };

  const approve = async (adult) => {
    setProblem('');
    setWorking(adult);
    let current = request;
    if (!current) {
      const made = await requestPayout(ask);
      if (!made.ok) {
        setWorking('');
        return setProblem(made.message);
      }
      took(made);
      current = made.request;
    }
    const reply = await approvePayout(current.id, adult, pins[adult] ?? '');
    setWorking('');
    setPins((all) => ({ ...all, [adult]: '' }));
    if (reply.ok) took(reply);
    else setProblem(reply.message);
  };

  const send = async (event) => {
    event.preventDefault();
    setProblem('');
    setWorking('send');
    const reply = await sendPayout(request.id, sender, pins.send ?? '');
    setWorking('');
    setPins((all) => ({ ...all, send: '' }));
    took(reply); // UNKNOWN/error replies carry the receipt and reserved pool too.
    if (!reply.ok) setProblem(reply.message);
  };

  const recover = async (event) => {
    event.preventDefault();
    setWorking('recover');
    setProblem('');
    const reply = await recoverPayout(recoveryId.trim(), recoveryAdult, recoveryPin);
    setWorking('');
    setRecoveryPin('');
    if (reply.ok) {
      took(reply);
      setAsk(reply.request.amount);
    } else setProblem(reply.message);
  };

  const refresh = async () => {
    setProblem('');
    const reply = await payoutStatus(receipt.paypalId);
    if (!reply.ok) return setProblem(reply.message);
    setRequest((current) => ({ ...current, receipt: reply.receipt }));
    setPool(reply.poolDollars);
  };

  const steps = [
    {
      title: 'Aanya asks for her money',
      render: () => (
        <div className="stack">
          {!request && (
            <details open={Boolean(recoveryId)}>
              <summary>{payoutRecovery.title}</summary>
              <form className="stack" onSubmit={recover}>
                <p className="hint">{payoutRecovery.help}</p>
                <label className="field">{payoutRecovery.code}
                  <input required value={recoveryId} onChange={(event) => setRecoveryId(event.target.value)} />
                </label>
                <label className="field">{payoutRecovery.adult}
                  <select value={recoveryAdult} onChange={(event) => setRecoveryAdult(event.target.value)}>
                    {adults.map((adult) => <option key={adult.id} value={adult.id}>{adult.who}</option>)}
                  </select>
                </label>
                <label className="field">{payoutRecovery.pin}
                  <input type="password" required autoComplete="off" value={recoveryPin} onChange={(event) => setRecoveryPin(event.target.value)} />
                </label>
                <button className="btn btn-sm btn-white" disabled={Boolean(working)}>
                  {working === 'recover' ? payoutRecovery.busy : payoutRecovery.button}
                </button>
                {problem && <p className="chat-notice" role="alert">{problem}</p>}
              </form>
            </details>
          )}
          {request && <p className="hint">{payoutRecovery.saved}: <strong className="mono">{request.id}</strong></p>}
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
              <button key={value} className="chip" aria-pressed={ask === value} onClick={() => setAsk(value)} disabled={Boolean(request)}>
                {dollars(value)}
              </button>
            ))}
          </div>
          <p className="hint" data-testid="pool">
            NGO reward pool: <strong>{dollars(shownPool)}</strong> in test money, from real sandbox donations.{' '}
            {shownPool < ask && <Link to="/soon/donate">Donate with PayPal first →</Link>}
          </p>
        </div>
      ),
    },
    {
      title: 'Two of three adults approve',
      render: () => {
        if (config && !config.configured) return <PayPalSetupNotice />;
        if (config && !payoutsOn) return <PayoutSetupNotice />;
        return (
          <div className="stack">
            <p>Each adult types their own PIN (set in server/.env). Any two are enough, and no one can approve twice.</p>
            <ul className="approver-list">
              {adults.map((adult) => {
                const done = approvals.includes(adult.id);
                return (
                  <li key={adult.id} className={`approver-row${done ? ' is-approved' : ''}`}>
                    <span className="approver-name">
                      <span className="approver-check">{done && <Check size={18} strokeWidth={3} aria-label="approved" />}</span>
                      <span>
                        <strong>{adult.who}</strong> · {adult.name}
                      </span>
                    </span>
                    {!done && !receipt && (
                      <>
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`${adult.who} PIN`}
                          placeholder="PIN"
                          value={pins[adult.id] ?? ''}
                          onChange={(event) => setPins((all) => ({ ...all, [adult.id]: event.target.value }))}
                        />
                        <button className="btn btn-sm btn-white" onClick={() => approve(adult.id)} disabled={!pins[adult.id] || Boolean(working)}>
                          {working === adult.id ? <Loader2 className="spin" size={18} strokeWidth={2.75} aria-hidden="true" /> : null}
                          Approve as {adult.who}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="approval-status" role="status">
              {enough ? `${approvals.length} of 3 approved. The payout can go ahead.` : `${approvals.length} of 3 approved. Needs 2.`}
            </p>
            {problem && (
              <p className="chat-notice" role="alert">
                {problem}
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: 'Paid to the guardian with PayPal',
      render: () => {
        if (config && !config.configured) return <PayPalSetupNotice />;
        if (config && !payoutsOn) return <PayoutSetupNotice />;
        if (receipt && !['UNKNOWN', 'SENDING'].includes(receipt.status)) {
          return (
            <div className="stack center-block" data-testid="payout-result">
              <Send size={34} strokeWidth={2.5} aria-hidden="true" />
              <p>
                Payout of <strong>{dollars(receipt.amount)}</strong> to the guardian’s PayPal account. The status below says whether it arrived.
              </p>
              <span className={`tag ${tagFor(receipt.status)}`}>PayPal: {statusWords[receipt.status] ?? receipt.status}</span>
              <dl className="receipt-inline">
                <dt>Receipt</dt>
                <dd className="mono">{receipt.id}</dd>
                <dt>PayPal payout batch</dt>
                <dd className="mono">{receipt.paypalId || '–'}</dd>
                <dt>Guardian code</dt>
                <dd className="mono">{receipt.ref}</dd>
              </dl>
              {receipt.paypalId && (
                <button className="btn btn-sm btn-white" onClick={refresh}>
                  <RefreshCw size={18} strokeWidth={2.75} aria-hidden="true" /> Check status with PayPal
                </button>
              )}
              {problem && (
                <p className="chat-notice" role="alert">
                  {problem}
                </p>
              )}
              <p className="hint">
                Pool now {dollars(shownPool)}. Only payouts PayPal marks as paid are sealed.{' '}
                <Link to="/soon/impact">Seal it on the blockchain →</Link>
              </p>
            </div>
          );
        }
        const approvers = adults.filter((adult) => approvals.includes(adult.id));
        return (
          <form className="stack" onSubmit={send}>
            {!enough && <p className="chat-notice">Go back and approve as two adults first. Without two approvals, nothing is paid.</p>}
            {receipt && ['UNKNOWN', 'SENDING'].includes(receipt.status) && (
              <p className="chat-notice" role="status">
                PayPal hasn’t confirmed payout {receipt.id} yet, so its money stays reserved. Send again to check: PayPal won’t pay twice.
              </p>
            )}
            <p className="hint">
              Paid to the guardian’s PayPal sandbox account <strong className="mono">{config?.payouts?.guardian}</strong> (set in server/.env).
              The email only goes to PayPal; the receipt keeps a code.
            </p>
            <label className="field">
              Who is sending it?
              <select value={sender} onChange={(event) => setSender(event.target.value)} disabled={!enough} required>
                <option value="">Choose an adult who approved</option>
                {approvers.map((adult) => (
                  <option key={adult.id} value={adult.id}>
                    {adult.who} · {adult.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Their PIN again
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                value={pins.send ?? ''}
                onChange={(event) => setPins((all) => ({ ...all, send: event.target.value }))}
                disabled={!enough}
              />
            </label>
            <button className="btn btn-green" type="submit" disabled={!enough || !sender || Boolean(working) || (!receipt && shownPool < (request?.amount ?? ask))}>
              {working === 'send' ? <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" /> : <Send size={20} strokeWidth={2.75} aria-hidden="true" />}
              {working === 'send' ? 'Sending with PayPal…' : `Send ${dollars(request?.amount ?? ask)} with PayPal Payouts`}
            </button>
            {!receipt && shownPool < (request?.amount ?? ask) && (
              <p className="hint">
                The pool has {dollars(shownPool)}. <Link to="/soon/donate">Donate with PayPal first →</Link>
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
      intro="Kids ask, two adults approve with their PINs, and PayPal pays a guardian."
      color="var(--purple)"
      steps={steps}
      realNote={
        <>
          <strong>Live on the PayPal sandbox.</strong> A real PayPal Payouts call with test money: nothing real is paid.
        </>
      }
      live={[
        'Real PayPal Payouts (sandbox) from the NGO’s account to the guardian’s PayPal email, which is fixed in server/.env.',
        'Two different adults approve this exact request with their own PIN, and one of them types it again to send.',
        'The server checks the pool, filled by real sandbox donations, has enough money, and saves every step to a file so a restart loses nothing.',
        'Status comes from PayPal (on its way, paid, unclaimed, failed); a failed payout puts the money back in the pool. If PayPal doesn’t answer, the money stays reserved and sending again checks it without paying twice.',
        'Still to come: full adult accounts instead of PINs.',
      ]}
    />
  );
}
