import { createHash, randomUUID } from 'node:crypto';
import { StateConflict, type Database, type Query } from '../../shared/storage/database.js';
import type { Approver, LiveReceipt, PayPalStore, PayoutRequest, SendClaim } from './store.js';
import { canUpdatePayout, MAX_OPEN_ORDERS } from './store.js';

type ReceiptRow = { id: string; type: 'donation' | 'payout'; cents: number; date: string; ref: string;
  provider_id: string; status: string; batch_id: number | null; order_id: string | null };
type RequestRow = { id: string; cents: number; email: string; child: string; created_at: Date;
  sent_at: Date | null; sender_batch_id: string | null; receipt_id: string | null; send_token: string | null; send_until: Date | null };
const receipt = (r: ReceiptRow): LiveReceipt => ({ id: r.id, type: r.type, amount: r.cents / 100, currency: 'USD',
  date: r.date, ref: r.ref, paypalId: r.provider_id, status: r.status, batchId: r.batch_id,
  ...(r.order_id ? { orderId: r.order_id } : {}) });
const ownerCopy: PayPalStore['ownerCopy'] = ({ orderId: _, ...r }) => r;
const publicCopy = ({ orderId: _, paypalId: __, ...r }: LiveReceipt) => r;
const failed = ['FAILED', 'RETURNED', 'REFUNDED', 'REVERSED', 'BLOCKED', 'DENIED', 'CANCELED', 'REJECTED'];
const cents = (dollars: number) => {
  const value = Math.round(dollars * 100);
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647 || Math.abs(value / 100 - dollars) > 1e-9)
    throw new StateConflict('invalid_amount', 'Use a positive amount in whole cents.', 400);
  return value;
};

async function findRequest(query: Query, id: string): Promise<PayoutRequest | undefined> {
  const { rows: [r] } = await query<RequestRow>('SELECT * FROM sprout_payout_requests WHERE id=$1', [id]);
  if (!r) return undefined;
  const { rows: approvals } = await query<{ approver: Approver; at: Date }>('SELECT approver,at FROM sprout_approvals WHERE request_id=$1 ORDER BY at,approver', [id]);
  return { id: r.id, amount: r.cents / 100, email: r.email, child: r.child, createdAt: r.created_at.toISOString(),
    ...(r.sent_at ? { sentAt: r.sent_at.toISOString() } : {}), senderBatchId: r.sender_batch_id, receiptId: r.receipt_id,
    approvals: approvals.map((a) => ({ approver: a.approver, at: a.at.toISOString() })) };
}
async function totals(query: Query) {
  const { rows: [r] } = await query<{ donated: number; paid: number; reserved: number }>(`
    SELECT COALESCE(sum(cents) FILTER (WHERE type='donation'),0)::integer donated,
      COALESCE(sum(cents) FILTER (WHERE type='payout' AND status='SUCCESS'),0)::integer paid,
      COALESCE(sum(cents) FILTER (WHERE type='payout' AND status <> 'SUCCESS' AND NOT(status=ANY($1::text[]))),0)::integer reserved
    FROM sprout_receipts`, [failed]);
  return { donated: r.donated / 100, paid: r.paid / 100, reserved: r.reserved / 100,
    available: (r.donated - r.paid - r.reserved) / 100 };
}

export function createPostgresPayments(db: Database): PayPalStore {
  const lock = async (query: Query) => (await query<{ salt: string }>('SELECT salt FROM sprout_payment_meta WHERE singleton FOR UPDATE')).rows[0];
  const nextId = async (query: Query, kind: 'donation' | 'payout' | 'request') => {
    const { rows: [r] } = await query<{ id: string }>(`SELECT nextval('sprout_${kind}_id')::text AS id`);
    const prefix = { donation: 'DON', payout: 'PAY', request: 'REQ' }[kind];
    const { rows: [date] } = await query<{ month_code: string }>("SELECT to_char(now() AT TIME ZONE 'UTC','YYMM') AS month_code");
    return `${prefix}-${date.month_code}-${r.id.padStart(4, '0')}`;
  };
  const code = (salt: string, prefix: string, secret: string) => `${prefix}-${createHash('sha256').update(salt).update(secret).digest('hex').slice(0,16)}`;
  const byId = async (id: string) => {
    const { rows: [r] } = await db.query<ReceiptRow>('SELECT * FROM sprout_receipts WHERE id=$1', [id]);
    return r ? receipt(r) : undefined;
  };
  // Shared lock protects the balance check AND insertion, even for separately built APIs.
  const reserve = async (query: Query, request: PayoutRequest, salt: string) => {
    const { rows: unknown } = await query("SELECT id FROM sprout_receipts WHERE type='payout' AND status IN ('UNKNOWN','SENDING') LIMIT 1");
    if (unknown.length) throw new StateConflict('payout_needs_review', 'An earlier payout has an unknown outcome. Recover that request first.');
    if (Math.round((await totals(query)).available * 100) < cents(request.amount))
      throw new StateConflict('pool_too_small', 'The reward pool is too small. Make a sandbox donation first.');
    if (new Set(request.approvals.map((a) => a.approver)).size < 2)
      throw new StateConflict('needs_approval', 'Two different adults must approve a payout.', 403);
    const id = await nextId(query, 'payout');
    const { rows: [r] } = await query<ReceiptRow>(`INSERT INTO sprout_receipts(id,type,cents,date,ref,status)
      VALUES ($1,'payout',$2,to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD'),$3,'SENDING') RETURNING *`,
      [id, cents(request.amount), code(salt, 'guardian', request.email.toLowerCase())]);
    const senderBatchId = `sprout-${id}-${randomUUID().slice(0,8)}`;
    await query('UPDATE sprout_payout_requests SET receipt_id=$2,sender_batch_id=$3,sent_at=now() WHERE id=$1', [request.id, id, senderBatchId]);
    return { receipt: receipt(r), senderBatchId };
  };
  const update = async (query: Query, id: string, change: { paypalId?: string; status: string }) => {
    const { rows: [current] } = await query<{ status: string }>(
      "SELECT status FROM sprout_receipts WHERE id=$1 AND type='payout' FOR UPDATE", [id]);
    if (!current || !canUpdatePayout(current.status, change.status)) return;
    await query(`UPDATE sprout_receipts SET provider_id=CASE WHEN $2='' THEN provider_id ELSE $2 END,status=$3
      WHERE id=$1 AND type='payout'`, [id, change.paypalId ?? '', change.status]);
  };
  return {
    ownerCopy,
    async rememberOrder(id, dollars) {
      return db.transaction(async (query) => {
        await lock(query);
        await query("DELETE FROM sprout_orders WHERE created_at < now()-interval '24 hours'");
        const { rows: [r] } = await query<{ count: number }>('SELECT count(*)::integer count FROM sprout_orders');
        if (r.count >= MAX_OPEN_ORDERS) return false;
        await query('INSERT INTO sprout_orders(id,cents) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', [id,cents(dollars)]);
        return true;
      });
    },
    async expectedDollars(id) {
      const { rows: [r] } = await db.query<{ cents: number }>('SELECT cents FROM sprout_orders WHERE id=$1', [id]);
      return r ? r.cents / 100 : undefined;
    },
    async donationFor(id) {
      const { rows: [r] } = await db.query<ReceiptRow>("SELECT * FROM sprout_receipts WHERE type='donation' AND order_id=$1", [id]);
      return r ? receipt(r) : undefined;
    },
    async addDonation(input) {
      return db.transaction(async (query) => {
        const { salt } = await lock(query);
        const { rows: [existing] } = await query<ReceiptRow>("SELECT * FROM sprout_receipts WHERE type='donation' AND (order_id=$1 OR provider_id=$2)", [input.orderId,input.captureId]);
        if (existing) {
          if (existing.order_id !== input.orderId || existing.provider_id !== input.captureId || existing.cents !== cents(input.dollars))
            throw new StateConflict('payment_not_completed', 'The provider capture does not match the saved donation.');
          return receipt(existing);
        }
        const { rows: [order] } = await query<{ cents: number }>('SELECT cents FROM sprout_orders WHERE id=$1', [input.orderId]);
        if (!order || order.cents !== cents(input.dollars)) throw new StateConflict('payment_not_completed', 'The capture amount does not match the saved order.');
        const id = await nextId(query, 'donation');
        const { rows: [r] } = await query<ReceiptRow>(`INSERT INTO sprout_receipts(id,type,cents,date,ref,provider_id,status,order_id)
          VALUES ($1,'donation',$2,to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD'),$3,$4,'COMPLETED',$5) RETURNING *`,
          [id,order.cents,code(salt,'donor',input.payerId),input.captureId,input.orderId]);
        await query('DELETE FROM sprout_orders WHERE id=$1', [input.orderId]);
        return receipt(r);
      });
    },
    async addRequest(input) {
      return db.transaction(async (query) => {
        const id = await nextId(query, 'request');
        await query('INSERT INTO sprout_payout_requests(id,cents,email,child) VALUES ($1,$2,$3,$4)', [id,cents(input.amount),input.email,input.child]);
        // Retain approved requests and all recovery references; request counts never form IDs.
        return (await findRequest(query,id))!;
      });
    },
    findRequest: (id) => findRequest(db.query,id),
    async approve(id, approver) {
      await db.transaction(async (query) => {
        await lock(query);
        const request = await findRequest(query,id);
        if (!request || request.receiptId) return;
        await query('INSERT INTO sprout_approvals(request_id,approver) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id,approver]);
      });
    },
    async startPayout(id) {
      return db.transaction(async (query) => {
        const { salt } = await lock(query);
        const request = await findRequest(query,id);
        if (!request) throw new StateConflict('unknown_request', 'No payout request with that id.',404);
        if (request.receiptId) {
          const { rows: [r] } = await query<ReceiptRow>('SELECT * FROM sprout_receipts WHERE id=$1', [request.receiptId]);
          return { receipt: receipt(r), senderBatchId: request.senderBatchId! };
        }
        return reserve(query,request,salt);
      });
    },
    async claimSend(id, approver): Promise<SendClaim> {
      return db.transaction(async (query) => {
        const { salt } = await lock(query);
        let request = await findRequest(query,id);
        if (!request) throw new StateConflict('unknown_request','No payout request with that id.',404);
        if (!request.approvals.some((a) => a.approver === approver)) throw new StateConflict('not_an_approver','Only an adult who approved this request can send it.',403);
        const retry = Boolean(request.receiptId);
        let r: LiveReceipt;
        if (request.receiptId) {
          const { rows: [row] } = await query<ReceiptRow>('SELECT * FROM sprout_receipts WHERE id=$1',[request.receiptId]);
          r = receipt(row);
          if (!['UNKNOWN','SENDING'].includes(r.status)) return { request, receipt: r, token: null, retry };
          const { rows: [lease] } = await query<{ busy: boolean; too_old: boolean }>(`SELECT send_until>now() busy,
            sent_at < now()-interval '29 days' OR sent_at>now() too_old FROM sprout_payout_requests WHERE id=$1`,[id]);
          if (lease.busy) throw new StateConflict('send_in_progress','This payout is already being sent.');
          if (lease.too_old) throw new StateConflict('payout_manual_review','This payout is too old to resend safely. Check the PayPal sandbox dashboard. Funds remain reserved.');
        } else {
          r = (await reserve(query,request,salt)).receipt;
          request = (await findRequest(query,id))!;
        }
        const token = randomUUID();
        await query("UPDATE sprout_payout_requests SET send_token=$2,send_until=now()+interval '90 seconds' WHERE id=$1",[id,token]);
        return { request, receipt: r, token, retry };
      });
    },
    async finishSend(id, token, change) {
      await db.transaction(async (query) => {
        await lock(query);
        const { rows: [r] } = await query<{ receipt_id: string }>('SELECT receipt_id FROM sprout_payout_requests WHERE id=$1 AND send_token=$2',[id,token]);
        if (!r) throw new StateConflict('send_in_progress','A newer recovery owns this payout. Refresh the request.');
        await update(query,r.receipt_id,change);
        await query('UPDATE sprout_payout_requests SET send_token=NULL,send_until=NULL WHERE id=$1',[id]);
      });
    },
    async updatePayout(id, change) {
      await db.transaction(async (query) => { await lock(query); await update(query,id,change); });
      return byId(id);
    },
    async findPayout(id) {
      const { rows: [r] } = await db.query<ReceiptRow>("SELECT * FROM sprout_receipts WHERE type='payout' AND provider_id=$1", [id]);
      return r ? receipt(r) : undefined;
    },
    receipt: byId,
    async uncertainPayout() {
      const { rows: [r] } = await db.query<ReceiptRow>("SELECT * FROM sprout_receipts WHERE type='payout' AND status IN ('UNKNOWN','SENDING') ORDER BY created_at,id LIMIT 1");
      return r ? receipt(r) : undefined;
    },
    async poolDollars() { return (await totals(db.query)).available; },
    totals: () => totals(db.query),
    async all() {
      const { rows } = await db.query<ReceiptRow>('SELECT * FROM (SELECT * FROM sprout_receipts ORDER BY created_at DESC,id DESC LIMIT 100) r ORDER BY created_at,id');
      return rows.map((r) => publicCopy(receipt(r)));
    },
    async receiptPage(limit, before) {
      if (before && !await byId(before))
        throw new StateConflict('invalid_receipt_cursor', 'That receipt page is unavailable. Refresh the receipt history.', 400);
      const { rows } = await db.query<ReceiptRow>(`SELECT * FROM sprout_receipts
        WHERE $1::text IS NULL OR (created_at,id) < (SELECT created_at,id FROM sprout_receipts WHERE id=$1)
        ORDER BY created_at DESC,id DESC LIMIT $2`, [before ?? null, limit + 1]);
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      return { receipts: page.reverse().map(row => publicCopy(receipt(row))),
        nextCursor: hasMore ? rows[limit - 1].id : null };
    },
    async unpublished() {
      const { rows } = await db.query<ReceiptRow>("SELECT * FROM sprout_receipts WHERE batch_id IS NULL AND ((type='donation' AND status='COMPLETED') OR (type='payout' AND status='SUCCESS')) ORDER BY created_at,id");
      return rows.map(receipt);
    },
    async pendingCount() {
      const { rows:[r] }=await db.query<{count:number}>(`SELECT count(*)::integer count FROM sprout_receipts r
        WHERE batch_id IS NULL AND ((type='donation' AND status='COMPLETED') OR (type='payout' AND status='SUCCESS'))
        AND NOT EXISTS (SELECT 1 FROM sprout_ledger_job_receipts j WHERE j.receipt_id=r.id)`);
      return r.count;
    },
    async nextBatchId() { return (await db.query<{ next_batch: number }>('SELECT next_batch FROM sprout_payment_meta WHERE singleton')).rows[0].next_batch; },
    async markPublished(ids, batchId) {
      await db.transaction(async (query) => {
        await lock(query);
        await query(`UPDATE sprout_receipts SET batch_id=$2 WHERE id=ANY($1::text[]) AND batch_id IS NULL
          AND ((type='donation' AND status='COMPLETED') OR (type='payout' AND status='SUCCESS'))`,[ids,batchId]);
        await query('UPDATE sprout_payment_meta SET next_batch=GREATEST(next_batch,$1+1) WHERE singleton',[batchId]);
      });
    },
  };
}
