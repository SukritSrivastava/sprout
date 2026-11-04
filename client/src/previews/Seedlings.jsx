// Preview: Seedlings mode for ages 8 to 11. Picture-first, seeds instead of rupees, read-aloud.
import React, { useState } from 'react';
import { Apple, BookOpen, Bus, Candy, Gamepad2, Shirt, Sprout as SproutIcon, Volume2 } from 'lucide-react';
import Walkthrough from './Walkthrough.jsx';
import Mascot from '../components/Mascot.jsx';

const items = [
  { name: 'Food', icon: Apple, need: true },
  { name: 'School book', icon: BookOpen, need: true },
  { name: 'Bus ticket', icon: Bus, need: true },
  { name: 'Clothes', icon: Shirt, need: true },
  { name: 'Video game', icon: Gamepad2, need: false },
  { name: 'Sweets', icon: Candy, need: false },
];

function readAloud(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'en-IN';
  speech.rate = 0.95;
  window.speechSynthesis.speak(speech);
}

function ReadAloud({ text }) {
  return (
    <button className="btn btn-sm btn-white" onClick={() => readAloud(text)}>
      <Volume2 size={18} strokeWidth={2.75} aria-hidden="true" /> Read to me
    </button>
  );
}

export default function Seedlings() {
  const [answers, setAnswers] = useState({});
  const [seeds, setSeeds] = useState(3);
  const correct = items.filter((item) => answers[item.name] === item.need).length;
  const done = Object.keys(answers).length === items.length;

  const steps = [
    {
      title: 'Need or want?',
      render: () => (
        <div className="stack">
          <div className="row-between">
            <p>Tap each picture: is it something you need, or something you want?</p>
            <ReadAloud text="Need or want? Tap each picture. Is it something you need, or something you want?" />
          </div>
          <ul className="sort-grid">
            {items.map(({ name, icon: Icon, need }) => {
              const answer = answers[name];
              const state = answer === undefined ? '' : answer === need ? 'right' : 'wrong';
              return (
                <li key={name} className={`sort-card ${state}`}>
                  <Icon size={40} strokeWidth={2.25} aria-hidden="true" />
                  <strong>{name}</strong>
                  <span className="sort-buttons">
                    <button className="chip chip-sm" aria-pressed={answer === true} onClick={() => setAnswers((a) => ({ ...a, [name]: true }))}>
                      Need
                    </button>
                    <button className="chip chip-sm" aria-pressed={answer === false} onClick={() => setAnswers((a) => ({ ...a, [name]: false }))}>
                      Want
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="hint" role="status">
            {done ? `${correct} of ${items.length} right. Wants are okay too, just after needs!` : 'Sort all six.'}
          </p>
        </div>
      ),
    },
    {
      title: 'Earn seeds, grow a garden',
      render: () => (
        <div className="walk-grid">
          <div className="stack">
            <p>
              Little ones earn seeds, not rupees. Every finished lesson adds a seed, and the garden
              grows. Grown-ups at the NGO decide what a full garden unlocks.
            </p>
            <button className="btn btn-green" onClick={() => setSeeds((n) => Math.min(9, n + 1))}>
              <SproutIcon size={20} strokeWidth={2.75} aria-hidden="true" /> Finish a lesson (+1 seed)
            </button>
            <p className="hint" role="status">
              {seeds} of 9 seeds planted
            </p>
          </div>
          <div className="garden" aria-label={`Garden with ${seeds} plants`}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={i < seeds ? 'plot planted' : 'plot'}>
                {i < seeds && <SproutIcon size={30} strokeWidth={2.5} aria-hidden="true" />}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Sprout cheers them on',
      render: () => (
        <div className="row-center">
          <Mascot size={110} mood="cheer" />
          <div className="stack">
            <p className="lead">“You saved 4 weeks in a row! Your garden is getting big.”</p>
            <ReadAloud text="You saved four weeks in a row! Your garden is getting big." />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Walkthrough
      id="seedlings"
      title="Seedlings mode (ages 8 to 11)"
      intro="Picture-first lessons with seeds instead of rupees, so younger kids learn the ideas before the money."
      color="var(--mint)"
      steps={steps}
      live={[
        'Short picture lessons: needs and wants, waiting for something, sharing.',
        'Every screen can be read aloud, in English or Hindi.',
        'No free-text AI chat for this age: only mentor-approved answers.',
        'Celebrates habits (weeks in a row), never compares kids.',
      ]}
    />
  );
}
