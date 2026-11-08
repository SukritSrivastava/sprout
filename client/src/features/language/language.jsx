// One language preference for every page, lesson, mentor and presentation. No learner data is stored.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  LANGUAGE_KEY,
  localizeContent,
  readLanguage,
  translate,
  validLanguage,
} from './language.js';

const Language = createContext(null);

export function LanguageProvider({ children }) {
  const [language, updateLanguage] = useState(() => {
    try {
      return readLanguage(window.localStorage);
    } catch {
      return 'en';
    }
  });
  const setLanguage = useCallback((next) => {
    if (!validLanguage(next)) return;
    updateLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Switching still works without storage. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === 'hi'
        ? 'sprout.io · हर बच्चे के लिए पैसों की समझ'
        : 'sprout.io · Money skills for every kid';
  }, [language]);
  useEffect(() => {
    const sync = (event) => {
      if (event.key === LANGUAGE_KEY)
        updateLanguage(validLanguage(event.newValue) ? event.newValue : 'en');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (source, values) => translate(source, language, values),
      content: (source) => localizeContent(source, language),
    }),
    [language, setLanguage],
  );
  return <Language.Provider value={value}>{children}</Language.Provider>;
}

export const useLanguage = () => useContext(Language);

export function LanguageSwitch({ label }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className="language-switch"
      role="group"
      aria-label={label ?? (language === 'hi' ? 'वेबसाइट की भाषा' : 'Website language')}
    >
      <button
        type="button"
        lang="en"
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
      <button
        type="button"
        lang="hi"
        aria-pressed={language === 'hi'}
        onClick={() => setLanguage('hi')}
      >
        हिन्दी
      </button>
    </div>
  );
}
