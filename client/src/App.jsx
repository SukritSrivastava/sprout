// The app shell: shared state, smooth scrolling, page transitions and routes.
// Pages live in src/pages/, page sections in src/components/.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { SiteFooter, SiteHeader, TourLauncher } from './components/Layout.jsx';
import Tour from './components/Tour.jsx';
import Landing from './pages/Landing.jsx';
import Demo from './pages/Demo.jsx';
import NotFound from './pages/NotFound.jsx';
import { SoonHub, SoonPreview } from './pages/Soon.jsx';
import { ReducedMotion, ease } from './lib/motion.jsx';
import { scrollToId, scrollToTop, startSmoothScroll, stopSmoothScroll, waitForId } from './lib/scroll.js';

const osPrefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reduced motion comes from the OS setting, and the header toggle can override it.
function useReducedMotionSetting() {
  const [reduced, setReduced] = useState(osPrefersReduced);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduced = String(reduced);
    if (reduced) stopSmoothScroll();
    else startSmoothScroll();
  }, [reduced]);
  useEffect(() => stopSmoothScroll, []);
  return [reduced, setReduced];
}

// Scrolls to `#section` links. Same page: glide there. New page: jump there once it has rendered.
function useHashScrolling(location, reduced) {
  const previousPath = useRef(location.pathname);
  const firstRun = useRef(true);
  useEffect(() => {
    // First load with a #section: wait for fonts so the page has its final height, then jump.
    if (firstRun.current) {
      firstRun.current = false;
      const id = location.hash.slice(1);
      if (id) {
        document.fonts.ready
          .then(() => waitForId(id))
          .then(() => scrollToId(id, { instant: true }));
      }
      return;
    }
    const samePage = previousPath.current === location.pathname;
    previousPath.current = location.pathname;
    const id = location.hash.slice(1);
    if (samePage) {
      if (id) scrollToId(id);
      return;
    }
    // New page: the old page fades out first, so wait for the new section to exist.
    if (id) waitForId(id).then(() => scrollToId(id, { instant: true }));
    // With motion off there is no fade-out to wait for, so start the new page at the top now.
    else if (reduced) scrollToTop();
    // `reduced` is read but not a trigger: only a change of address should scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}

function Pages({ startTour, location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<Landing onTour={startTour} />} />
      <Route path="/app" element={<Demo />} />
      <Route path="/soon" element={<SoonHub />} />
      <Route path="/soon/:id" element={<SoonPreview />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  const location = useLocation();
  const [reduced, setReduced] = useReducedMotionSetting();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const tourTrigger = useRef(null);
  useHashScrolling(location, reduced);

  const startTour = (event) => {
    tourTrigger.current = event?.currentTarget ?? null;
    setMenuOpen(false);
    setTourOpen(true);
  };
  const closeTour = useCallback(() => setTourOpen(false), []);

  return (
    <ReducedMotion.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          reduced={reduced}
          setReduced={setReduced}
        />
        {reduced ? (
          // Motion off: swap pages instantly, no fade.
          <main id="main" key={location.pathname}>
            <Pages startTour={startTour} location={location} />
          </main>
        ) : (
          // Pages fade out, then the next fades in. Arriving without a #section starts at the top.
          <AnimatePresence mode="wait" onExitComplete={() => !location.hash && scrollToTop()}>
            <motion.main
              id="main"
              key={location.pathname}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease }}
            >
              <Pages startTour={startTour} location={location} />
            </motion.main>
          </AnimatePresence>
        )}
        <SiteFooter onTour={startTour} />
        <TourLauncher hidden={tourOpen} onTour={startTour} />
        <Tour open={tourOpen} onClose={closeTour} returnFocusRef={tourTrigger} />
      </MotionConfig>
    </ReducedMotion.Provider>
  );
}
