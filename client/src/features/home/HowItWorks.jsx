// Home page, section 2: the three steps, laid out zig-zag, each with a small UI card instead of
// a drawing. Cards lift slightly when you hover them. Words: src/content/home.js → home.how.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, BookOpen, HandCoins } from 'lucide-react';
import { Reveal, liftOnHover } from '../../shared/motion.jsx';
import { icon } from '../../shared/icons.js';
import { home as homeEnglish } from '../../content/home.js';
import { jars as jarsEnglish } from '../../content/demo.js';
import { money } from '../practice/model.js';

// The small card shown beside each step, in the same order as text.steps.

export default function HowItWorks() {
  const { t, content } = useLanguage();
  const home = content(homeEnglish);
  const jars = content(jarsEnglish);
  const text = home.how;
  const [first, second] = text.steps;
  const cards = [
    <div className="card ticket" key="ticket">
      <div className="ticket-top">
        <BookOpen {...icon} />
        <span className="tag tag-white">{first.cardTag}</span>
      </div>
      <strong>{first.cardTitle}</strong>
      <span className="ticket-reward">+ {money(200)}</span>
    </div>,
    <div className="card checklist" key="checklist">
      <div>
        <BadgeCheck {...icon} /> {second.checklist[0]}
      </div>
      <div>
        <BadgeCheck {...icon} /> {second.checklist[1]}
      </div>
      <div className="checklist-done">
        <HandCoins {...icon} /> {money(200)} {second.checklist[2]}
      </div>
    </div>,
    <div className="card split-bars" key="bars">
      {jars.map((jar, i) => (
        <div key={jar.name} className="split-bar">
          <span>{t(jar.name)}</span>
          {/* --w sets how full each bar is; the CSS draws it. */}
          <span className="bar" style={{ '--jar': jar.color, '--w': `${[50, 30, 10, 10][i]}%` }} />
        </div>
      ))}
    </div>,
  ];

  return (
    <section id="how" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="tag tag-mint">{text.tag}</span>
          <h2>
            {text.title[0]}
            <br />
            {text.title[1]}
          </h2>
        </Reveal>
        <ol className="steps">
          {text.steps.map((step, i) => (
            // step-1/2/3 classes give each row its own layout (the zig-zag) in styles.css.
            <Reveal as="li" key={step.title} className={`step step-${i + 1}`}>
              <div className="step-copy">
                <span className="step-number">{t(i + 1)}</span>
                <h3>{t(step.title)}</h3>
                <p>{t(step.text)}</p>
              </div>
              <motion.div className="step-card" {...liftOnHover}>
                {t(cards[i])}
              </motion.div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
