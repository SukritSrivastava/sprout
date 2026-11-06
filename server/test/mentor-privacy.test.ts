// Tests for the mentor fixes from the November 2026 audit: personal details are blanked out
// before Gemini sees them, a sensitive topic earlier in the chat stays flagged, long mentor
// replies in the history are accepted, bad requests don't use up the shared AI budget, and the
// website's offline safety word list matches the server's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './consented-app.js';
import { loadConfig } from '../src/config.js';
import type { MentorModel } from '../src/mentor/model.js';
import { redactPersonal } from '../src/mentor/privacy.js';
import { patterns } from '../src/mentor/safety.js';
import { patterns as websitePatterns } from '../../client/src/lib/safety.js';

const config = loadConfig({ API_PORT: '8787' });
function fakeModel(calls: any[] = []): MentorModel {
  return {
    async *stream(input) {
      calls.push(input);
      yield 'Okay.';
    },
  };
}
const ask = (app: ReturnType<typeof buildApp>, body: unknown) =>
  app.inject({ method: 'POST', url: '/api/mentor/chat', payload: body as object });
const firstEvent = (raw: string) => JSON.parse(raw.split('\n')[0]);

test('emails, UPI ids and long numbers are blanked out; money amounts are kept', () => {
  assert.equal(redactPersonal('mail me at aanya.s@gmail.com'), 'mail me at [email]');
  assert.equal(redactPersonal('my upi is aanya@okaxis'), 'my upi is [email]');
  assert.equal(redactPersonal('call 98765 43210 now'), 'call [number] now');
  assert.equal(redactPersonal('aadhaar 1234-5678-9012'), 'aadhaar [number]');
  assert.equal(redactPersonal('I saved ₹5000 and 250 rupees'), 'I saved ₹5000 and 250 rupees');
});

test('Gemini never receives the personal details, from any turn', async () => {
  const calls: any[] = [];
  const app = buildApp(config, { model: fakeModel(calls) });
  await ask(app, {
    language: 'en',
    messages: [
      { role: 'user', text: 'My number is 9876543210' },
      { role: 'mentor', text: 'Please don’t share that.' },
      { role: 'user', text: 'ok, email me at kid@example.com' },
    ],
  });
  const sent = JSON.stringify(calls[0].turns);
  assert.ok(!sent.includes('9876543210') && !sent.includes('kid@example.com'));
  assert.match(sent, /\[number\]/);
});

test('a sensitive topic earlier in the chat keeps the follow-up flagged', async () => {
  const calls: any[] = [];
  const app = buildApp(config, { model: fakeModel(calls) });
  const response = await ask(app, {
    language: 'en',
    messages: [
      { role: 'user', text: 'Someone is bullying me for my pocket money' },
      { role: 'mentor', text: 'I am sorry. Please tell a trusted adult.' },
      { role: 'user', text: 'what should I do now?' },
    ],
  });
  assert.equal(firstEvent(response.body).flagged, true);
  assert.match(calls[0].system, /trusted adult|careful|sensitive/i);
});

test('a long earlier mentor reply is fine; a long kid question is not', async () => {
  const app = buildApp(config, { model: fakeModel() });
  const longReply = 'Saving a little each week adds up. '.repeat(25); // ~875 characters
  const ok = await ask(app, {
    language: 'en',
    messages: [
      { role: 'user', text: 'How do I save?' },
      { role: 'mentor', text: longReply },
      { role: 'user', text: 'Thanks, and then?' },
    ],
  });
  assert.equal(ok.statusCode, 200);
  assert.equal((await ask(app, { language: 'en', messages: [{ role: 'user', text: 'x'.repeat(601) }] })).statusCode, 400);
  assert.equal(
    (await ask(app, { language: 'en', messages: [{ role: 'mentor', text: 'x'.repeat(1001) }, { role: 'user', text: 'hi' }] })).statusCode,
    400,
  );
});

test('bad requests do not use up the shared hourly AI budget', async () => {
  const app = buildApp(loadConfig({ API_PORT: '8787', MENTOR_HOURLY_LIMIT: '2' }), {
    model: fakeModel(),
    rateLimit: { limit: 100, windowMs: 60_000 },
  });
  for (let i = 0; i < 10; i++) assert.equal((await ask(app, { language: 'xx' })).statusCode, 400);
  const good = { language: 'en', messages: [{ role: 'user', text: 'What is a budget?' }] };
  assert.equal((await ask(app, good)).statusCode, 200);
  assert.equal((await ask(app, good)).statusCode, 200);
  assert.equal((await ask(app, good)).statusCode, 429);
});

test('the website’s offline safety words match the server’s', () => {
  assert.deepEqual(
    websitePatterns.map((p: RegExp) => `${p.source}/${p.flags}`),
    patterns.map((p) => `${p.source}/${p.flags}`),
  );
});
