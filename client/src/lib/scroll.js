// Smooth scrolling with Lenis, plus helpers to scroll to a section.
// Lenis is only switched on when motion is allowed; otherwise the browser scrolls normally.
import Lenis from 'lenis';

let lenis = null;
const HEADER_OFFSET = 96; // keeps section tops clear of the sticky header

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
  if (lenis && !instant) {
    lenis.scrollTo(element, { offset: -HEADER_OFFSET, duration: 1.1 });
  } else {
    const top = element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'instant' });
    lenis?.scrollTo(top, { immediate: true });
  }
  return true;
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
