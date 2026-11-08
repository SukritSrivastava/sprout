// Unit tests for the money maths in model.js: jar splits never lose a rupee, savings growth is
// right, and goal timing reads naturally. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitReward,
  projectSavings,
  monthsToGoal,
  describeMonths,
  savingsGoals,
  monthlyOptions,
} from './model.js';

test('months to goal matches the growth projection and handles edge cases', () => {
  assert.equal(monthsToGoal(100, 1200, 0), 12);
  assert.equal(monthsToGoal(100, 1201, 0), 13);
  assert.equal(monthsToGoal(100, 0), 0);
  assert.equal(monthsToGoal(0, 1000), null);
  assert.equal(monthsToGoal(100, 10_000_000), null);
  // 5 years of ₹100/month at 8% reaches ₹7,348, so a ₹7,300 goal lands in month 60.
  assert.equal(monthsToGoal(100, 7300), 60);
  for (const goal of savingsGoals)
    for (const monthly of monthlyOptions) {
      const months = monthsToGoal(monthly, goal.cost);
      assert.ok(months === null || months > 0);
    }
});
test('month counts read naturally', () => {
  assert.equal(describeMonths(1), '1 month');
  assert.equal(describeMonths(12), '1 year');
  assert.equal(describeMonths(26), '2 years 2 months');
  assert.equal(describeMonths(null), 'more than 20 years');
});

test('jar allocations conserve every rupee, including all-save and no-save choices', () => {
  for (const amount of [1, 199, 200, 400])
    for (let percent = 0; percent <= 100; percent += 5) {
      const split = splitReward(amount, percent);
      assert.equal(
        split.reduce((a, b) => a + b, 0),
        amount,
      );
      assert.ok(split.every((value) => Number.isInteger(value) && value >= 0));
    }
  assert.deepEqual(splitReward(200, 100), [200, 0, 0, 0]);
});
test('growth uses month-end contributions and handles zero returns', () => {
  assert.deepEqual(projectSavings(100, 1, 0), {
    balance: 1200,
    contributed: 1200,
    points: [0, 1200],
  });
  const result = projectSavings(100, 5);
  assert.equal(result.balance, 7348);
  assert.equal(result.contributed, 6000);
  assert.equal(result.points.length, 6);
});
