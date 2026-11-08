// Growth: pick a goal and a monthly amount, see when you could reach it and how saving grows.
// Words: src/content/demo.js → demo.grow. Goals and amounts: src/features/practice/model.js.
import { useLanguage } from '../language/language.jsx';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Reveal, ease, useReduced } from '../../shared/motion.jsx';
import { useCountUp } from '../../shared/hooks.js';
import {
  describeMonths,
  money,
  monthlyOptions,
  monthsToGoal,
  projectSavings,
  savingsGoals,
} from './model.js';
import { demo as demoEnglish } from '../../content/demo.js';

function Chips({ label, options, value, onChange, present }) {
  const { t } = useLanguage();

  return (
    <div className="chip-group" role="group" aria-label={t(label)}>
      <span className="chip-label">{t(label)}</span>
      <div className="chips">
        {options.map((option) => (
          <button
            key={option.id}
            data-present={`${present}-${option.id}`}
            className="chip"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

// The goal and monthly amount live in Demo.jsx so the AI mentor can talk about the same goal.
export default function Growth({ goalId, setGoalId, monthly, setMonthly }) {
  const { t, content, language } = useLanguage();
  const demo = content(demoEnglish);
  const text = demo.grow;

  const reduced = useReduced();
  const [years, setYears] = useState(5);
  const goal = savingsGoals.find((item) => item.id === goalId);
  const result = projectSavings(monthly, years);
  const months = monthsToGoal(monthly, goal.cost);
  const balance = useCountUp(result.balance);

  // Chart: 0 at the bottom (y=170), the biggest value at the top (y=20).
  const max = Math.max(...result.points);
  const y = (value) => 170 - (value / max) * 150;
  const x = (i) => 16 + (i / years) * 368;
  const line = result.points.map((point, i) => `${i ? 'L' : 'M'}${x(i)},${y(point)}`).join(' ');
  const goalOnChart = goal.cost <= max;

  return (
    <section id="grow" className="section">
      <div className="container grow-grid">
        <Reveal className="grow-copy">
          <span className="tag tag-yellow">{text.tag}</span>
          <h2>{text.title}</h2>
          <p>{text.text}</p>
        </Reveal>
        <Reveal delay={0.1} className="card calculator">
          <div className="calc-pickers">
            <Chips
              present="goal"
              label={text.goalLabel}
              options={savingsGoals.map((item) => ({ id: item.id, label: item.label }))}
              value={goalId}
              onChange={setGoalId}
            />
            <Chips
              present="monthly"
              label={text.monthlyLabel}
              options={monthlyOptions.map((amount) => ({ id: amount, label: money(amount) }))}
              value={monthly}
              onChange={setMonthly}
            />
          </div>
          <p className="goal-eta" aria-live="polite">
            {t(
              months === null ? (
                text.tooFar(money(goal.cost), t(goal.label.toLowerCase()))
              ) : (
                <>
                  {text.reachable} {money(goal.cost)} {t(goal.label.toLowerCase())}
                  {t(' in')}
                  {t(' ')}
                  <strong>{describeMonths(months, language)}</strong>
                </>
              ),
            )}
          </p>
          <div className="growth-value">
            {money(balance)}
            <span>{text.after(years)}</span>
          </div>
          <svg
            className="growth-chart"
            viewBox="0 0 400 190"
            role="img"
            aria-label={t('Pretend savings growth to {0} over {1} years', [
              money(result.balance),
              years,
            ])}
          >
            <path d="M16 20h368M16 95h368M16 170h368" className="chart-grid" />
            <path d={`${line} L384,170 L16,170Z`} className="chart-area" />
            <motion.path
              d={line}
              className="chart-line"
              initial={reduced ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease }}
            />
            {goalOnChart && (
              <g className="goal-line">
                <path d={`M16 ${y(goal.cost)}h368`} />
                <text x="20" y={y(goal.cost) - 8}>
                  {t(goal.label)}
                  {t(' goal')}
                </text>
              </g>
            )}
            <circle cx="384" cy="20" r="7" className="chart-dot" />
          </svg>
          <div className="chart-labels">
            <span>{text.today}</span>
            <span>{text.later(years)}</span>
          </div>
          <div className="slider-label">
            <label htmlFor="years">{text.slider}</label>
            <output htmlFor="years">{text.sliderValue(years)}</output>
          </div>
          <input
            id="years"
            type="range"
            min="1"
            max="10"
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
          />
          <p className="hint calculator-note">{text.note(money(result.contributed), years)}</p>
        </Reveal>
      </div>
    </section>
  );
}
