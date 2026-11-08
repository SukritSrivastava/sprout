// Withdraw: a simulated request → approval → payout → receipt trail. No money moves.
// Words: src/content/demo.js → demo.withdraw.
import { useLanguage } from '../language/language.jsx';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Receipt } from 'lucide-react';
import { Reveal } from '../../shared/motion.jsx';
import { demo as demoEnglish } from '../../content/demo.js';

export default function Withdraw() {
  const { t, content } = useLanguage();
  const demo = content(demoEnglish);
  const text = demo.withdraw;
  const { stages, buttons: actions } = text;

  const [stage, setStage] = useState(0);
  const finished = stage === stages.length - 1;
  return (
    <section id="withdraw" className="section band band-ink">
      <div className="container withdraw-grid">
        <Reveal>
          <span className="tag tag-green">{text.tag}</span>
          <h2>{text.title}</h2>
          <p className="muted-on-ink">{text.text}</p>
        </Reveal>
        <Reveal delay={0.1} className="card receipt">
          <div className="receipt-head">
            <Receipt size={22} strokeWidth={2.75} aria-hidden="true" />
            <span>{text.cardTitle}</span>
            <span className="tag tag-yellow">{text.cardTag}</span>
          </div>
          <div className="receipt-total">
            <span>{text.what}</span>
            <strong>{text.amount}</strong>
          </div>
          <ol className="timeline">
            {stages.map((label, i) => (
              <li key={label} className={stage >= i ? 'done' : ''}>
                <motion.span
                  className="timeline-dot"
                  animate={stage === i ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {t(stage >= i ? <Check size={15} strokeWidth={3.5} /> : i + 1)}
                </motion.span>
                {t(label)}
              </li>
            ))}
          </ol>
          <div className="receipt-status" role="status">
            {t(finished ? text.finished : stages[stage])}
          </div>
          <button
            className="btn btn-ink receipt-action"
            onClick={() => setStage((value) => (finished ? 0 : value + 1))}
          >
            {t(actions[stage])}
            <ArrowRight size={20} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
