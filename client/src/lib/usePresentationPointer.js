// Move between the current slide's cues, frame each target, then run only sample /app actions.
// Pause, page exit and mode changes cancel the animation frame and remove target highlighting.
import { useEffect, useRef, useState } from 'react';
import { usePresentation } from './presentation.jsx';
import { clampCursor, presentationCue } from './presentation.js';
import { scrollToPosition } from './scroll.js';

export function presentationSection(step) {
  // Several /soon pages use id="preview". Wait for the right page, including route transitions.
  if (step.path.startsWith('/soon/')) return document.querySelector(`[data-preview="${step.path.split('/').at(-1)}"]`);
  return document.getElementById(step.id);
}

export function usePresentationPointer({ enabled, paused, ready, step, stepIndex, seconds, session, reduced, layoutKey }) {
  const { x, y, runAction } = usePresentation();
  const [clicking, setClicking] = useState(false);
  const clock = useRef(seconds);
  clock.current = seconds;
  const performed = useRef(new Set());
  useEffect(() => { performed.current.clear(); }, [session, stepIndex]);

  useEffect(() => {
    setClicking(false);
    if (!enabled || paused || !ready) return;
    let frame = 0;
    let lastTime = performance.now();
    let currentCue = -1;
    let target = null;
    let pulseUntil = 0;
    let lastPulse = false;
    const cues = step.cues ?? [{ at: 0, target: 'h1, h2' }];
    function tick(now) {
      const root = presentationSection(step);
      if (!root) { frame = requestAnimationFrame(tick); return; }
      const cue = presentationCue(cues, clock.current);
      const preferred = root.querySelector(cue.target);
      if (cue.index !== currentCue || !target?.isConnected || (preferred && preferred !== target)) {
        target?.classList.remove('presentation-focus');
        target = preferred ?? root.querySelector('h1, h2') ?? root;
        target.classList.add('presentation-focus');
        currentCue = cue.index;
        const box = target.getBoundingClientRect();
        const header = (document.querySelector('.site-header')?.offsetHeight ?? 80) + 24;
        const panel = document.querySelector('.tour-panel')?.getBoundingClientRect();
        const centerX = box.left + box.width * 0.5;
        const bottom = panel && centerX > panel.left - 32 ? panel.top - 32 : innerHeight - 90;
        const centerY = box.top + box.height * 0.5;
        if (centerY < header || centerY > bottom) {
          const desiredY = header + Math.max(30, (bottom - header) * 0.45);
          scrollToPosition(window.scrollY + centerY - desiredY, { instant: reduced });
        }
      }
      const box = target.getBoundingClientRect();
      const destination = clampCursor({ x: box.left + box.width * 0.5, y: box.top + box.height * 0.5 }, { width: innerWidth, height: innerHeight });
      const blend = reduced ? 1 : 1 - Math.exp(-Math.min(60, now - lastTime) / 120);
      lastTime = now;
      x.set(x.get() + (destination.x - x.get()) * blend);
      y.set(y.get() + (destination.y - y.get()) * blend);
      const arrived = Math.hypot(destination.x - x.get(), destination.y - y.get()) < 4;
      if (cue.action && preferred && arrived && clock.current >= cue.at + 0.9 && !performed.current.has(cue.index)) {
        if (runAction(cue.action)) { performed.current.add(cue.index); pulseUntil = now + 550; }
      }
      const pulse = now < pulseUntil;
      if (lastPulse !== pulse) { setClicking(pulse); lastPulse = pulse; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); target?.classList.remove('presentation-focus'); };
  }, [enabled, paused, ready, step, stepIndex, session, reduced, layoutKey, x, y, runAction]);
  return clicking;
}
