// Preview: a donor funds an NGO's reward pool with PayPal. Nothing is charged.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Loader2, ReceiptText } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { money } from '../lib/model.js';

const amounts = [100, 500, 1000, 2500];

export default function Donate() {
  const [amount, setAmount] = useState(500);
  const lessons = Math.floor(amount / 200); // one ₹200 reward per completed activity

  const steps = [
    {
      title: 'Choose how much to give',
      render: () => (
        <div className="walk-grid">
          <div className="stack">
            <p>Your money goes into Asha Learning Trust’s reward pool (a sample NGO).</p>
            <div className="chips" role="group" aria-label="Donation amount">
              {amounts.map((value) => (
                <button key={value} className="chip" aria-pressed={amount === value} onClick={() => setAmount(value)}>
                  {money(value)}
                </button>
              ))}
            </div>
          </div>
          <div className="card mini-card">
            <HeartHandshake size={28} strokeWidth={2.5} aria-hidden="true" />
            <strong className="big-number">{lessons}</strong>
            <span>
              activity reward{lessons === 1 ? '' : 's'} for kids, at {money(200)} each
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Pay with PayPal',
      render: ({ next }) => (
        <div className="stack center-block">
          <p>
            You’d pay {money(amount)} with your PayPal account or a card. In this preview nothing is
            charged.
          </p>
          <button className="paypal-btn" onClick={next}>
            Pay {money(amount)} with <strong>PayPal</strong>
          </button>
          <span className="hint">Sample button · PayPal sandbox when live</span>
        </div>
      ),
    },
    {
      title: 'Payment confirmed',
      render: () => (
        <div className="stack center-block">
          <Loader2 className="spin" size={36} strokeWidth={2.5} aria-hidden="true" />
          <p>
            PayPal confirms the payment, sprout.io’s server double-checks the amount, and the NGO pool
            goes up by {money(amount)}.
          </p>
        </div>
      ),
    },
    {
      title: 'Thank you! Here’s your receipt',
      render: () => (
        <div className="card receipt-mini">
          <div className="receipt-mini-head">
            <ReceiptText size={22} strokeWidth={2.5} aria-hidden="true" /> Donation receipt
            <span className="tag tag-yellow">Sample</span>
          </div>
          <dl>
            <dt>Amount</dt>
            <dd>{money(amount)}</dd>
            <dt>To</dt>
            <dd>Asha Learning Trust · reward pool</dd>
            <dt>Receipt</dt>
            <dd className="mono">DON-2611-0042</dd>
          </dl>
          <p className="hint">
            Its fingerprint goes into the next public batch. <Link to="/soon/impact">See how anyone can check it →</Link>
          </p>
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="donate"
      title="Donate with PayPal"
      intro="Anyone can fund an NGO’s reward pool in a few taps, and see where the money goes."
      color="var(--green)"
      steps={steps}
      live={[
        'Real PayPal Checkout (sandbox first) into the NGO’s pool.',
        'The server checks the paid amount itself; it never trusts the browser’s number.',
        'Every donation gets a receipt that is included in the public impact ledger.',
        'Donors see totals and impact, never anything about individual kids.',
      ]}
    />
  );
}
