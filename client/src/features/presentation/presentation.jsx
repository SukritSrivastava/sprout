// The demo cursor's position is shared without rendering the whole app on each animation frame.
// Only /app's temporary sample controls can register actions; no API or PIN actions are supported.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import { samplePresentationActions } from './presentation.js';

const PresentationContext = createContext(null);
export const usePresentation = () => useContext(PresentationContext);

export function PresentationProvider({ children }) {
  const [active, setActive] = useState(false);
  const x = useMotionValue(80);
  const y = useMotionValue(180);
  const actions = useRef({});
  const registerActions = useCallback((next) => {
    actions.current = next;
    return () => { if (actions.current === next) actions.current = {}; };
  }, []);
  const runAction = useCallback((name) => {
    if (!samplePresentationActions.includes(name) || !actions.current[name]) return false;
    actions.current[name]();
    return true;
  }, []);
  const value = useMemo(() => ({ active, setActive, x, y, registerActions, runAction }),
    [active, x, y, registerActions, runAction]);
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}
