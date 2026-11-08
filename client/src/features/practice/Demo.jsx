// The demo at "/app": a sample kid's Sprout with earn, jars, growth, mentor and withdraw.
// Shared sample state lives here so sections stay in sync and the AI mentor knows the numbers.
import { useLanguage } from '../language/language.jsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Mascot from '../../shared/components/Mascot.jsx';
import Earn from './Earn.jsx';
import Jars from './Jars.jsx';
import Growth from './Growth.jsx';
import Mentor from '../mentor/Mentor.jsx';
import Withdraw from './Withdraw.jsx';
import { ease, useReduced } from '../../shared/motion.jsx';
import { useCountUp } from '../../shared/hooks.js';
import { money, savingsGoals, splitReward } from './model.js';
import { demo as demoEnglish, sampleKid } from '../../content/demo.js';
import { usePresentation } from '../presentation/presentation.jsx';

export default function Demo() {
  const { t, content } = useLanguage();
  const demo = content(demoEnglish);

  const reduced = useReduced();
  const { registerActions } = usePresentation();
  const [earned, setEarned] = useState(false);
  const [save, setSave] = useState(50);
  const [goalId, setGoalId] = useState('bicycle');
  const [monthly, setMonthly] = useState(100);
  const [burstId, setBurstId] = useState(0);
  const [cheering, setCheering] = useState(false);
  const cheerTimer = useRef(0);
  useEffect(() => () => clearTimeout(cheerTimer.current), []);

  const balance = sampleKid.baseBalance + (earned ? sampleKid.reward : 0);
  const shown = useCountUp(balance, 700);

  // What the mentor is told about this sample kid (whole rupees, no personal details).
  const [jarSave, jarSpend, jarGive, jarInvest] = splitReward(balance, save);
  const goal = savingsGoals.find((item) => item.id === goalId);
  const mentorContext = {
    jars: { save: jarSave, spend: jarSpend, give: jarGive, invest: jarInvest },
    goal: { label: goal.label, cost: goal.cost, monthly },
  };

  const earn = useCallback(() => {
    setEarned(true);
    setBurstId((value) => value + 1);
    setCheering(true);
    clearTimeout(cheerTimer.current);
    cheerTimer.current = setTimeout(() => setCheering(false), 1600);
  }, []);

  // The presenter uses the same sample controls. No persistent records or payments are touched.
  useEffect(
    () =>
      registerActions({
        'sample-earn': earn,
        'sample-save': () => setSave(65),
        'sample-goal': () => setGoalId('headphones'),
        'sample-monthly': () => setMonthly(500),
      }),
    [registerActions, earn],
  );

  return (
    <>
      <section className="demo-hello band band-mint">
        <div className="container hello-grid">
          <Mascot mood={cheering ? 'cheer' : 'happy'} size={104} label={t('Sprout')} />
          <div>
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              {demo.hello.title(sampleKid.name)}
            </motion.h1>
            <p>{demo.hello.text}</p>
          </div>
          <div className="card balance-card" aria-live="polite">
            <span>{demo.hello.balance}</span>
            <strong>{money(shown)}</strong>
            <span className="tag tag-white">{demo.hello.sample}</span>
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
      <Jars balance={balance} save={save} setSave={setSave} />
      <Growth goalId={goalId} setGoalId={setGoalId} monthly={monthly} setMonthly={setMonthly} />
      <Mentor context={mentorContext} />
      <Withdraw />
    </>
  );
}
