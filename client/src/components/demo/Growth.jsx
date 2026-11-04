// Growth: pick a goal and a monthly amount, see when you could reach it and how saving grows.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Reveal, ease, useReduced } from '../../lib/motion.jsx';
import { useCountUp } from '../../lib/hooks.js';
import {
  describeMonths,
  money,
  monthlyOptions,
  monthsToGoal,
  projectSavings,
  savingsGoals,
} from '../../lib/model.js';

function Chips({ label, options, value, onChange }) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      <span className="chip-label">{label}</span>
      <div className="chips">
        {options.map((option) => (
          <button
            key={option.id}
            className="chip"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// The goal and monthly amount live in Demo.jsx so the AI mentor can talk about the same goal.
export default function Growth({ goalId, setGoalId, monthly, setMonthly }) {
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
          <span className="tag tag-yellow">Step 3 · Grow</span>
          <h2>When can I get it?</h2>
          <p>
            Pick something you want and how much you could put aside each month. Small amounts add
            up faster than you’d think.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="card calculator">
          <div className="calc-pickers">
            <Chips
              label="Saving for"
              options={savingsGoals.map((item) => ({ id: item.id, label: item.label }))}
              value={goalId}
              onChange={setGoalId}
            />
            <Chips
              label="Each month"
              options={monthlyOptions.map((amount) => ({ id: amount, label: money(amount) }))}
              value={monthly}
              onChange={setMonthly}
            />
          </div>
          <p className="goal-eta" aria-live="polite">
            {months === null ? (
              <>
                A {money(goal.cost)} {goal.label.toLowerCase()} needs a bigger monthly amount or
                more time.
              </>
            ) : (
              <>
                Your {money(goal.cost)} {goal.label.toLowerCase()} in{' '}
                <strong>{describeMonths(months)}</strong>
              </>
            )}
          </p>
          <div className="growth-value">
            {money(balance)}
            <span>after {years} years</span>
          </div>
          <svg
            className="growth-chart"
            viewBox="0 0 400 190"
            role="img"
            aria-label={`Pretend savings growth to ${money(result.balance)} over ${years} years`}
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
                  {goal.label} goal
                </text>
              </g>
            )}
            <circle cx="384" cy="20" r="7" className="chart-dot" />
          </svg>
          <div className="chart-labels">
            <span>Today</span>
            <span>{years} years from now</span>
          </div>
          <div className="slider-label">
            <label htmlFor="years">Give it time</label>
            <output htmlFor="years">{years} years</output>
          </div>
          <input
            id="years"
            type="range"
            min="1"
            max="10"
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
          />
          <p className="hint calculator-note">
            You put in {money(result.contributed)} over {years} years. Assumes 8% a year, added
            monthly. A pretend example, not a promise. No real investing happens here.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
