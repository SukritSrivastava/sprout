// "/soon": the hub listing every preview (live ones are stamped), and "/soon/:id": one preview.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { previewById, previews } from './registry.js';
import { Reveal, Stagger } from '../../shared/motion.jsx';
import NotFound from '../../app/NotFound.jsx';

export function SoonHub() {
  const { t } = useLanguage();

  return (
    <section id="soon-hub" className="section">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-green">{t('Live and coming soon')}</span>
            <h1 className="hub-title">{t('Try what works today, and what’s next.')}</h1>
          </div>
          <p>
            {t(
              'Try PayPal sandbox payments, the local blockchain, guardian permission, the NGO workspace and saved Seedlings lessons. The rest are clickable previews with sample data.',
            )}
          </p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.05}>
          {previews.map(({ id, title, line, icon: Icon, color, live }, i) => (
            <Stagger.Item as="li" key={id} style={{ '--row': color }}>
              <Link to={`/soon/${id}`} className="soon-row soon-link">
                <span className="soon-number">{t(String(i + 1).padStart(2, '0'))}</span>
                <span className="soon-icon">
                  <Icon size={22} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(line)}</p>
                  {live && <span className="stamp stamp-live soon-live">{t(live)}</span>}
                </div>
                <span className="soon-go">
                  {t('Try it ')}
                  <ArrowRight size={18} strokeWidth={2.75} aria-hidden="true" />
                </span>
              </Link>
            </Stagger.Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function SoonPreview() {
  const { id } = useParams();
  const preview = previewById[id];
  if (!preview) return <NotFound />;
  const Preview = preview.component;
  return <Preview />;
}
