// Talks to PayPal's REST API, SANDBOX ONLY (test money; nothing real is ever charged or paid).
//
// The four calls sprout.io makes:
//   createOrder(dollars)   Orders v2: start a donation; the PayPal button shows it to the donor.
//   captureOrder(id)       Orders v2: after the donor approves, actually take the payment.
//   sendPayout(...)        Payouts v1: pay a guardian's PayPal account.
//   getPayout(batchId)     Payouts v1: has that payout gone through yet?
//
// Everything else in the server only sees the small `PayPal` interface, so tests can pass a fake
// `fetch` and never call PayPal.
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.js';

// Hard-coded on purpose: there is no setting that could point this at real money.
export const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';
export const CURRENCY = 'USD'; // INR only works for Indian PayPal accounts, so the sandbox uses USD

export type CapturedOrder = {
  orderId: string;
  captureId: string;
  status: string; // 'COMPLETED' when the money was taken
  dollars: number; // what PayPal says was actually paid
  currency: string;
  payerId: string; // PayPal's code for the donor (never their name)
};

export type PayoutResult = { batchId: string; status: string };

export interface PayPal {
  clientId: string;
  createOrder(dollars: number): Promise<{ id: string }>;
  captureOrder(orderId: string): Promise<CapturedOrder>;
  sendPayout(input: { email: string; dollars: number; note: string; itemId: string }): Promise<PayoutResult>;
  getPayout(batchId: string): Promise<PayoutResult>;
}

// A PayPal error with the HTTP status and PayPal's own error name (e.g. ORDER_NOT_APPROVED).
export class PayPalError extends Error {
  constructor(readonly status: number, readonly issue: string, readonly originalBatchId?: string) {
    super(`PayPal said ${status} ${issue}`);
  }
}

export function createPayPal(config: Config, fetchImpl: typeof fetch = fetch): PayPal | null {
  const clientId = config.PAYPAL_CLIENT_ID;
  const secret = config.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) return null; // no keys → the PayPal pages say "add sandbox keys"

  // PayPal hands out an access token that lasts hours; keep it and reuse it until near the end.
  let token: { value: string; expiresAt: number } | null = null;
  async function accessToken() {
    if (token && Date.now() < token.expiresAt) return token.value;
    const response = await fetchImpl(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as any;
    if (!response.ok || !body.access_token) throw new PayPalError(response.status, body.error ?? 'AUTH_FAILED');
    token = { value: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) - 60) * 1000 };
    return token.value;
  }

  // One authorised JSON call to PayPal. `requestId` makes retries safe: PayPal won't do it twice.
  async function call(method: string, path: string, body?: unknown, requestId?: string) {
    const headers: Record<string, string> = {
      authorization: `Bearer ${await accessToken()}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    };
    if (requestId) headers['paypal-request-id'] = requestId;
    const response = await fetchImpl(`${PAYPAL_SANDBOX_API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      const issue = json.details?.[0]?.issue ?? json.name ?? 'UNKNOWN';
      let originalBatchId: string | undefined;
      if (issue === 'DUPLICATE_BATCH_ID') {
        // Never send credentials to a response-supplied URL. Extract only a sandbox batch id,
        // then build our own URL for the follow-up read.
        const links = [...(Array.isArray(json.links) ? json.links : []),
          ...(Array.isArray(json.details) ? json.details.flatMap((d: any) => Array.isArray(d.links) ? d.links : []) : [])];
        for (const link of links) {
          try {
            const url = new URL(link.href);
            const match = /^\/v1\/payments\/payouts\/([A-Z0-9-]{8,40})$/.exec(url.pathname);
            if (url.protocol === 'https:' && ['api-m.sandbox.paypal.com', 'api.sandbox.paypal.com'].includes(url.host) &&
                !url.username && !url.password && match) {
              originalBatchId = match[1];
              break;
            }
          } catch { /* Ignore malformed links; the payout remains unknown. */ }
        }
      }
      throw new PayPalError(response.status, issue, originalBatchId);
    }
    return json;
  }

  return {
    clientId,

    async createOrder(dollars) {
      const order = await call(
        'POST',
        '/v2/checkout/orders',
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              description: 'sprout.io donation to an NGO reward pool (sandbox)',
              amount: { currency_code: CURRENCY, value: dollars.toFixed(2) },
            },
          ],
        },
        randomUUID(),
      );
      return { id: order.id };
    },

    async captureOrder(orderId) {
      const order = await call('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, `capture-${orderId}`);
      const capture = order.purchase_units?.[0]?.payments?.captures?.[0] ?? {};
      return {
        orderId: order.id,
        captureId: capture.id ?? '',
        status: capture.status ?? order.status ?? 'UNKNOWN',
        dollars: Number(capture.amount?.value ?? 0),
        currency: capture.amount?.currency_code ?? '',
        payerId: order.payer?.payer_id ?? 'unknown',
      };
    },

    async sendPayout({ email, dollars, note, itemId }) {
      let result: any;
      try {
      result = await call(
        'POST',
        '/v1/payments/payouts',
        {
          sender_batch_header: {
            sender_batch_id: itemId,
            email_subject: 'A sprout.io payout for your child (sandbox)',
            email_message: note,
          },
          items: [
            {
              recipient_type: 'EMAIL',
              receiver: email,
              amount: { value: dollars.toFixed(2), currency: CURRENCY },
              note,
              sender_item_id: itemId,
            },
          ],
        },
        itemId,
      );
      } catch (error) {
        if (!(error instanceof PayPalError) || error.issue !== 'DUPLICATE_BATCH_ID' || !error.originalBatchId) throw error;
        try {
          result = await call('GET', `/v1/payments/payouts/${encodeURIComponent(error.originalBatchId)}`);
        } catch {
          // A failed lookup does not mean the original send was refused.
          throw new PayPalError(502, 'DUPLICATE_BATCH_ID', error.originalBatchId);
        }
        const item = result.items?.[0]?.payout_item;
        // A duplicate is useful only if it points back to this exact business operation.
        if (result.batch_header?.payout_batch_id !== error.originalBatchId ||
            result.batch_header?.sender_batch_header?.sender_batch_id !== itemId ||
            result.items?.length !== 1 || item?.sender_item_id !== itemId ||
            item?.receiver?.toLowerCase() !== email.toLowerCase() ||
            item?.amount?.currency !== CURRENCY || Number(item?.amount?.value) !== dollars) {
          throw new Error('The original payout did not match this request.');
        }
        return { batchId: error.originalBatchId, status: result.items[0].transaction_status ?? 'UNKNOWN' };
      }
      if (!result.batch_header?.payout_batch_id || !result.batch_header?.batch_status) {
        throw new Error('PayPal returned incomplete payout details.');
      }
      return { batchId: result.batch_header.payout_batch_id, status: result.batch_header.batch_status };
    },

    async getPayout(batchId) {
      const result = await call('GET', `/v1/payments/payouts/${encodeURIComponent(batchId)}`);
      // The single item's status (SUCCESS, UNCLAIMED, PENDING…) is more telling than the batch's.
      const status = result.items?.[0]?.transaction_status ?? result.batch_header?.batch_status ?? 'UNKNOWN';
      return { batchId, status };
    },
  };
}
