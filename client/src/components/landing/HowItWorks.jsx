// Home page, section 2: the three steps, laid out zig-zag, each with a small UI card instead of
// a drawing. Cards lift slightly when you hover them.
import React from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, BookOpen, HandCoins } from 'lucide-react';
import { Reveal, liftOnHover } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { jars } from '../../lib/content.js';
import { money } from '../../lib/model.js';

const steps = [
  {
    title: 'Do something useful.',
    text: 'Run a reading hour at your NGO centre, sort the library, teach a younger kid to count change.',
    card: (
      <div className="card ticket">
        <div className="ticket-top">
          <BookOpen {...icon} />
          <span className="tag tag-white">Community · 30 min</span>
        </div>
        <strong>Reading hour at the learning centre</strong>
        <span className="ticket-reward">+ {money(200)}</span>
      </div>
    ),
  },
  {
    title: 'A grown-up checks it.',
    text: 'A mentor at the NGO looks at what you did and approves it. Then the reward lands in your Sprout.',
    card: (
      <div className="card checklist">
        <div>
          <BadgeCheck {...icon} /> Activity submitted
        </div>
        <div>
          <BadgeCheck {...icon} /> Checked by your mentor
        </div>
        <div className="checklist-done">
          <HandCoins {...icon} /> {money(200)} added
        </div>
      </div>
    ),
  },
  {
    title: 'You decide where it goes.',
    text: 'Save, Spend, Give, Invest. You set the split. Nobody does it for you, and nobody judges it.',
    card: (
      <div className="card split-bars">
        {jars.map((jar, i) => (
          <div key={jar.name} className="split-bar">
            <span>{jar.name}</span>
            {/* --w sets how full each bar is; the CSS draws it. */}
            <span className="bar" style={{ '--jar': jar.color, '--w': `${[50, 30, 10, 10][i]}%` }} />
          </div>
        ))}
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="tag tag-mint">How it works</span>
          <h2>
            Three steps.
            <br />
            No bank account needed.
          </h2>
        </Reveal>
        <ol className="steps">
          {steps.map((step, i) => (
            // step-1/2/3 classes give each row its own layout (the zig-zag) in styles.css.
            <Reveal as="li" key={step.title} className={`step step-${i + 1}`}>
              <div className="step-copy">
                <span className="step-number">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <motion.div className="step-card" {...liftOnHover}>
                {step.card}
              </motion.div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
