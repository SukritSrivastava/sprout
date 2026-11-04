// Sprout's guided tour (about 85 seconds). It moves between pages, glides to each section and
// highlights it, with captions in English or Hindi. The steps and their words are in lib/tour.js.
// Escape closes the tour, and focus goes back to whatever button opened it.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import Mascot from './Mascot.jsx';
import { ease } from '../lib/motion.jsx';
import { tourDuration, tourIndex, tourLanguages, tourStart, tourSteps } from '../lib/tour.js';
import { waitForId } from '../lib/scroll.js';

const icon = { size: 18, strokeWidth: 2.75, 'aria-hidden': true };

const doneText = {
  en: { title: 'That’s Sprout!', text: 'Explore at your own pace, or play the tour again.' },
  hi: { title: 'यह था स्प्राउट!', text: 'अपनी रफ़्तार से देखो, या टूर फिर से चलाओ।' },
};

export default function Tour({ open, onClose, returnFocusRef }) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0); // seconds of tour played so far
  const [paused, setPaused] = useState(false);
  const [lang, setLang] = useState('en');
  const closeRef = useRef(null);
  const previousFocus = useRef(null);

  const index = tourIndex(elapsed); // -1 once the tour is over
  const complete = elapsed >= tourDuration;
  const step = tourSteps[Math.max(0, index)];
  const words = complete ? doneText[lang] : step[lang];

  // Opening: start from the beginning, focus Close, listen for Escape and tab switches.
  // Closing (the cleanup) removes the listeners and puts focus back.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = returnFocusRef.current || document.activeElement;
    setElapsed(0);
    setPaused(false);
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const onVisibility = () => {
      if (document.hidden) setPaused(true); // don't play on while nobody is looking
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open, onClose, returnFocusRef]);

  // The clock: adds the real time that passed, every 100ms, while playing.
  useEffect(() => {
    if (!open || paused || complete) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      // Work out the step size now. Reading `previous` inside the updater would be a bug: React
      // may run it later, after `previous` has moved on, and the time would be lost.
      const delta = (now - previous) / 1000;
      previous = now;
      setElapsed((value) => Math.min(tourDuration, value + delta));
    }, 100);
    return () => clearInterval(timer);
  }, [open, paused, complete]);

  // Each new step: go to its page and section (App's hash scrolling glides there), then
  // outline the section until the step ends.
  useEffect(() => {
    if (!open || complete) return;
    navigate(`${step.path}#${step.id}`, { replace: true });
    let element = null;
    let cancelled = false;
    waitForId(step.id).then((found) => {
      if (cancelled || !found) return;
      element = found;
      element.classList.add('tour-target');
    });
    return () => {
      cancelled = true;
      element?.classList.remove('tour-target');
    };
  }, [open, index, complete, step.id, step.path, navigate]);

  // Move by whole steps. Reads the latest time so fast repeated clicks never skip a step.
  const jump = (delta) =>
    setElapsed((value) => {
      const next = tourIndex(value) + delta;
      return next >= tourSteps.length ? tourDuration : tourStart(Math.max(0, next));
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="tour-panel"
          aria-label="Sprout guided tour"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.3, ease }}
        >
          <div className="tour-top">
            <span className="tour-step-count">
              {complete ? 'Done' : `Step ${index + 1} of ${tourSteps.length}`}
            </span>
            <div className="tour-top-actions">
              <div className="lang-switch" role="group" aria-label="Caption language">
                {Object.entries(tourLanguages).map(([code, name]) => (
                  <button
                    key={code}
                    className="chip chip-sm"
                    aria-pressed={lang === code}
                    onClick={() => setLang(code)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <button ref={closeRef} className="icon-btn" aria-label="Close tour" onClick={onClose}>
                <X {...icon} />
              </button>
            </div>
          </div>
          <div className="tour-body">
            <Mascot size={64} mood={complete ? 'cheer' : 'happy'} />
            <div aria-live="polite" aria-atomic="true" lang={lang}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${complete ? 'done' : index}-${lang}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <h3>{words.title}</h3>
                  <p>{words.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div
            className="tour-progress"
            role="progressbar"
            aria-label="Tour progress"
            aria-valuemin={0}
            aria-valuemax={tourDuration}
            aria-valuenow={Math.floor(elapsed)}
          >
            <span style={{ width: `${(elapsed / tourDuration) * 100}%` }} />
          </div>
          <div className="tour-controls">
            <span className="tour-time">
              {String(Math.floor(elapsed)).padStart(2, '0')} / {tourDuration}s
            </span>
            {complete ? (
              <button
                className="btn btn-sm btn-white"
                onClick={() => {
                  setElapsed(0);
                  setPaused(false);
                }}
              >
                <RotateCcw {...icon} /> Replay
              </button>
            ) : (
              <>
                <button
                  className="icon-btn"
                  aria-label="Previous tour step"
                  disabled={index === 0}
                  onClick={() => jump(-1)}
                >
                  <ArrowLeft {...icon} />
                </button>
                <button className="btn btn-sm btn-white" onClick={() => setPaused((value) => !value)}>
                  {paused ? <Play {...icon} /> : <Pause {...icon} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button className="icon-btn" aria-label="Next tour step" onClick={() => jump(1)}>
                  <ArrowRight {...icon} />
                </button>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
