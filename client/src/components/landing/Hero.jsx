// Home page, section 1: the big headline, and a sample jars card with Sprout peeking over it.
// Words: src/content/home.js → home.hero. Each headline line rises in a little after the one before.
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { ease, useReduced } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { home } from '../../content/home.js';
import { jars } from '../../content/demo.js';
import { money, splitReward } from '../../lib/model.js';

const text = home.hero;

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
          <span>{text.card.title}</span>
          <span className="tag tag-white">{text.card.sample}</span>
        </div>
        <div className="hero-total">
          {money(400)}{' '}
          <span className="tag tag-yellow">
            +{money(200)} {text.card.earned}
          </span>
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
          <span>{text.card.goal}</span>
          <span>
            {money(2100)} {text.card.of} {money(6000)}
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
      <Mascot size={92} className="hero-mascot" label={text.mascotLabel} />
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
            {text.tag}
          </motion.span>
          <h1>
            {text.headline.map((line, i) => (
              <motion.span key={line} className="block" {...riseIn(0.05 + i * 0.07)}>
                {line}
              </motion.span>
            ))}
            <motion.span className="highlight" {...riseIn(0.2)}>
              {text.highlight}
            </motion.span>
          </h1>
          <motion.p className="lead" {...riseIn(0.3)}>
            {text.intro}
          </motion.p>
          <motion.div className="hero-actions" {...riseIn(0.38)}>
            <Link className="btn btn-green btn-lg" to="/app">
              {text.openDemo} <ArrowRight {...icon} />
            </Link>
            <button className="link-btn" onClick={onTour}>
              {text.tour}
            </button>
          </motion.div>
        </div>
        <HeroCard />
      </div>
    </section>
  );
}
