// Local demo permission: a configured guardian PIN authorizes each saved change.
// This acknowledges the demo policy; it does not verify a real adult's identity.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { PinChecker } from '../paypal/pins.js';
import { learnerCodes, consentPolicy, type LearningStore } from '../learning/store.js';
import { onlyOurWebsite } from '../origin.js';
import { createRateLimiter } from '../rate-limit.js';

const learner = z.enum(learnerCodes);
const change = z.object({ learner, pin: z.string().min(1).max(64),
  action: z.enum(['acknowledge', 'withdraw', 'delete']), revision: z.number().int().nonnegative(),
  policy: z.literal(consentPolicy).optional(), acknowledged: z.literal(true).optional(),
  confirm: z.string().max(3).optional(),
}).strict();

export async function guardianRoutes(app: FastifyInstance, options: { config: Config; pins: PinChecker; learning: LearningStore }) {
  const limit = createRateLimiter({ limit: 60, windowMs: 60_000 });
  const writes = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });
  onlyOurWebsite(app, options.config.ALLOWED_ORIGIN, ['/api/guardian/status', '/api/guardian/permission']);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const wait = limit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: 'Wait a little before checking permission again.' });
  });
  const status = (code: typeof learnerCodes[number]) => ({ configured: Boolean(options.config.PAYOUT_PIN_GUARDIAN), consent: options.learning.consent(code) });
  app.get('/api/guardian/status', async (request, reply) => {
    const parsed = z.object({ learner: learner.default('A12') }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a known sample learner.' });
    return status(parsed.data.learner);
  });
  app.post('/api/guardian/permission', async (request, reply) => {
    const wait = writes.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: 'Wait before trying permission again.' });
    const parsed = change.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a sample learner and a permission action.' });
    const body = parsed.data;
    if (!options.config.PAYOUT_PIN_GUARDIAN) return reply.code(503).send({ error: 'guardian_not_configured', message: 'Set up the guardian PIN on this computer, then restart the API.' });
    const checked = options.pins.check('guardian', body.pin);
    if (checked.result === 'locked') return reply.header('retry-after', String(checked.wait)).code(429)
      .send({ error: 'pin_locked', message: 'Too many incorrect guardian PINs. Try again later.' });
    if (checked.result !== 'ok') return reply.code(403).send({ error: 'wrong_pin', message: 'That guardian PIN is not correct.' });
    if (body.action === 'acknowledge' && (body.acknowledged !== true || body.policy !== consentPolicy))
      return reply.code(400).send({ error: 'acknowledgement_required', message: 'Read and accept the current demo permission statements first.' });
    if (body.action === 'delete' && body.confirm !== body.learner)
      return reply.code(400).send({ error: 'confirmation_required', message: 'Type the sample learner code to confirm deletion.' });
    // A stale tab must never overwrite a newer guardian decision (including a deleted record).
    if (options.learning.consent(body.learner).revision !== body.revision)
      return reply.code(409).send({ error: 'consent_changed', message: 'Permission changed in another tab. Refresh before making this decision.' });
    options.learning.changeConsent(body.learner, body.action);
    return status(body.learner);
  });
}
