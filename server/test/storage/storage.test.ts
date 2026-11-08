import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import { createDatabase, StateConflict, StorageError, type Database, type Query } from '../../src/shared/storage/database.js';
import { migrate, checkSchema, checkDatabaseAccess, schemaVersion } from '../../src/shared/storage/schema.js';
import { createPostgresPayments } from '../../src/features/payments/postgres.js';
import { createPayPalStore } from '../../src/features/payments/store.js';
import { createPostgresLearning } from '../../src/features/learning/postgres.js';
import { createPostgresSecurity } from '../../src/shared/security/postgres.js';
import { lessonAnswers } from '../../src/features/seedlings/answers.js';
import { consentPolicy } from '../../src/features/learning/store.js';
import type { PayPal } from '../../src/features/payments/client.js';

// Embedded Postgres checks SQL and separately constructed stores/APIs. Its transaction queue
// serializes work; run the optional real-Postgres case to test actual concurrent row locking.
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const pg = await PGlite.create();
  const db: Database = {
    query: ((sql,values) => pg.query(sql,values)) as Query,
    transaction: (work) => pg.transaction((tx) => work((async (sql,values) => {
      if (!values?.length) {
        const results = await tx.exec(sql);
        return results.at(-1) ?? { rows: [] };
      }
      return tx.query(sql,values);
    }) as Query)),
    close: () => pg.close(),
  };
  t.after(() => db.close());
  await migrate(db);
  return db;
}
async function fund(db: Database, dollars = 50) {
  const store = createPostgresPayments(db);
  await store.rememberOrder('ORDER12345',dollars);
  return store.addDonation({ orderId: 'ORDER12345',captureId: 'CAPTURE123',dollars,payerId:'synthetic-payer' });
}
async function approved(db: Database, amount = 40) {
  const store = createPostgresPayments(db);
  const request = await store.addRequest({ amount,email:'synthetic@example.com',child:'sample' });
  await store.approve(request.id,'mentor'); await store.approve(request.id,'admin');
  return request.id;
}
const keys = { DEMO_OPEN_ACCESS:'false', PAYOUT_PIN_MENTOR:'mentor-test',PAYOUT_PIN_ADMIN:'admin-test',PAYOUT_PIN_GUARDIAN:'guardian-test',GUARDIAN_PAYPAL_EMAIL:'synthetic@example.com' };
const fake: PayPal = { clientId:'fake',async createOrder() { return { id:'ORDER12345' }; },
  async captureOrder() { return { orderId:'ORDER12345',captureId:'CAPTURE123',dollars:25,currency:'USD',status:'COMPLETED',payerId:'sample' }; },
  async sendPayout() { return { batchId:'BATCH12345',status:'PENDING' }; }, async getPayout(batchId) { return { batchId,status:'SUCCESS' }; } };
function appFixture(t: { after: (fn: () => Promise<void>) => void }, db: Database, extra: Parameters<typeof buildApp>[1] = {}, env: NodeJS.ProcessEnv = {}) {
  const app = buildApp(loadConfig({ ...keys,...env }),{ database:db,model:null,chain:null,paypal:fake,...extra });
  t.after(() => app.close()); return app;
}
const post = (app: ReturnType<typeof buildApp>,url: string,payload: object = {},headers: Record<string,string> = {}) => app.inject({ method:'POST',url,payload,headers });

test('database access checks detect RLS drift without changing payment or learning records', async t => {
  const db = await fixture(t);
  await fund(db, 25);
  assert.deepEqual(await checkDatabaseAccess(db), { schemaVersion, tables: 16 });
  await db.query('ALTER TABLE sprout_orders DISABLE ROW LEVEL SECURITY');
  await assert.rejects(checkDatabaseAccess(db), /access checks failed/);
  assert.equal(await createPostgresPayments(db).poolDollars(), 25);
  assert.equal((await createPostgresLearning(db, false).snapshot()).activities.length, 3);
});

test('hosted-storage policy migration requires new permission and preserves progress and blocked markers', async t => {
  const db = await fixture(t), learning = createPostgresLearning(db, false);
  await fund(db, 25);
  await learning.changeConsent('A12', 'acknowledge', 0);
  await learning.completeLesson('needs', 1);
  await learning.changeConsent('B07', 'delete', 0);
  await db.query('DELETE FROM sprout_migrations WHERE version=4');
  assert.equal(await migrate(db), true);
  assert.equal((await learning.consent()).status, 'pending');
  assert.equal((await learning.consent()).revision, 2);
  assert.equal((await learning.consent('B07')).status, 'deleted');
  assert.equal((await learning.snapshot()).activities.length, 2);
  assert.equal(await createPostgresPayments(db).poolDollars(), 25);
  await assert.rejects(learning.changeConsent('A12', 'acknowledge', 1), /Permission changed/);
  await learning.changeConsent('A12', 'acknowledge', 2);
  assert.equal((await learning.garden()).completed.length, 1);
  assert.equal(await migrate(db), false);
  assert.equal((await learning.consent()).revision, 3);
  await db.query("UPDATE sprout_learners SET status='active',revision=revision+1,acknowledged_at=now(),consent_policy='demo-permission-v1' WHERE code='A12'");
  assert.equal((await learning.consent()).status, 'pending');
  await assert.rejects(learning.completeLesson('waiting', 4), /guardian must record/i);
  await learning.changeConsent('A12', 'acknowledge', 4);
  assert.equal((await learning.consent()).status, 'active');
});

test('shared receipt pages remain stable across new receipts and validate public cursors', async (t) => {
  const db = await fixture(t);
  const insert = (start: number, end: number) => db.query(`INSERT INTO sprout_receipts
    (id,type,cents,date,ref,provider_id,status,order_id,created_at)
    SELECT 'DON-2611-'||lpad(n::text,4,'0'),'donation',100,'2026-11-08','donor-synthetic',
      'PRIVATECAPTURE'||n,'COMPLETED','PRIVATEORDER'||n,
      '2026-11-08T00:00:00Z'::timestamptz+n*interval '1 millisecond'
    FROM generate_series($1::integer,$2::integer) n`, [start, end]);
  await insert(1, 125);
  const app = appFixture(t, db);
  const first = (await app.inject('/api/paypal/receipts')).json();
  assert.equal(first.receipts.length, 100);
  assert.equal(first.nextCursor, 'DON-2611-0026');
  await insert(126, 126);
  const older = (await app.inject(`/api/paypal/receipts?before=${first.nextCursor}`)).json();
  assert.equal(older.receipts.length, 25);
  assert.equal(older.nextCursor, null);
  assert.equal(older.pendingCount, 126);
  assert.equal(new Set([...first.receipts, ...older.receipts].map(receipt => receipt.id)).size, 125);
  assert.doesNotMatch(JSON.stringify(older.receipts), /PRIVATE|provider_id|paypalId|orderId/);
  for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'before=not-a-receipt', 'before=DON-0000-0000', 'extra=1'])
    assert.equal((await app.inject(`/api/paypal/receipts?${query}`)).statusCode, 400);
});

test('schema migration is idempotent and never restores deleted learning data or resets money', async (t) => {
  const db = await fixture(t);
  await fund(db);
  const learning = createPostgresLearning(db,false);
  await learning.changeConsent('A12','delete',0);
  assert.equal(await migrate(db),false); await checkSchema(db);
  assert.equal((await learning.consent()).status,'deleted');
  assert.equal((await learning.snapshot()).activities.length,2);
  assert.equal(await createPostgresPayments(db).poolDollars(),50);
});

test('duplicate captures from separate stores credit once and reject conflicting provider identity', async (t) => {
  const db = await fixture(t); const a = createPostgresPayments(db), b = createPostgresPayments(db);
  await a.rememberOrder('ORDER12345',0.29);
  const input = { orderId:'ORDER12345',captureId:'CAPTURE123',dollars:0.29,payerId:'sample' };
  const receipts = await Promise.all([a.addDonation(input),b.addDonation(input)]);
  assert.equal(receipts[0].id,receipts[1].id); assert.equal(await b.poolDollars(),0.29);
  await assert.rejects(async () => b.addDonation({ ...input,captureId:'DIFFERENT' }),StateConflict);
  assert.equal((await a.all()).length,1);
  assert.doesNotMatch(JSON.stringify(await a.all()),/CAPTURE123|ORDER12345|synthetic/);
});

test('two independent reservations cannot spend two $40 payouts from a $50 pool', async (t) => {
  const db = await fixture(t); await fund(db);
  const ids = await Promise.all([approved(db),approved(db)]);
  const a = createPostgresPayments(db), b = createPostgresPayments(db);
  const results = await Promise.allSettled([a.claimSend!(ids[0],'mentor'),b.claimSend!(ids[1],'mentor')]);
  assert.equal(results.filter((r) => r.status==='fulfilled').length,1);
  assert.equal(results.filter((r) => r.status==='rejected').length,1);
  assert.equal(await b.poolDollars(),10);
  assert.deepEqual(await a.totals(),{ donated:50,paid:0,reserved:40,available:10 });
  assert.equal((await b.all()).length,2);
});

test('durable send leases, expired recovery and stale results retain the original operation IDs', async (t) => {
  const db = await fixture(t); await fund(db); const id = await approved(db);
  const a = createPostgresPayments(db), b = createPostgresPayments(db);
  const first = await a.claimSend!(id,'mentor');
  await assert.rejects(b.claimSend!(id,'mentor'),(error: StateConflict) => error.code==='send_in_progress');
  await db.query("UPDATE sprout_payout_requests SET send_until=now()-interval '1 second' WHERE id=$1",[id]);
  const retry = await b.claimSend!(id,'mentor');
  assert.equal(retry.retry,true); assert.equal(retry.receipt.id,first.receipt.id);
  assert.equal(retry.request.senderBatchId,first.request.senderBatchId);
  assert.equal(retry.request.sentAt,first.request.sentAt); assert.notEqual(retry.token,first.token);
  await assert.rejects(a.finishSend!(id,first.token!,{ status:'REJECTED' }),StateConflict);
  await b.finishSend!(id,retry.token!,{ status:'SUCCESS',paypalId:'BATCH12345' });
  await a.updatePayout(first.receipt.id,{ status:'UNKNOWN' });
  assert.equal((await a.receipt(first.receipt.id))!.status,'SUCCESS');
  assert.equal((await b.claimSend!(id,'mentor')).token,null);
  assert.equal((await b.unpublished()).length,2);
});

test('both payment backends reflect returned funds without allowing late responses to undo them', async (t) => {
  const db = await fixture(t);
  for (const store of [createPayPalStore(), createPostgresPayments(db)]) {
    await store.rememberOrder('ORDER12345',50);
    await store.addDonation({ orderId:'ORDER12345',captureId:'CAPTURE123',dollars:50,payerId:'sample' });
    for (const returned of ['REFUNDED','RETURNED','REVERSED']) {
      const request = await store.addRequest({ amount:40,email:'sample@example.com',child:'sample' });
      await store.approve(request.id,'mentor'); await store.approve(request.id,'admin');
      const started = await store.startPayout(request.id,true);
      await store.updatePayout(started.receipt.id,{ status:'SUCCESS',paypalId:`BATCH-${returned}` });
      for (const status of ['UNKNOWN','SENDING','PENDING','UNCLAIMED'])
        await store.updatePayout(started.receipt.id,{ status });
      assert.equal((await store.receipt(started.receipt.id))!.status,'SUCCESS');
      assert.equal(await store.poolDollars(),10);
      assert.deepEqual(await store.totals(),{ donated:50,paid:40,reserved:0,available:10 });
      assert.ok((await store.unpublished()).some((r) => r.id===started.receipt.id));
      await store.updatePayout(started.receipt.id,{ status:returned });
      for (const status of ['SUCCESS','PENDING','UNKNOWN','SENDING'])
        await store.updatePayout(started.receipt.id,{ status });
      const receipt = (await store.receipt(started.receipt.id))!;
      assert.equal(receipt.status,returned); assert.equal(receipt.paypalId,`BATCH-${returned}`);
      assert.equal(await store.poolDollars(),50);
      assert.deepEqual(await store.totals(),{ donated:50,paid:0,reserved:0,available:50 });
      assert.equal((await store.unpublished()).length,1,'Only the donation is eligible for publication');
      assert.equal((await store.findRequest(request.id))!.senderBatchId,started.senderBatchId);
    }
  }
});

test('a provider refund refresh corrects the database receipt, public balance and NGO report', async (t) => {
  const db = await fixture(t); await fund(db); const id = await approved(db);
  const store = createPostgresPayments(db), claim = await store.claimSend!(id,'mentor');
  await store.finishSend!(id,claim.token!,{ status:'SUCCESS',paypalId:'BATCH12345' });
  const app = appFixture(t,db,{ paypal:{ ...fake,async getPayout(batchId) { return { batchId,status:'REFUNDED' }; } } },{ DEMO_OPEN_ACCESS:'true' });
  const refreshed = await app.inject({ url:'/api/paypal/payouts/BATCH12345' });
  assert.equal(refreshed.statusCode,200); assert.equal(refreshed.json().receipt.status,'REFUNDED');
  assert.equal(refreshed.json().poolDollars,50);
  const publicReceipts = (await app.inject({ url:'/api/paypal/receipts' })).json();
  assert.equal(publicReceipts.receipts.find((r: { id: string }) => r.id===claim.receipt.id).status,'REFUNDED');
  const report = (await app.inject({ url:'/api/ngo/report' })).json().csv;
  assert.match(report,/sandbox_paid,USD,0/); assert.match(report,/sandbox_available,USD,50/);
});

test('failed pre-provider transactions send nothing; lost result saves keep funds reserved across fresh APIs', async (t) => {
  const db = await fixture(t); await fund(db); const id = await approved(db); let sends=0;
  let failed = false;
  const broken: Database = { ...db,async transaction(work) { if (failed) throw new StorageError(); return db.transaction(work); } };
  const a = appFixture(t,broken,{ paypal:{ ...fake,async sendPayout() { sends++; failed=true; return { batchId:'BATCH12345',status:'PENDING' }; } } });
  // Failure before reservation cannot call the provider (route-limit storage fails closed).
  failed=true;
  assert.equal((await post(a,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR })).statusCode,503);
  assert.equal(sends,0); failed=false;
  assert.equal((await post(a,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR })).statusCode,503);
  assert.equal(sends,1);
  const b = appFixture(t,db); const recovered = await post(b,`/api/paypal/payout-requests/${id}/recover`,{ approver:'admin',pin:keys.PAYOUT_PIN_ADMIN });
  assert.equal(recovered.statusCode,200); assert.equal(recovered.json().poolDollars,10);
  assert.equal(recovered.json().request.receipt.status,'SENDING');
  assert.equal((await post(b,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR })).json().error,'send_in_progress');
  await db.query("UPDATE sprout_payout_requests SET send_until=now()-interval '1 second' WHERE id=$1",[id]);
  const settled = await post(b,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR });
  assert.equal(settled.json().request.receipt.status,'PENDING');
});

test('a failure during reservation rolls back receipt and operation IDs before any provider send', async (t) => {
  const db = await fixture(t); await fund(db); const id = await approved(db); let sends=0;
  const failing: Database = { ...db,transaction(work) {
    return db.transaction((query) => work((async (sql,values) => {
      const result = await query(sql,values);
      if (sql.startsWith('UPDATE sprout_payout_requests SET receipt_id=')) throw new StorageError();
      return result;
    }) as Query));
  } };
  const app = appFixture(t,failing,{ paypal:{ ...fake,async sendPayout() { sends++; return { batchId:'BATCH12345',status:'PENDING' }; } } });
  const response = await post(app,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR });
  assert.equal(response.statusCode,503); assert.equal(sends,0);
  const store = createPostgresPayments(db), request = (await store.findRequest(id))!;
  assert.equal(request.receiptId,null); assert.equal(request.senderBatchId,null); assert.equal(request.sentAt,undefined);
  assert.equal(await store.poolDollars(),50); assert.equal((await store.all()).length,1);
});

test('uncertain payouts older than 29 days remain reserved and require manual review', async (t) => {
  const db = await fixture(t); await fund(db); const id = await approved(db); const store = createPostgresPayments(db);
  const claim = await store.claimSend!(id,'mentor'); await store.finishSend!(id,claim.token!,{ status:'UNKNOWN' });
  await db.query("UPDATE sprout_payout_requests SET sent_at=now()-interval '30 days' WHERE id=$1",[id]);
  await assert.rejects(store.claimSend!(id,'mentor'),(error: StateConflict) => error.code==='payout_manual_review');
  assert.equal(await store.poolDollars(),10); assert.equal((await store.unpublished()).length,1);
  const app = appFixture(t,db);
  const response = await post(app,`/api/paypal/payout-requests/${id}/send`,{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR });
  assert.equal(response.statusCode,409); assert.equal(response.json().request.receipt.status,'UNKNOWN');
  assert.equal(response.json().poolDollars,10);
});

test('permission revision, one-time rewards and deletion are atomic across separate stores', async (t) => {
  const db = await fixture(t); const a = createPostgresLearning(db,false), b = createPostgresLearning(db,false);
  await a.changeConsent('A12','acknowledge',0);
  const completions = await Promise.all([a.completeLesson('needs',1),b.completeLesson('needs',1)]);
  assert.deepEqual(completions.sort(),['saved','unchanged']); assert.equal((await b.garden()).seeds,1);
  const reviews = await Promise.all([a.review('ACT-001','approved','mentor'),b.review('ACT-001','approved','admin')]);
  assert.deepEqual(reviews.sort(),['saved','unchanged']); assert.equal((await b.snapshot()).totals.totalCredits,200);
  const changes = await Promise.allSettled([a.changeConsent('A12','delete',1),b.changeConsent('A12','acknowledge',1)]);
  assert.equal(changes[0].status,'fulfilled'); assert.equal(changes[1].status,'rejected');
  await assert.rejects(b.completeLesson('needs',1),StateConflict);
  assert.equal(await b.review('ACT-001','approved','mentor'),'not_found');
  assert.equal((await b.garden()).seeds,0); assert.equal((await b.snapshot()).totals.totalCredits,0);
  await b.changeConsent('A12','acknowledge',2);
  await assert.rejects(a.completeLesson('needs',1),StateConflict);
  assert.equal(await b.completeLesson('needs',3),'saved');
});

test('staff sessions, role lockouts, IP limits and the AI budget are shared across fresh stores', async (t) => {
  const db = await fixture(t); const a = createPostgresSecurity(db), b = createPostgresSecurity(db);
  for (let i=0;i<5;i++) assert.equal((await a.pins.check('guardian',false)).result,'wrong');
  assert.equal((await b.pins.check('guardian',true)).result,'locked');
  assert.equal((await b.pins.check('mentor',true)).result,'ok');
  await a.sessions.create('secret-test-token','admin',Date.now()+60_000);
  assert.equal((await b.sessions.find('secret-test-token'))!.role,'admin');
  const saved = await db.query<{ token_hash: string }>('SELECT token_hash FROM sprout_sessions');
  assert.doesNotMatch(JSON.stringify(saved.rows),/secret-test-token/);
  await b.sessions.delete('secret-test-token'); assert.equal(await a.sessions.find('secret-test-token'),undefined);
  const first = a.limiter({ limit:1,windowMs:60_000 },'shared-test'), second = b.limiter({ limit:1,windowMs:60_000 },'shared-test');
  assert.equal(await first.check('sample-ip'),0); assert.ok(await second.check('sample-ip')>0);
  const other = b.limiter({ limit:1,windowMs:60_000 },'other-route'); assert.equal(await other.check('sample-ip'),0);
});

test('separate APIs share NGO sessions, checked lessons, revisions and fail-closed ledger publication', async (t) => {
  const db = await fixture(t); const a = appFixture(t,db), b = appFixture(t,db);
  const unlock = await post(a,'/api/ngo/unlock',{ approver:'mentor',pin:keys.PAYOUT_PIN_MENTOR });
  assert.equal(unlock.statusCode,200);
  const headers = { authorization:`Bearer ${unlock.json().token}` };
  assert.equal((await b.inject({ url:'/api/ngo/dashboard',headers })).statusCode,200);
  const permission = await post(a,'/api/guardian/permission',{ learner:'A12',action:'acknowledge',pin:keys.PAYOUT_PIN_GUARDIAN,revision:0,policy:consentPolicy,acknowledged:true });
  assert.equal(permission.json().consent.revision,1);
  const complete = await post(b,'/api/seedlings/complete',{ lessonId:'needs',answers:lessonAnswers.needs },{ 'x-learning-revision':'1' });
  assert.equal(complete.statusCode,200); assert.equal(complete.json().garden.seeds,1);
  await post(a,'/api/guardian/permission',{ learner:'A12',action:'withdraw',pin:keys.PAYOUT_PIN_GUARDIAN,revision:1 });
  assert.equal((await post(b,'/api/seedlings/complete',{ lessonId:'needs',answers:lessonAnswers.needs },{ 'x-learning-revision':'1' })).statusCode,403);
  await post(b,'/api/ngo/lock',{},headers);
  assert.equal((await a.inject({ url:'/api/ngo/dashboard',headers })).statusCode,401);
  assert.equal((await post(b,'/api/ledger/publish-live')).json().error,'ledger_setup_required');
});

test('donation notes and mentor streams spend one shared provider budget', async (t) => {
  const db = await fixture(t); let calls=0;
  const model = { async *stream() { calls++; yield 'Save a little each week.'; } };
  const a = appFixture(t,db,{ model },{ DEMO_OPEN_ACCESS:'true',MENTOR_HOURLY_LIMIT:'1' });
  const b = appFixture(t,db,{ model },{ DEMO_OPEN_ACCESS:'true',MENTOR_HOURLY_LIMIT:'1' });
  await post(a,'/api/paypal/orders',{ amount:25 });
  const captured = await post(a,'/api/paypal/orders/ORDER12345/capture');
  assert.equal(captured.json().note.source,'ai');
  const chat = await post(b,'/api/mentor/chat',{ language:'en',messages:[{ role:'user',text:'How do I save?' }] },{ 'x-learning-revision':'0' });
  assert.equal(chat.statusCode,429); assert.equal(calls,1);
});

test('a permission change on another store stops later AI output from an open stream', async (t) => {
  const db = await fixture(t); const learning = createPostgresLearning(db,false);
  await learning.changeConsent('A12','acknowledge',0);
  let release!: () => void, started!: () => void;
  const waiting = new Promise<void>((done) => { release=done; });
  const running = new Promise<void>((done) => { started=done; });
  const app = appFixture(t,db,{ model:{ async *stream() { yield 'First advice. '; started(); await waiting; yield 'Stale later advice.'; } } });
  const response = post(app,'/api/mentor/chat',{ language:'en',messages:[{ role:'user',text:'How do I save?' }] },{ 'x-learning-revision':'1' });
  try { await running; await learning.changeConsent('A12','withdraw',1); } finally { release(); }
  const result = await response;
  assert.match(result.body,/First advice/); assert.doesNotMatch(result.body,/Stale later advice|"type":"done"/);
});

test('Supabase migration blocks browser roles while preserving backend records and access', async (t) => {
  const db = await fixture(t);
  await fund(db, 25);
  await db.transaction(query => query(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
    DO $$ DECLARE item record; BEGIN
      FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sprout_%' LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', item.tablename);
      END LOOP;
    END $$;
    DELETE FROM sprout_migrations WHERE version=3;
  `));
  assert.equal(await migrate(db), true);
  assert.equal(await migrate(db), false);
  const protectedTables = await db.query<{ protected: boolean }>(
    "SELECT bool_and(rowsecurity) AS protected FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sprout_%'");
  assert.equal(protectedTables.rows[0].protected, true);
  for (const role of ['anon', 'authenticated']) {
    const access = await db.query<{ read: boolean; sequence: boolean }>(
      "SELECT has_table_privilege($1,'sprout_receipts','SELECT') AS read, has_sequence_privilege($1,'sprout_donation_id','USAGE') AS sequence", [role]);
    assert.deepEqual(access.rows[0], { read: false, sequence: false });
  }
  // Re-granting table access, as a dashboard's automatic exposure might, still hits default-deny RLS.
  await db.transaction(query => query('GRANT SELECT ON sprout_receipts TO anon; GRANT INSERT ON sprout_orders TO authenticated;'));
  const visible = await db.transaction(async query => {
    await query('SET LOCAL ROLE anon');
    return query('SELECT id FROM sprout_receipts');
  });
  assert.equal(visible.rows.length, 0);
  await assert.rejects(db.transaction(async query => {
    await query('SET LOCAL ROLE authenticated');
    return query("INSERT INTO sprout_orders(id,cents) VALUES ('FORGEDORDER',100)");
  }), /row.level security/i);
  const payments = createPostgresPayments(db);
  assert.equal(await payments.poolDollars(), 25);
});

test('database configuration requires verified hosted TLS and never echoes credentials', () => {
  assert.throws(() => loadConfig({ RENDER:'true' }),/DATABASE_URL/);
  assert.throws(() => loadConfig({ DATABASE_URL:'postgresql://private-user:private-secret@db.example/sprout?sslmode=disable' }),
    (error: Error) => error.message.includes('verify-full')&&!error.message.includes('private-secret'));
  assert.doesNotThrow(() => loadConfig({ DATABASE_URL:'postgresql://test:test@localhost/test' }));
  assert.doesNotThrow(() => loadConfig({ DATABASE_URL:'postgresql://test:test@db.example/test?sslmode=verify-full' }));
});

test('real Postgres: independent connections preserve payment, permission and security boundaries', { skip: !process.env.SPROUT_TEST_DATABASE_URL }, async (t) => {
  // Use only a disposable database: this check applies the schema and inserts synthetic records.
  const config = loadConfig({ DATABASE_URL:process.env.SPROUT_TEST_DATABASE_URL });
  const a = createDatabase(config.DATABASE_URL!), b = createDatabase(config.DATABASE_URL!);
  t.after(async () => { await a.close(); await b.close(); });
  const existing = await a.query<{ exists: string | null }>("SELECT to_regclass('public.sprout_migrations')::text AS exists");
  assert.equal(existing.rows[0].exists,null,'Use an empty disposable database; existing Sprout records are never reset.');
  await migrate(a); await fund(a);
  const ids = await Promise.all([approved(a),approved(b)]);
  const results = await Promise.allSettled([createPostgresPayments(a).claimSend!(ids[0],'mentor'),createPostgresPayments(b).claimSend!(ids[1],'mentor')]);
  assert.equal(results.filter((r) => r.status==='fulfilled').length,1);
  assert.equal(await createPostgresPayments(b).poolDollars(),10);

  const first = createPostgresLearning(a,false), second = createPostgresLearning(b,false);
  await first.changeConsent('A12','acknowledge',0);
  const completions = await Promise.all([first.completeLesson('needs',1),second.completeLesson('needs',1)]);
  assert.deepEqual(completions.sort(),['saved','unchanged']);
  const decisions = await Promise.allSettled([first.changeConsent('A12','delete',1),second.changeConsent('A12','withdraw',1)]);
  assert.equal(decisions.filter((r) => r.status==='fulfilled').length,1);
  assert.equal(decisions.filter((r) => r.status==='rejected').length,1);
  const consent = await second.consent();
  await assert.rejects(a.transaction(async (query) => {
    await query("UPDATE sprout_learners SET revision=revision+10 WHERE code='A12'");
    throw new StateConflict('test_rollback','Roll back the entire transaction.');
  }),StateConflict);
  assert.equal((await first.consent()).revision,consent.revision);
  await assert.rejects(first.completeLesson('needs',1),StateConflict);

  const securityA=createPostgresSecurity(a), securityB=createPostgresSecurity(b);
  await securityA.sessions.create('synthetic-token','mentor',Date.now()+60_000);
  assert.equal((await securityB.sessions.find('synthetic-token'))?.role,'mentor');
  await securityB.sessions.delete('synthetic-token'); assert.equal(await securityA.sessions.find('synthetic-token'),undefined);
  for (let i=0;i<5;i++) await securityA.pins.check('guardian',false);
  assert.equal((await securityB.pins.check('guardian',true)).result,'locked');
  const budgetA=securityA.limiter({ limit:1,windowMs:60_000 },'ai-budget'), budgetB=securityB.limiter({ limit:1,windowMs:60_000 },'ai-budget');
  const budget=await Promise.all([budgetA.check('everyone'),budgetB.check('everyone')]);
  assert.equal(budget.filter((wait) => wait===0).length,1);

  const winning = results.find((result) => result.status==='fulfilled');
  assert.ok(winning && winning.status==='fulfilled');
  const payout = winning.value;
  const paymentA = createPostgresPayments(a), paymentB = createPostgresPayments(b);
  await paymentA.finishSend!(payout.request.id,payout.token!,{ status:'SUCCESS',paypalId:'SYNTHETICBATCH' });
  await Promise.all([
    paymentA.updatePayout(payout.receipt.id,{ status:'PENDING' }),
    paymentB.updatePayout(payout.receipt.id,{ status:'REFUNDED' }),
  ]);
  await paymentA.updatePayout(payout.receipt.id,{ status:'SUCCESS' });
  assert.equal((await paymentB.receipt(payout.receipt.id))!.status,'REFUNDED');
  assert.equal(await paymentB.poolDollars(),50);
  assert.deepEqual(await paymentB.totals(),{ donated:50,paid:0,reserved:0,available:50 });
  assert.equal((await paymentB.unpublished()).length,1);
});
