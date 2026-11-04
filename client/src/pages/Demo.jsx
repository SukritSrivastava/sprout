// The demo at "/app": a sample kid's Sprout with earn, jars, growth, mentor and withdraw.
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Mascot from '../components/Mascot.jsx';
import Earn from '../components/demo/Earn.jsx';
import Jars from '../components/demo/Jars.jsx';
import Growth from '../components/demo/Growth.jsx';
import Mentor from '../components/demo/Mentor.jsx';
import Withdraw from '../components/demo/Withdraw.jsx';
import { ease, useReduced } from '../lib/motion.jsx';
import { useCountUp } from '../lib/hooks.js';
import { money } from '../lib/model.js';
import { sampleKid } from '../lib/content.js';

export default function Demo() {
  const reduced = useReduced();
  const [earned, setEarned] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const [cheering, setCheering] = useState(false);
  const cheerTimer = useRef(0);
  useEffect(() => () => clearTimeout(cheerTimer.current), []);

  const balance = sampleKid.baseBalance + (earned ? sampleKid.reward : 0);
  const shown = useCountUp(balance, 700);

  const earn = () => {
    setEarned(true);
    setBurstId((value) => value + 1);
    setCheering(true);
    clearTimeout(cheerTimer.current);
    cheerTimer.current = setTimeout(() => setCheering(false), 1600);
  };

  return (
    <>
      <section className="demo-hello band band-mint">
        <div className="container hello-grid">
          <Mascot mood={cheering ? 'cheer' : 'happy'} size={104} label="Sprout" />
          <div>
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              Hi {sampleKid.name}. This is your Sprout.
            </motion.h1>
            <p>Everything here is sample money. Tap things, move sliders, break nothing.</p>
          </div>
          <div className="card balance-card" aria-live="polite">
            <span>Total balance</span>
            <strong>{money(shown)}</strong>
            <span className="tag tag-white">Sample</span>
          </div>
        </div>
      </section>
      <Earn
        earned={earned}
        burstId={burstId}
        onEarn={earn}
        onReset={() => setEarned(false)}
        reward={sampleKid.reward}
      />
      <Jars balance={balance} />
      <Growth />
      <Mentor />
      <Withdraw />
    </>
  );
}
