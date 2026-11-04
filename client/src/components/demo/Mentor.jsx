// Paisa Mentor (prepared answers for now; Phase 1 connects the live AI).
// Asking shows Sprout "thinking" for a moment, then the answer.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { Reveal, ease } from '../../lib/motion.jsx';
import { answers } from '../../lib/content.js';

const motionOff = () => document.documentElement.dataset.reduced === 'true';

export default function Mentor() {
  const [question, setQuestion] = useState('Why should I save?');
  const [typing, setTyping] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const ask = (text) => {
    if (text === question && !typing) return;
    setQuestion(text);
    clearTimeout(timer.current);
    if (motionOff()) return setTyping(false);
    setTyping(true);
    timer.current = setTimeout(() => setTyping(false), 750);
  };

  return (
    <section id="mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">Ask anything</span>
          <h2>Paisa Mentor.</h2>
          <p>
            Questions you were scared to ask, answered plainly. Tap one to try it. These are
            prepared answers; the live AI mentor, in English and Hindi, is being built.
          </p>
          <Mascot mood={typing ? 'think' : 'happy'} size={110} label="Sprout listening" />
        </Reveal>
        <Reveal delay={0.1} className="card chat-card">
          <div className="chat-head">
            <Mascot size={40} mood={typing ? 'think' : 'happy'} />
            <div>
              <strong>Paisa Mentor</strong>
              <span>Prepared answers · sample</span>
            </div>
          </div>
          <div className="chat-body" aria-live="polite">
            <p className="bubble bubble-user">{question}</p>
            <AnimatePresence mode="wait" initial={false}>
              {typing ? (
                <motion.p
                  key="typing"
                  className="bubble bubble-mentor typing"
                  aria-label="Paisa Mentor is typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span />
                  <span />
                  <span />
                </motion.p>
              ) : (
                <motion.p
                  key={question}
                  className="bubble bubble-mentor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {answers[question]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="chat-label">Try a question</div>
          <div className="question-list">
            {Object.keys(answers).map((text) => (
              <button
                key={text}
                className="chip"
                aria-pressed={question === text}
                onClick={() => ask(text)}
              >
                {text}
                <ArrowUpRight size={16} strokeWidth={2.75} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
