// A single shared sample garden for the local demo, with server-checked one-time seeds.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LearningStore } from '../learning/store.js';
import { lessonAnswers, lessonIds } from '../learning/seedlings.js';
import { onlyOurWebsite } from '../origin.js';
import { createRateLimiter } from '../rate-limit.js';
import { allowLearning } from '../learning/access.js';

const completion = z.object({ lessonId: z.enum(lessonIds), answers: z.array(z.string().min(1).max(20)).min(1).max(6) }).strict();

export async function seedlingsRoutes(app: FastifyInstance, options: { learning: LearningStore; allowedOrigins: string[] }) {
  const limit = createRateLimiter({ limit: 60, windowMs: 60_000 });
  onlyOurWebsite(app, options.allowedOrigins, ['/api/seedlings', '/api/seedlings/complete'], ['x-learning-revision']);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const wait = limit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429)
      .send({ error: 'rate_limited', message: 'Too many lesson requests. Wait a little and try again.' });
  });
  app.get('/api/seedlings', async (request, reply) => {
    if (!allowLearning(options.learning, request, reply)) return reply;
    return { garden: options.learning.garden() };
  });
  app.post('/api/seedlings/complete', async (request, reply) => {
    if (!allowLearning(options.learning, request, reply)) return reply;
    const parsed = completion.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose an answer for each picture in a known lesson.' });
    const { lessonId, answers } = parsed.data;
    const expected = lessonAnswers[lessonId];
    if (answers.length !== expected.length) return reply.code(400).send({ error: 'invalid_request', message: 'Answer every picture before planting a seed.' });
    const incorrect = expected.flatMap((answer, index) => answer === answers[index] ? [] : [index]);
    if (incorrect.length) return reply.code(422).send({ error: 'lesson_incomplete', message: 'Try the highlighted pictures again.', incorrect });
    const result = options.learning.completeLesson(lessonId);
    return { garden: options.learning.garden(), alreadyCompleted: result === 'unchanged' };
  });
}
