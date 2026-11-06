// The PayPal API (sandbox): real donations in, real payouts to guardians out.
// See docs/mentor-api.md for the full contract.
//
//   GET  /api/paypal/config                         Is PayPal set up? Public client id, amounts.
//   GET  /api/paypal/receipts                       The newest public receipts and the pool.
//   POST /api/paypal/orders                         Start a donation (Orders v2). Body { amount }.
//   POST /api/paypal/orders/:id/capture             Take the approved payment, make a receipt,
//                                                   ask the AI for a thank-you note.
//   POST /api/paypal/payout-requests                A kid asks for money. Body { amount }.
//   POST /api/paypal/payout-requests/:id/approve    An adult approves with their PIN.
//   POST /api/paypal/payout-requests/:id/send       An adult who approved sends it (PIN again).
//   GET  /api/paypal/payouts/:batchId               Refresh a payout's status.
//
// The server decides every amount and the payee itself. The guardian's email comes from
// server/.env, never from the browser, and each approval needs that adult's own PIN.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import { CURRENCY, PayPalError, type PayPal } from '../paypal/client.js';
import { PaymentStoreError, type Approver, type PayoutRequest, type PayPalStore } from '../paypal/store.js';
import { createPinChecker, type PinChecker } from '../paypal/pins.js';
import { paypalSettings } from '../paypal/settings.js';
import { writeImpactNote } from '../paypal/impactNote.js';
import type { MentorModel } from '../mentor/model.js';
import { createRateLimiter } from '../rate-limit.js';
import { onlyOurWebsite } from '../origin.js';

type Options = {
  pins?: PinChecker;
  config: Config;
  paypal: PayPal | null;
  store: PayPalStore;
  model: MentorModel | null;
  allowedOrigins: string[];
};

const approvers = paypalSettings.approvers as [Approver, ...Approver[]];
const orderSchema = z.object({ amount: z.number().int() }).strict();
const requestSchema = z.object({ amount: z.number().int().min(1).max(paypalSettings.maxPayoutDollars) }).strict();
const pinSchema = z.object({ approver: z.enum(approvers), pin: z.string().min(1).max(64) }).strict();
const paypalIdPattern = /^[A-Z0-9-]{8,40}$/;
const requestIdPattern = /^REQ-\d{4}-\d{4,}$/;

const notConfigured = {
  error: 'paypal_not_configured',
  message: 'PayPal sandbox keys aren’t set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to server/.env (see README).',
};
const payoutsOff = {
  error: 'payouts_not_configured',
  message: 'Payouts are switched off. Add PAYOUT_PIN_MENTOR, PAYOUT_PIN_ADMIN, PAYOUT_PIN_GUARDIAN and GUARDIAN_PAYPAL_EMAIL to server/.env (see README).',
};

// "sb-abc123@personal.example.com" → "sb…@personal.example.com", enough to recognise it.
const maskEmail = (email: string) => `${email.slice(0, 2)}…${email.slice(email.indexOf('@'))}`;

export async function paypalRoutes(app: FastifyInstance, options: Options) {
  const { store, config } = options;
  const pins = options.pins ?? createPinChecker(config);
  const guardianEmail = config.GUARDIAN_PAYPAL_EMAIL;
  const payoutsReady = Boolean(options.paypal && pins.configured && guardianEmail);

  onlyOurWebsite(app, options.allowedOrigins, [
    '/api/paypal/orders',
    '/api/paypal/orders/:id/capture',
    '/api/paypal/payout-requests',
    '/api/paypal/payout-requests/:id/approve',
    '/api/paypal/payout-requests/:id/send',
    '/api/paypal/payout-requests/:id/recover',
  ]);
  const orderLimit = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });
  const payoutLimit = createRateLimiter({ limit: 20, windowMs: 5 * 60_000 });
  const readLimit = createRateLimiter({ limit: 60, windowMs: 60_000 });
  const capturing = new Set<string>(); // orders being captured right now
  const sending = new Set<string>(); // payout requests being sent right now
  const statusCache = new Map<string, number>(); // payout batch id → when we last asked PayPal

  const tooMany = (reply: FastifyReply, wait: number) =>
    reply.header('retry-after', String(wait)).code(429).send({ error: 'rate_limited', message: `Try again in ${wait} seconds.` });
  const bad = (reply: FastifyReply, message: string) => reply.code(400).send({ error: 'invalid_request', message });

  // Reading is limited too: every status check can call PayPal.
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET' || !request.url.startsWith('/api/paypal/')) return;
    const wait = readLimit.check(request.ip);
    if (wait) return tooMany(reply, wait);
  });

  // PayPal's errors, turned into short messages a person can act on.
  function paypalFailed(request: FastifyRequest, reply: FastifyReply, error: unknown) {
    if (error instanceof PaymentStoreError) throw error;
    const issue = error instanceof PayPalError ? error.issue : 'NETWORK';
    request.log.warn({ issue }, 'paypal call failed');
    const messages: Record<string, string> = {
      ORDER_NOT_APPROVED: 'The donor hasn’t approved this payment in PayPal yet.',
      INSUFFICIENT_FUNDS: 'The NGO’s PayPal sandbox account doesn’t have enough test money for this payout.',
      AUTHORIZATION_ERROR: 'This PayPal sandbox app isn’t allowed to send Payouts. Turn on Payouts for the app in the PayPal developer dashboard.',
      PAYOUT_NOT_AVAILABLE: 'Payouts aren’t switched on for this PayPal sandbox app. In developer.paypal.com → Apps & Credentials → your app → Features, tick Payouts and save.',
      AUTH_FAILED: 'PayPal rejected the sandbox keys. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.',
      invalid_client: 'PayPal rejected the sandbox keys. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.',
    };
    return reply.code(502).send({
      error: 'paypal_error',
      issue,
      message: messages[issue] ?? `PayPal couldn’t do that (${issue}). Try again.`,
    });
  }

  // What the browser may see about a request: never the guardian's email.
  function requestView(request: PayoutRequest) {
    const receipt = request.receiptId ? store.receipt(request.receiptId) : undefined;
    return {
      id: request.id,
      amount: request.amount,
      child: request.child,
      approvals: request.approvals.map((a) => a.approver),
      receipt: receipt ? store.ownerCopy(receipt) : null,
    };
  }

  // Checks an adult's PIN; sends the error reply itself and returns false if it's wrong.
  function pinOk(reply: FastifyReply, approver: Approver, pin: string) {
    const answer = pins.check(approver, pin);
    if (answer.result === 'ok') return true;
    if (answer.result === 'locked') {
      reply.header('retry-after', String(answer.wait)).code(429).send({
        error: 'pin_locked',
        message: `Too many wrong PINs for this adult. Try again in ${Math.ceil(answer.wait / 60)} minutes.`,
      });
    } else {
      reply.code(403).send({ error: 'wrong_pin', message: 'That PIN is not right for this adult.' });
    }
    return false;
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
    payouts: { configured: payoutsReady, guardian: guardianEmail ? maskEmail(guardianEmail) : null },
  }));

  app.get('/api/paypal/receipts', async () => ({ receipts: store.all(), poolDollars: store.poolDollars() }));

  // ---------- Donations ----------

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
      if (!store.rememberOrder(order.id, parsed.data.amount)) {
        return reply.code(503).send({ error: 'too_many_orders', message: 'Too many unfinished donations right now. Try again later.' });
      }
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
    if (existing) return { receipt: store.ownerCopy(existing), note: null, poolDollars: store.poolDollars() };

    const expected = store.expectedDollars(orderId);
    if (expected === undefined) {
      return reply.code(404).send({ error: 'unknown_order', message: 'This server didn’t create that PayPal order.' });
    }
    // Two captures at once: only the first one talks to PayPal.
    if (capturing.has(orderId)) {
      return reply.code(409).send({ error: 'capture_in_progress', message: 'This payment is already being confirmed. Wait a moment and check again.' });
    }
    capturing.add(orderId);
    try {
      const captured = await options.paypal.captureOrder(orderId);
      // Trust PayPal's answer, not the browser: the money must really be taken, in full.
      if (
        captured.orderId !== orderId ||
        !captured.captureId ||
        captured.status !== 'COMPLETED' ||
        captured.currency !== CURRENCY ||
        captured.dollars !== expected
      ) {
        request.log.warn({ status: captured.status, currency: captured.currency }, 'paypal capture did not match');
        return reply.code(409).send({
          error: 'payment_not_completed',
          message: `PayPal reports this payment as ${captured.status}, so no receipt was made.`,
        });
      }
      const receipt = store.addDonation({ orderId, captureId: captured.captureId, dollars: captured.dollars, payerId: captured.payerId });
      const note = await writeImpactNote(options.model, captured.dollars);
      return { receipt: store.ownerCopy(receipt), note, poolDollars: store.poolDollars() };
    } catch (error) {
      return paypalFailed(request, reply, error);
    } finally {
      capturing.delete(orderId);
    }
  });

  // ---------- Payouts: request → two PIN approvals → send ----------

  // Shared start of the payout routes: rate limit, switched on, body checked, request found.
  async function payoutStep(request: FastifyRequest, reply: FastifyReply) {
    const wait = payoutLimit.check(request.ip);
    if (wait) return void tooMany(reply, wait);
    if (!options.paypal) return void reply.code(503).send(notConfigured);
    if (!payoutsReady) return void reply.code(503).send(payoutsOff);
    const parsed = pinSchema.safeParse(request.body);
    if (!parsed.success) return void bad(reply, 'Choose an adult and type their PIN.');
    const id = (request.params as { id: string }).id;
    const found = requestIdPattern.test(id) ? store.findRequest(id) : undefined;
    if (!found) return void reply.code(404).send({ error: 'unknown_request', message: 'No payout request with that id.' });
    return { ...parsed.data, payoutRequest: found };
  }

  app.post('/api/paypal/payout-requests', async (request, reply) => {
    const wait = payoutLimit.check(request.ip);
    if (wait) return tooMany(reply, wait);
    if (!options.paypal) return reply.code(503).send(notConfigured);
    if (!payoutsReady) return reply.code(503).send(payoutsOff);
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return bad(reply, `Ask for $1 to $${paypalSettings.maxPayoutDollars}.`);
    const made = store.addRequest({ amount: parsed.data.amount, email: guardianEmail!, child: paypalSettings.childName });
    return { request: requestView(made), poolDollars: store.poolDollars() };
  });

  app.post('/api/paypal/payout-requests/:id/approve', async (request, reply) => {
    const step = await payoutStep(request, reply);
    if (!step) return reply;
    const { approver, pin, payoutRequest } = step;
    if (payoutRequest.receiptId) return reply.code(409).send({ error: 'already_sent', message: 'This request has already been paid out.' });
    if (!pinOk(reply, approver, pin)) return reply;
    store.approve(payoutRequest.id, approver);
    return { request: requestView(payoutRequest), poolDollars: store.poolDollars() };
  });

  // Reloading the page must not lose an approved or unknown payout. An adult's PIN is
  // required to recover it; the browser remembers only its request id, never any PIN.
  app.post('/api/paypal/payout-requests/:id/recover', async (request, reply) => {
    const step = await payoutStep(request, reply);
    if (!step) return reply;
    if (!pinOk(reply, step.approver, step.pin)) return reply;
    return { request: requestView(step.payoutRequest), poolDollars: store.poolDollars() };
  });

  app.post('/api/paypal/payout-requests/:id/send', async (request, reply) => {
    const step = await payoutStep(request, reply);
    if (!step) return reply;
    const { approver, pin, payoutRequest } = step;
    // The sender must be one of the adults who approved, and proves it again with their PIN.
    if (!payoutRequest.approvals.some((a) => a.approver === approver)) {
      return reply.code(403).send({ error: 'not_an_approver', message: 'Only an adult who approved this request can send it.' });
    }
    if (!pinOk(reply, approver, pin)) return reply;
    if (new Set(payoutRequest.approvals.map((a) => a.approver)).size < 2) {
      return reply.code(403).send({ error: 'needs_approval', message: 'Two different adults must approve a payout.' });
    }
    if (sending.has(payoutRequest.id)) {
      return reply.code(409).send({ error: 'send_in_progress', message: 'This payout is already being sent.' });
    }

    let receiptId = payoutRequest.receiptId;
    const retry = receiptId !== null;
    if (retry) {
      // Sent before: only a payout with an unknown outcome is sent again, with the SAME PayPal ids,
      // so PayPal answers with the original payout instead of paying twice.
      const earlier = store.receipt(receiptId!)!;
      if (!['UNKNOWN', 'SENDING'].includes(earlier.status)) return { request: requestView(payoutRequest), poolDollars: store.poolDollars() };
      // PayPal's duplicate protection lasts 30 days. Stop automatic resends before then.
      // Old records have no sentAt, so use their creation date conservatively.
      const firstSent = Date.parse(payoutRequest.sentAt ?? payoutRequest.createdAt);
      if (!Number.isFinite(firstSent) || firstSent > Date.now() || Date.now() - firstSent >= 29 * 24 * 60 * 60_000) {
        return reply.code(409).send({ error: 'payout_manual_review', message: 'This payout is too old to resend safely. Check it in the PayPal sandbox dashboard. Funds remain reserved.', request: requestView(payoutRequest), poolDollars: store.poolDollars() });
      }
    } else {
      const unsure = store.uncertainPayout();
      if (unsure) {
        return reply.code(409).send({
          error: 'payout_needs_review',
          message: `Payout ${unsure.id} has an unknown outcome. Send that request again to check it with PayPal before sending a new one.`,
        });
      }
      if (payoutRequest.amount > store.poolDollars()) {
        return reply.code(409).send({
          error: 'pool_too_small',
          message: `The reward pool only has $${store.poolDollars()}. Make a sandbox donation first.`,
        });
      }
      receiptId = store.startPayout(payoutRequest.id).receipt.id;
    }

    sending.add(payoutRequest.id);
    try {
      const result = await options.paypal!.sendPayout({
        email: payoutRequest.email,
        dollars: payoutRequest.amount,
        note: 'Your child earned this by finishing money lessons with their NGO. (PayPal sandbox test payout)',
        itemId: payoutRequest.senderBatchId!,
      });
      store.updatePayout(receiptId!, { paypalId: result.batchId, status: result.status });
      return { request: requestView(payoutRequest), poolDollars: store.poolDollars() };
    } catch (error) {
      if (error instanceof PaymentStoreError) throw error;
      // Only a clear "no" from PayPal on the FIRST try proves nothing was paid. A timeout, a lost
      // answer or a PayPal server error might hide a payout that went through, so the money stays
      // reserved and the payout is marked UNKNOWN until a retry with the same ids settles it.
      const refused =
        !retry && error instanceof PayPalError && error.issue !== 'DUPLICATE_BATCH_ID' && error.status >= 400 && error.status < 500 && ![408, 409, 429].includes(error.status);
      if (refused) {
        store.updatePayout(receiptId!, { status: 'REJECTED' });
        return paypalFailed(request, reply, error);
      }
      store.updatePayout(receiptId!, { status: 'UNKNOWN' });
      request.log.warn({ issue: error instanceof PayPalError ? error.issue : 'NETWORK' }, 'payout outcome unknown');
      return reply.code(502).send({
        error: 'payout_unknown',
        message: 'PayPal didn’t confirm this payout, so the money stays reserved. Press Send again to check with PayPal; it won’t pay twice.',
        request: requestView(payoutRequest),
        poolDollars: store.poolDollars(),
      });
    } finally {
      sending.delete(payoutRequest.id);
    }
  });

  app.get('/api/paypal/payouts/:batchId', async (request, reply) => {
    if (!options.paypal) return reply.code(503).send(notConfigured);
    const batchId = (request.params as { batchId: string }).batchId;
    const receipt = paypalIdPattern.test(batchId) ? store.findPayout(batchId) : undefined;
    if (!receipt) return reply.code(404).send({ error: 'unknown_payout', message: 'No payout with that id on this server.' });
    // Ask PayPal at most once every 15 seconds per payout.
    const askedAt = statusCache.get(batchId) ?? 0;
    if (Date.now() - askedAt > 15_000) {
      try {
        const result = await options.paypal.getPayout(batchId);
        statusCache.set(batchId, Date.now());
        if (statusCache.size > 500) statusCache.delete(statusCache.keys().next().value!);
        store.updatePayout(receipt.id, { status: result.status });
      } catch (error) {
        return paypalFailed(request, reply, error);
      }
    }
    return { receipt: store.ownerCopy(store.receipt(receipt.id)!), poolDollars: store.poolDollars() };
  });
}
