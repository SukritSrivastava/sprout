// "/soon": the hub listing every Coming-soon preview, and "/soon/:id": one preview.
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PreviewBanner } from '../previews/Walkthrough.jsx';
import { previewById, previews } from '../previews/index.js';
import { Reveal, Stagger } from '../lib/motion.jsx';
import NotFound from './NotFound.jsx';

export function SoonHub() {
  return (
    <section className="section">
      <div className="container">
        <PreviewBanner />
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-purple">Coming soon</span>
            <h1 className="hub-title">Try what we’re building next.</h1>
          </div>
          <p>
            Each preview is a short walkthrough you can click through, with sample data. Only Paisa
            Mentor is live today.
          </p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.05}>
          {previews.map(({ id, title, line, icon: Icon, color }, i) => (
            <Stagger.Item as="li" key={id} style={{ '--row': color }}>
              <Link to={`/soon/${id}`} className="soon-row soon-link">
                <span className="soon-number">{String(i + 1).padStart(2, '0')}</span>
                <span className="soon-icon">
                  <Icon size={22} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{line}</p>
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
