// Shared animation pieces built on Motion (motion.dev).
// `ReducedMotion` holds one true/false for the whole app: the OS setting or the header toggle.
import React, { createContext, useContext } from 'react';
import { motion } from 'motion/react';

export const ReducedMotion = createContext(false);
export const useReduced = () => useContext(ReducedMotion);

// One easing curve everywhere keeps the motion feeling like one system.
export const ease = [0.22, 1, 0.36, 1];

// Fades and lifts its content the first time it scrolls into view.
export function Reveal({ as = 'div', delay = 0, y = 28, children, ...rest }) {
  const reduced = useReduced();
  const Component = motion[as];
  return (
    <Component
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease, delay }}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Children wrapped in <Stagger.Item> reveal one after another.
export function Stagger({ as = 'div', gap = 0.09, children, ...rest }) {
  const reduced = useReduced();
  const Component = motion[as];
  return (
    <Component
      initial={reduced ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ shown: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </Component>
  );
}

Stagger.Item = function StaggerItem({ as = 'div', children, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      variants={{
        hidden: { opacity: 0, y: 24 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};

// Cards lift and tilt a touch under the pointer, like a sticker being picked up.
export const liftOnHover = { whileHover: { y: -6, rotate: -0.6 }, transition: { type: 'spring', stiffness: 320, damping: 22 } };
