// Earn: complete the sample activity to add ₹200. A small burst celebrates it.
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';
import { Reveal, ease, useReduced } from '../../lib/motion.jsx';
import { money } from '../../lib/model.js';
import { scrollToId } from '../../lib/scroll.js';

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
          <span className="tag tag-mint">Step 1 · Earn</span>
          <h2>Do something useful. Earn a little.</h2>
          <p>
            In the real app, a mentor at your NGO checks the activity first. Here, tap the button
            and we’ll pretend they said yes.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className={`card activity ${earned ? 'activity-done' : ''}`}>
            <div className="activity-top">
              <span className="activity-icon">
                <BookOpen {...icon} />
              </span>
              <span className="tag tag-white">Community · 30 min</span>
              <span className="tag tag-yellow">+ {money(reward)}</span>
            </div>
            <h3>Run a reading hour at the learning centre</h3>
            <p>Read a story with younger kids and help them sound out new words.</p>
            <div className="activity-action">
              <button
                className={`btn btn-lg ${earned ? 'btn-white' : 'btn-green'}`}
                disabled={earned}
                onClick={onEarn}
              >
                {earned ? 'Reward added' : 'Complete the activity'}
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
                    <span>Approved (pretend). Your jars now hold {money(400)}.</span>
                    <button className="link-btn" onClick={() => scrollToId('jars')}>
                      See your jars
                    </button>
                    <button className="link-btn quiet" onClick={onReset}>
                      <RotateCcw size={16} strokeWidth={2.75} aria-hidden="true" /> Reset
                    </button>
                  </motion.div>
                ) : (
                  <motion.span key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Sample activity. Approval is simulated in this demo.
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
