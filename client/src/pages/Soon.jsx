// "/soon": the hub listing every preview (live ones are stamped), and "/soon/:id": one preview.
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { previewById, previews } from '../previews/index.js';
import { Reveal, Stagger } from '../lib/motion.jsx';
import NotFound from './NotFound.jsx';

export function SoonHub() {
  return (
    <section id="soon-hub" className="section">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-green">Live and coming soon</span>
            <h1 className="hub-title">Try what works today, and what’s next.</h1>
          </div>
          <p>
            Stamped <strong>Live</strong>: real PayPal sandbox calls (test money) and a local test
            blockchain. The rest are clickable previews with sample data.
          </p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.05}>
          {previews.map(({ id, title, line, icon: Icon, color, live }, i) => (
            <Stagger.Item as="li" key={id} style={{ '--row': color }}>
              <Link to={`/soon/${id}`} className="soon-row soon-link">
                <span className="soon-number">{String(i + 1).padStart(2, '0')}</span>
                <span className="soon-icon">
                  <Icon size={22} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{line}</p>
                  {live && <span className="stamp stamp-live soon-live">{live}</span>}
                </div>
                <span className="soon-go">
                  Try it <ArrowRight size={18} strokeWidth={2.75} aria-hidden="true" />
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
