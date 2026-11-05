// Preview: guardian consent before a kid's account is active, what data is kept, and deletion.
import React, { useState } from 'react';
import { Check, ShieldCheck, Trash2, X } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';

const promises = [
  'I am Aanya’s parent or legal guardian.',
  'I agree that Aanya can use sprout.io with her NGO.',
  'I understand an NGO mentor can read her chats with Paisa Mentor.',
];

export default function Safety() {
  const [ticks, setTicks] = useState([]);
  const [deleteAsked, setDeleteAsked] = useState(false);
  const allTicked = ticks.length === promises.length;

  const steps = [
    {
      title: 'A guardian says yes first',
      render: () => (
        <div className="stack">
          <p>
            Before a kid can use sprout.io, a parent or guardian gives consent. India’s data protection
            law (the DPDP Act, 2023) requires this for anyone under 18.
          </p>
          <ul className="consent-list">
            {promises.map((line) => (
              <li key={line}>
                <label className="consent-item">
                  <input
                    type="checkbox"
                    checked={ticks.includes(line)}
                    onChange={() =>
                      setTicks((list) => (list.includes(line) ? list.filter((x) => x !== line) : [...list, line]))
                    }
                  />
                  {line}
                </label>
              </li>
            ))}
          </ul>
          <p className={allTicked ? 'verify-result ok' : 'hint'} role="status">
            {allTicked ? (
              <>
                <ShieldCheck size={20} strokeWidth={2.75} aria-hidden="true" /> Consent recorded (sample). Aanya’s
                account can be switched on.
              </>
            ) : (
              'Tick all three to give consent.'
            )}
          </p>
        </div>
      ),
    },
    {
      title: 'Only what’s needed',
      render: () => (
        <div className="walk-grid">
          <div className="card mini-card proves">
            <strong>sprout.io keeps</strong>
            <span>
              <Check size={16} strokeWidth={3} aria-hidden="true" /> First name and age group
            </span>
            <span>
              <Check size={16} strokeWidth={3} aria-hidden="true" /> NGO and mentor
            </span>
            <span>
              <Check size={16} strokeWidth={3} aria-hidden="true" /> Jars, goals, activities
            </span>
          </div>
          <div className="card mini-card proves-not">
            <strong>sprout.io never asks for</strong>
            <span>
              <X size={16} strokeWidth={3} aria-hidden="true" /> Photos of faces
            </span>
            <span>
              <X size={16} strokeWidth={3} aria-hidden="true" /> Home address or school name
            </span>
            <span>
              <X size={16} strokeWidth={3} aria-hidden="true" /> Bank details of the kid
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Delete my data',
      render: () => (
        <div className="stack center-block">
          <p>A guardian or the kid can ask to delete everything, any time.</p>
          {deleteAsked ? (
            <p className="verify-result ok" role="status">
              <Check size={20} strokeWidth={3} aria-hidden="true" /> Request received (sample). The NGO confirms
              within 7 days; public receipts keep only anonymous totals.
            </p>
          ) : (
            <button className="btn btn-white" onClick={() => setDeleteAsked(true)}>
              <Trash2 size={18} strokeWidth={2.75} aria-hidden="true" /> Ask to delete Aanya’s data
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="safety"
      title="Guardian consent and child safety"
      intro="Kids’ data is treated with care: a guardian agrees first, sprout.io keeps very little, and it can all be deleted."
      color="var(--lavender)"
      steps={steps}
      live={[
        'Verifiable guardian consent recorded before any kid account is active.',
        'Data minimised by design; nothing that identifies a kid ever goes on a blockchain.',
        'Mentor-visible chats, explained to guardians at sign-up.',
        'A working “delete my data” request, handled by the NGO.',
      ]}
    />
  );
}
