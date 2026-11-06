// A PIN-protected local NGO workspace. Sessions stay in memory and expire after 15 minutes.
// Reports expose aggregate learning credits and sandbox dollars, never names or payment ids.
import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { PinChecker } from '../paypal/pins.js';
import type { PayPalStore } from '../paypal/store.js';
import type { LearningStore, StaffRole } from '../learning/store.js';
import { onlyOurWebsite } from '../origin.js';
import { createRateLimiter } from '../rate-limit.js';

const credentials = z.object({ approver: z.enum(['mentor', 'admin']), pin: z.string().min(1).max(64) }).strict();
const reviewBody = z.object({ decision: z.enum(['approved', 'returned']) }).strict();
type Options = { config: Config; pins: PinChecker; payments: PayPalStore; learning: LearningStore };

export async function ngoRoutes(app: FastifyInstance, options: Options) {
  const sessions = new Map<string, { role: StaffRole; expiresAt: number }>();
  const roles = (['mentor', 'admin'] as const).filter((role) => options.config[role === 'mentor' ? 'PAYOUT_PIN_MENTOR' : 'PAYOUT_PIN_ADMIN']);
  const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
  const unlockLimit = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });
  onlyOurWebsite(app, options.config.ALLOWED_ORIGIN,
    ['/api/ngo/unlock', '/api/ngo/dashboard', '/api/ngo/reviews/:id', '/api/ngo/report', '/api/ngo/lock'], ['authorization']);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const wait = limiter.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429)
      .send({ error: 'rate_limited', message: 'Too many workspace requests. Try again shortly.' });
  });
  app.addHook('onClose', async () => { sessions.clear(); });

  function staff(request: FastifyRequest, reply: FastifyReply) {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? '')?.[1];
    const session = token ? sessions.get(token) : undefined;
    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      reply.code(401).send({ error: 'workspace_locked', message: 'Unlock the workspace with your PIN to continue.' });
      return null;
    }
    return { ...session, token: token! };
  }
  const dashboard = () => ({ ...options.learning.snapshot(), sandbox: options.payments.totals() });

  app.get('/api/ngo/config', async () => ({ configured: roles.length > 0, roles }));
  app.post('/api/ngo/unlock', async (request, reply) => {
    const wait = unlockLimit.check(request.ip);
    if (wait) return reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: 'Wait a little before trying another PIN.' });
    const parsed = credentials.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'Choose a staff role and enter your PIN.' });
    if (!roles.length) return reply.code(503).send({ error: 'staff_not_configured', message: 'Staff access has not been set up on this computer.' });
    const { approver, pin } = parsed.data;
    const checked = options.pins.check(approver, pin);
    if (checked.result === 'locked') return reply.header('retry-after', String(checked.wait)).code(429)
      .send({ error: 'pin_locked', message: 'Too many wrong PINs for this adult. Try again later.' });
    if (checked.result !== 'ok') return reply.code(403).send({ error: 'wrong_pin', message: 'That PIN is not right for this staff role.' });
    for (const [key, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(key);
    if (sessions.size >= 100) return reply.code(503).send({ error: 'workspace_busy', message: 'Too many open workspaces. Try again later.' });
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60_000;
    const data = dashboard(); // A broken records file must not leave an unused session behind.
    sessions.set(token, { role: approver, expiresAt });
    return { token, expiresAt, role: approver, dashboard: data };
  });
  app.get('/api/ngo/dashboard', async (request, reply) => {
    if (!staff(request, reply)) return reply;
    return { dashboard: dashboard() };
  });
  app.post('/api/ngo/lock', async (request, reply) => {
    const session = staff(request, reply);
    if (!session) return reply;
    sessions.delete(session.token);
    return { locked: true };
  });
  app.post('/api/ngo/reviews/:id', async (request, reply) => {
    const session = staff(request, reply);
    if (!session) return reply;
    const parsed = reviewBody.safeParse(request.body);
    const id = (request.params as { id: string }).id;
    if (!parsed.success || !/^ACT-\d{3}$/.test(id)) return reply.code(400).send({ error: 'invalid_request', message: 'Choose approve or send back for this activity.' });
    const result = options.learning.review(id, parsed.data.decision, session.role);
    if (result === 'consent_required') return reply.code(403).send({ error: 'consent_required', message: 'This sample learner needs guardian permission before a learning review.' });
    if (result === 'not_found') return reply.code(404).send({ error: 'unknown_activity', message: 'That activity was not found.' });
    if (result === 'conflict') return reply.code(409).send({ error: 'already_reviewed', message: 'This activity already has a different saved decision. Refresh the queue.' });
    return { dashboard: dashboard(), alreadyReviewed: result === 'unchanged' };
  });
  app.get('/api/ngo/report', async (request, reply) => {
    if (!staff(request, reply)) return reply;
    const { totals, sandbox } = dashboard();
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
