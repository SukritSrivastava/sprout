// A PIN-protected NGO workspace. Sessions expire after 15 minutes.
// Reports expose aggregate learning credits and sandbox dollars, never names or payment ids.
import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../../config.js';
import type { PinChecker } from '../../shared/security/pins.js';
import type { PayPalStore } from '../payments/store.js';
import type { LearningStore } from '../learning/store.js';
import { onlyOurWebsite } from '../../shared/http/origin.js';
import { memoryLimits, limitRequests, type LimitFactory } from '../../shared/http/rate-limit.js';
import { createMemorySessions, type Sessions } from '../../shared/security/postgres.js';

const credentials = z.object({ approver: z.enum(['mentor', 'admin']), pin: z.string().min(1).max(64) }).strict();
const reviewBody = z.object({ decision: z.enum(['approved', 'returned']) }).strict();
type Options = { config: Config; pins: PinChecker; payments: PayPalStore; learning: LearningStore; limiter?: LimitFactory; sessions?: Sessions };

export async function ngoRoutes(app: FastifyInstance, options: Options) {
  const sessions = options.sessions ?? createMemorySessions();
  const roles = (['mentor', 'admin'] as const).filter((role) => options.config[role === 'mentor' ? 'PAYOUT_PIN_MENTOR' : 'PAYOUT_PIN_ADMIN']);
  const unlockLimit = (options.limiter ?? memoryLimits)({ limit: 20, windowMs: 5 * 60_000 }, 'ngo-unlock');
  onlyOurWebsite(app, options.config.ALLOWED_ORIGIN,
    ['/api/ngo/unlock', '/api/ngo/dashboard', '/api/ngo/reviews/:id', '/api/ngo/report', '/api/ngo/lock'], ['authorization']);
  limitRequests(app, { limit: 60, windowMs: 60_000, message: 'Too many workspace requests. Try again shortly.', limiter: options.limiter, scope: 'ngo' });

  async function staff(request: FastifyRequest, reply: FastifyReply) {
    // Demo access does not create a session or ask visitors for credentials.
    if (options.config.DEMO_OPEN_ACCESS) return { role: 'mentor' as const, token: '' };
    const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? '')?.[1];
    const session = token ? await sessions.find(token) : undefined;
    if (!session || session.expiresAt <= Date.now()) {
      if (token) await sessions.delete(token);
      reply.code(401).send({ error: 'workspace_locked', message: 'Unlock the workspace with your PIN to continue.' });
      return null;
    }
    return { ...session, token: token! };
  }
  const dashboard = async () => ({ ...await options.learning.snapshot(), sandbox: await options.payments.totals() });

  app.get('/api/ngo/config', async () => ({ configured: options.config.DEMO_OPEN_ACCESS || roles.length > 0,
    demoOpenAccess: options.config.DEMO_OPEN_ACCESS, roles: options.config.DEMO_OPEN_ACCESS ? ['mentor', 'admin'] : roles }));
  app.post('/api/ngo/unlock', async (request, reply) => {
    const wait = await unlockLimit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: 'Wait a little before trying another PIN.' });
    const parsed = credentials.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a staff role and enter your PIN.' });
    if (!roles.length) return reply.code(503).send({ error: 'staff_not_configured', message: 'Staff access has not been set up on this computer.' });
    const { approver, pin } = parsed.data;
    const checked = await options.pins.check(approver, pin);
    if (checked.result === 'locked') return reply.header('retry-after', String(checked.wait)).code(429)
      .send({ error: 'pin_locked', message: 'Too many wrong PINs for this adult. Try again later.' });
    if (checked.result !== 'ok') return reply.code(403).send({ error: 'wrong_pin', message: 'That PIN is not right for this staff role.' });
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60_000;
    const data = await dashboard(); // A broken records file must not leave an unused session behind.
    if (!await sessions.create(token, approver, expiresAt)) return reply.code(503).send({ error: 'workspace_busy', message: 'Too many open workspaces. Try again later.' });
    return { token, expiresAt, role: approver, dashboard: data };
  });
  app.get('/api/ngo/dashboard', async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    return { dashboard: await dashboard() };
  });
  app.post('/api/ngo/lock', async (request, reply) => {
    const session = await staff(request, reply);
    if (!session) return reply;
    // Open demo access bypasses the workspace gate, but an issued publishing session still needs revocation.
    const supplied=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization??'')?.[1];
    await sessions.delete(supplied??session.token);
    return { locked: true };
  });
  app.post('/api/ngo/reviews/:id', async (request, reply) => {
    const session = await staff(request, reply);
    if (!session) return reply;
    const parsed = reviewBody.safeParse(request.body);
    const id = (request.params as { id: string }).id;
    if (!parsed.success || !/^ACT-\d{3}$/.test(id)) return reply.code(400).send({ error: 'invalid_request', message: 'Choose approve or send back for this activity.' });
    const result = await options.learning.review(id, parsed.data.decision, session.role);
    if (result === 'consent_required') return reply.code(403).send({ error: 'consent_required', message: 'This sample learner needs guardian permission before a learning review.' });
    if (result === 'not_found') return reply.code(404).send({ error: 'unknown_activity', message: 'That activity was not found.' });
    if (result === 'conflict') return reply.code(409).send({ error: 'already_reviewed', message: 'This activity already has a different saved decision. Refresh the queue.' });
    return { dashboard: await dashboard(), alreadyReviewed: result === 'unchanged' };
  });
  app.get('/api/ngo/report', async (request, reply) => {
    if (!await staff(request, reply)) return reply;
    const { totals, sandbox } = await dashboard();
    const rows = [
      ['pending_activities', 'count', totals.pending], ['approved_activities', 'count', totals.approved],
      ['returned_activities', 'count', totals.returned], ['learning_rewards', 'credits', totals.totalCredits],
      ['sandbox_donations', 'USD', sandbox.donated], ['sandbox_paid', 'USD', sandbox.paid],
      ['sandbox_reserved', 'USD', sandbox.reserved], ['sandbox_available', 'USD', sandbox.available],
    ];
    return { filename: `sprout-ngo-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: 'metric,unit,value\r\n' + rows.map((row) => row.join(',')).join('\r\n') + '\r\n' };
  });
}
