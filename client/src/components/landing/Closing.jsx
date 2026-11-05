// Home page, last section: the closing message with a cheering Sprout.
// Words: src/content/home.js → home.closing.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { Reveal } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { home } from '../../content/home.js';

const text = home.closing;

export default function Closing() {
  return (
    <section className="section band band-mint closing">
      <div className="container closing-grid">
        <Reveal>
          <h2 className="closing-title">
            {text.title} <span className="highlight">{text.highlight}</span>
          </h2>
          <p className="lead">{text.text}</p>
          <Link className="btn btn-ink btn-lg" to="/app">
            {text.button} <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.15} className="closing-mascot">
          <Mascot mood="cheer" size={150} />
        </Reveal>
      </div>
    </section>
  );
}
