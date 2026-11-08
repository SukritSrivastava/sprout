// Donate with PayPal: LIVE on the PayPal sandbox (test money, nothing real is charged).
//   Step 1: pick an amount.  Step 2: the real PayPal button (Orders v2).
//   Step 3: the server-checked receipt, plus a thank-you note written by the AI (Gemini) from
//           the amount PayPal actually captured.
// The receipt then goes into the public impact ledger (/soon/impact, last step).
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Loader2, ReceiptText, Sparkles } from 'lucide-react';
import Walkthrough from '../../shared/components/Walkthrough.jsx';
import PayPalButton, { PayPalSetupNotice } from './PayPalButton.jsx';
import { dollars, paypalConfig } from './api.js';

// Used until the server answers (the server's list in server/src/features/payments/settings.ts wins).
const fallback = {
  amounts: [5, 10, 25, 50],
  rewardDollars: 2,
  ngoName: 'Asha Learning Trust (sample NGO)',
  currency: 'USD',
};

export default function Donate() {
  const { t, language } = useLanguage();

  const [config, setConfig] = useState(null); // null while loading
  const [amount, setAmount] = useState(10);
  const [paid, setPaid] = useState(null); // { receipt, note, poolDollars } after a real capture
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    paypalConfig().then((reply) =>
      setConfig(reply.ok ? reply : { ...fallback, configured: false, message: reply.message }),
    );
  }, []);

  const settings = config ?? fallback;
  const rewards = Math.floor(amount / settings.rewardDollars);

  const steps = [
    {
      title: 'Choose how much to give',
      render: () => (
        <div className="walk-grid">
          <div className="stack">
            <p>
              {t('Your money goes into ')}
              {t(settings.ngoName)}
              {t('’s reward pool. This runs on PayPal’s sandbox, so it’s test money.')}
            </p>
            <div className="chips" role="group" aria-label={t('Donation amount')}>
              {settings.amounts.map((value) => (
                <button
                  key={value}
                  className="chip"
                  aria-pressed={amount === value}
                  onClick={() => setAmount(value)}
                  disabled={Boolean(paid)}
                >
                  {dollars(value)}
                </button>
              ))}
            </div>
          </div>
          <div className="card mini-card">
            <HeartHandshake size={28} strokeWidth={2.5} aria-hidden="true" />
            <strong className="big-number">{t(rewards)}</strong>
            <span>
              {language === 'hi' ? (
                t('activity rewards for kids, at {0} each', [dollars(settings.rewardDollars)])
              ) : (
                <>
                  activity reward{rewards === 1 ? '' : 's'} for kids, at{' '}
                  {dollars(settings.rewardDollars)} each
                </>
              )}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Pay with PayPal',
      render: ({ next }) => (
        <div className="stack center-block">
          {paid ? (
            <p>
              {t('Paid ')}
              {dollars(paid.receipt.amount)}.{' '}
              <button className="link-btn" onClick={next}>
                {t('See your receipt →')}
              </button>
            </p>
          ) : !config ? (
            <p className="hint">{t('Checking PayPal…')}</p>
          ) : !config.configured ? (
            <PayPalSetupNotice />
          ) : (
            <>
              <p>
                {t('Donate ')}
                <strong>{dollars(amount)}</strong>
                {t('. PayPal opens its own window: log in with a')}
                {t(' ')}
                <strong>{t('sandbox buyer account')}</strong>
                {t(', or choose the card option with a test card.')}
              </p>
              <PayPalButton
                clientId={config.clientId}
                currency={config.currency}
                amount={amount}
                onBusy={setBusy}
                onError={setProblem}
                onPaid={(reply) => {
                  setPaid(reply);
                  next();
                }}
              />
              {busy && (
                <p className="hint" role="status">
                  <Loader2 className="spin" size={18} strokeWidth={2.75} aria-hidden="true" />
                  {t(' PayPal approved it. Our server is confirming the payment…')}
                </p>
              )}
            </>
          )}
          {problem && (
            <p className="chat-notice" role="alert">
              {t(problem)}
            </p>
          )}
        </div>
      ),
    },
    {
      title: 'Thank you! Here’s your receipt',
      render: () =>
        !paid ? (
          <p className="hint">
            {t('Pay in step 2 first. Your real sandbox receipt appears here.')}
          </p>
        ) : (
          <div className="walk-grid">
            <div className="card receipt-mini" data-testid="donation-receipt">
              <div className="receipt-mini-head">
                <ReceiptText size={22} strokeWidth={2.5} aria-hidden="true" />
                {t(' Donation receipt')}
                <span className="tag tag-green">{t('PayPal sandbox')}</span>
              </div>
              <dl>
                <dt>{t('Amount')}</dt>
                <dd>
                  {dollars(paid.receipt.amount)}
                  {t(' (test money)')}
                </dd>
                <dt>{t('To')}</dt>
                <dd>
                  {t(settings.ngoName)}
                  {t(' · reward pool')}
                </dd>
                <dt>{t('Receipt')}</dt>
                <dd className="mono">{paid.receipt.id}</dd>
                <dt>{t('PayPal capture')}</dt>
                <dd className="mono">{paid.receipt.paypalId}</dd>
                <dt>{t('Donor code')}</dt>
                <dd className="mono">{paid.receipt.ref}</dd>
              </dl>
              <p className="hint">
                {t('Pool now ')}
                {dollars(paid.poolDollars)}.{' '}
                <Link to="/soon/impact">{t('Seal it on the blockchain →')}</Link>
              </p>
            </div>
            {paid.note && (
              <div className="card ai-note" data-testid="impact-note">
                <span className="tag tag-purple">
                  <Sparkles size={16} strokeWidth={2.75} aria-hidden="true" />
                  {t(' ')}
                  {t(
                    paid.note.source === 'ai'
                      ? 'Written by AI (Gemini)'
                      : 'Prepared note (AI offline)',
                  )}
                </span>
                <p>{paid.note.text}</p>
              </div>
            )}
          </div>
        ),
    },
  ];

  return (
    <Walkthrough
      id="donate"
      title={t('Donate with PayPal')}
      intro={t(
        'Fund an NGO’s reward pool with PayPal, get a receipt, and see what your money does.',
      )}
      color="var(--green)"
      steps={steps}
      realNote={
        <>
          <strong>{t('Live on the PayPal sandbox.')}</strong>
          {t(' Real PayPal API calls with test money: nothing real is charged.')}
        </>
      }
      live={[
        'Real PayPal Checkout (Orders v2, sandbox): our server creates the order and captures it after you approve.',
        'The server checks PayPal’s answer itself (status, currency, exact amount) and never trusts the browser’s number.',
        'AI (Google Gemini) writes your thank-you from the checked amount only; it never sees who you are.',
        'Your receipt uses a code instead of your name, and can be sealed on the blockchain in the impact ledger.',
        'Still to come: an NGO’s own PayPal business account and a shared database. Receipts currently persist in a local file.',
      ]}
    />
  );
}
