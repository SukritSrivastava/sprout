// The frame around every page: header, footer and the floating tour launcher.
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ease } from '../lib/motion.jsx';
import { ArrowUpRight, Menu, Sprout as SproutIcon, X } from 'lucide-react';
import Mascot from './Mascot.jsx';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="sprout.io home">
      <span className="brand-mark">
        <SproutIcon size={22} strokeWidth={2.75} aria-hidden="true" />
      </span>
      <span>
        sprout<span className="brand-dot">.io</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ menuOpen, setMenuOpen, reduced, setReduced }) {
  const { pathname } = useLocation();
  const close = () => setMenuOpen(false);

  // Escape closes the phone menu.
  useEffect(() => {
    if (!menuOpen) return;
    const key = (event) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [menuOpen, setMenuOpen]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Main navigation" className={menuOpen ? 'nav nav-open' : 'nav'}>
          <Link to="/#how" onClick={close}>
            How it works
          </Link>
          <Link to="/#meet-mentor" onClick={close}>
            Mentor
          </Link>
          <Link to="/soon" onClick={close}>
            Coming soon
          </Link>
        </nav>
        <div className="header-actions">
          <button
            className="motion-toggle"
            aria-pressed={reduced}
            onClick={() => setReduced((value) => !value)}
            title="Turn animations on or off"
          >
            <span className={reduced ? 'motion-dot' : 'motion-dot on'} aria-hidden="true" />
            {reduced ? 'Motion off' : 'Motion on'}
          </button>
          {pathname === '/app' ? (
            <Link className="btn btn-sm btn-white" to="/">
              Home
            </Link>
          ) : (
            <Link className="btn btn-sm btn-ink" to="/app">
              Open the demo <ArrowUpRight size={18} strokeWidth={2.75} aria-hidden="true" />
            </Link>
          )}
          <button
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={24} strokeWidth={2.75} /> : <Menu size={24} strokeWidth={2.75} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ onTour }) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Brand />
          <p>Money skills for every kid, whatever they start with.</p>
        </div>
        <div className="footer-links">
          <Link to="/app">Open the demo</Link>
          <Link to="/soon">Coming soon</Link>
          <button className="link-btn" onClick={onTour}>
            Tour with Sprout
          </button>
        </div>
        <p className="footer-note">
          sprout.io © {new Date().getFullYear()} · A demo for the PayPal AI hackathon. Every amount on
          this site is sample money.
        </p>
      </div>
    </footer>
  );
}

// Near the top it shows a label. Further down it shrinks to just Sprout, slides away while you
// scroll down (so it never covers what you're reading) and comes back when you scroll up.
export function TourLauncher({ hidden, onTour }) {
  const [compact, setCompact] = useState(false);
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      setCompact(y > 320);
      if (Math.abs(y - lastY) > 6) setTucked(y > lastY && y > 320);
      lastY = y;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <motion.button
      hidden={hidden}
      className="tour-launcher"
      onClick={onTour}
      aria-label="Start the guided tour"
      animate={{ y: tucked ? 140 : 0, opacity: tucked ? 0 : 1 }}
      transition={{ duration: 0.3, ease }}
      style={{ pointerEvents: tucked ? 'none' : 'auto' }}
      tabIndex={tucked ? -1 : 0}
    >
      <AnimatePresence initial={false}>
        {!compact && (
          <motion.span
            className="launcher-label"
            initial={{ opacity: 0, x: 16, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.9 }}
            transition={{ duration: 0.25, ease }}
          >
            Take the tour<small>About 1½ minutes with Sprout</small>
          </motion.span>
        )}
      </AnimatePresence>
      <Mascot size={58} />
    </motion.button>
  );
}
