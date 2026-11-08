// Home page, section 5: live and planned features as a ledger-style list. Each row opens its clickable
// preview; the button opens the hub with all of them (/soon).
// Words: src/content/home.js → home.comingSoon. Row titles come from src/features/catalog/registry.js.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal, Stagger } from '../../shared/motion.jsx';
import { icon } from '../../shared/icons.js';
import { home as homeEnglish } from '../../content/home.js';
import { previewById, previews } from '../catalog/registry.js';

export default function ComingSoon() {
  const { t, content } = useLanguage();
  const home = content(homeEnglish);
  const text = home.comingSoon;
  const highlights = text.show.map((id) => previewById[id]).filter(Boolean);

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
                <span className="soon-number">{t(String(i + 1).padStart(2, '0'))}</span>
                <span className="soon-icon">
                  <Icon {...icon} />
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(line)}</p>
                </div>
                <span className={live ? 'stamp stamp-live' : 'stamp'}>
                  {t(live ?? text.rowStamp)}
                </span>
              </Link>
            </Stagger.Item>
          ))}
        </Stagger>
        <Reveal className="soon-more">
          <Link className="btn btn-white" to="/soon">
            {text.seeAll} {previews.length}
            {t(' previews ')}
            <ArrowRight {...icon} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
