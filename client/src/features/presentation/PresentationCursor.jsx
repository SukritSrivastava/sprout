// A pale green pointer, blue folded edge and small exclamation mark, matching the supplied image.
// This is a visual overlay only: it never intercepts the presenter's real mouse or touch input.
import React from 'react';
import { motion } from 'motion/react';
import { usePresentation } from './presentation.jsx';

export default function PresentationCursor({ visible, clicking }) {
  const { x, y } = usePresentation();
  if (!visible) return null;
  return <motion.div className={`presentation-cursor${clicking ? ' is-clicking' : ''}`}
    data-testid="presentation-cursor" aria-hidden="true" style={{ x, y }}>
    <span className="presentation-click" />
    <svg width="75" height="85" viewBox="0 0 150 170" fill="none">
      <g stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M32 24 24 35 48 158 57 147Z" fill="var(--presentation-blue)" />
        <path d="m82 94 61-10-9 11-57 10Z" fill="var(--presentation-blue)" />
        <path d="m32 24 111 60-61 10-25 53Z" fill="var(--presentation-paper)" />
      </g>
      <rect x="1" y="3" width="10" height="37" rx="5" fill="var(--presentation-blue)" stroke="var(--muted)" strokeWidth="2" />
      <circle cx="6" cy="51" r="5" fill="var(--presentation-blue)" stroke="var(--muted)" strokeWidth="2" />
    </svg>
  </motion.div>;
}
