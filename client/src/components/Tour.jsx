import React, { useEffect, useRef, useState } from 'react';
import { Clicky, Icon } from './Art.jsx';
import { tourSteps, tourDuration, tourIndex, tourStart } from '../lib/model.js';

export function goTo(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: document.documentElement.dataset.reduced === 'true' ? 'instant' : 'smooth',
      block: 'start',
    });
}

export default function Tour({ open, onClose, returnFocusRef }) {
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

  useEffect(() => {
    if (!open || paused || complete) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      setElapsed((value) => Math.min(tourDuration, value + (now - previous) / 1000));
      previous = now;
    }, 100);
    return () => clearInterval(timer);
  }, [open, paused, complete]);

  useEffect(() => {
    if (!open || complete) return;
    goTo(step.id);
    document.getElementById(step.id)?.classList.add('tour-target');
    return () => document.getElementById(step.id)?.classList.remove('tour-target');
  }, [open, index, complete, step.id]);

  useEffect(() => {
    if (!open || !voice || !speechAvailable || paused || complete) {
      window.speechSynthesis?.cancel();
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(step.text);
    speech.rate = 1.15;
    speech.lang = 'en-IN';
    speech.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error))
        setVoiceError('Voice unavailable. Follow the captions instead.');
    };
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [open, voice, index, paused, complete, speechAvailable, step.text]);

  if (!open) return null;
  const jump = (next) =>
    setElapsed(next >= tourSteps.length ? tourDuration : tourStart(Math.max(0, next)));
  return (
    <aside className="tour-panel" aria-label="Sprout guided tour">
      <div className="tour-top">
        <span className="eyebrow">
          <span className="live-dot" /> CLICKY’S QUICK TOUR
        </span>
        <button ref={closeRef} className="icon-button" aria-label="Close tour" onClick={onClose}>
          <Icon name="close" size={19} />
        </button>
      </div>
      <div className="tour-body">
        <Clicky />
        <div aria-live="polite" aria-atomic="true">
          <h3>{complete ? 'You’re ready to grow.' : step.title}</h3>
          <p>
            {complete
              ? 'Tour complete. Explore at your own pace, or give the interactive demo a go.'
              : step.text}
          </p>
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
            className="text-button"
            onClick={() => {
              setElapsed(0);
              setPaused(false);
            }}
          >
            Replay ↻
          </button>
        ) : (
          <>
            <button
              className="icon-button"
              aria-label="Previous tour step"
              disabled={index === 0}
              onClick={() => jump(index - 1)}
            >
              ←
            </button>
            <button className="text-button" onClick={() => setPaused((value) => !value)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              className="icon-button"
              aria-label="Next tour step"
              onClick={() => jump(index + 1)}
            >
              →
            </button>
          </>
        )}
        <button
          className="voice-button"
          disabled={!speechAvailable || complete}
          aria-pressed={voice}
          onClick={() => setVoice((value) => !value)}
        >
          <Icon name="volume" size={16} />
          {voice ? 'Voice on' : 'Voice off'}
        </button>
      </div>
      {voiceError && <small role="status">{voiceError}</small>}
    </aside>
  );
}
