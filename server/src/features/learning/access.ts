// Learning requests are checked against the saved permission, including after a withdrawal.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LearningStore } from './store.js';

export async function allowLearning(learning: LearningStore, request: FastifyRequest, reply: FastifyReply, demoOpenAccess = false) {
  const consent = await learning.consent(); // The current learning/mentor screens use sample A12.
  reply.header('cache-control', 'no-store');
  if (!demoOpenAccess && consent.status !== 'active') {
    reply.code(403).send({ error: 'consent_required', message: 'A guardian must record demo permission before learning or AI chat.' });
    return false;
  }
  if (request.headers['x-learning-revision'] !== String(consent.revision)) {
    reply.code(409).send({ error: 'consent_changed', message: 'Permission changed. Check guardian permission again before continuing.' });
    return false;
  }
  return true;
}
