import test from 'node:test';
import assert from 'node:assert/strict';
import { tourDuration, tourSteps, tourStart, tourIndex } from './tour.js';

test('the tour is a short story: 60 to 120 seconds, adding up exactly', () => {
  assert.ok(tourDuration >= 60 && tourDuration <= 120, `tour is ${tourDuration}s`);
  assert.equal(tourDuration, tourSteps.reduce((sum, step) => sum + step.seconds, 0));
});

test('every step has an address and words in English and Hindi', () => {
  assert.equal(new Set(tourSteps.map((s) => `${s.path}#${s.id}`)).size, tourSteps.length);
  for (const step of tourSteps) {
    assert.match(step.path, /^\//);
    for (const lang of ['en', 'hi']) {
      assert.ok(step[lang]?.title && step[lang]?.text, `${step.id} ${lang}`);
    }
    assert.match(step.hi.text, /[ऀ-ॿ]/, `${step.id} Hindi text is in Devanagari`);
  }
});

test('the clock maps to the right step at every boundary', () => {
  tourSteps.forEach((step, i) => {
    assert.equal(tourIndex(tourStart(i)), i);
    assert.equal(tourIndex(tourStart(i) + step.seconds - 0.01), i);
  });
  assert.equal(tourIndex(tourDuration), -1);
});
