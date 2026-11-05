// Earn: complete the sample activity to add ₹200. A small burst celebrates it.
// Words: src/content/demo.js → demo.earn.
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';
import { Reveal, ease, useReduced } from '../../lib/motion.jsx';
import { money } from '../../lib/model.js';
import { scrollToId } from '../../lib/scroll.js';
import { demo } from '../../content/demo.js';

const text = demo.earn;

const icon = { size: 20, strokeWidth: 2.75, 'aria-hidden': true };

function Burst({ id }) {
  const reduced = useReduced();
  if (reduced) return null;
  const pieces = ['₹', '+', '₹', '★', '₹', '+', '₹', '★', '₹', '+'];
  return (
    <span className="burst" key={id} aria-hidden="true">
      {pieces.map((piece, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: Math.cos(angle) * 110, y: Math.sin(angle) * 70, opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.9, ease }}
          >
            {piece}
          </motion.span>
        );
      })}
    </span>
  );
}

export default function Earn({ earned, burstId, onEarn, onReset, reward }) {
  return (
    <section id="earn" className="section">
      <div className="container earn-grid">
        <Reveal className="earn-copy">
          <span className="tag tag-mint">{text.tag}</span>
          <h2>{text.title}</h2>
          <p>{text.text}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className={`card activity ${earned ? 'activity-done' : ''}`}>
            <div className="activity-top">
              <span className="activity-icon">
                <BookOpen {...icon} />
              </span>
              <span className="tag tag-white">{text.activityTag}</span>
              <span className="tag tag-yellow">+ {money(reward)}</span>
            </div>
            <h3>{text.activityTitle}</h3>
            <p>{text.activityText}</p>
            <div className="activity-action">
              <button
                className={`btn btn-lg ${earned ? 'btn-white' : 'btn-green'}`}
                disabled={earned}
                onClick={onEarn}
              >
                {earned ? text.buttonDone : text.button}
                {earned ? <Check {...icon} /> : <ArrowRight {...icon} />}
              </button>
              {burstId > 0 && <Burst id={burstId} />}
            </div>
            <div className="activity-status" role="status">
              <AnimatePresence mode="wait" initial={false}>
                {earned ? (
                  <motion.div
                    key="done"
                    className="status-row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span>{text.done(money(400))}</span>
                    <button className="link-btn" onClick={() => scrollToId('jars')}>
                      {text.seeJars}
                    </button>
                    <button className="link-btn quiet" onClick={onReset}>
                      <RotateCcw size={16} strokeWidth={2.75} aria-hidden="true" /> {text.reset}
                    </button>
                  </motion.div>
                ) : (
                  <motion.span key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {text.notDone}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
