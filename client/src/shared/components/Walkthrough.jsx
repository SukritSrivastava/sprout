// The shared frame for every Coming-soon preview: a banner saying nothing is real, a short
// step-by-step walkthrough, and a last step explaining what the feature will do when it's live.
//
// Each preview passes `steps`: [{ title, render: ({ next }) => JSX }] and `live`: [bullet strings].
// Pages that really work (PayPal sandbox, local blockchain) also pass `realNote`: a sentence for a
// green "this is real" banner instead of the yellow "Coming soon" one. Their last step is then
// "What's real here" instead of "What this will do when it's live".
// A step can call `next()` itself (e.g. after "Pay with PayPal"); Back/Next are always there too.
import { useLanguage } from '../../features/language/language.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BadgeCheck, Construction, RotateCcw } from 'lucide-react';
import Mascot from './Mascot.jsx';
import { ease, useReduced } from '../motion.jsx';

const icon = { size: 18, strokeWidth: 2.75, 'aria-hidden': true };

export function PreviewBanner({ realNote }) {
  const { t } = useLanguage();

  if (realNote) {
    return (
      <div className="preview-banner real-banner" role="note">
        <BadgeCheck size={20} strokeWidth={2.75} aria-hidden="true" />
        <span>{t(realNote)}</span>
      </div>
    );
  }
  return (
    <div className="preview-banner" role="note">
      <Construction size={20} strokeWidth={2.75} aria-hidden="true" />
      <span>
        <strong>{t('Coming soon · preview.')}</strong>
        {t(' Nothing here is real: sample data, no money moves.')}
      </span>
    </div>
  );
}

export default function Walkthrough({ id, title, intro, color, steps, live, realNote }) {
  const { t } = useLanguage();

  const reduced = useReduced();
  const [index, setIndex] = useState(0);
  const cardRef = useRef(null);
  const firstRender = useRef(true);

  // When the step changes and the card's top is off screen (you scrolled down a long step),
  // glide back so the new step starts in view.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 90) {
      card.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    }
  }, [index, reduced]);
  const all = [
    ...steps,
    {
      title: realNote ? 'What’s real here' : 'What this will do when it’s live',
      render: () => (
        <div className="live-panel">
          <Mascot size={84} mood="cheer" />
          <ul>
            {live.map((line) => (
              <li key={line}>{t(line)}</li>
            ))}
          </ul>
        </div>
      ),
    },
  ];
  const last = index === all.length - 1;
  const go = (to) => setIndex(Math.max(0, Math.min(all.length - 1, to)));
  const step = all[index];

  return (
    <section
      id="preview"
      className="section preview"
      style={{ '--accent': color }}
      data-preview={id}
    >
      <div className="container">
        <PreviewBanner realNote={realNote} />
        <div className="preview-head">
          <Link to="/soon" className="link-btn quiet">
            <ArrowLeft {...icon} />
            {t(' All previews')}
          </Link>
          <h1>{t(title)}</h1>
          <p className="lead">{t(intro)}</p>
        </div>

        <div className="card walkthrough" ref={cardRef}>
          <div className="walk-top">
            <span className="walk-count">{t('Step {0} of {1}', [index + 1, all.length])}</span>
            <ol className="walk-dots" aria-label={t('Steps')}>
              {all.map((s, i) => (
                <li key={s.title}>
                  <button
                    aria-label={t('Go to step {0}: {1}', [i + 1, t(s.title)])}
                    aria-current={i === index ? 'step' : undefined}
                    className={i <= index ? 'dot done' : 'dot'}
                    onClick={() => go(i)}
                  />
                </li>
              ))}
            </ol>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              className="walk-step"
              initial={{ opacity: 0, x: reduced ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -24 }}
              transition={{ duration: reduced ? 0 : 0.28, ease }}
            >
              <h2 className="walk-title">{t(step.title)}</h2>
              {step.render({ next: () => go(index + 1) })}
            </motion.div>
          </AnimatePresence>
          <div className="walk-nav">
            <button
              className="btn btn-sm btn-white"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              <ArrowLeft {...icon} />
              {t(' Back')}
            </button>
            {last ? (
              <button className="btn btn-sm btn-white" onClick={() => go(0)}>
                <RotateCcw {...icon} />
                {t(' Start again')}
              </button>
            ) : (
              <button className="btn btn-sm btn-ink" onClick={() => go(index + 1)}>
                {t('Next ')}
                <ArrowRight {...icon} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
