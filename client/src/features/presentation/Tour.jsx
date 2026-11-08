// A silent presentation: the speaker controls the steps, or Sprout presents with a moving cursor.
// Closing restores focus; automatic playback pauses in hidden tabs and waits for each real page.
import { useLanguage } from '../language/language.jsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Hand,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import Mascot from '../../shared/components/Mascot.jsx';
import PresentationCursor from './PresentationCursor.jsx';
import { ease, useReduced } from '../../shared/motion.jsx';
import {
  tourDone,
  tourDuration,
  tourIndex,
  tourLanguages,
  tourStart,
  tourSteps,
} from './tour.js';
import { tourUi } from '../../content/tour.js';
import { usePresentation } from './presentation.jsx';
import { presentationSection, usePresentationPointer } from './usePresentationPointer.js';

const icon = { size: 18, strokeWidth: 2.75, 'aria-hidden': true };

export default function Tour({ open, onClose, returnFocusRef }) {
  const { t, language: lang, setLanguage: setLang } = useLanguage();

  const navigate = useNavigate();
  const reduced = useReduced();
  const { setActive } = usePresentation();
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState(null);
  const [paused, setPaused] = useState(false);

  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [session, setSession] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const closeRef = useRef(null);
  const primaryRef = useRef(null);
  const minimiseRef = useRef(null);
  const previousFocus = useRef(null);
  const started = mode !== null;
  const complete = started && elapsed >= tourDuration;
  const index = Math.max(0, tourIndex(elapsed));
  const step = tourSteps[index];
  const text = tourUi[lang];
  const words = complete ? tourDone[lang] : step[lang];
  const automatic = open && mode === 'auto' && !complete;
  const compact = started && mode === 'auto' && !expanded && !missing;
  const close = useCallback(() => {
    setMode(null);
    onClose();
  }, [onClose]);
  const jump = useCallback((delta) => {
    setElapsed((value) => {
      const next = tourIndex(value) + delta;
      return next >= tourSteps.length ? tourDuration : tourStart(Math.max(0, next));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = returnFocusRef.current || document.activeElement;
    setElapsed(0);
    setMode(null);
    setPaused(false);
    setReady(false);
    setExpanded(false);
    closeRef.current?.focus({ preventScroll: true });
    const key = (event) => {
      if (event.key === 'Escape') close();
    };
    const visibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open, close, returnFocusRef]);

  useEffect(() => {
    setActive(automatic);
    return () => setActive(false);
  }, [automatic, setActive]);

  // Keep keyboard focus on a visible control when the full panel collapses or expands.
  useEffect(() => {
    if (!open || mode !== 'auto') return;
    if (compact) primaryRef.current?.focus({ preventScroll: true });
    else if (expanded) minimiseRef.current?.focus({ preventScroll: true });
  }, [open, mode, compact, expanded, complete]);

  useEffect(() => {
    if (!open || !started || complete) {
      setReady(false);
      return;
    }
    setReady(false);
    setMissing(false);
    navigate(`${step.path}#${step.id}`, { replace: true });
    let frame = 0;
    let element = null;
    const began = performance.now();
    const find = () => {
      element = presentationSection(step);
      if (element) {
        element.classList.add('tour-target');
        setReady(true);
        return;
      }
      if (performance.now() - began > 5000) {
        setMissing(true);
        return;
      }
      frame = requestAnimationFrame(find);
    };
    frame = requestAnimationFrame(find);
    return () => {
      cancelAnimationFrame(frame);
      element?.classList.remove('tour-target');
    };
  }, [open, started, complete, index, step, navigate, retry]);

  // Manual mode never starts this clock. Pausing freezes the cursor as well as the clock.
  useEffect(() => {
    if (!automatic || paused || !ready) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = Math.max(0, Math.min(1, (now - previous) / 1000));
      previous = now;
      setElapsed((value) => Math.min(tourDuration, value + delta));
    }, 100);
    return () => clearInterval(timer);
  }, [automatic, paused, ready]);

  useEffect(() => {
    if (!open || !started || complete) return;
    const key = (event) => {
      if (
        event.target.closest('input, textarea, select, button, a, [contenteditable="true"]') ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        jump(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        jump(-1);
      }
      if (event.code === 'Space' && mode === 'auto') {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, started, complete, jump, mode]);

  const clicking = usePresentationPointer({
    enabled: automatic,
    paused,
    ready,
    step,
    stepIndex: index,
    seconds: elapsed - tourStart(index),
    session,
    reduced,
    layoutKey: compact,
  });
  const begin = (choice) => {
    setElapsed(0);
    setPaused(false);
    setSession((value) => value + 1);
    setExpanded(false);
    setMode(choice);
  };

  return (
    <>
      <PresentationCursor visible={automatic && ready} clicking={clicking} />
      <AnimatePresence>
        {open && (
          <motion.aside
            className={`tour-panel${started ? '' : ' tour-chooser'}${compact ? ' tour-compact' : ''}`}
            aria-label={t('Sprout guided tour')}
            data-mode={mode ?? 'choose'}
            data-minimized={compact}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 20 }}
            transition={{ duration: reduced ? 0 : 0.3, ease }}
          >
            {compact ? (
              <>
                <div className="tour-mini-summary">
                  <Mascot size={30} mood={complete ? 'cheer' : 'happy'} />
                  <span className="tour-step-count sr-only">
                    {t(complete ? text.done : text.step(index + 1, tourSteps.length))}
                  </span>
                  <span className="tour-mini-count" aria-hidden="true">
                    {t(complete ? text.done : `${index + 1} / ${tourSteps.length}`)}
                  </span>
                  <span className="tour-time">
                    {t(String(Math.floor(elapsed)).padStart(2, '0'))} / {t(tourDuration)}
                    {t('s')}
                  </span>
                </div>
                <div className="sr-only" aria-live="polite" aria-atomic="true" lang={lang}>
                  <h3>{words.title}</h3>
                  <p>{words.text}</p>
                </div>
                <div className="tour-mini-controls">
                  {complete ? (
                    <button
                      ref={primaryRef}
                      className="btn btn-sm btn-white"
                      onClick={() => begin(mode)}
                    >
                      <RotateCcw {...icon} />
                      {text.replay}
                    </button>
                  ) : (
                    <button
                      ref={primaryRef}
                      className="btn btn-sm btn-white"
                      onClick={() => setPaused((value) => !value)}
                    >
                      {paused ? <Play {...icon} /> : <Pause {...icon} />}
                      {t(paused ? text.resume : text.pause)}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-white"
                    aria-label={text.stopLabel}
                    onClick={close}
                  >
                    <Square {...icon} />
                    {text.stop}
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={text.expand}
                    title={text.expand}
                    aria-expanded="false"
                    onClick={() => setExpanded(true)}
                  >
                    <ChevronUp {...icon} />
                  </button>
                </div>
                <div
                  className="tour-progress"
                  role="progressbar"
                  aria-label={t('Tour progress')}
                  aria-valuemin={0}
                  aria-valuemax={tourDuration}
                  aria-valuenow={Math.floor(elapsed)}
                >
                  <span style={{ width: `${(elapsed / tourDuration) * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="tour-top">
                  <span className="tour-step-count">
                    {t(
                      !started
                        ? 'Demo'
                        : complete
                          ? text.done
                          : text.step(index + 1, tourSteps.length),
                    )}
                  </span>
                  <div className="tour-top-actions">
                    <div className="lang-switch" role="group" aria-label={t('Caption language')}>
                      {Object.entries(tourLanguages).map(([code, name]) => (
                        <button
                          key={code}
                          lang={code}
                          className="chip chip-sm"
                          aria-pressed={lang === code}
                          onClick={() => setLang(code)}
                        >
                          {t(name)}
                        </button>
                      ))}
                    </div>
                    {mode === 'auto' && (
                      <button
                        ref={minimiseRef}
                        className="icon-btn"
                        aria-label={text.minimise}
                        title={text.minimise}
                        aria-expanded="true"
                        onClick={() => setExpanded(false)}
                      >
                        <ChevronDown {...icon} />
                      </button>
                    )}
                    <button
                      ref={closeRef}
                      className="icon-btn"
                      aria-label={t('Close tour')}
                      onClick={close}
                    >
                      <X {...icon} />
                    </button>
                  </div>
                </div>
                {!started ? (
                  <div className="tour-choice-content" lang={lang}>
                    <div className="tour-body">
                      <Mascot size={74} />
                      <div>
                        <h3>{text.choose}</h3>
                        <p>{text.intro}</p>
                      </div>
                    </div>
                    <div className="tour-choices">
                      <button
                        className="tour-mode-choice manual"
                        aria-label={text.manual}
                        onClick={() => begin('manual')}
                      >
                        <Hand size={26} aria-hidden="true" />
                        <span>
                          <strong>{text.manual}</strong>
                          <small>{text.manualHelp}</small>
                        </span>
                        <ArrowRight {...icon} />
                      </button>
                      <button
                        className="tour-mode-choice auto"
                        aria-label={text.auto}
                        onClick={() => begin('auto')}
                      >
                        <MousePointer2 size={26} aria-hidden="true" />
                        <span>
                          <strong>{text.auto}</strong>
                          <small>{text.autoHelp}</small>
                        </span>
                        <ArrowRight {...icon} />
                      </button>
                    </div>
                    <p className="tour-silent">{text.silent}</p>
                  </div>
                ) : (
                  <>
                    {!complete && (
                      <div className="tour-mode-switch" role="group" aria-label={text.modeLabel}>
                        {[
                          ['manual', text.manualShort],
                          ['auto', text.autoShort],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            className="chip chip-sm"
                            aria-pressed={mode === value}
                            onClick={() => {
                              setMode(value);
                              setPaused(false);
                              setExpanded(false);
                            }}
                          >
                            {t(label)}
                          </button>
                        ))}
                        <span>{text.silent}</span>
                      </div>
                    )}
                    <div className="tour-body">
                      <Mascot size={64} mood={complete ? 'cheer' : 'happy'} />
                      <div aria-live="polite" aria-atomic="true" lang={lang}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={`${complete ? 'done' : index}-${lang}`}
                            initial={reduced ? false : { opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: reduced ? 0 : -12 }}
                            transition={{ duration: reduced ? 0 : 0.2, ease }}
                          >
                            <h3>{words.title}</h3>
                            <p>{words.text}</p>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                    {!complete && !ready && (
                      <div className="tour-loading" role="status">
                        <span>{t(missing ? text.missing : text.waiting)}</span>
                        {missing && (
                          <button
                            className="btn btn-sm btn-white"
                            onClick={() => setRetry((value) => value + 1)}
                          >
                            {text.retry}
                          </button>
                        )}
                      </div>
                    )}
                    <div
                      className="tour-progress"
                      role="progressbar"
                      aria-label={t('Tour progress')}
                      aria-valuemin={0}
                      aria-valuemax={tourDuration}
                      aria-valuenow={Math.floor(elapsed)}
                    >
                      <span style={{ width: `${(elapsed / tourDuration) * 100}%` }} />
                    </div>
                    <div className="tour-controls">
                      <span className="tour-time">
                        {t(
                          mode === 'manual' && !complete
                            ? text.pace
                            : `${String(Math.floor(elapsed)).padStart(2, '0')} / ${tourDuration}s`,
                        )}
                      </span>
                      {complete ? (
                        <>
                          <button className="btn btn-sm btn-white" onClick={() => begin(mode)}>
                            <RotateCcw {...icon} />
                            {text.replay}
                          </button>
                          <button className="link-btn" onClick={() => setMode(null)}>
                            {text.modes}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-btn"
                            aria-label={t('Previous tour step')}
                            disabled={index === 0}
                            onClick={() => jump(-1)}
                          >
                            <ArrowLeft {...icon} />
                          </button>
                          {mode === 'auto' && (
                            <button
                              className="btn btn-sm btn-white"
                              onClick={() => setPaused((value) => !value)}
                            >
                              {paused ? <Play {...icon} /> : <Pause {...icon} />}
                              {t(paused ? text.resume : text.pause)}
                            </button>
                          )}
                          <button
                            className="icon-btn"
                            aria-label={t('Next tour step')}
                            onClick={() => jump(1)}
                          >
                            <ArrowRight {...icon} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
