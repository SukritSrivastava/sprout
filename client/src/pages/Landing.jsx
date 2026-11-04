// The home page at "/": what Sprout is, for judges, NGOs, donors and parents.
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  HandCoins,
  Landmark,
  Languages,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Sprout as SproutIcon,
  Users,
} from 'lucide-react';
import Mascot from '../components/Mascot.jsx';
import { Reveal, Stagger, ease, liftOnHover, useReduced } from '../lib/motion.jsx';
import { jars } from '../lib/content.js';
import { money, splitReward } from '../lib/model.js';

const icon = { size: 22, strokeWidth: 2.5, 'aria-hidden': true };

function HeroCard() {
  const reduced = useReduced();
  const values = splitReward(400, 50);
  return (
    <motion.div
      className="hero-card-wrap"
      initial={reduced ? false : { opacity: 0, y: 40, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, ease, delay: 0.15 }}
    >
      <div className="card hero-card">
        <div className="hero-card-top">
          <span>Aanya’s jars</span>
          <span className="tag tag-white">Sample</span>
        </div>
        <div className="hero-total">
          {money(400)} <span className="tag tag-yellow">+{money(200)} earned</span>
        </div>
        <div className="mini-jars">
          {jars.map((jar, i) => (
            <div className="mini-jar" key={jar.name} style={{ '--jar': jar.color }}>
              <strong>{jar.name}</strong>
              {money(values[i])}
            </div>
          ))}
        </div>
        <div className="goal-row">
          <span>Bicycle goal</span>
          <span>{money(2100)} of {money(6000)}</span>
        </div>
        <div className="meter">
          <motion.span
            initial={reduced ? false : { width: 0 }}
            animate={{ width: '35%' }}
            transition={{ duration: 1.2, ease, delay: 0.6 }}
          />
        </div>
      </div>
      <Mascot size={92} className="hero-mascot" label="Sprout, the mascot, waving hello" />
    </motion.div>
  );
}

function Hero({ onTour }) {
  const reduced = useReduced();
  const line = (delay) => ({
    initial: reduced ? false : { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease, delay },
  });
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.span className="tag tag-yellow tilt" {...line(0)}>
            For kids 8 to 17 · run with NGOs
          </motion.span>
          <h1>
            <motion.span className="block" {...line(0.05)}>
              Money skills
            </motion.span>
            <motion.span className="block" {...line(0.12)}>
              for every kid.
            </motion.span>
            <motion.span className="highlight" {...line(0.2)}>
              Whatever they start with.
            </motion.span>
          </h1>
          <motion.p className="lead" {...line(0.3)}>
            Do a small activity, earn a little, split it into four jars, and ask a mentor the money
            questions you were scared to ask.
          </motion.p>
          <motion.div className="hero-actions" {...line(0.38)}>
            <Link className="btn btn-green btn-lg" to="/app">
              Open the demo <ArrowRight {...icon} />
            </Link>
            <button className="link-btn" onClick={onTour}>
              Take the 75-second tour
            </button>
          </motion.div>
        </div>
        <HeroCard />
      </div>
    </section>
  );
}

const steps = [
  {
    title: 'Do something useful.',
    text: 'Run a reading hour at your NGO centre, sort the library, teach a younger kid to count change.',
    card: (
      <div className="card ticket">
        <div className="ticket-top">
          <BookOpen {...icon} />
          <span className="tag tag-white">Community · 30 min</span>
        </div>
        <strong>Reading hour at the learning centre</strong>
        <span className="ticket-reward">+ {money(200)}</span>
      </div>
    ),
  },
  {
    title: 'A grown-up checks it.',
    text: 'A mentor at the NGO looks at what you did and approves it. Then the reward lands in your Sprout.',
    card: (
      <div className="card checklist">
        <div>
          <BadgeCheck {...icon} /> Activity submitted
        </div>
        <div>
          <BadgeCheck {...icon} /> Checked by your mentor
        </div>
        <div className="checklist-done">
          <HandCoins {...icon} /> {money(200)} added
        </div>
      </div>
    ),
  },
  {
    title: 'You decide where it goes.',
    text: 'Save, Spend, Give, Invest. You set the split. Nobody does it for you, and nobody judges it.',
    card: (
      <div className="card split-bars">
        {jars.map((jar, i) => (
          <div key={jar.name} className="split-bar">
            <span>{jar.name}</span>
            <span className="bar" style={{ '--jar': jar.color, '--w': `${[50, 30, 10, 10][i]}%` }} />
          </div>
        ))}
      </div>
    ),
  },
];

function HowItWorks() {
  return (
    <section id="how" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="tag tag-mint">How it works</span>
          <h2>
            Three steps.
            <br />
            No bank account needed.
          </h2>
        </Reveal>
        <ol className="steps">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} className={`step step-${i + 1}`}>
              <div className="step-copy">
                <span className="step-number">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <motion.div className="step-card" {...liftOnHover}>
                {step.card}
              </motion.div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MeetMentor() {
  return (
    <section id="meet-mentor" className="section band band-yellow">
      <div className="container mentor-grid">
        <Reveal className="mentor-copy">
          <span className="tag tag-white">Paisa Mentor</span>
          <h2>
            A mentor.
            <br />
            Not a lecture.
          </h2>
          <p>
            Ask anything about money, in English or Hindi. Paisa Mentor answers like an older cousin
            who’s good with money, not like a textbook.
          </p>
          <Link className="btn btn-white" to="/app#mentor">
            Try it in the demo <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="mentor-sample">
          <div className="card chat-card">
            <div className="chat-head">
              <Mascot size={40} mood="think" />
              <div>
                <strong>Paisa Mentor</strong>
                <span>Sample chat</span>
              </div>
            </div>
            <p className="bubble bubble-user" lang="hi">
              मैं साइकिल कब खरीद पाऊँगी?
            </p>
            <p className="bubble bubble-mentor" lang="hi">
              ₹100 हर महीने बचाकर लगभग 4 साल 3 महीने में। ₹250 बचाओ तो 2 साल से कम।
            </p>
            <p className="bubble bubble-user">Can I still buy snacks sometimes?</p>
            <p className="bubble bubble-mentor">
              Yes! That’s what your Spend jar is for. Saving works best when it doesn’t feel like a
              punishment.
            </p>
            <p className="chat-note">The live AI mentor is being built. These are sample replies.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Trust() {
  const points = [
    [Landmark, 'The NGO keeps the money.', 'Kids see their balance in Sprout. The real funds stay with the NGO.'],
    [Users, 'Two adults approve every payout.', 'A mentor and an NGO admin both say yes before anything is paid.'],
    [Receipt, 'Every rupee leaves a receipt.', 'Donors and parents can check where the money went.'],
  ];
  return (
    <section id="trust" className="section band band-ink">
      <div className="container trust-grid">
        <Reveal className="trust-head">
          <span className="tag tag-green">
            <ShieldCheck size={18} strokeWidth={2.75} aria-hidden="true" /> Built on trust
          </span>
          <h2>
            Kids learn.
            <br />
            Adults hold the money.
          </h2>
          <p className="muted-on-ink">
            Payouts through PayPal and public receipts are planned. In today’s demo they are
            simulated, and it says so.
          </p>
        </Reveal>
        <Stagger as="ul" className="trust-list">
          {points.map(([Icon, title, text]) => (
            <Stagger.Item as="li" key={title}>
              <span className="trust-icon">
                <Icon {...icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </Stagger.Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const upcoming = [
  [HandCoins, 'PayPal donations', 'Anyone can fund an NGO’s reward pool in a few taps.', 'var(--green)'],
  [LayoutDashboard, 'NGO dashboard', 'Mentors approve activities and payouts in one place.', 'var(--purple)'],
  [Receipt, 'Public impact ledger', 'Receipts on a public blockchain that anyone can check. No kid data on it.', 'var(--peach)'],
  [SproutIcon, 'Seedlings mode', 'Picture-first lessons for ages 8 to 11, with seeds instead of rupees.', 'var(--yellow)'],
  [Languages, 'Hindi everywhere', 'The whole app in Hindi, not just the mentor.', 'var(--mint)'],
];

function ComingSoon() {
  return (
    <section id="soon" className="section">
      <div className="container">
        <Reveal className="section-head split-head">
          <div>
            <span className="tag tag-purple">Coming soon</span>
            <h2>What we’re building next.</h2>
          </div>
          <p>
            These are planned, not live. The demo shows clickable previews of each one as we build
            them.
          </p>
        </Reveal>
        <Stagger as="ul" className="soon-list" gap={0.07}>
          {upcoming.map(([Icon, title, text, color], i) => (
            <Stagger.Item as="li" key={title} className="soon-row" style={{ '--row': color }}>
              <span className="soon-number">{String(i + 1).padStart(2, '0')}</span>
              <span className="soon-icon">
                <Icon {...icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <span className="stamp">Coming soon</span>
            </Stagger.Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="section band band-mint closing">
      <div className="container closing-grid">
        <Reveal>
          <h2 className="closing-title">
            Start with <span className="highlight">₹0.</span>
          </h2>
          <p className="lead">
            Sprout is for kids who have never had pocket money. That’s the whole point.
          </p>
          <Link className="btn btn-ink btn-lg" to="/app">
            Open the demo <ArrowRight {...icon} />
          </Link>
        </Reveal>
        <Reveal delay={0.15} className="closing-mascot">
          <Mascot mood="cheer" size={150} />
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing({ onTour }) {
  return (
    <>
      <Hero onTour={onTour} />
      <HowItWorks />
      <MeetMentor />
      <Trust />
      <ComingSoon />
      <Closing />
    </>
  );
}
