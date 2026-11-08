// A single shared sample garden for the local demo, with server-checked one-time seeds.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LearningStore } from '../learning/store.js';
import { lessonAnswers, lessonIds } from './answers.js';
import { onlyOurWebsite } from '../../shared/http/origin.js';
import { limitRequests, type LimitFactory } from '../../shared/http/rate-limit.js';
import { allowLearning } from '../learning/access.js';

const completion = z.object({ lessonId: z.enum(lessonIds), answers: z.array(z.string().min(1).max(20)).min(1).max(6) }).strict();

export async function seedlingsRoutes(app: FastifyInstance, options: { learning: LearningStore; demoOpenAccess: boolean; allowedOrigins: string[]; limiter?: LimitFactory }) {
  onlyOurWebsite(app, options.allowedOrigins, ['/api/seedlings', '/api/seedlings/complete'], ['x-learning-revision']);
  limitRequests(app, { limit: 60, windowMs: 60_000, message: 'Too many lesson requests. Wait a little and try again.', limiter: options.limiter, scope: 'seedlings' });
  app.get('/api/seedlings', async (request, reply) => {
    if (!await allowLearning(options.learning, request, reply, options.demoOpenAccess)) return reply;
    return { garden: await options.learning.garden() };
  });
  app.post('/api/seedlings/complete', async (request, reply) => {
    if (!await allowLearning(options.learning, request, reply, options.demoOpenAccess)) return reply;
    const parsed = completion.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose an answer for each picture in a known lesson.' });
    const { lessonId, answers } = parsed.data;
    const expected = lessonAnswers[lessonId];
    if (answers.length !== expected.length) return reply.code(400).send({ error: 'invalid_request', message: 'Answer every picture before planting a seed.' });
    const incorrect = expected.flatMap((answer, index) => answer === answers[index] ? [] : [index]);
    if (incorrect.length) return reply.code(422).send({ error: 'lesson_incomplete', message: 'Try the highlighted pictures again.', incorrect });
    const result = await options.learning.completeLesson(lessonId, Number(request.headers['x-learning-revision']));
    return { garden: await options.learning.garden(), alreadyCompleted: result === 'unchanged' };
  });
}
