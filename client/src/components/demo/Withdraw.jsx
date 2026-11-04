// Withdraw: a simulated request → approval → payout → receipt trail. No money moves.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Receipt } from 'lucide-react';
import { Reveal } from '../../lib/motion.jsx';

const stages = ['Withdrawal requested', 'Approved by a mentor', 'Payout simulated', 'Receipt ready'];
const actions = ['Simulate mentor approval', 'Simulate payout', 'Show receipt', 'Start again'];

export default function Withdraw() {
  const [stage, setStage] = useState(0);
  const finished = stage === stages.length - 1;
  return (
    <section id="withdraw" className="section band band-ink">
      <div className="container withdraw-grid">
        <Reveal>
          <span className="tag tag-green">Step 4 · Use it</span>
          <h2>Every step leaves a trail.</h2>
          <p className="muted-on-ink">
            Ask for money for your goal. A grown-up approves it, the NGO pays it to your guardian,
            and you get a receipt. In this demo nothing is really paid.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="card receipt">
          <div className="receipt-head">
            <Receipt size={22} strokeWidth={2.75} aria-hidden="true" />
            <span>Accountability trail</span>
            <span className="tag tag-yellow">Demo</span>
          </div>
          <div className="receipt-total">
            <span>Sample withdrawal for school shoes</span>
            <strong>₹100.00</strong>
          </div>
          <ol className="timeline">
            {stages.map((label, i) => (
              <li key={label} className={stage >= i ? 'done' : ''}>
                <motion.span
                  className="timeline-dot"
                  animate={stage === i ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {stage >= i ? <Check size={15} strokeWidth={3.5} /> : i + 1}
                </motion.span>
                {label}
              </li>
            ))}
          </ol>
          <div className="receipt-status" role="status">
            {finished ? 'Preview only · no real transaction' : stages[stage]}
          </div>
          <button
            className="btn btn-ink receipt-action"
            onClick={() => setStage((value) => (finished ? 0 : value + 1))}
          >
            {actions[stage]}
            <ArrowRight size={20} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
