import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitReward,
  projectSavings,
  tourDuration,
  tourSteps,
  tourStart,
  tourIndex,
} from './model.js';

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
test('the full tour finishes in 75 seconds and covers every section exactly once', () => {
  assert.equal(tourDuration, 75);
  assert.ok(tourDuration < 90);
  assert.equal(new Set(tourSteps.map((step) => step.id)).size, tourSteps.length);
  tourSteps.forEach((step, i) => {
    assert.equal(tourIndex(tourStart(i)), i);
    assert.equal(tourIndex(tourStart(i) + step.seconds - 0.01), i);
  });
  assert.equal(tourIndex(75), -1);
});
