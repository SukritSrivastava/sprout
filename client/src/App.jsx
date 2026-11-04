import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Clicky, Flower, JarArt } from './components/Art.jsx';
import Tour, { goTo } from './components/Tour.jsx';
import { money, splitReward, projectSavings } from './lib/model.js';

const jars = [
  {
    name: 'Save',
    icon: 'lock',
    color: '#a8cfb4',
    note: 'For your next big thing.',
    detail:
      'A course, a bicycle, your own laptop. Set money aside for something that matters to you.',
  },
  {
    name: 'Spend',
    icon: 'bag',
    color: '#c1aff0',
    note: 'For a little right now.',
    detail: 'Enjoy some of what you earned. A plan makes room for today, too.',
  },
  {
    name: 'Give',
    icon: 'heart',
    color: '#f3b4a2',
    note: 'For something you believe in.',
    detail: 'Support a cause you care about, if you want to. Giving is always optional.',
  },
  {
    name: 'Invest',
    icon: 'chart',
    color: '#f9ca6b',
    note: 'For a future you’re building.',
    detail:
      'Earmark money for later and learn how investing works. No real investments are made in Sprout.',
  },
];
const answers = {
  'Why should I save?':
    'Think of saving as buying your future self more choices. If your goal costs ₹1,000, putting aside ₹100 from each reward gets you there in 10 rewards. You still decide what to enjoy today.',
  'What is compound interest?':
    'It means growth can earn more growth. Imagine a seed becoming a plant, then making more seeds. The calculator above shows a hypothetical example; real returns can vary and are not guaranteed.',
  'Do I have to give?':
    'No. Giving is a choice, never a requirement. Take care of your own needs and goals first. Helping with your time can matter just as much as helping with money.',
};

function useMotion(reduced) {
  useEffect(() => {
    document.documentElement.dataset.reduced = String(reduced);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reduced]);
}

function HeroCards() {
  return (
    <div className="hero-art" aria-label="Illustrative savings goal and reward cards">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="little-note">
        a little today.
        <br />a lot of possibility.
      </div>
      <Flower className="hero-flower" />
      <div className="goal-card floating-card">
        <div className="card-top">
          <span>
            <span className="mini-dot" /> MY NEXT BIG THING
          </span>
          <Icon name="diagonal" size={19} />
        </div>
        <div className="headphone-art" aria-hidden="true">
          <div className="headband" />
          <div className="ear left" />
          <div className="ear right" />
          <span className="spark s1">✦</span>
          <span className="spark s2">✧</span>
        </div>
        <h3>My first headphones.</h3>
        <div className="goal-amount">
          <strong>₹650</strong>
          <span>of ₹1,000</span>
        </div>
        <div className="progress-track">
          <span />
        </div>
        <div className="goal-foot">
          <span>65% of the way there</span>
          <span>YOU GOT THIS ↗</span>
        </div>
      </div>
      <div className="reward-card floating-card">
        <span className="reward-icon">
          <Icon name="check" />
        </span>
        <div>
          <span>Small effort. Real progress.</span>
          <strong>+ ₹200 earned!</strong>
        </div>
        <span className="reward-star">✳</span>
      </div>
      <div className="save-sticker">
        <Icon name="leaf" size={30} />
        <span>
          future you
          <br />
          says thanks.
        </span>
      </div>
      <div className="art-caption">A GLIMPSE OF YOUR GROWTH · SAMPLE DATA</div>
    </div>
  );
}

function Jars({ reward }) {
  const [save, setSave] = useState(50);
  const [selected, setSelected] = useState(0);
  const values = splitReward(reward, save);
  return (
    <section id="jars" className="jars-section section-pad">
      <div className="section-heading reveal">
        <span className="eyebrow">YOUR MONEY. YOUR MIX.</span>
        <h2>
          Give every rupee
          <br />
          <span className="serif-word">a little direction.</span>
        </h2>
        <p>
          There’s no perfect split. Just a plan that feels like you.
          <br />
          Tap a jar. See what it’s for.
        </p>
      </div>
      <div className="jars-grid reveal">
        {jars.map((jar, i) => (
          <button
            className={`jar-card ${selected === i ? 'selected' : ''}`}
            key={jar.name}
            style={{ '--jar-color': jar.color }}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span className="jar-number">0{i + 1}</span>
            <JarArt
              type={jar.icon}
              color={jar.color}
              level={Math.max(18, (values[i] / reward) * 110)}
            />
            <h3>{jar.name}</h3>
            <p>{jar.note}</p>
            <strong>{money(values[i])}</strong>
            <span className="jar-select">
              <Icon name={selected === i ? 'check' : 'diagonal'} size={17} />
            </span>
          </button>
        ))}
      </div>
      <div className="allocation-bar reveal">
        <div className="allocation-copy" aria-live="polite">
          <strong>{jars[selected].name}, your way.</strong>
          <p>{jars[selected].detail}</p>
        </div>
        <div className="allocation-slider">
          <div>
            <label htmlFor="save-split">Try saving a little more</label>
            <output htmlFor="save-split">{save}%</output>
          </div>
          <input
            id="save-split"
            type="range"
            min="0"
            max="100"
            step="5"
            value={save}
            onChange={(e) => setSave(Number(e.target.value))}
          />
          <span>
            Sample reward: {money(reward)} · remaining split: 60% Spend, 20% Give, 20% Invest
          </span>
        </div>
      </div>
    </section>
  );
}

function Growth() {
  const [years, setYears] = useState(5);
  const result = projectSavings(100, years);
  const max = Math.max(...result.points);
  const path = result.points
    .map(
      (point, i) => `${i === 0 ? 'M' : 'L'}${12 + (i / years) * 356},${160 - (point / max) * 140}`,
    )
    .join(' ');
  return (
    <section id="grow" className="growth-section section-pad">
      <div className="growth-copy reveal">
        <span className="eyebrow">MEET YOUR FUTURE SELF</span>
        <h2>
          Small habits.
          <br />
          <span className="serif-word">Long game.</span>
        </h2>
        <p>
          You don’t need a lot to start. See how a little, saved regularly, could grow over time.
        </p>
        <div className="growth-note">
          <Icon name="sparkle" size={28} />
          <span>
            The secret ingredient?
            <br />
            <strong>Giving it time.</strong>
          </span>
        </div>
      </div>
      <div className="growth-card reveal">
        <div className="card-top">
          <span>THE WHAT-IF CALCULATOR</span>
          <span className="small-pill">ILLUSTRATION</span>
        </div>
        <p>
          If you set aside <strong>₹100 / month</strong>
        </p>
        <div className="growth-value" aria-live="polite">
          {money(result.balance)}
          <span>after {years} years</span>
        </div>
        <svg
          className="growth-chart"
          viewBox="0 0 380 180"
          role="img"
          aria-label={`Illustrative savings growth to ${money(result.balance)} over ${years} years`}
        >
          <path
            d="M12 20h356M12 90h356M12 160h356"
            stroke="currentColor"
            opacity=".13"
            strokeDasharray="4 4"
          />
          <path d={`${path} L368,160 L12,160Z`} fill="#d9efdf" />
          <path d={path} fill="none" stroke="#426f54" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="368" cy="20" r="6" fill="#c1aff0" stroke="#1b2922" strokeWidth="2" />
        </svg>
        <div className="chart-labels">
          <span>Today</span>
          <span>{years} years from now</span>
        </div>
        <div className="range-label">
          <label htmlFor="years">Give it time</label>
          <output htmlFor="years">{years} years</output>
        </div>
        <input
          id="years"
          type="range"
          min="1"
          max="10"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
        />
        <p className="calculator-note">
          You put in {money(result.contributed)}. Assumes 8% annual growth, compounded monthly, with
          deposits at month-end. Hypothetical, not guaranteed. No actual investing.
        </p>
      </div>
    </section>
  );
}

function Mentor() {
  const [question, setQuestion] = useState('Why should I save?');
  return (
    <section id="mentor" className="mentor-section section-pad">
      <div className="mentor-chat reveal">
        <div className="chat-header">
          <span className="mentor-avatar">
            <Icon name="sparkle" />
          </span>
          <div>
            <strong>Paisa Mentor</strong>
            <span>Your money questions, untangled.</span>
          </div>
          <span className="small-pill">SAMPLE CHAT</span>
        </div>
        <div className="chat-content" aria-live="polite">
          <div className="message user-message">{question}</div>
          <div className="message mentor-message">
            {answers[question]}
            <span className="message-sign">A LITTLE WISDOM, ZERO JUDGEMENT.</span>
          </div>
        </div>
        <div className="question-label">TRY A QUESTION</div>
        <div className="question-options">
          {Object.keys(answers).map((text) => (
            <button
              className={question === text ? 'active' : ''}
              onClick={() => setQuestion(text)}
              aria-pressed={question === text}
              key={text}
            >
              {text}
              <Icon name="diagonal" size={15} />
            </button>
          ))}
        </div>
        <div className="chat-foot">Prepared answers for this draft · live AI planned</div>
      </div>
      <div className="mentor-copy reveal">
        <span className="eyebrow">LESS JARGON. MORE “OH, I GET IT.”</span>
        <h2>
          A mentor.
          <br />
          Not a lecture.
        </h2>
        <p>
          “Can I afford it?” “What even is interest?”
          <br />
          Bring the questions you were afraid to ask.
        </p>
        <p>
          Paisa Mentor is designed to explain money in your language, with examples from your life.
        </p>
        <span className="hand-note">no such thing as a silly question ↙</span>
      </div>
    </section>
  );
}

function Trust() {
  const [stage, setStage] = useState(0);
  const stages = [
    'Withdrawal requested',
    'Approved by a mentor',
    'Payout simulated',
    'Receipt preview ready',
  ];
  return (
    <section id="trust" className="trust-section section-pad">
      <div className="trust-heading reveal">
        <span className="eyebrow">GROWTH NEEDS TRUST</span>
        <h2>
          Small money.
          <br />
          Big accountability.
        </h2>
        <p>
          Your jars are virtual. Adults look after the real money.
          <br />
          And every approved step should leave a trail.
        </p>
      </div>
      <div className="trust-layout reveal">
        <div className="trust-principles">
          <article>
            <span className="principle-icon">
              <Icon name="lock" />
            </span>
            <div>
              <h3>Grown-ups hold the keys.</h3>
              <p>
                The NGO manages funds. Teens request withdrawals; authorized adults approve them.
              </p>
            </div>
          </article>
          <article>
            <span className="principle-icon">
              <Icon name="arrow" />
            </span>
            <div>
              <h3>A payment with a status.</h3>
              <p>
                Planned PayPal sandbox payouts to approved adult recipients, with progress you can
                follow.
              </p>
            </div>
          </article>
          <article>
            <span className="principle-icon">
              <Icon name="check" />
            </span>
            <div>
              <h3>A record you can check.</h3>
              <p>
                Planned blockchain receipts help reveal changed records. They don’t prove every
                claim or prevent every scam.
              </p>
            </div>
          </article>
        </div>
        <div className="receipt-card">
          <div className="receipt-header">
            <Icon name="leaf" size={25} />
            <span>THE ACCOUNTABILITY TRAIL</span>
            <span className="demo-label">DEMO</span>
          </div>
          <div className="receipt-total">
            <span>Sample withdrawal</span>
            <strong>
              ₹100<span>.00</span>
            </strong>
          </div>
          <ol className="receipt-timeline">
            {stages.map((label, i) => (
              <li key={label} className={stage >= i ? 'done' : ''}>
                <span>{stage >= i ? <Icon name="check" size={13} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="receipt-status" role="status">
            {stage === 3 ? 'Preview only · no transaction published' : stages[stage]}
          </div>
          <button
            className="button button-dark receipt-action"
            onClick={() => setStage((value) => (value === 3 ? 0 : value + 1))}
          >
            {stage === 3
              ? 'Replay example'
              : stage === 0
                ? 'Simulate mentor approval'
                : stage === 1
                  ? 'Simulate payout'
                  : 'Preview receipt'}
            <Icon name="arrow" size={18} />
          </button>
          <small>No money moves. No PayPal or blockchain connection in this frontend draft.</small>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [tourOpen, setTourOpen] = useState(false);
  const [earned, setEarned] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const ring = useRef(null);
  const tourTrigger = useRef(null);
  const closeTour = useCallback(() => setTourOpen(false), []);
  useMotion(reduced);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const click = (event) => {
      if (event.pointerType === 'touch' || !ring.current) return;
      ring.current.style.left = `${event.clientX}px`;
      ring.current.style.top = `${event.clientY}px`;
      ring.current.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.8 },
          { transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 },
        ],
        { duration: 420, easing: 'ease-out' },
      );
    };
    window.addEventListener('pointerdown', click);
    return () => window.removeEventListener('pointerdown', click);
  }, [reduced]);
  const startTour = (event) => {
    tourTrigger.current = event.currentTarget;
    setMenu(false);
    setTourOpen(true);
  };
  const navigate = () => setMenu(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a href="#home" className="brand" aria-label="Sprout home">
          <Icon name="leaf" size={34} />
          <span>
            sprout<span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className={menu ? 'nav-links nav-open' : 'nav-links'}>
          <a href="#earn" onClick={navigate}>
            How it works
          </a>
          <a href="#jars" onClick={navigate}>
            The four jars
          </a>
          <a href="#trust" onClick={navigate}>
            Built on trust
          </a>
        </nav>
        <div className="nav-actions">
          <button
            className="motion-toggle"
            aria-pressed={reduced}
            onClick={() => setReduced((value) => !value)}
            title="Toggle reduced motion"
          >
            {reduced ? 'Motion off' : 'Motion on'}
            <span className={reduced ? '' : 'enabled'} />
          </button>
          <a className="button button-small button-dark nav-cta" href="#earn">
            Try the demo <Icon name="diagonal" size={17} />
          </a>
          <button
            className="menu-toggle icon-button"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
          >
            {menu ? '×' : '☰'}
          </button>
        </div>
      </header>
      <main id="main">
        <section id="home" className="hero section-pad">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">
              <span className="live-dot" /> BIG FUTURES START SMALL
            </div>
            <h1>
              Small earnings.
              <br />
              Big{' '}
              <span className="headline-flourish">
                beginnings.
                <svg viewBox="0 0 600 24" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 16Q260-3 594 10M40 22Q310 8 550 18" />
                </svg>
              </span>
            </h1>
            <p>
              A little earned. A little saved. A lot learned.
              <br />
              Build your money confidence, one real-world
              <br className="desktop-break" /> step at a time.
            </p>
            <div className="hero-actions">
              <a href="#earn" className="button button-dark">
                Let’s grow <Icon name="diagonal" size={22} />
              </a>
              <button className="button button-outline" onClick={startTour}>
                <span className="play-triangle" /> Explain me{' '}
                <span className="button-time">75 sec</span>
              </button>
            </div>
            <div className="hero-note">
              <span className="tiny-avatars">
                <span>↗</span>
                <span>✳</span>
                <span>☺</span>
              </span>
              <span>
                For young minds. And the people
                <br />
                <strong>helping them grow.</strong>
              </span>
            </div>
          </div>
          <HeroCards />
          <div className="hero-bottom">
            <span>MADE FOR YOUR FIRST MONEY MOVES</span>
            <a href="#earn">
              SCROLL TO GROW <span>↓</span>
            </a>
          </div>
        </section>
        <div className="ticker" aria-label="Earn with purpose. Save for something. Learn by doing.">
          <div className="ticker-track">
            {[0, 1].map((i) => (
              <div key={i} aria-hidden={i === 1 ? 'true' : undefined}>
                <span>EARN WITH PURPOSE</span>
                <span>✳</span>
                <span>SAVE FOR SOMETHING</span>
                <span>✳</span>
                <span>LEARN BY DOING</span>
                <span>✳</span>
                <span>GROW YOUR OWN WAY</span>
                <span>✳</span>
              </div>
            ))}
          </div>
        </div>
        <section id="earn" className="earn-section section-pad">
          <div className="section-heading horizontal reveal">
            <div>
              <span className="eyebrow">A SMALL START GOES A LONG WAY</span>
              <h2>
                Life skills.
                <br />
                <span className="serif-word">Meet money skills.</span>
              </h2>
            </div>
            <p>
              Learning about money hits different
              <br />
              when you have a little of your own.
              <br />
              Here’s how your first step could look.
            </p>
          </div>
          <div className="earn-layout reveal">
            <div className="activity-card">
              <div className="card-top">
                <span className="small-pill">YOUR FIRST MONEY MOVE</span>
                <Icon name="sparkle" />
              </div>
              <div className="activity-illustration" aria-hidden="true">
                <div className="book book-one">
                  A<span>↗</span>
                </div>
                <div className="book book-two">
                  abc<span>✳</span>
                </div>
                <span className="pencil" />
              </div>
              <div className="activity-meta">
                <span>COMMUNITY · 30 MIN</span>
                <strong>+ ₹200</strong>
              </div>
              <h3>
                Help someone learn
                <br />
                something new.
              </h3>
              <p>Lead a short reading activity at your NGO’s learning centre.</p>
              <button
                className={`button ${earned ? 'button-mint' : 'button-dark'}`}
                disabled={earned}
                onClick={() => setEarned(true)}
              >
                {earned ? 'Sample reward added' : 'Complete demo activity'}
                <Icon name={earned ? 'check' : 'arrow'} size={18} />
              </button>
              <small>
                {earned
                  ? 'Demo approval simulated. Your sample jars now hold ₹400.'
                  : 'Illustrative activity · mentor approval simulated in this demo'}
              </small>
            </div>
            <div className="steps">
              <article>
                <span className="step-number">01</span>
                <div>
                  <h3>Do something that matters.</h3>
                  <p>
                    Pick an NGO-backed activity. Build a skill. Help your community. Make a small
                    difference.
                  </p>
                </div>
              </article>
              <article>
                <span className="step-number">02</span>
                <div>
                  <h3>Earn your little beginning.</h3>
                  <p>
                    A mentor checks your activity and approves your learning reward. It’s yours to
                    plan.
                  </p>
                </div>
              </article>
              <article>
                <span className="step-number">03</span>
                <div>
                  <h3>Put your money to work.</h3>
                  <p>
                    Split it into jars. Pick a goal. Learn what happens when small decisions start
                    adding up.
                  </p>
                </div>
              </article>
              <div className="earned-feedback" role="status">
                {earned ? (
                  <>
                    <Icon name="check" /> Your sample reward is ready.{' '}
                    <button className="text-button" onClick={() => goTo('jars')}>
                      See your jars →
                    </button>
                    <button className="reset-button" onClick={() => setEarned(false)}>
                      Reset example
                    </button>
                  </>
                ) : (
                  <>
                    <Icon name="leaf" /> Real learning starts with a little doing.
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        <Jars reward={earned ? 400 : 200} />
        <Growth />
        <Mentor />
        <Trust />
        <section id="start" className="closing section-pad">
          <Flower className="closing-flower" />
          <div className="reveal">
            <span className="eyebrow">YOUR FIRST STEP DOESN’T HAVE TO BE BIG</span>
            <h2>
              Just a little
              <br />
              <span className="serif-word">room to grow.</span>
            </h2>
            <p>Your goals. Your pace. A mentor by your side.</p>
            <div className="closing-actions">
              <a className="button button-dark" href="#earn">
                Try your first money move <Icon name="diagonal" />
              </a>
              <button className="text-button" onClick={startTour}>
                Take the 75-second tour ↗
              </button>
            </div>
          </div>
          <span className="closing-stamp">
            SMALL STARTS
            <br />
            <Icon name="leaf" size={35} />
            <br />
            BIG POSSIBILITIES
          </span>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <a className="brand" href="#home">
            <Icon name="leaf" size={30} />
            sprout.
          </a>
          <p>A little money. A lifelong skill.</p>
          <a href="#home" className="back-top">
            Back to top ↑
          </a>
        </div>
        <div className="footer-bottom">
          <span>SPROUT © {new Date().getFullYear()} · FRONTEND CONCEPT</span>
          <span>Built for learning. All money shown is illustrative.</span>
          <button className="text-button" onClick={startTour}>
            Meet Clicky ↗
          </button>
        </div>
      </footer>
      <button
        hidden={tourOpen}
        className="tour-launcher"
        onClick={startTour}
        aria-label="Explain me: start the 75-second website tour"
      >
        <span className="launcher-label">
          Explain me<span>THE 75-SECOND TOUR</span>
        </span>
        <Clicky />
      </button>
      <Tour open={tourOpen} onClose={closeTour} returnFocusRef={tourTrigger} />
      <div className="click-ring" ref={ring} aria-hidden="true" />
    </>
  );
}
