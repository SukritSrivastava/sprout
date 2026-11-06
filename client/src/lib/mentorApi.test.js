// Unit tests for mentorApi.js: an answer only counts as finished when the server says "done".
// A stream that just stops (a dropped connection) is reported as cut short.
import test from 'node:test';
import assert from 'node:assert/strict';
import { askMentor, MentorError } from './mentorApi.js';

const stream = (text) => {
  globalThis.fetch = async () =>
    new Response(text, { status: 200, headers: { 'content-type': 'application/x-ndjson' } });
};
const run = async () => {
  const seen = { text: '', done: false };
  await askMentor({
    language: 'en',
    messages: [{ role: 'user', text: 'hi' }],
    onDelta: (piece) => (seen.text += piece),
    onDone: () => (seen.done = true),
  });
  return seen;
};

test('a complete answer finishes normally', async () => {
  stream('{"type":"start","source":"ai","flagged":false}\n{"type":"delta","text":"Save "}\n{"type":"delta","text":"more."}\n{"type":"done","suggestions":[]}\n');
  assert.deepEqual(await run(), { text: 'Save more.', done: true });
});

test('the last line counts even without a newline at the end', async () => {
  stream('{"type":"start","source":"ai","flagged":false}\n{"type":"delta","text":"Hi"}\n{"type":"done","suggestions":[]}');
  assert.deepEqual(await run(), { text: 'Hi', done: true });
});

test('an answer that stops without "done" is reported as cut short', async () => {
  stream('{"type":"start","source":"ai","flagged":false}\n{"type":"delta","text":"Save "}\n');
  await assert.rejects(run(), (error) => error instanceof MentorError && error.cutShort);
});

test('a broken line is reported as cut short, not shown as finished', async () => {
  stream('{"type":"start","source":"ai","flagged":false}\n{"type":"del');
  await assert.rejects(run(), (error) => error instanceof MentorError && error.cutShort);
});
