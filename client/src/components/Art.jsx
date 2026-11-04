import React from 'react';

export function Icon({ name = 'arrow', size = 24, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    diagonal: <><path d="M6 18 18 6M6 6h12v12"/></>,
    leaf: <><path d="M12 21V11M12 14C3 15 3 5 3 5s9-1 9 9Zm0-4C12 2 21 2 21 2s1 9-9 8Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    heart: <path d="M12 20S2 14 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 6-10 12-10 12Z"/>,
    bag: <><path d="M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2"/><path d="M8 12h.01M16 12h.01"/></>,
    chart: <><path d="M3 3v18h18M6 15l5-5 4 3 6-8M16 5h5v5"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M8 8h8M8 11h8M10 8c7 0 6 7-1 6l6 4"/></>,
    sparkle: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    volume: <><path d="M11 4 6 8H3v8h3l5 4V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

export function Clicky({ className = '' }) {
  return <svg className={className} width="76" height="88" viewBox="0 0 76 88" fill="none" aria-hidden="true"><path d="M13 7 64 49 43 52 53 75 40 81 29 57 14 72 13 7Z" fill="#1b2922" stroke="#1b2922" strokeWidth="5" strokeLinejoin="round" transform="translate(4 3)"/><path d="M13 7 64 49 43 52 53 75 40 81 29 57 14 72 13 7Z" fill="#c1aff0" stroke="#1b2922" strokeWidth="3" strokeLinejoin="round"/><ellipse cx="27" cy="35" rx="2.5" ry="4" fill="#1b2922"/><ellipse cx="39" cy="39" rx="2.5" ry="4" fill="#1b2922"/><path d="M27 45q5 7 11 2" stroke="#1b2922" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export function Flower({ className = '' }) {
  return <svg className={className} viewBox="0 0 180 180" aria-hidden="true"><g fill="#f9ca6b" stroke="#1b2922" strokeWidth="2.5">{Array.from({length:8},(_,i)=><ellipse key={i} cx="90" cy="49" rx="22" ry="40" transform={`rotate(${i*45} 90 90)`}/>)}<circle cx="90" cy="90" r="36" fill="#faf9f4"/><path d="M78 84v8m24-8v8m-25 8q13 15 26 0" fill="none" strokeLinecap="round"/></g></svg>;
}

export function JarArt({ type, color = '#a8cfb4', level = 60 }) {
  return <svg viewBox="0 0 160 180" className="jar-art" aria-hidden="true"><defs><clipPath id={`jar-${type}`}><path d="M39 38h82v15l12 14v82q0 15-15 15H42q-15 0-15-15V67l12-14Z"/></clipPath></defs><path d="M39 38h82v15l12 14v82q0 15-15 15H42q-15 0-15-15V67l12-14Z" fill="#faf9f4" stroke="#1b2922" strokeWidth="3"/><g clipPath={`url(#jar-${type})`}><rect x="27" y={164-level} width="106" height={level} fill={color} className="jar-fill"/><path d={`M27 ${164-level}q24-8 53 0t53 0`} fill="none" stroke="#1b2922" strokeWidth="2" opacity=".35"/></g><rect x="34" y="23" width="92" height="19" rx="5" fill={color} stroke="#1b2922" strokeWidth="3"/><path d="M46 27v10m12-10v10m12-10v10m12-10v10m12-10v10m12-10v10m12-10v10" stroke="#1b2922" strokeWidth="1.5"/><rect x="50" y="77" width="60" height="51" rx="9" fill="#faf9f4" stroke="#1b2922" strokeWidth="2"/><g transform="translate(65 88)"><Icon name={type} size={30}/></g><path d="M38 68v64" stroke="white" strokeWidth="5" strokeLinecap="round" opacity=".8"/></svg>;
}
