// Sprout, the mascot: a seedling in a sunny pot, drawn in the same thick-outline style as the UI.
// Moods: 'happy' (default), 'think' (while the mentor answers), 'cheer' (when you earn).
// Idle motion is gentle (a blink, a leaf sway) and switches off when motion is reduced.
import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { useReduced } from '../lib/motion.jsx';
import { usePresentation } from '../lib/presentation.jsx';
import { gazeToward } from '../lib/presentation.js';

const ink = 'var(--ink)';

function Eyes({ mood, reduced, following, lookX, lookY }) {
  if (mood === 'cheer' && !following) {
    // Closed, smiling eyes: ^ ^
    return (
      <g stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M33 66q5-6 10 0" />
        <path d="M57 66q5-6 10 0" />
      </g>
    );
  }
  const look = mood === 'think' && !following ? { x: 3, y: -3 } : { x: 0, y: 0 };
  return (
    <motion.g className="mascot-gaze" style={{ x: lookX, y: lookY }}>
    <motion.g
      style={{ originY: '64px' }}
      animate={reduced ? undefined : { scaleY: [1, 1, 0.12, 1] }}
      transition={{ duration: 4.2, times: [0, 0.9, 0.95, 1], repeat: Infinity, repeatDelay: 0.6 }}
    >
      <ellipse cx={38 + look.x} cy={64 + look.y} rx="4.2" ry="5.4" fill={ink} />
      <ellipse cx={62 + look.x} cy={64 + look.y} rx="4.2" ry="5.4" fill={ink} />
      <circle cx={39.5 + look.x} cy={62 + look.y} r="1.4" fill="#fff" />
      <circle cx={63.5 + look.x} cy={62 + look.y} r="1.4" fill="#fff" />
    </motion.g>
    </motion.g>
  );
}

function Mouth({ mood }) {
  if (mood === 'think') return <circle cx="52" cy="80" r="3.6" fill={ink} />;
  if (mood === 'cheer') {
    return (
      <path d="M38 76h24q0 13-12 13t-12-13Z" fill={ink} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    );
  }
  return <path d="M40 78q10 9 20 0" stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
}

export default function Mascot({ mood = 'happy', size = 96, label, className = '' }) {
  const reduced = useReduced();
  const svg = useRef(null);
  const presentation = usePresentation();
  const following = Boolean(presentation?.active);
  const lookX = useMotionValue(0);
  const lookY = useMotionValue(0);
  useEffect(() => {
    if (!following) { lookX.set(0); lookY.set(0); return; }
    const follow = () => {
      if (!svg.current) return;
      const look = gazeToward({ x: presentation.x.get(), y: presentation.y.get() }, svg.current.getBoundingClientRect());
      lookX.set(look.x); lookY.set(look.y);
    };
    const unwatchX = presentation.x.on('change', follow);
    const unwatchY = presentation.y.on('change', follow);
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow); follow();
    return () => { unwatchX(); unwatchY(); window.removeEventListener('scroll', follow); window.removeEventListener('resize', follow); };
  }, [following, presentation?.x, presentation?.y, lookX, lookY]);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <motion.svg
      ref={svg}
      data-following-cursor={following ? 'true' : undefined}
      className={`mascot ${className}`}
      width={size}
      height={size * 1.1}
      viewBox="0 0 100 110"
      {...a11y}
      // Cheering bounces twice; `key` restarts it each time the mood becomes 'cheer'.
      key={mood}
      animate={!reduced && mood === 'cheer' ? { y: [0, -10, 0, -6, 0] } : { y: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {/* Leaves sway from the stem base */}
      <motion.g
        style={{ originX: '50px', originY: '40px' }}
        animate={reduced ? undefined : { rotate: [-4, 4, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M50 40V24" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <path
          d="M50 28C38 30 28 22 26 10c12-2 23 4 24 18Z"
          fill="var(--green)"
          stroke={ink}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M50 24c2-12 13-18 25-16-1 12-12 19-25 16Z"
          fill="var(--green)"
          stroke={ink}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </motion.g>
      {/* Arms go up when cheering */}
      {mood === 'cheer' && (
        <g stroke={ink} strokeWidth="3.5" strokeLinecap="round">
          <path d="M18 64 7 50" />
          <path d="M82 64 93 50" />
        </g>
      )}
      <rect x="16" y="40" width="68" height="64" rx="26" fill="var(--yellow)" stroke={ink} strokeWidth="3.5" />
      <ellipse cx="27" cy="77" rx="5" ry="3.4" fill="var(--peach)" />
      <ellipse cx="73" cy="77" rx="5" ry="3.4" fill="var(--peach)" />
      <Eyes mood={mood} reduced={reduced} following={following} lookX={lookX} lookY={lookY} />
      <Mouth mood={mood} />
    </motion.svg>
  );
}
