// Local demo permission: a configured guardian PIN authorizes each saved change.
// This acknowledges the demo policy; it does not verify a real adult's identity.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../../config.js';
import type { PinChecker } from '../../shared/security/pins.js';
import { learnerCodes, consentPolicy, type LearningStore } from '../learning/store.js';
import { onlyOurWebsite } from '../../shared/http/origin.js';
import { memoryLimits, limitRequests, type LimitFactory } from '../../shared/http/rate-limit.js';

const learner = z.enum(learnerCodes);
const change = z.object({ learner, pin: z.string().max(64).default(''),
  action: z.enum(['acknowledge', 'withdraw', 'delete']), revision: z.number().int().nonnegative(),
  policy: z.literal(consentPolicy).optional(), acknowledged: z.literal(true).optional(),
  confirm: z.string().max(3).optional(),
}).strict();

export async function guardianRoutes(app: FastifyInstance, options: { config: Config; pins: PinChecker; learning: LearningStore; limiter?: LimitFactory }) {
  const writes = (options.limiter ?? memoryLimits)({ limit: 20, windowMs: 5 * 60_000 }, 'guardian-write');
  onlyOurWebsite(app, options.config.ALLOWED_ORIGIN, ['/api/guardian/status', '/api/guardian/permission']);
  limitRequests(app, { limit: 60, windowMs: 60_000, message: 'Wait a little before checking permission again.', limiter: options.limiter, scope: 'guardian' });
  const status = async (code: typeof learnerCodes[number]) => ({ configured: options.config.DEMO_OPEN_ACCESS || Boolean(options.config.PAYOUT_PIN_GUARDIAN),
    demoOpenAccess: options.config.DEMO_OPEN_ACCESS, consent: await options.learning.consent(code) });
  app.get('/api/guardian/status', async (request, reply) => {
    const parsed = z.object({ learner: learner.default('A12') }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a known sample learner.' });
    return status(parsed.data.learner);
  });
  app.post('/api/guardian/permission', async (request, reply) => {
    const wait = await writes.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: 'Wait before trying permission again.' });
    const parsed = change.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a sample learner and a permission action.' });
    const body = parsed.data;
    if (!options.config.DEMO_OPEN_ACCESS) {
      if (!options.config.PAYOUT_PIN_GUARDIAN) return reply.code(503).send({ error: 'guardian_not_configured', message: 'Guardian access is not configured for this demo. Ask the demo operator for help.' });
      if (!body.pin) return reply.code(400).send({ error: 'invalid_request', message: 'Enter the guardian PIN.' });
      const checked = await options.pins.check('guardian', body.pin);
      if (checked.result === 'locked') return reply.header('retry-after', String(checked.wait)).code(429)
        .send({ error: 'pin_locked', message: 'Too many incorrect guardian PINs. Try again later.' });
      if (checked.result !== 'ok') return reply.code(403).send({ error: 'wrong_pin', message: 'That guardian PIN is not correct.' });
    }
    if (body.action === 'acknowledge' && (body.acknowledged !== true || body.policy !== consentPolicy))
      return reply.code(400).send({ error: 'acknowledgement_required', message: 'Read and accept the current demo permission statements first.' });
    if (body.action === 'delete' && body.confirm !== body.learner)
      return reply.code(400).send({ error: 'confirmation_required', message: 'Type the sample learner code to confirm deletion.' });
    // A stale tab must never overwrite a newer guardian decision (including a deleted record).
    await options.learning.changeConsent(body.learner, body.action, body.revision);
    return status(body.learner);
  });
}
