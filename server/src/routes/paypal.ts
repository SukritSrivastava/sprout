// The PayPal API (sandbox): real donations in, real payouts to guardians out.
// See docs/mentor-api.md for the full contract.
//
//   GET  /api/paypal/config               Is PayPal set up? The public client id and amounts.
//   POST /api/paypal/orders               Start a donation (Orders v2). Body { amount }.
//   POST /api/paypal/orders/:id/capture   Take the approved payment, make a receipt, ask the AI
//                                         for a thank-you note.
//   POST /api/paypal/payouts              Pay a guardian (Payouts v1) after two adults approve.
//   GET  /api/paypal/payouts/:batchId     Refresh a payout's status.
//   GET  /api/paypal/receipts             The live receipts and the reward pool.
//
// The server decides every amount itself. The browser picks from the allowed list, and the
// captured amount is checked against what the server asked PayPal for.
import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CURRENCY, PayPalError, type PayPal } from '../paypal/client.js';
import type { PayPalStore } from '../paypal/store.js';
import { paypalSettings } from '../paypal/settings.js';
import { writeImpactNote } from '../paypal/impactNote.js';
import type { MentorModel } from '../mentor/model.js';
import { createRateLimiter } from '../rate-limit.js';
import { onlyOurWebsite } from '../origin.js';

type Options = {
  paypal: PayPal | null;
  store: PayPalStore;
  model: MentorModel | null;
  allowedOrigins: string[];
};

const orderSchema = z.object({ amount: z.number().int() }).strict();
const payoutSchema = z
  .object({
    email: z.email('Enter the guardian’s PayPal sandbox email'),
    amount: z.number().int().min(1).max(paypalSettings.maxPayoutDollars),
    approvals: z.array(z.enum(paypalSettings.approvers as [string, ...string[]])).max(3),
  })
  .strict();
const paypalIdPattern = /^[A-Z0-9-]{8,40}$/;

const notConfigured = {
  error: 'paypal_not_configured',
  message: 'PayPal sandbox keys aren’t set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to server/.env (see README).',
};

export async function paypalRoutes(app: FastifyInstance, options: Options) {
  const { store } = options;
  onlyOurWebsite(app, options.allowedOrigins, ['/api/paypal/orders', '/api/paypal/orders/:id/capture', '/api/paypal/payouts']);
  const orderLimit = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });
  const payoutLimit = createRateLimiter({ limit: 10, windowMs: 5 * 60_000 });

  const tooMany = (reply: FastifyReply, wait: number) =>
    reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
  const bad = (reply: FastifyReply, message: string) => reply.code(400).send({ error: 'invalid_request', message });

  // PayPal's errors, turned into short messages a person can act on.
  function paypalFailed(request: any, reply: FastifyReply, error: unknown) {
    const issue = error instanceof PayPalError ? error.issue : 'NETWORK';
    request.log.warn({ issue }, 'paypal call failed');
    const messages: Record<string, string> = {
      ORDER_NOT_APPROVED: 'The donor hasn’t approved this payment in PayPal yet.',
      INSUFFICIENT_FUNDS: 'The NGO’s PayPal sandbox account doesn’t have enough test money for this payout.',
      AUTHORIZATION_ERROR: 'This PayPal sandbox app isn’t allowed to send Payouts. Turn on Payouts for the app in the PayPal developer dashboard.',
      AUTH_FAILED: 'PayPal rejected the sandbox keys. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.',
      invalid_client: 'PayPal rejected the sandbox keys. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.',
    };
    return reply.code(502).send({
      error: 'paypal_error',
      issue,
      message: messages[issue] ?? `PayPal couldn’t do that (${issue}). Try again.`,
    });
  }

  app.get('/api/paypal/config', async () => ({
    configured: Boolean(options.paypal),
    clientId: options.paypal?.clientId ?? null, // public by design: the PayPal button needs it
    currency: CURRENCY,
    mode: 'sandbox',
    amounts: paypalSettings.donationAmounts,
    rewardDollars: paypalSettings.rewardDollars,
    maxPayoutDollars: paypalSettings.maxPayoutDollars,
    ngoName: paypalSettings.ngoName,
    poolDollars: store.poolDollars(),
  }));

  app.get('/api/paypal/receipts', async () => ({ receipts: store.all(), poolDollars: store.poolDollars() }));

  app.post('/api/paypal/orders', async (request, reply) => {
    const wait = orderLimit.check(request.ip);
    if (wait) return tooMany(reply, wait);
    if (!options.paypal) return reply.code(503).send(notConfigured);
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success || !paypalSettings.donationAmounts.includes(parsed.data.amount)) {
      return bad(reply, `Pick one of the amounts: ${paypalSettings.donationAmounts.map((a) => `$${a}`).join(', ')}`);
    }
    try {
      const order = await options.paypal.createOrder(parsed.data.amount);
      store.rememberOrder(order.id, parsed.data.amount);
      return { id: order.id };
    } catch (error) {
      return paypalFailed(request, reply, error);
    }
  });

  app.post('/api/paypal/orders/:id/capture', async (request, reply) => {
    const wait = orderLimit.check(request.ip);
    if (wait) return tooMany(reply, wait);
    if (!options.paypal) return reply.code(503).send(notConfigured);
    const orderId = (request.params as { id: string }).id;
    if (!paypalIdPattern.test(orderId)) return bad(reply, 'That isn’t a PayPal order id.');

    // Already captured (a double click or a retry)? Hand back the same receipt.
    const existing = store.donationFor(orderId);
    if (existing) return { receipt: existing, note: null, poolDollars: store.poolDollars() };

    const expected = store.expectedDollars(orderId);
    if (expected === undefined) {
      return reply.code(404).send({ error: 'unknown_order', message: 'This server didn’t create that PayPal order.' });
    }
    try {
      const captured = await options.paypal.captureOrder(orderId);
      // Trust PayPal's answer, not the browser: the money must really be taken, in full.
      if (captured.status !== 'COMPLETED' || captured.currency !== CURRENCY || captured.dollars !== expected) {
        request.log.warn({ status: captured.status, currency: captured.currency }, 'paypal capture did not match');
        return reply.code(409).send({
          error: 'payment_not_completed',
          message: `PayPal reports this payment as ${captured.status}, so no receipt was made.`,
        });
      }
      const receipt = store.addDonation({ orderId, captureId: captured.captureId, dollars: captured.dollars, payerId: captured.payerId });
      const note = await writeImpactNote(options.model, captured.dollars);
      return { receipt, note, poolDollars: store.poolDollars() };
    } catch (error) {
      return paypalFailed(request, reply, error);
    }
  });

  app.post('/api/paypal/payouts', async (request, reply) => {
    const wait = payoutLimit.check(request.ip);
    if (wait) return tooMany(reply, wait);
    if (!options.paypal) return reply.code(503).send(notConfigured);
    const parsed = payoutSchema.safeParse(request.body);
    if (!parsed.success) return bad(reply, parsed.error.issues[0]?.message ?? 'Invalid request');
    const { email, amount, approvals } = parsed.data;

    // Two DIFFERENT adults. (A demo without logins can't prove who clicked; the real app would
    // check each adult's own sign-in. See PHASES.md.)
    if (new Set(approvals).size < 2) {
      return reply.code(403).send({ error: 'needs_approval', message: 'Two different adults must approve a payout.' });
    }
    if (amount > store.poolDollars()) {
      return reply.code(409).send({
        error: 'pool_too_small',
        message: `The reward pool only has $${store.poolDollars()}. Make a sandbox donation first.`,
      });
    }

    const receipt = store.addPayout({ email, dollars: amount });
    try {
      const result = await options.paypal.sendPayout({
        email,
        dollars: amount,
        note: 'Your child earned this by finishing money lessons with their NGO. (PayPal sandbox test payout)',
        itemId: `${receipt.id}-${randomUUID().slice(0, 8)}`,
      });
      receipt.paypalId = result.batchId;
      receipt.status = result.status;
      return { receipt: { ...receipt }, poolDollars: store.poolDollars() };
    } catch (error) {
      store.dropPayout(receipt.id); // nothing left PayPal, so the pool is untouched
      return paypalFailed(request, reply, error);
    }
  });

  app.get('/api/paypal/payouts/:batchId', async (request, reply) => {
    if (!options.paypal) return reply.code(503).send(notConfigured);
    const batchId = (request.params as { batchId: string }).batchId;
    const receipt = paypalIdPattern.test(batchId) ? store.findPayout(batchId) : undefined;
    if (!receipt) return reply.code(404).send({ error: 'unknown_payout', message: 'No payout with that id on this server.' });
    try {
      const result = await options.paypal.getPayout(batchId);
      receipt.status = result.status;
      return { receipt: { ...receipt }, poolDollars: store.poolDollars() };
    } catch (error) {
      return paypalFailed(request, reply, error);
    }
  });
}
