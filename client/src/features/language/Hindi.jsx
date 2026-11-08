// Demonstrates the shared site language preference.
import React from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitch, useLanguage } from './language.jsx';

export function Hindi() {
  const { t } = useLanguage();
  return (
    <section id="preview" className="section" data-preview="hindi">
      <div className="container narrow stack">
        <Link className="link-btn" to="/soon">
          {t('All features')}
        </Link>
        <span className="tag tag-green">{t('Working · shared site language')}</span>
        <h1>{t('Hindi everywhere')}</h1>
        <p className="lead">
          {t(
            'Choose English or Hindi for the whole website. Your choice follows you across pages and stays after a reload.',
          )}
        </p>
        <LanguageSwitch />
        <p>
          {t(
            'Lessons, navigation, forms, errors, mentor reply language and presentation captions use the same setting.',
          )}
        </p>
        <p className="hint">
          {t(
            'PayPal’s own checkout window follows PayPal’s language settings. Existing chat messages and AI donor notes stay in the language in which they were written.',
          )}
        </p>
        <Link className="btn btn-green" to="/app">
          {t('Open the demo')}
        </Link>
        <Link className="btn btn-white" to="/soon/seedlings">
          {t('Open Seedlings lessons')}
        </Link>
      </div>
    </section>
  );
}
