// Home page, section 1: the big headline, and a sample jars card with Sprout peeking over it.
// Each headline line rises in a little after the one before (the `delay` values).
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { ease, useReduced } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { jars } from '../../lib/content.js';
import { money, splitReward } from '../../lib/model.js';

// A picture made of real UI: what a kid's jars look like after earning ₹200 (sample numbers).
function HeroCard() {
  const reduced = useReduced();
  const values = splitReward(400, 50);
  return (
    <motion.div
      className="hero-card-wrap"
      initial={reduced ? false : { opacity: 0, y: 40, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, ease, delay: 0.15 }}
    >
      <div className="card hero-card">
        <div className="hero-card-top">
          <span>Aanya’s jars</span>
          <span className="tag tag-white">Sample</span>
        </div>
        <div className="hero-total">
          {money(400)} <span className="tag tag-yellow">+{money(200)} earned</span>
        </div>
        <div className="mini-jars">
          {jars.map((jar, i) => (
            <div className="mini-jar" key={jar.name} style={{ '--jar': jar.color }}>
              <strong>{jar.name}</strong>
              {money(values[i])}
            </div>
          ))}
        </div>
        <div className="goal-row">
          <span>Bicycle goal</span>
          <span>
            {money(2100)} of {money(6000)}
          </span>
        </div>
        <div className="meter">
          {/* The bar fills from empty to 35% (₹2,100 of ₹6,000). */}
          <motion.span
            initial={reduced ? false : { width: 0 }}
            animate={{ width: '35%' }}
            transition={{ duration: 1.2, ease, delay: 0.6 }}
          />
        </div>
      </div>
      <Mascot size={92} className="hero-mascot" label="Sprout, the mascot, waving hello" />
    </motion.div>
  );
}

export default function Hero({ onTour }) {
  const reduced = useReduced();
  // Animation settings for one headline line, starting `delay` seconds after the page loads.
  const riseIn = (delay) => ({
    initial: reduced ? false : { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease, delay },
  });
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.span className="tag tag-yellow tilt" {...riseIn(0)}>
            For kids 8 to 17 · run with NGOs
          </motion.span>
          <h1>
            <motion.span className="block" {...riseIn(0.05)}>
              Money skills
            </motion.span>
            <motion.span className="block" {...riseIn(0.12)}>
              for every kid.
            </motion.span>
            <motion.span className="highlight" {...riseIn(0.2)}>
              Whatever they start with.
            </motion.span>
          </h1>
          <motion.p className="lead" {...riseIn(0.3)}>
            Do a small activity, earn a little, split it into four jars, and ask a mentor the money
            questions you were scared to ask.
          </motion.p>
          <motion.div className="hero-actions" {...riseIn(0.38)}>
            <Link className="btn btn-green btn-lg" to="/app">
              Open the demo <ArrowRight {...icon} />
            </Link>
            <button className="link-btn" onClick={onTour}>
              Take the 1½-minute tour
            </button>
          </motion.div>
        </div>
        <HeroCard />
      </div>
    </section>
  );
}
