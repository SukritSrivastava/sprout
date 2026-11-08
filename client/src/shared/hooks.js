// Small reusable React helpers.
// useCountUp: when a number changes (like a jar amount), it rolls to the new value instead of
// jumping. When motion is turned off it jumps straight there.
import { useEffect, useRef, useState } from 'react';

export const motionReduced = () => document.documentElement.dataset.reduced === 'true';

// Animates a number from its previous value to the new target. Jumps straight there when motion is off.
export function useCountUp(target, duration = 550) {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || motionReduced()) {
      from.current = target;
      setDisplay(target);
      return;
    }
    let frame;
    const began = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(start + (target - start) * eased);
      from.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return display;
}
