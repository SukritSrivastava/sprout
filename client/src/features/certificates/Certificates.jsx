// Sample certificate checker; this preview does not issue or persist certificates.
import React, { useState } from 'react';
import { BadgeCheck, CircleCheck, CircleX } from 'lucide-react';
import { useLanguage } from '../language/language.jsx';
import Walkthrough from '../../shared/components/Walkthrough.jsx';

const VALID_CODE = 'SPR-MB1-7Q4K';

export function Certificates() {
  const { t } = useLanguage();

  const [code, setCode] = useState(VALID_CODE);
  const [checked, setChecked] = useState(null);
  const steps = [
    {
      title: 'Finish a track, get a certificate',
      render: () => (
        <div className="card certificate">
          <BadgeCheck size={40} strokeWidth={2.25} aria-hidden="true" />
          <span className="tag tag-yellow">{t('Sample')}</span>
          <strong className="cert-title">{t('Money Basics · Level 1')}</strong>
          <span>{t('Awarded to Aanya · Asha Learning Trust · Nov 2026')}</span>
          <span className="mono">
            {t('Check code: ')}
            {t(VALID_CODE)}
          </span>
        </div>
      ),
    },
    {
      title: 'A school can check it',
      render: () => (
        <div className="stack">
          <p>
            {t(
              'Type a certificate code to check it. Try the real sample code, then change a letter.',
            )}
          </p>
          <div className="verify-row">
            <label>
              {t('Code')}
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setChecked(null);
                }}
              />
            </label>
            <button
              className="btn btn-sm btn-ink"
              onClick={() => setChecked(code.trim() === VALID_CODE)}
            >
              {t('Check')}
            </button>
          </div>
          {checked !== null && (
            <p className={checked ? 'verify-result ok' : 'verify-result bad'} role="status">
              {checked ? (
                <>
                  <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" />
                  {t(' Real certificate: Money Basics · Level 1.')}
                </>
              ) : (
                <>
                  <CircleX size={22} strokeWidth={2.75} aria-hidden="true" />
                  {t(' No certificate with this code.')}
                </>
              )}
            </p>
          )}
        </div>
      ),
    },
  ];
  return (
    <Walkthrough
      id="certificates"
      title={t('Learning certificates')}
      intro={t('Proof of what a kid learned, that a school or employer can check.')}
      color="var(--purple)"
      steps={steps}
      live={[
        'Digitally signed certificates, checked on a public page.',
        'Kept off the blockchain on purpose, so they can be removed if a family asks.',
        'Shows only what the kid chooses to share.',
      ]}
    />
  );
}
