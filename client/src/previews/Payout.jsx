// Preview: a kid's withdrawal needs 2 of 3 adults, then is paid to their guardian via PayPal.
import React, { useState } from 'react';
import { Check, Clock, Send, ShoppingBag } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { money } from '../lib/model.js';

const adults = [
  { id: 'mentor', who: 'Mentor', name: 'Meera (sample)' },
  { id: 'admin', who: 'NGO admin', name: 'Rahul (sample)' },
  { id: 'guardian', who: 'Guardian', name: 'Aanya’s mother (sample)' },
];

export default function Payout() {
  const [approved, setApproved] = useState([]);
  const enough = approved.length >= 2;
  const toggle = (id) =>
    setApproved((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const steps = [
    {
      title: 'Aanya asks for her money',
      render: () => (
        <div className="card request-card">
          <ShoppingBag size={28} strokeWidth={2.5} aria-hidden="true" />
          <div>
            <strong>{money(600)} for school shoes</strong>
            <p>From her Save jar · sample request</p>
          </div>
          <span className="tag tag-yellow">
            <Clock size={16} strokeWidth={2.75} aria-hidden="true" /> Waiting for adults
          </span>
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
                <button
                  className="approver"
                  aria-pressed={approved.includes(adult.id)}
                  onClick={() => toggle(adult.id)}
                >
                  <span className="approver-check">{approved.includes(adult.id) && <Check size={18} strokeWidth={3} />}</span>
                  <span>
                    <strong>{adult.who}</strong> · {adult.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="approval-status" role="status">
            {enough ? '2 of 3 approved. The payout can go ahead.' : `${approved.length} of 3 approved. Needs 2.`}
          </p>
        </div>
      ),
    },
    {
      title: 'Paid to the guardian, not the kid',
      render: () => (
        <div className="stack center-block">
          <Send size={34} strokeWidth={2.5} aria-hidden="true" />
          <p>
            {enough
              ? `${money(600)} is sent to Aanya’s mother’s verified PayPal account. Aanya never needs a bank account.`
              : 'Go back and approve as two adults first. Without two approvals, nothing is paid.'}
          </p>
          {enough && <span className="tag tag-green">Sent via PayPal · sample</span>}
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="payout"
      title="Payout to a guardian"
      intro="Kids ask, adults approve, and the money goes to a verified guardian."
      color="var(--purple)"
      steps={steps}
      live={[
        'PayPal Payouts (sandbox first) to a guardian’s verified PayPal email.',
        'Two different adults must approve on the server; the browser can’t skip it.',
        'Payment status is tracked (sent, failed, returned), and failures put the money back.',
        'Each payout gets a receipt in the public impact ledger.',
      ]}
    />
  );
}
