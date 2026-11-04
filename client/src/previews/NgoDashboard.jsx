// Preview: the NGO and mentor dashboard: money in and out, activities to check, reports.
import React, { useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { money } from '../lib/model.js';

const months = [
  { month: 'Aug', donated: 12000, rewarded: 8400 },
  { month: 'Sep', donated: 18500, rewarded: 11200 },
  { month: 'Oct', donated: 15000, rewarded: 13600 },
];
const submissions = [
  { id: 1, kid: 'Kid #A12', activity: 'Reading hour at the learning centre', reward: 200 },
  { id: 2, kid: 'Kid #B07', activity: 'Sorted the library shelves', reward: 150 },
  { id: 3, kid: 'Kid #C33', activity: 'Taught counting change to a younger kid', reward: 200 },
];

export default function NgoDashboard() {
  const [decisions, setDecisions] = useState({});
  const decide = (id, value) => setDecisions((all) => ({ ...all, [id]: value }));
  const max = Math.max(...months.flatMap((m) => [m.donated, m.rewarded]));
  const approvedTotal = submissions
    .filter((s) => decisions[s.id] === 'approved')
    .reduce((sum, s) => sum + s.reward, 0);

  const steps = [
    {
      title: 'Money in and out',
      render: () => (
        <div className="walk-grid">
          <div className="stat-row">
            <div className="card mini-card">
              <span>Reward pool now</span>
              <strong className="big-number">{money(12300)}</strong>
            </div>
            <div className="card mini-card">
              <span>Kids active</span>
              <strong className="big-number">46</strong>
            </div>
          </div>
          <div className="bar-chart" role="img" aria-label="Donations and rewards for August to October, sample data">
            {months.map((m) => (
              <div key={m.month} className="bar-group">
                <span className="bar in" style={{ height: `${(m.donated / max) * 100}%` }} title={`Donated ${money(m.donated)}`} />
                <span className="bar out" style={{ height: `${(m.rewarded / max) * 100}%` }} title={`Rewarded ${money(m.rewarded)}`} />
                <span className="bar-label">{m.month}</span>
              </div>
            ))}
            <div className="legend">
              <span className="key in" /> Donated <span className="key out" /> Rewarded
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Check kids’ activities',
      render: () => (
        <div className="stack">
          <p>Mentors approve real work before any reward is paid. Kids show only as codes here.</p>
          <ul className="queue">
            {submissions.map((s) => (
              <li key={s.id} className={decisions[s.id] ? `queue-row ${decisions[s.id]}` : 'queue-row'}>
                <div>
                  <strong>{s.activity}</strong>
                  <span>
                    {s.kid} · {money(s.reward)}
                  </span>
                </div>
                {decisions[s.id] ? (
                  <span className="tag tag-white">{decisions[s.id] === 'approved' ? 'Approved' : 'Sent back'}</span>
                ) : (
                  <span className="queue-actions">
                    <button className="icon-btn" aria-label={`Approve: ${s.activity}`} onClick={() => decide(s.id, 'approved')}>
                      <Check size={18} strokeWidth={3} />
                    </button>
                    <button className="icon-btn" aria-label={`Send back: ${s.activity}`} onClick={() => decide(s.id, 'returned')}>
                      <X size={18} strokeWidth={3} />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="hint" role="status">
            Approved so far: {money(approvedTotal)} in rewards.
          </p>
        </div>
      ),
    },
    {
      title: 'Share an impact report',
      render: () => (
        <div className="stack">
          <p>One click makes a report for donors: totals only, no names, ready to share.</p>
          <pre className="csv-preview">{`month,donated,rewarded,activities\n${months
            .map((m) => `${m.month},${m.donated},${m.rewarded},${Math.round(m.rewarded / 200)}`)
            .join('\n')}`}</pre>
          <button className="btn btn-sm btn-white" disabled>
            <Download size={18} strokeWidth={2.75} aria-hidden="true" /> Download CSV (when live)
          </button>
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="ngo"
      title="NGO & mentor dashboard"
      intro="One place for an NGO to see its money, check kids’ activities and report to donors."
      color="var(--yellow)"
      steps={steps}
      live={[
        'Mentors and NGO admins sign in; each role sees only what it needs.',
        'Approving an activity moves a reward from the pool into the kid’s jars, in a ledger that can’t be edited.',
        'Payout approvals (2 of 3 adults) happen here too.',
        'Reports and AI-written donor summaries use totals only, never kids’ details.',
      ]}
    />
  );
}
