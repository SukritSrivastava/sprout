// Home page, section 4 (black band): who holds the money and how it stays honest.
// The three points appear one after another as you scroll to them.
// Words: src/content/home.js → home.trust.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { Landmark, Receipt, ShieldCheck, Users } from 'lucide-react';
import { Reveal, Stagger } from '../../shared/motion.jsx';
import { icon, iconSized } from '../../shared/icons.js';
import { home as homeEnglish } from '../../content/home.js';

const pointIcons = [Landmark, Users, Receipt]; // one per point, in order

export default function Trust() {
  const { t, content } = useLanguage();
  const home = content(homeEnglish);
  const text = home.trust;

  return (
    <section id="trust" className="section band band-ink">
      <div className="container trust-grid">
        <Reveal className="trust-head">
          <span className="tag tag-green">
            <ShieldCheck {...iconSized(18, 2.75)} /> {text.tag}
          </span>
          <h2>
            {text.title[0]}
            <br />
            {text.title[1]}
          </h2>
          <p className="muted-on-ink">{text.text}</p>
        </Reveal>
        <Stagger as="ul" className="trust-list">
          {text.points.map(({ title, text: body }, i) => {
            const Icon = pointIcons[i] ?? Receipt;
            return (
              <Stagger.Item as="li" key={title}>
                <span className="trust-icon">
                  <Icon {...icon} />
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </div>
              </Stagger.Item>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
