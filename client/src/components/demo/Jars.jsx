// Jars: split the balance between Save, Spend, Give and Invest. Every rupee is always accounted for.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Reveal, Stagger, useReduced } from '../../lib/motion.jsx';
import { useCountUp } from '../../lib/hooks.js';
import { money, splitReward } from '../../lib/model.js';
import { jars } from '../../lib/content.js';

function JarAmount({ value }) {
  return money(useCountUp(value));
}

// `save` (the % saved) lives in Demo.jsx so the AI mentor can see the same split.
export default function Jars({ balance, save, setSave }) {
  const [selected, setSelected] = useState(0);
  const reduced = useReduced();
  const values = splitReward(balance, save);
  return (
    <section id="jars" className="section band band-lavender">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-white">Step 2 · Plan</span>
            <h2>Four jars. Your split.</h2>
          </div>
          <p>There’s no perfect split, just one that fits you. Tap a jar to see what it’s for.</p>
        </Reveal>
        <Stagger className="jar-grid">
          {jars.map((jar, i) => {
            const fill = balance ? Math.max(6, (values[i] / balance) * 100) : 6;
            return (
              <Stagger.Item key={jar.name}>
                <motion.button
                  className="jar-card"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  style={{ '--jar': jar.color }}
                  whileHover={reduced ? undefined : { y: -6 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                >
                  <span className="jar-meter" aria-hidden="true">
                    <span style={{ height: `${fill}%` }} />
                  </span>
                  <span className="jar-text">
                    <span className="jar-name">{jar.name}</span>
                    <span className="jar-note">{jar.note}</span>
                    <strong className="jar-amount">
                      <JarAmount value={values[i]} />
                    </strong>
                  </span>
                  {selected === i && (
                    <span className="jar-check" aria-hidden="true">
                      <Check size={18} strokeWidth={3} />
                    </span>
                  )}
                </motion.button>
              </Stagger.Item>
            );
          })}
        </Stagger>
        <Reveal className="card allocation">
          <div aria-live="polite">
            <h3>{jars[selected].name}, your way.</h3>
            <p>{jars[selected].detail}</p>
          </div>
          <div className="slider-block">
            <div className="slider-label">
              <label htmlFor="save-split">How much do you save?</label>
              <output htmlFor="save-split">{save}%</output>
            </div>
            <input
              id="save-split"
              type="range"
              min="0"
              max="100"
              step="5"
              value={save}
              onChange={(event) => setSave(Number(event.target.value))}
            />
            <p className="hint">
              Sample balance {money(balance)}. The rest splits 60% Spend, 20% Give, 20% Invest.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
