// The frame around every page: header, footer and the floating tour launcher.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ease } from '../lib/motion.jsx';
import { site } from '../content/site.js';
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
  const header = useRef(null);
  const toggle = useRef(null);

  // The desktop menu has two rows. Anchor links and focused controls clear its actual height.
  useEffect(() => {
    const update = () => document.documentElement.style.setProperty('--header-offset', `${header.current.offsetHeight + 16}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header.current); update();
    return () => observer.disconnect();
  }, []);

  // Escape closes the phone menu.
  useEffect(() => {
    if (!menuOpen) return;
    const key = (event) => { if (event.key === 'Escape') { setMenuOpen(false); toggle.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [menuOpen, setMenuOpen]);

  return (
    <header className="site-header" ref={header}>
      <div className="container header-inner">
        <Brand />
        <nav id="site-navigation" aria-label="Main navigation" className={menuOpen ? 'nav nav-open' : 'nav'}>
          <Link to="/#how" onClick={close}>
            {site.nav.howItWorks}
          </Link>
          <Link to="/app#mentor" onClick={close}>
            {site.nav.mentor}
          </Link>
          {site.nav.features.map(({ id, label, status }) => <Link key={id} to={`/soon/${id}`} onClick={close}
            className="nav-feature" aria-current={pathname === `/soon/${id}` ? 'page' : undefined}>
            <span>{label}</span><small>{status}</small>
          </Link>)}
          <Link to="/soon" onClick={close}>
            {site.nav.comingSoon}
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
            {reduced ? site.nav.motionOff : site.nav.motionOn}
          </button>
          {pathname === '/app' ? (
            <Link className="btn btn-sm btn-white" to="/">
              {site.nav.home}
            </Link>
          ) : (
            <Link className="btn btn-sm btn-ink" to="/app">
              {site.nav.openDemo} <ArrowUpRight size={18} strokeWidth={2.75} aria-hidden="true" />
            </Link>
          )}
          <button
            ref={toggle}
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
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
          <p>{site.footer.tagline}</p>
        </div>
        <div className="footer-links">
          <Link to="/app">{site.footer.openDemo}</Link>
          <Link to="/soon">{site.footer.comingSoon}</Link>
          <button className="link-btn" onClick={onTour}>
            {site.footer.tour}
          </button>
        </div>
        <p className="footer-note">
          sprout.io © {new Date().getFullYear()} · {site.footer.note}
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
            {site.tourButton.label}
            <small>{site.tourButton.small}</small>
          </motion.span>
        )}
      </AnimatePresence>
      <Mascot size={58} />
    </motion.button>
  );
}
