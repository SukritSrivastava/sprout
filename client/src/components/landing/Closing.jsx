// Home page, last section: the closing message with a cheering Sprout.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from '../Mascot.jsx';
import { Reveal } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';

export default function Closing() {
  return (
    <section className="section band band-mint closing">
      <div className="container closing-grid">
        <Reveal>
          <h2 className="closing-title">
            Start with <span className="highlight">₹0.</span>
          </h2>
          <p className="lead">
            Sprout is for kids who have never had pocket money. That’s the whole point.
          </p>
          <Link className="btn btn-ink btn-lg" to="/app">
            Open the demo <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.15} className="closing-mascot">
          <Mascot mood="cheer" size={150} />
        </Reveal>
      </div>
    </section>
  );
}
