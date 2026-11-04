// Previews for three smaller features: the full Hindi app, classroom mode, and certificates.
import React, { useState } from 'react';
import { BadgeCheck, CircleCheck, CircleX, Delete, WifiOff } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import { money } from '../lib/model.js';

// ---------- Hindi everywhere ----------
const homeText = {
  en: { hello: 'Hi Aanya!', balance: 'Total balance', jars: ['Save', 'Spend', 'Give', 'Invest'], goal: 'Bicycle goal', cta: 'Do an activity' },
  hi: { hello: 'नमस्ते आन्या!', balance: 'कुल बैलेंस', jars: ['बचत', 'खर्च', 'दान', 'निवेश'], goal: 'साइकिल का लक्ष्य', cta: 'एक गतिविधि करो' },
};

export function Hindi() {
  const [lang, setLang] = useState('hi');
  const t = homeText[lang];
  const steps = [
    {
      title: 'The whole app, in Hindi',
      render: () => (
        <div className="stack">
          <div className="chips" role="group" aria-label="App language">
            <button className="chip" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              English
            </button>
            <button className="chip" aria-pressed={lang === 'hi'} onClick={() => setLang('hi')}>
              हिंदी
            </button>
          </div>
          <div className="card phone-mock" lang={lang}>
            <strong className="phone-hello">{t.hello}</strong>
            <span>{t.balance}</span>
            <strong className="big-number">{money(400)}</strong>
            <div className="mini-jars">
              {t.jars.map((name, i) => (
                <div key={name} className="mini-jar" style={{ '--jar': ['var(--green)', 'var(--purple)', 'var(--peach)', 'var(--yellow)'][i] }}>
                  <strong>{name}</strong>
                  {money([200, 120, 40, 40][i])}
                </div>
              ))}
            </div>
            <span>{t.goal}</span>
            <button className="btn btn-sm btn-green">{t.cta}</button>
          </div>
        </div>
      ),
    },
    {
      title: 'Today vs later',
      render: () => (
        <p className="lead">
          Today only Paisa Mentor speaks Hindi (try the switch in the demo). Later, every screen,
          lesson and read-aloud will be in Hindi, checked by a native speaker.
        </p>
      ),
    },
  ];
  return (
    <Walkthrough
      id="hindi"
      title="Hindi everywhere"
      intro="Kids learn best in the language they think in."
      color="var(--mint)"
      steps={steps}
      live={[
        'Every screen and lesson in English and Hindi, with more languages after.',
        'Indian number formatting (₹1,00,000) and Devanagari fonts.',
        'Translations reviewed by native speakers, not just AI.',
      ]}
    />
  );
}

// ---------- Classroom mode ----------
const profiles = ['Aanya', 'Kabir', 'Zoya', 'Ravi'];
const SAMPLE_PIN = '1234';

export function Classroom() {
  const [who, setWho] = useState(null);
  const [pin, setPin] = useState('');
  const unlocked = pin === SAMPLE_PIN;
  const press = (digit) => setPin((value) => (value.length < 4 ? value + digit : value));

  const steps = [
    {
      title: 'One tablet, many kids',
      render: ({ next }) => (
        <div className="stack">
          <p>At the NGO centre, kids share a tablet. Each taps their own picture.</p>
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
                <span className="avatar">{name[0]}</span>
                {name}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'A simple PIN',
      render: () => (
        <div className="walk-grid">
          <div className="stack">
            <p>
              {who ? `${who}` : 'The kid'} enters a 4-digit PIN. For this preview the sample PIN is{' '}
              <strong>1234</strong>.
            </p>
            <p className="pin-display" aria-label={`${pin.length} digits entered`}>
              {'●'.repeat(pin.length).padEnd(4, '○')}
            </p>
            <p className={unlocked ? 'verify-result ok' : 'hint'} role="status">
              {unlocked ? `Welcome, ${who ?? 'friend'}!` : pin.length === 4 ? 'Not quite. Clear and try again.' : 'Enter 4 digits.'}
            </p>
          </div>
          <div className="pin-pad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} className="chip" onClick={() => press(d)}>
                {d}
              </button>
            ))}
            <button className="chip" aria-label="Clear PIN" onClick={() => setPin('')}>
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
            Lessons and jars still work offline. Finished activities wait on the tablet and sync
            when the internet comes back.
          </p>
        </div>
      ),
    },
  ];
  return (
    <Walkthrough
      id="classroom"
      title="Classroom mode and offline"
      intro="For centres where kids share one device and the internet comes and goes."
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

// ---------- Certificates ----------
const VALID_CODE = 'SPR-MB1-7Q4K';

export function Certificates() {
  const [code, setCode] = useState(VALID_CODE);
  const [checked, setChecked] = useState(null);
  const steps = [
    {
      title: 'Finish a track, get a certificate',
      render: () => (
        <div className="card certificate">
          <BadgeCheck size={40} strokeWidth={2.25} aria-hidden="true" />
          <span className="tag tag-yellow">Sample</span>
          <strong className="cert-title">Money Basics · Level 1</strong>
          <span>Awarded to Aanya · Asha Learning Trust · Nov 2026</span>
          <span className="mono">Check code: {VALID_CODE}</span>
        </div>
      ),
    },
    {
      title: 'A school can check it',
      render: () => (
        <div className="stack">
          <p>Type a certificate code to check it. Try the real sample code, then change a letter.</p>
          <div className="verify-row">
            <label>
              Code
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setChecked(null);
                }}
              />
            </label>
            <button className="btn btn-sm btn-ink" onClick={() => setChecked(code.trim() === VALID_CODE)}>
              Check
            </button>
          </div>
          {checked !== null && (
            <p className={checked ? 'verify-result ok' : 'verify-result bad'} role="status">
              {checked ? (
                <>
                  <CircleCheck size={22} strokeWidth={2.75} aria-hidden="true" /> Real certificate: Money Basics · Level 1.
                </>
              ) : (
                <>
                  <CircleX size={22} strokeWidth={2.75} aria-hidden="true" /> No certificate with this code.
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
      title="Learning certificates"
      intro="Proof of what a kid learned, that a school or employer can check."
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
