// One permission check for the shared sample learning session. No PIN or chat is stored here.
import { useLanguage } from '../language/language.jsx';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { call } from '../../shared/api.js';
import { guardian } from '../../content/guardian.js';

const Permission = createContext(null);
export const LearningRevision = createContext(0);
const changeEvent = 'sprout-permission-change';

export function PermissionProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const round = useRef(0);
  const controller = useRef(null);
  const refresh = useCallback(async (clear = false) => {
    const current = ++round.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 12_000);
    if (clear) setData(null);
    setError('');
    try {
      const response = await call('/api/guardian/status?learner=A12', {
        signal: request.signal,
        cache: 'no-store',
      });
      if (current !== round.current) return;
      if (response.ok && response.consent?.learner === 'A12') setData(response);
      else {
        setData(null);
        setError('We couldn’t check guardian permission. Check the connection and try again.');
      }
    } finally {
      clearTimeout(timer);
    }
  }, []);
  const changed = useCallback(() => {
    void refresh(true);
    try {
      localStorage.setItem(changeEvent, `${Date.now()}-${Math.random()}`);
    } catch {
      /* Browser storage is optional. */
    }
  }, [refresh]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15_000);
    const focus = () => {
      // Rechecking the same revision must preserve drafts and temporary calculator choices.
      void refresh();
    };
    const visible = () => {
      if (!document.hidden) focus();
    };
    const storage = (event) => {
      if (event.key === changeEvent) focus();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visible);
    return () => {
      round.current++;
      controller.current?.abort();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  return (
    <Permission.Provider value={{ data, error, refresh, changed }}>{children}</Permission.Provider>
  );
}
export const usePermission = () => useContext(Permission);

export function LearningGate({ children }) {
  const { t } = useLanguage();

  const { data, error, refresh } = usePermission();
  if (data?.demoOpenAccess || data?.consent.status === 'active')
    return (
      <LearningRevision.Provider value={data.consent.revision}>
        <React.Fragment key={data.consent.revision}>{children}</React.Fragment>
      </LearningRevision.Provider>
    );
  if (!data && !error)
    return (
      <section className="section">
        <div className="container" role="status">
          {t('Checking demo access…')}
        </div>
      </section>
    );
  return (
    <section className="section" id="learning-permission">
      <div className="container card guardian-gate stack">
        <span className="tag tag-yellow">{t(guardian.gateTag)}</span>
        <h1>{t('Guardian permission comes first.')}</h1>
        <p>
          {t(
            data?.consent.status === 'deleted'
              ? 'This sample learner’s learning data was deleted. A guardian can record fresh permission to start again.'
              : data?.consent.status === 'withdrawn'
                ? 'Permission is withdrawn. Learning and AI chat are paused until a guardian agrees again.'
                : 'Ask a guardian to record demo permission before opening learning activities or AI chat.',
          )}
        </p>
        {!data && !error && <p role="status">{t('Checking saved permission…')}</p>}
        {error && <p role="alert">{t(error)}</p>}
        {data && !data.configured && (
          <p>
            {t(
              guardian.setup,
            )}
          </p>
        )}
        <Link className="btn btn-green" to="/soon/safety">
          {t('Open guardian permission')}
        </Link>
        <button className="btn btn-white" onClick={() => refresh(true)}>
          {t('Check permission again')}
        </button>
      </div>
    </section>
  );
}
