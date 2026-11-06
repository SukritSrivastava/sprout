// Seed rewards must be validated, saved once, and isolated from staff credits and PayPal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildApp } from './consented-app.js';
import { loadConfig } from '../src/config.js';
import { lessonAnswers, lessonIds } from '../src/learning/seedlings.js';
import { seedlings } from '../../client/src/content/seedlings.js';

const config = loadConfig({ PAYOUT_PIN_ADMIN: 'seedling-admin-test' });
const setup = (file?: string) => buildApp(config, { model: null, chain: null, paypal: null, learningDataFile: file });
const complete = (app: ReturnType<typeof setup>, lessonId = 'needs', answers: readonly string[] = lessonAnswers.needs) =>
  app.inject({ method: 'POST', url: '/api/seedlings/complete', payload: { lessonId, answers } });
const garden = async (app: ReturnType<typeof setup>) => (await app.inject('/api/seedlings')).json().garden;
function temporary() {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-seedlings-'));
  assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
  assert.ok(folder.startsWith(join(tmpdir(), 'sprout-seedlings-')));
  return { file: join(folder, 'learning.json'), cleanup: () => rmSync(folder, { recursive: true, force: true }) };
}

test('the shared sample garden needs no personal data and rejects other browser origins', async (t) => {
  const app = setup(); t.after(() => app.close());
  const response = await app.inject('/api/seedlings');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.json().garden, { completed: [], seeds: 0, totalLessons: 3 });
  for (const method of ['GET', 'POST'] as const) {
    const reply = await app.inject({ method, url: method === 'GET' ? '/api/seedlings' : '/api/seedlings/complete', headers: { origin: 'https://untrusted.example' },
      ...(method === 'POST' ? { payload: { lessonId: 'needs', answers: lessonAnswers.needs } } : {}) });
    assert.equal(reply.statusCode, 403);
  }
});

test('missing, invented and incorrect answers cannot plant seeds', async (t) => {
  const app = setup(); t.after(() => app.close());
  assert.equal((await complete(app, 'unknown')).statusCode, 400);
  assert.equal((await complete(app, 'needs', ['need'])).statusCode, 400);
  const wrong = await complete(app, 'needs', ['need', 'need', 'need', 'need', 'need', 'want']);
  assert.equal(wrong.statusCode, 422); assert.deepEqual(wrong.json().incorrect, [4]);
  assert.equal((await app.inject({ method: 'POST', url: '/api/seedlings/complete', payload: { lessonId: 'needs', answers: lessonAnswers.needs, seeds: 900 } })).statusCode, 400);
  assert.equal((await garden(app)).seeds, 0);
});

test('concurrent retries award once; practice and each other lesson have fixed rewards', async (t) => {
  const app = setup(); t.after(() => app.close());
  const replies = await Promise.all(Array.from({ length: 5 }, () => complete(app)));
  assert.ok(replies.every((reply) => reply.statusCode === 200));
  assert.equal(replies.filter((reply) => !reply.json().alreadyCompleted).length, 1);
  assert.equal((await garden(app)).seeds, 1);
  for (const id of ['waiting', 'sharing'] as const) await complete(app, id, lessonAnswers[id]);
  assert.equal((await garden(app)).seeds, 3);
  assert.equal((await complete(app)).json().alreadyCompleted, true);
});

test('every localized picture lesson offers the choices the server checks', () => {
  for (const language of ['en', 'hi'] as const) {
    assert.deepEqual(seedlings[language].lessonList.map((lesson) => lesson.id), [...lessonIds]);
    for (const lesson of seedlings[language].lessonList) {
      const expected = lessonAnswers[lesson.id as keyof typeof lessonAnswers];
      assert.equal(lesson.questions.length, expected.length);
      lesson.questions.forEach((question, index) => assert.ok(question.choices.some(([id]) => id === expected[index])));
    }
  }
});

test('legacy NGO records keep decisions, seeds survive restart, and neither changes PayPal', async () => {
  const temp = temporary();
  writeFileSync(temp.file, JSON.stringify({ version: 1, activities: [{ id: 'ACT-001', learner: 'A12', title: 'Sample review', credits: 200, status: 'approved', reviewedAt: '2026-11-05T00:00:00.000Z', reviewedBy: 'admin' }] }));
  let app = setup(temp.file);
  try {
    assert.equal((await garden(app)).seeds, 0);
    const pool = (await app.inject('/api/paypal/receipts')).json();
    await complete(app);
    const token = (await app.inject({ method: 'POST', url: '/api/ngo/unlock', payload: { approver: 'admin', pin: 'seedling-admin-test' } })).json().token;
    const dashboard = (await app.inject({ url: '/api/ngo/dashboard', headers: { authorization: `Bearer ${token}` } })).json().dashboard;
    assert.equal(dashboard.totals.totalCredits, 200);
    assert.deepEqual((await app.inject('/api/paypal/receipts')).json(), pool);
    await app.close(); app = setup(temp.file);
    assert.equal((await garden(app)).seeds, 1);
    assert.equal((await complete(app)).json().alreadyCompleted, true);
    const disk = JSON.parse(readFileSync(temp.file, 'utf8'));
    assert.equal(disk.activities[0].status, 'approved'); assert.equal(disk.seedlings.length, 1);
    assert.ok(disk.seedlings[0].completedAt);
  } finally { await app.close(); temp.cleanup(); }
});

test('a failed disk write plants nothing and a later retry can safely save once', async () => {
  const temp = temporary(); const app = setup(temp.file);
  try {
    mkdirSync(`${temp.file}.tmp`);
    assert.equal((await complete(app)).statusCode, 503);
    assert.equal((await garden(app)).seeds, 0);
    rmdirSync(`${temp.file}.tmp`);
    assert.equal((await complete(app)).json().garden.seeds, 1);
    assert.equal((await complete(app)).json().alreadyCompleted, true);
    assert.equal(JSON.parse(readFileSync(temp.file, 'utf8')).seedlings.length, 1);
  } finally { await app.close(); temp.cleanup(); }
});

test('lesson reads and writes are rate limited', async (t) => {
  const app = setup(); t.after(() => app.close());
  for (let index = 0; index < 60; index++) assert.equal((await app.inject('/api/seedlings')).statusCode, 200);
  assert.equal((await complete(app)).statusCode, 429);
});
