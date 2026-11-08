// Smooth scrolling with Lenis, plus helpers to scroll to a section.
// Lenis is only switched on when motion is allowed; otherwise the browser scrolls normally.
import Lenis from 'lenis';

let lenis = null;

export function startSmoothScroll() {
  if (lenis) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.12, wheelMultiplier: 1 });
}

export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

export function scrollToId(id, { instant = false } = {}) {
  const element = document.getElementById(id);
  if (!element) return false;
  const headerOffset = (document.querySelector('.site-header')?.offsetHeight ?? 80) + 16;
  const top = element.getBoundingClientRect().top + window.scrollY - headerOffset;
  scrollToPosition(top, { instant });
  return true;
}

// The presentation can frame a control above its caption panel using the same scroll owner.
export function scrollToPosition(top, { instant = false } = {}) {
  // Permission checks can replace a short gate with the full app between resize frames.
  // Refresh Lenis's scroll limits before jumping to a newly mounted section.
  lenis?.resize();
  if (lenis && !instant) {
    // A touch, keyboard or browser scroll can move the page before Lenis catches up.
    // Start at the actual position and use an absolute target (one header offset only).
    lenis.scrollTo(window.scrollY, { immediate: true });
    lenis.scrollTo(top, { duration: 1.1 });
  } else {
    window.scrollTo({ top, behavior: 'instant' });
    lenis?.scrollTo(top, { immediate: true });
  }
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  lenis?.scrollTo(0, { immediate: true });
}

// Resolves with the element once it exists (pages mount after their enter animation starts).
export function waitForId(id, timeout = 2500) {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      const element = document.getElementById(id);
      if (element || performance.now() - started > timeout) resolve(element);
      else requestAnimationFrame(check);
    };
    check();
  });
}
