// Unit tests for the tour schedule in tour.js: right length, every step in both languages, and
// the clock always points at the right step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tourDuration, tourSteps, tourStart, tourIndex } from './tour.js';
import { clampCursor, gazeToward, presentationCue, samplePresentationActions } from './presentation.js';

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

test('presentation cues stay inside their slide; only temporary sample controls can run', () => {
  const used = [];
  for (const step of tourSteps) {
    assert.ok(step.cues.length > 0);
    let previous = -1;
    for (const cue of step.cues) {
      assert.ok(cue.at >= 0 && cue.at > previous && cue.at < step.seconds);
      assert.ok(cue.target); previous = cue.at;
      if (cue.action) {
        assert.equal(step.path, '/app');
        assert.ok(samplePresentationActions.includes(cue.action)); used.push(cue.action);
      }
    }
    assert.equal(presentationCue(step.cues, 0).index, 0);
    assert.equal(presentationCue(step.cues, step.seconds - 0.01).index, step.cues.length - 1);
  }
  assert.deepEqual(used.sort(), [...samplePresentationActions].sort());
});

test('mascot eyes look toward the cursor and remain inside the face', () => {
  const bounds = { left: 0, top: 0, width: 100, height: 110 };
  assert.deepEqual(gazeToward({ x: 50, y: 64 }, bounds), { x: 0, y: 0 });
  assert.ok(gazeToward({ x: -1000, y: 64 }, bounds).x < 0);
  assert.ok(gazeToward({ x: 1000, y: 64 }, bounds).x > 0);
  assert.ok(gazeToward({ x: 50, y: -1000 }, bounds).y < 0);
  assert.ok(gazeToward({ x: 50, y: 1000 }, bounds).y > 0);
  for (const point of [{ x: 1e9, y: -1e9 }, { x: 50, y: 64 }]) {
    const look = gazeToward(point, bounds);
    assert.ok(Number.isFinite(look.x) && Number.isFinite(look.y));
    assert.ok(Math.abs(look.x) <= 4 && Math.abs(look.y) <= 3);
  }
});

test('the reference cursor stays within phone and desktop edges', () => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 1366, height: 768 }]) {
    const left = clampCursor({ x: -500, y: -500 }, viewport);
    const right = clampCursor({ x: 5000, y: 5000 }, viewport);
    assert.ok(left.x >= 16 && left.y >= 12);
    assert.ok(right.x + 59 <= viewport.width && right.y + 73 <= viewport.height);
  }
});
