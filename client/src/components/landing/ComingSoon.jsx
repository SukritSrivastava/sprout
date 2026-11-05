// Home page, section 5: live and planned features as a ledger-style list. Each row opens its clickable
// preview; the button opens the hub with all of them (/soon).
// Words: src/content/home.js → home.comingSoon. Row titles come from src/previews/index.js.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal, Stagger } from '../../lib/motion.jsx';
import { icon } from '../../lib/icons.js';
import { home } from '../../content/home.js';
import { previewById, previews } from '../../previews/index.js';

const text = home.comingSoon;
const highlights = text.show.map((id) => previewById[id]).filter(Boolean);

export default function ComingSoon() {
  return (
    <section id="soon" className="section">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-purple">{text.tag}</span>
            <h2>{text.title}</h2>
          </div>
          <p>{text.text}</p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.07}>
          {highlights.map(({ id, title, line, icon: Icon, color, live }, i) => (
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
                <span className={live ? 'stamp stamp-live' : 'stamp'}>{live ?? text.rowStamp}</span>
              </Link>
            </Stagger.Item>
          ))}
        </Stagger>
        <Reveal className="soon-more">
          <Link className="btn btn-white" to="/soon">
            {text.seeAll} {previews.length} previews <ArrowRight {...icon} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
