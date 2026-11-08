import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { keccak256 } from 'viem';
import { buildApp } from '../../src/build-app.js';
import { loadConfig } from '../../src/config.js';
import { createDatabase,StateConflict,StorageError,type Database,type Query } from '../../src/shared/storage/database.js';
import { migrate,schemaVersion } from '../../src/shared/storage/schema.js';
import { createPublicationStore } from '../../src/features/ledger/postgres.js';
import { createPostgresPayments } from '../../src/features/payments/postgres.js';
import { createPayPalStore } from '../../src/features/payments/store.js';
import { createPostgresLearning } from '../../src/features/learning/postgres.js';
import { createPublisher } from '../../src/features/ledger/publisher.js';
import { publicJob,type LedgerIdentity,type PublicationChain,type SignedPublication } from '../../src/features/ledger/publication.js';
import { sampleReceipts } from '../../src/features/ledger/sample.js';
import type { BatchInput,StoredBatch } from '../../src/features/ledger/chain.js';
import { HARDHAT_TEST_KEY,isLocal } from '../../src/features/ledger/chain.js';
import { fixedClients,prepareDeployment,deploymentIdentity,createFixedLedgerChain } from '../../src/features/ledger/fixed-chain.js';

const target:LedgerIdentity={ chainId:31337,contract:'0x0000000000000000000000000000000000000001',
  publisher:'0x0000000000000000000000000000000000000002',deployHash:`0x${'11'.repeat(32)}`,
  deployBlock:1,deployBlockHash:`0x${'22'.repeat(32)}` };
async function fixture(t:{ after:(fn:()=>Promise<void>)=>void }) {
  const pg=await PGlite.create();
  const db:Database={ query:((sql,values)=>pg.query(sql,values)) as Query,
    transaction:work=>pg.transaction(tx=>work((async (sql,values)=>values?.length?tx.query(sql,values):(await tx.exec(sql)).at(-1)??{rows:[]} ) as Query)),
    close:()=>pg.close() };
  t.after(()=>db.close()); await migrate(db); return db;
}
async function bind(db:Database) {
  const store=createPublicationStore(db);
  await store.saveSetup({ ...target,raw:'0xab' }); await store.finishSetup(target); return store;
}
async function fund(db:Database,n=1) {
  const payments=createPostgresPayments(db), orderId=`ORDER1234${n}`;
  await payments.rememberOrder(orderId,50);
  return payments.addDonation({ orderId,captureId:`CAPTURE123${n}`,dollars:50,payerId:'synthetic' });
}
function fakeChain() {
  let preparations=0,loseReply=false,reverted=false;
  const sent:SignedPublication[]=[], prepared=new Map<string,BatchInput>(), batches=new Map<number,StoredBatch>();
  const chain:PublicationChain={ identity:target,async validate(){},
    async prepare(input) {
      preparations++; const raw=`0x${input.batchId.toString(16).padStart(4,'0')}` as const;
      const hash=keccak256(raw); prepared.set(hash,input); return {raw,hash};
    },
    async broadcast(transaction) {
      sent.push(transaction);
      const input=prepared.get(transaction.hash)!;
      batches.set(input.batchId,{ ...input,publishedAt:1,tx:{ hash:transaction.hash,blockNumber:3,blockHash:target.deployBlockHash,
        timestamp:1,from:target.publisher,to:target.contract,gasUsed:1,feeEth:'0',status:reverted?'reverted':'success' } });
      if (loseReply) { loseReply=false; throw new Error('RPC reply lost after acceptance'); }
    },
    async outcome(hash) { return sent.some(s=>s.hash===hash)?reverted?'reverted':'success':'pending'; },
    async readBatch(id){ return batches.get(id)??null; },
  };
  return { chain,sent,batches,get preparations(){return preparations;},loseNextReply(){loseReply=true;},revert(){reverted=true;} };
}

test('schema 1 upgrades without reseeding money, deleted learners or counters',async t=>{
  const db=await fixture(t); await fund(db);
  await createPostgresLearning(db,false).changeConsent('A12','delete',0);
  await db.transaction(query=>query('DROP TABLE sprout_ledger_job_receipts; DROP TABLE sprout_ledger_jobs; DROP TABLE sprout_ledger_target; DELETE FROM sprout_migrations WHERE version>=2'));
  assert.equal(await migrate(db),true); assert.equal(await migrate(db),false);
  assert.equal((await db.query<{version:number}>('SELECT max(version)::integer version FROM sprout_migrations')).rows[0].version,schemaVersion);
  assert.equal(await createPostgresPayments(db).poolDollars(),50);
  assert.equal((await createPostgresLearning(db,false).consent()).status,'deleted');
  assert.equal((await createPostgresLearning(db,false).snapshot()).activities.length,2);
});

test('one shared job reserves only settled receipts; busy and expired leases cannot create another batch',async t=>{
  const db=await fixture(t), a=await bind(db), b=createPublicationStore(db); await fund(db);
  const payments=createPostgresPayments(db), request=await payments.addRequest({amount:10,email:'synthetic@example.com',child:'sample'});
  await payments.approve(request.id,'mentor'); await payments.approve(request.id,'admin'); await payments.startPayout(request.id,true);
  const claim=await a.claim('live');
  assert.deepEqual(claim.job.receipts.map(r=>r.type),['donation']);
  await assert.rejects(b.claim('live'),(e:StateConflict)=>e.code==='ledger_busy');
  await db.query("UPDATE sprout_ledger_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",[claim.job.id]);
  const retry=await b.claim('live');
  assert.equal(retry.job.id,claim.job.id); assert.equal(retry.job.input.batchId,101);
  await assert.rejects(a.saveSigned(claim.job.id,claim.token!,{raw:'0x1234',hash:keccak256('0x1234')}),StateConflict);
  await b.release(retry.job.id,retry.token!);
  assert.equal((await a.overview()).pendingCount,0);
});

test('a failed signed-transaction save broadcasts nothing and recovery retains the batch and receipts',async t=>{
  const db=await fixture(t); await bind(db); await fund(db); const fake=fakeChain();
  const failing:Database={...db,transaction(work){return db.transaction(query=>work((async(sql,values)=>{
    const result=await query(sql,values); if(sql.startsWith('UPDATE sprout_ledger_jobs SET raw_tx=')) throw new StorageError(); return result;
  }) as Query));}};
  await assert.rejects(createPublisher(createPublicationStore(failing),()=>fake.chain).run('live'),StorageError);
  assert.equal(fake.sent.length,0);
  const original=(await createPublicationStore(db).overview()).active!;
  const result=await createPublisher(createPublicationStore(db),()=>fake.chain).run('live',original.id);
  assert.equal(result.id,original.id); assert.equal(result.input.batchId,original.input.batchId);
  assert.equal(result.state,'confirmed'); assert.equal(fake.sent.length,1);
});

test('lost broadcasts and failed result saves recover from fresh workers without another signature or batch',async t=>{
  const db=await fixture(t); const store=await bind(db); await fund(db); const fake=fakeChain(); fake.loseNextReply();
  const first=await createPublisher(store,()=>fake.chain).run('live');
  assert.equal(first.state,'signed'); assert.equal(fake.sent.length,1);
  const failing:Database={...db,transaction(work){return db.transaction(query=>work((async(sql,values)=>{
    const result=await query(sql,values); if(sql.startsWith("UPDATE sprout_ledger_jobs SET state='confirmed'")) throw new StorageError(); return result;
  }) as Query));}};
  await assert.rejects(createPublisher(createPublicationStore(failing),()=>fake.chain).run('live',first.id),StorageError);
  const recovered=await createPublisher(createPublicationStore(db),()=>fake.chain).run('live',first.id);
  assert.equal(recovered.state,'confirmed'); assert.equal(recovered.hash,first.hash);
  assert.equal(fake.preparations,1); assert.equal(fake.sent.length,1);
  assert.equal((await createPostgresPayments(db).all())[0].batchId,101);
  assert.equal((await store.overview()).active,null);
  assert.equal((await store.target() as unknown as {raw?:string}).raw,undefined);
  assert.equal((publicJob((await store.get(first.id))!) as {raw?:string}).raw,undefined);
});

test('reverted publications stop for review and never mark receipts published',async t=>{
  const db=await fixture(t); const store=await bind(db); await fund(db); const fake=fakeChain(); fake.revert();
  const result=await createPublisher(store,()=>fake.chain).run('live');
  assert.equal(result.state,'blocked'); assert.equal((await createPostgresPayments(db).all())[0].batchId,null);
  assert.equal((await createPublisher(store,()=>fake.chain).run('live')).id,result.id);
  assert.equal(fake.sent.length,1);
});

test('an occupied batch with different contents blocks the saved job without signing or marking receipts',async t=>{
  const db=await fixture(t), store=await bind(db);await fund(db);
  const claim=await store.claim('live');await store.release(claim.job.id,claim.token!);
  const fake=fakeChain();fake.batches.set(101,{...claim.job.input,root:'ff'.repeat(32),publishedAt:1,tx:null});
  const result=await createPublisher(store,()=>fake.chain).run('live',claim.job.id);
  assert.equal(result.state,'blocked');assert.equal(fake.preparations,0);assert.equal(fake.sent.length,0);
  assert.equal((await createPostgresPayments(db).all())[0].batchId,null);
});

test('pending counts include settled receipts outside the newest-100 public window',()=>{
  const store=createPayPalStore();
  const receipts=Array.from({length:101},(_,i)=>store.addDonation({orderId:`ORDER${i}`,captureId:`CAPTURE${i}`,dollars:5,payerId:'sample'}));
  store.markPublished(receipts.slice(1).map(r=>r.id),101);
  assert.equal(store.all().length,100);assert.ok(store.all().every(r=>r.batchId===101));
  assert.equal(store.pendingCount(),1);assert.equal(store.unpublished()[0].id,receipts[0].id);
});

test('a matching batch cannot confirm a job using a different transaction hash',async t=>{
  const db=await fixture(t),store=await bind(db);await fund(db);const fake=fakeChain();
  const read=fake.chain.readBatch;
  fake.chain.readBatch=async id=>{const result=await read(id);return result?{...result,tx:{...result.tx!,hash:target.deployHash}}:null;};
  const result=await createPublisher(store,()=>fake.chain).run('live');
  assert.equal(result.state,'blocked');assert.equal((await createPostgresPayments(db).all())[0].batchId,null);
});

test('fixed deployment identity cannot be replaced, and existing intent bytes win competing setup',async t=>{
  assert.throws(()=>fixedClients(loadConfig({CHAIN_RPC_URL:'https://rpc.example.com',LEDGER_CHAIN_ID:'84532',
    PUBLISHER_PRIVATE_KEY:`0x${HARDHAT_TEST_KEY.slice(2).toUpperCase()}`})),/Hardhat/);
  const db=await fixture(t), store=await bind(db);
  assert.equal((await store.saveSetup({...target,raw:'0xcd',deployHash:`0x${'33'.repeat(32)}`})).deployHash,target.deployHash);
  await assert.rejects(store.saveSetup({...target,chainId:84532,raw:null}),StateConflict);
  await assert.rejects(store.finishSetup({...target,deployBlockHash:`0x${'44'.repeat(32)}`}),StateConflict);
  assert.equal((await store.target()).deployBlockHash,target.deployBlockHash);
});

test('database publishing requires an admin session even in open demo; reads are public and identity-scoped',async t=>{
  const db=await fixture(t); await bind(db); await fund(db); const fake=fakeChain();
  const app=buildApp(loadConfig({DEMO_OPEN_ACCESS:'true',PAYOUT_PIN_ADMIN:'admin-test',PAYOUT_PIN_MENTOR:'mentor-test'}),
    {database:db,publicationChain:()=>fake.chain,model:null,paypal:null,chain:null}); t.after(()=>app.close());
  assert.equal((await app.inject({url:'/api/ledger/status'})).json().publicationMode,'staff');
  assert.equal((await app.inject({method:'POST',url:'/api/ledger/publish-live'})).statusCode,401);
  const unlock=async(approver:string)=> (await app.inject({method:'POST',url:'/api/ngo/unlock',payload:{approver,pin:`${approver}-test`}})).json().token;
  const mentor=await unlock('mentor');
  assert.equal((await app.inject({method:'POST',url:'/api/ledger/publish-live',headers:{authorization:`Bearer ${mentor}`}})).statusCode,401);
  const admin=await unlock('admin'),headers={authorization:`Bearer ${admin}`};
  const published=await app.inject({method:'POST',url:'/api/ledger/publish-live',headers});
  assert.equal(published.statusCode,200); assert.equal(published.json().job.state,'confirmed');
  assert.equal(published.json().job.raw,undefined); assert.equal(published.json().identity.raw,undefined);
  const id=published.json().job.id;
  const proof=await app.inject({url:`/api/ledger/jobs/${id}`}); assert.equal(proof.statusCode,200);
  assert.equal(proof.json().job.receipts[0].paypalId,undefined);
  assert.equal((await app.inject({method:'POST',url:`/api/ledger/jobs/${id}/resume`})).statusCode,401);
  assert.equal((await app.inject({url:'/api/ledger/batches/101?chainId=84532'})).statusCode,409);
  assert.equal((await app.inject({url:'/api/ledger/batches/101?contract=bad'})).statusCode,400);
  const scoped=await app.inject({url:`/api/ledger/batches/101?chainId=31337&contract=${target.contract}`});
  assert.equal(scoped.json().batch.identity.contract,target.contract);
  const sample=await app.inject({method:'POST',url:'/api/ledger/publish',headers,payload:{batchId:1,receipts:sampleReceipts}});
  assert.equal(sample.statusCode,200); assert.equal(sample.json().job.kind,'sample');
  assert.equal((await app.inject({method:'POST',url:'/api/ngo/lock',headers,payload:{}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:`/api/ledger/jobs/${id}/resume`,headers,payload:{}})).statusCode,401);
});

test('real Postgres: publisher claims and receipt ownership coordinate independent pools', {skip:!process.env.SPROUT_TEST_DATABASE_URL},async t=>{
  const a=createDatabase(process.env.SPROUT_TEST_DATABASE_URL!), b=createDatabase(process.env.SPROUT_TEST_DATABASE_URL!);
  t.after(async()=>{await a.close();await b.close();});
  assert.equal((await a.query<{exists:string|null}>("SELECT to_regclass('public.sprout_migrations')::text AS exists")).rows[0].exists,null,'Use an empty disposable database.');
  await migrate(a); await bind(a); await fund(a);
  const stores=[createPublicationStore(a),createPublicationStore(b)];
  const claims=await Promise.allSettled(stores.map(s=>s.claim('live')));
  assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);
  const winner=claims.find(r=>r.status==='fulfilled'); assert.ok(winner?.status==='fulfilled');
  await a.query("UPDATE sprout_ledger_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",[winner.value.job.id]);
  const fake=fakeChain(); const completed=await createPublisher(stores[1],()=>fake.chain).run('live',winner.value.job.id);
  assert.equal(completed.state,'confirmed'); assert.equal(fake.sent.length,1);
  assert.equal((await createPostgresPayments(a).all())[0].batchId,101);
  assert.equal((await a.query<{count:number}>('SELECT count(*)::integer count FROM sprout_ledger_jobs')).rows[0].count,1);
});

test('real chain: saved deployment and exact signed publication survive fresh drivers', {skip:!process.env.SPROUT_TEST_LEDGER_RPC},async t=>{
  const rpc=process.env.SPROUT_TEST_LEDGER_RPC!;
  assert.ok(isLocal(rpc),'This check may only use its disposable local test node.');
  const db=await fixture(t), store=createPublicationStore(db);
  const config=loadConfig({CHAIN_RPC_URL:rpc,LEDGER_CHAIN_ID:'31337'}), {reader}=fixedClients(config);
  const mine=()=>reader.request({method:'evm_mine'} as never);
  const prepared=await prepareDeployment(config), saved=await store.saveSetup(prepared);
  assert.equal(saved.deployHash,prepared.deployHash);
  await reader.sendRawTransaction({serializedTransaction:saved.raw!}); await mine();
  const identity=await deploymentIdentity(config,saved); assert.ok(identity);
  await store.finishSetup(identity); await fund(db);
  const first=await createPublisher(store,target=>createFixedLedgerChain(config,target)).run('live');
  assert.equal(first.state,'submitted'); assert.ok(first.hash);
  const signed=(await store.get(first.id))!; assert.ok(signed.raw); assert.equal(keccak256(signed.raw),first.hash);
  await mine();
  const recovered=await createPublisher(createPublicationStore(db),target=>createFixedLedgerChain(config,target)).run('live',first.id);
  assert.equal(recovered.id,first.id); assert.equal(recovered.state,'confirmed'); assert.equal(recovered.hash,first.hash);
  assert.equal(recovered.result!.root,recovered.input.root); assert.equal(recovered.result!.tx!.status,'success');
  assert.equal((await createPostgresPayments(db).all())[0].batchId,101);
  const nonce=await reader.getTransactionCount({address:identity.publisher,blockTag:'pending'});
  await createPublisher(store,target=>createFixedLedgerChain(config,target)).run('live',first.id);
  assert.equal(await reader.getTransactionCount({address:identity.publisher,blockTag:'pending'}),nonce);
  await assert.rejects(createFixedLedgerChain(config,{...identity,deployBlockHash:`0x${'ff'.repeat(32)}`}).validate());
  assert.throws(()=>createFixedLedgerChain({...config,LEDGER_CHAIN_ID:84532},identity));
});
