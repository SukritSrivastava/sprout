// Home page, section 5: five planned features as a ledger-style list. Each row opens its
// clickable preview; the button opens the hub with all of them (/soon).
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal, Stagger } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { previewById, previews } from '../../previews/index.js';

// Which previews to show here, in this order. Their titles and icons come from previews/index.js.
const highlights = ['donate', 'ngo', 'impact', 'seedlings', 'hindi'].map((id) => previewById[id]);

export default function ComingSoon() {
  return (
    <section id="soon" className="section">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-purple">Coming soon</span>
            <h2>What we’re building next.</h2>
          </div>
          <p>
            These are planned, not live. Each one has a clickable preview with sample data, so you
            can see how it will work.
          </p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.07}>
          {highlights.map(({ id, title, line, icon: Icon, color }, i) => (
            <Stagger.Item as="li" key={id} style={{ '--row': color }}>
              <Link to={`/soon/${id}`} className="soon-row soon-link">
                <span className="soon-number">{String(i + 1).padStart(2, '0')}</span>
                <span className="soon-icon">
                  <Icon {...icon} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{line}</p>
                </div>
                <span className="stamp">Try the preview</span>
              </Link>
            </Stagger.Item>
          ))}
        </Stagger>
        <Reveal className="soon-more">
          <Link className="btn btn-white" to="/soon">
            See all {previews.length} previews <ArrowRight {...icon} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
