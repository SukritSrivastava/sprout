// Sprout's 75-second guided tour. It moves between pages, glides to each section, and highlights it.
// Captions set the pace; voice is optional. Escape closes; focus returns to whatever opened it.
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import Mascot from './Mascot.jsx';
import { ease } from '../lib/motion.jsx';
import { tourSteps, tourDuration, tourIndex, tourStart } from '../lib/model.js';
import { waitForId } from '../lib/scroll.js';

const icon = { size: 18, strokeWidth: 2.75, 'aria-hidden': true };

export default function Tour({ open, onClose, returnFocusRef }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [voice, setVoice] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const closeRef = useRef(null);
  const previousFocus = useRef(null);
  const index = tourIndex(elapsed);
  const complete = elapsed >= tourDuration;
  const step = tourSteps[Math.max(0, index)];
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Opening: reset, focus Close, listen for Escape and tab switches. Closing undoes all of it.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = returnFocusRef.current || document.activeElement;
    setElapsed(0);
    setPaused(false);
    setVoice(false);
    setVoiceError('');
    closeRef.current?.focus({ preventScroll: true });
    const key = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const visibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      window.speechSynthesis?.cancel();
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open, onClose, returnFocusRef]);

  // The clock: adds real elapsed time every 100ms while playing.
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

  // Each step: go to its page and section (App's hash scrolling glides there), then highlight it.
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
    // `pathname` is left out on purpose: the step decides the page, not the other way round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, complete, step.id, step.path, navigate]);

  // Optional narration of the current caption.
  useEffect(() => {
    if (!open || !voice || !speechAvailable || paused || complete) {
      window.speechSynthesis?.cancel();
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(step.text);
    speech.rate = 1.1;
    speech.lang = 'en-IN';
    speech.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error))
        setVoiceError('Voice isn’t available here. Follow the captions instead.');
    };
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [open, voice, index, paused, complete, speechAvailable, step.text]);

  // Step from the latest elapsed value so fast repeated clicks never read a stale step.
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
          data-page={pathname}
        >
          <div className="tour-top">
            <span className="tour-step-count">
              {complete ? 'Done' : `Step ${index + 1} of ${tourSteps.length}`}
            </span>
            <button ref={closeRef} className="icon-btn" aria-label="Close tour" onClick={onClose}>
              <X {...icon} />
            </button>
          </div>
          <div className="tour-body">
            <Mascot size={64} mood={complete ? 'cheer' : 'happy'} />
            <div aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={complete ? 'done' : index}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <h3>{complete ? 'That’s Sprout!' : step.title}</h3>
                  <p>
                    {complete
                      ? 'Explore the demo at your own pace, or play the tour again.'
                      : step.text}
                  </p>
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
            <button
              className="icon-btn voice-btn"
              disabled={!speechAvailable || complete}
              aria-pressed={voice}
              aria-label={voice ? 'Voice on' : 'Voice off'}
              onClick={() => setVoice((value) => !value)}
            >
              {voice ? <Volume2 {...icon} /> : <VolumeX {...icon} />}
            </button>
          </div>
          {voiceError && (
            <small className="tour-error" role="status">
              {voiceError}
            </small>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
