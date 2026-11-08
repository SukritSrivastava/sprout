// Payout to a guardian: LIVE on the PayPal sandbox (test money).
// A kid asks for money from the NGO's reward pool, two of three adults approve with their own
// PIN, and one of them sends it: our server makes a real PayPal Payouts call to the guardian's
// PayPal account. The guardian's email and the adults' PINs are set in server/.env, so this page
// can't change who gets paid. The kid never needs a bank account. The pool is filled by real
// sandbox donations (/soon/donate).
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Loader2, RefreshCw, Send, ShoppingBag } from 'lucide-react';
import Walkthrough from '../../shared/components/Walkthrough.jsx';
import { PayPalSetupNotice } from './PayPalButton.jsx';
import {
  approvePayout,
  dollars,
  paypalConfig,
  payoutStatus,
  recoverPayout,
  requestPayout,
  sendPayout,
} from './api.js';
import { payoutRecovery as payoutRecoveryEnglish } from '../../content/payout.js';
import { demoAccess } from '../../content/demo-access.js';

const savedRequestKey = 'sprout-payout-request';
const readSavedRequest = () => {
  try {
    return sessionStorage.getItem(savedRequestKey) ?? '';
  } catch {
    return '';
  }
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
  if (
    [
      'FAILED',
      'RETURNED',
      'BLOCKED',
      'REJECTED',
      'REFUNDED',
      'REVERSED',
      'DENIED',
      'CANCELED',
    ].includes(status)
  )
    return 'tag-peach';
  return 'tag-yellow';
};

// Shown when PayPal keys are set but payouts aren't (no PINs or guardian email in server/.env).
function PayoutSetupNotice({ demoOpenAccess }) {
  const { t } = useLanguage();

  if (demoOpenAccess)
    return (
      <div className="chat-notice" role="status" data-testid="payout-setup">
        {t(
          'Set GUARDIAN_PAYPAL_EMAIL in server/.env for sandbox payouts. No PIN is needed for the demo.',
        )}
      </div>
    );
  return (
    <div className="chat-notice" role="status" data-testid="payout-setup">
      <strong>{t('Payouts are switched off on this computer.')}</strong>
      {t(' Add ')}
      <code>{t('PAYOUT_PIN_MENTOR')}</code>,{t(' ')}
      <code>{t('PAYOUT_PIN_ADMIN')}</code>, <code>{t('PAYOUT_PIN_GUARDIAN')}</code>
      {t(' (6+ characters each) and')}
      {t(' ')}
      <code>{t('GUARDIAN_PAYPAL_EMAIL')}</code>
      {t(' to ')}
      <code>{t('server/.env')}</code>
      {t(', then restart ')}
      <code>{t('npm run dev')}</code>
      {t('. The README has the steps.')}
    </div>
  );
}

export default function Payout() {
  const { t, content, language } = useLanguage();
  const demoText = demoAccess[language];
  const payoutRecovery = content(payoutRecoveryEnglish);

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
  const demoOpenAccess = Boolean(config?.demoOpenAccess);

  useEffect(() => {
    paypalConfig().then((reply) =>
      setConfig(reply.ok ? reply : { configured: false, poolDollars: 0 }),
    );
  }, []);

  // Every server answer carries the request and the pool; keep both.
  const took = (reply) => {
    if (reply.request) {
      setRequest(reply.request);
      setRecoveryId(reply.request.id);
      try {
        sessionStorage.setItem(savedRequestKey, reply.request.id);
      } catch {
        /* Recovery by code still works. */
      }
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
              <summary>{t(payoutRecovery.title)}</summary>
              <form className="stack" onSubmit={recover}>
                <p className="hint">
                  {demoOpenAccess ? demoText.recovery : t(payoutRecovery.help)}
                </p>
                <label className="field">
                  {t(payoutRecovery.code)}
                  <input
                    required
                    value={recoveryId}
                    onChange={(event) => setRecoveryId(event.target.value)}
                  />
                </label>
                <label className="field">
                  {t(payoutRecovery.adult)}
                  <select
                    value={recoveryAdult}
                    onChange={(event) => setRecoveryAdult(event.target.value)}
                  >
                    {adults.map((adult) => (
                      <option key={adult.id} value={adult.id}>
                        {t(adult.who)}
                      </option>
                    ))}
                  </select>
                </label>
                {config && !demoOpenAccess && (
                  <label className="field">
                    {t(payoutRecovery.pin)}
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      value={recoveryPin}
                      onChange={(event) => setRecoveryPin(event.target.value)}
                    />
                  </label>
                )}
                <button className="btn btn-sm btn-white" disabled={Boolean(working)}>
                  {t(working === 'recover' ? payoutRecovery.busy : payoutRecovery.button)}
                </button>
                {problem && (
                  <p className="chat-notice" role="alert">
                    {t(problem)}
                  </p>
                )}
              </form>
            </details>
          )}
          {request && (
            <p className="hint">
              {t(payoutRecovery.saved)}: <strong className="mono">{request.id}</strong>
            </p>
          )}
          <div className="card request-card">
            <ShoppingBag size={28} strokeWidth={2.5} aria-hidden="true" />
            <div>
              <strong>
                {dollars(ask)}
                {t(' for school shoes')}
              </strong>
              <p>{t('From her Save jar · sample request')}</p>
            </div>
            <span className="tag tag-yellow">
              <Clock size={16} strokeWidth={2.75} aria-hidden="true" />
              {t(' Waiting for adults')}
            </span>
          </div>
          <div className="chips" role="group" aria-label={t('Amount Aanya asks for')}>
            {requestAmounts.map((value) => (
              <button
                key={value}
                className="chip"
                aria-pressed={ask === value}
                onClick={() => setAsk(value)}
                disabled={Boolean(request)}
              >
                {dollars(value)}
              </button>
            ))}
          </div>
          <p className="hint" data-testid="pool">
            {t('NGO reward pool: ')}
            <strong>{dollars(shownPool)}</strong>
            {t(' in test money, from real sandbox donations.')}
            {t(' ')}
            {shownPool < ask && <Link to="/soon/donate">{t('Donate with PayPal first →')}</Link>}
          </p>
        </div>
      ),
    },
    {
      title: 'Two of three adults approve',
      render: () => {
        if (!config) return <p role="status">{demoText.loading}</p>;
        if (config && !config.configured) return <PayPalSetupNotice />;
        if (config && !payoutsOn) return <PayoutSetupNotice demoOpenAccess={demoOpenAccess} />;
        return (
          <div className="stack">
            <p>
              {demoOpenAccess
                ? demoText.approvals
                : t(
                    'Each adult types their own PIN (set in server/.env). Any two are enough, and no one can approve twice.',
                  )}
            </p>
            <ul className="approver-list">
              {adults.map((adult) => {
                const done = approvals.includes(adult.id);
                return (
                  <li key={adult.id} className={`approver-row${done ? ' is-approved' : ''}`}>
                    <span className="approver-name">
                      <span className="approver-check">
                        {done && <Check size={18} strokeWidth={3} aria-label={t('approved')} />}
                      </span>
                      <span>
                        <strong>{t(adult.who)}</strong> · {t(adult.name)}
                      </span>
                    </span>
                    {!done && !receipt && (
                      <>
                        {!demoOpenAccess && (
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={t('{0} PIN', [t(adult.who)])}
                            placeholder={t('PIN')}
                            value={pins[adult.id] ?? ''}
                            onChange={(event) =>
                              setPins((all) => ({ ...all, [adult.id]: event.target.value }))
                            }
                          />
                        )}
                        <button
                          className="btn btn-sm btn-white"
                          onClick={() => approve(adult.id)}
                          disabled={
                            !config || (!demoOpenAccess && !pins[adult.id]) || Boolean(working)
                          }
                        >
                          {working === adult.id ? (
                            <Loader2
                              className="spin"
                              size={18}
                              strokeWidth={2.75}
                              aria-hidden="true"
                            />
                          ) : null}
                          {t('Approve as ')}
                          {t(adult.who)}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="approval-status" role="status">
              {t(
                enough
                  ? t('{0} of 3 approved. The payout can go ahead.', [approvals.length])
                  : t('{0} of 3 approved. Needs 2.', [approvals.length]),
              )}
            </p>
            {problem && (
              <p className="chat-notice" role="alert">
                {t(problem)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: 'Paid to the guardian with PayPal',
      render: () => {
        if (!config) return <p role="status">{demoText.loading}</p>;
        if (config && !config.configured) return <PayPalSetupNotice />;
        if (config && !payoutsOn) return <PayoutSetupNotice demoOpenAccess={demoOpenAccess} />;
        if (receipt && !['UNKNOWN', 'SENDING'].includes(receipt.status)) {
          return (
            <div className="stack center-block" data-testid="payout-result">
              <Send size={34} strokeWidth={2.5} aria-hidden="true" />
              <p>
                {t('Payout of ')}
                <strong>{dollars(receipt.amount)}</strong>
                {t(' to the guardian’s PayPal account. The status below says whether it arrived.')}
              </p>
              <span className={`tag ${tagFor(receipt.status)}`}>
                {t('PayPal: ')}
                {t(statusWords[receipt.status] ?? receipt.status)}
              </span>
              <dl className="receipt-inline">
                <dt>{t('Receipt')}</dt>
                <dd className="mono">{receipt.id}</dd>
                <dt>{t('PayPal payout batch')}</dt>
                <dd className="mono">{t(receipt.paypalId || '–')}</dd>
                <dt>{t('Guardian code')}</dt>
                <dd className="mono">{receipt.ref}</dd>
              </dl>
              {receipt.paypalId && (
                <button className="btn btn-sm btn-white" onClick={refresh}>
                  <RefreshCw size={18} strokeWidth={2.75} aria-hidden="true" />
                  {t(' Check status with PayPal')}
                </button>
              )}
              {problem && (
                <p className="chat-notice" role="alert">
                  {t(problem)}
                </p>
              )}
              <p className="hint">
                {t('Pool now ')}
                {dollars(shownPool)}
                {t('. Only payouts PayPal marks as paid are sealed.')}
                {t(' ')}
                <Link to="/soon/impact">{t('Seal it on the blockchain →')}</Link>
              </p>
            </div>
          );
        }
        const approvers = adults.filter((adult) => approvals.includes(adult.id));
        return (
          <form className="stack" onSubmit={send}>
            {!enough && (
              <p className="chat-notice">
                {t(
                  'Go back and approve as two adults first. Without two approvals, nothing is paid.',
                )}
              </p>
            )}
            {receipt && ['UNKNOWN', 'SENDING'].includes(receipt.status) && (
              <p className="chat-notice" role="status">
                {t('PayPal hasn’t confirmed payout ')}
                {receipt.id}
                {t(
                  ' yet, so its money stays reserved. Send again to check: PayPal won’t pay twice.',
                )}
              </p>
            )}
            <p className="hint">
              {t('Paid to the guardian’s PayPal sandbox account ')}
              <strong className="mono">{t(config?.payouts?.guardian)}</strong>
              {t(' (set in server/.env). The email only goes to PayPal; the receipt keeps a code.')}
            </p>
            <label className="field">
              {t('Who is sending it?')}
              <select
                value={sender}
                onChange={(event) => setSender(event.target.value)}
                disabled={!enough}
                required
              >
                <option value="">{t('Choose an adult who approved')}</option>
                {approvers.map((adult) => (
                  <option key={adult.id} value={adult.id}>
                    {t(adult.who)} · {t(adult.name)}
                  </option>
                ))}
              </select>
            </label>
            {!demoOpenAccess && (
              <label className="field">
                {t('Their PIN again')}
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
            )}
            <button
              className="btn btn-green"
              type="submit"
              disabled={
                !enough ||
                !sender ||
                Boolean(working) ||
                (!receipt && shownPool < (request?.amount ?? ask))
              }
            >
              {working === 'send' ? (
                <Loader2 className="spin" size={20} strokeWidth={2.75} aria-hidden="true" />
              ) : (
                <Send size={20} strokeWidth={2.75} aria-hidden="true" />
              )}
              {t(
                working === 'send'
                  ? 'Sending with PayPal…'
                  : t('Send {0} with PayPal Payouts', [dollars(request?.amount ?? ask)]),
              )}
            </button>
            {!receipt && shownPool < (request?.amount ?? ask) && (
              <p className="hint">
                {t('The pool has ')}
                {dollars(shownPool)}.{' '}
                <Link to="/soon/donate">{t('Donate with PayPal first →')}</Link>
              </p>
            )}
            {problem && (
              <p className="chat-notice" role="alert">
                {t(problem)}
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
      title={t('Payout to a guardian')}
      intro={
        !config || demoOpenAccess
          ? demoText.payoutIntro
          : t('Kids ask, two adults approve with their PINs, and PayPal pays a guardian.')
      }
      color="var(--purple)"
      steps={steps}
      realNote={
        <>
          <strong>{t('Live on the PayPal sandbox.')}</strong>
          {t(' A real PayPal Payouts call with test money: nothing real is paid.')}
        </>
      }
      live={[
        'Real PayPal Payouts (sandbox) from the NGO’s account to the guardian’s PayPal email, which is fixed in server/.env.',
        demoOpenAccess
          ? demoText.payoutDetail
          : 'Two different adults approve this exact request with their own PIN, and one of them types it again to send.',
        'The server checks the pool, filled by real sandbox donations, has enough money, and saves every step to a file so a restart loses nothing.',
        'Status comes from PayPal (on its way, paid, unclaimed, failed); a failed payout puts the money back in the pool. If PayPal doesn’t answer, the money stays reserved and sending again checks it without paying twice.',
        'Still to come: full adult accounts instead of PINs.',
      ]}
    />
  );
}
