// Shared-tablet and offline preview; all profile/PIN choices are temporary sample state.
import React, { useState } from 'react';
import { Delete, WifiOff } from 'lucide-react';
import { useLanguage } from '../language/language.jsx';
import { usePermission } from '../guardian/permission.jsx';
import { demoAccess } from '../../content/demo-access.js';
import Walkthrough from '../../shared/components/Walkthrough.jsx';

const profiles = ['Aanya', 'Kabir', 'Zoya', 'Ravi'];
const SAMPLE_PIN = '1234';

export function Classroom() {
  const { t, language } = useLanguage();
  const { data } = usePermission();
  const demoOpenAccess = Boolean(data?.demoOpenAccess);
  const demoText = demoAccess[language];

  const [who, setWho] = useState(null);
  const [pin, setPin] = useState('');
  const unlocked = pin === SAMPLE_PIN;
  const press = (digit) => setPin((value) => (value.length < 4 ? value + digit : value));

  const steps = [
    {
      title: 'One tablet, many kids',
      render: ({ next }) => (
        <div className="stack">
          <p>{t('At the NGO centre, kids share a tablet. Each taps their own picture.')}</p>
          <div className="profile-grid">
            {profiles.map((name) => (
              <button
                key={name}
                className="profile"
                aria-pressed={who === name}
                onClick={() => {
                  setWho(name);
                  setPin('');
                  next();
                }}
              >
                <span className="avatar">{t(name[0])}</span>
                {t(name)}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: !data || demoOpenAccess ? demoText.classroomTitle : 'A simple PIN',
      render: () =>
        !data ? (
          <p role="status">{demoText.loading}</p>
        ) : demoOpenAccess ? (
          <div className="card stack">
            <p>{demoText.classroomText}</p>
            <p className="verify-result ok" role="status">
              {demoText.welcome(who)}
            </p>
          </div>
        ) : (
          <div className="walk-grid">
            <div className="stack">
              <p>
                {t(who ? `${who}` : 'The kid')}
                {t(' enters a 4-digit PIN. For this preview the sample PIN is')}
                {t(' ')}
                <strong>1234</strong>.
              </p>
              <p className="pin-display" aria-label={t('{0} digits entered', [pin.length])}>
                {t('●'.repeat(pin.length).padEnd(4, '○'))}
              </p>
              <p className={unlocked ? 'verify-result ok' : 'hint'} role="status">
                {t(
                  unlocked
                    ? t('Welcome, {0}!', [who ?? 'friend'])
                    : pin.length === 4
                      ? 'Not quite. Clear and try again.'
                      : 'Enter 4 digits.',
                )}
              </p>
            </div>
            <div className="pin-pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} className="chip" onClick={() => press(d)}>
                  {t(d)}
                </button>
              ))}
              <button className="chip" aria-label={t('Clear PIN')} onClick={() => setPin('')}>
                <Delete size={18} strokeWidth={2.75} aria-hidden="true" />
              </button>
              <button className="chip" onClick={() => press('0')}>
                0
              </button>
            </div>
          </div>
        ),
    },
    {
      title: 'Works without internet',
      render: () => (
        <div className="row-center">
          <WifiOff size={40} strokeWidth={2.5} aria-hidden="true" />
          <p className="lead">
            {t(
              'Lessons and jars still work offline. Finished activities wait on the tablet and sync when the internet comes back.',
            )}
          </p>
        </div>
      ),
    },
  ];
  return (
    <Walkthrough
      id="classroom"
      title={t('Classroom mode and offline')}
      intro={t('For centres where kids share one device and the internet comes and goes.')}
      color="var(--yellow)"
      steps={steps}
      live={[
        'Shared-device profiles with PINs, set up by the NGO.',
        'Installable app that works offline and syncs later.',
        'Small downloads, so it runs on cheap phones and slow connections.',
      ]}
    />
  );
}
