import { randomUUID } from 'node:crypto';
import { StateConflict, type Database, type Query } from '../../shared/storage/database.js';
import { batchRoot, batchTotals, type Receipt } from './merkle.js';
import { sampleReceipts } from './sample.js';
import type { LedgerIdentity, SetupIntent, PublicationJob, SignedPublication } from './publication.js';
import type { StoredBatch } from './chain.js';

type TargetRow = { chain_id:number; contract:`0x${string}`; publisher:`0x${string}`; deploy_hash:`0x${string}`;
  deploy_raw:`0x${string}`|null; deploy_block:string|null; deploy_block_hash:`0x${string}`|null; next_batch:number };
type JobRow = { id:string; kind:PublicationJob['kind']; chain_id:number; contract:string; input:PublicationJob['input'];
  receipts:Receipt[]; state:PublicationJob['state']; raw_tx:PublicationJob['raw']; tx_hash:PublicationJob['hash']; result:StoredBatch|null; busy?:boolean };
const job = (r:JobRow):PublicationJob => ({ id:r.id,kind:r.kind,chainId:r.chain_id,contract:r.contract,
  input:r.input,receipts:r.receipts,state:r.state,raw:r.raw_tx,hash:r.tx_hash,result:r.result });
const setup = (r:TargetRow):SetupIntent => ({ chainId:r.chain_id,contract:r.contract,publisher:r.publisher,deployHash:r.deploy_hash,raw:r.deploy_raw });
const sameSetup = (a:SetupIntent,b:SetupIntent) => a.chainId===b.chainId &&
  a.contract.toLowerCase()===b.contract.toLowerCase() && a.publisher.toLowerCase()===b.publisher.toLowerCase() && a.deployHash===b.deployHash;

export function createPublicationStore(db:Database) {
  const targetRow = async (query:Query,lock=false) => (await query<TargetRow>(
    `SELECT * FROM sprout_ledger_target WHERE singleton${lock?' FOR UPDATE':''}`)).rows[0];
  const ready = (r:TargetRow|undefined):LedgerIdentity => {
    if (!r || r.deploy_block===null || !r.deploy_block_hash)
      throw new StateConflict('ledger_setup_required','The ledger publisher has not completed its one-time setup.',503);
    return { chainId:r.chain_id,contract:r.contract,publisher:r.publisher,deployHash:r.deploy_hash,
      deployBlock:Number(r.deploy_block),deployBlockHash:r.deploy_block_hash };
  };
  const find = async (query:Query,id:string) => {
    const { rows:[r] } = await query<JobRow>('SELECT *,lease_until>now() AS busy FROM sprout_ledger_jobs WHERE id=$1',[id]);
    return r;
  };
  const owned = async (query:Query,id:string,token:string) => {
    const { rows:[r] } = await query<JobRow>(`SELECT * FROM sprout_ledger_jobs
      WHERE id=$1 AND lease_token=$2 AND lease_until>now() FOR UPDATE`,[id,token]);
    if (!r) throw new StateConflict('ledger_claim_lost','This publication is owned by another recovery. Refresh its status.');
    return r;
  };
  return {
    async setupIntent() { const r=await targetRow(db.query); return r?setup(r):null; },
    async saveSetup(intent:SetupIntent) {
      return db.transaction(async (query) => {
        await query(`INSERT INTO sprout_ledger_target(singleton,chain_id,contract,publisher,deploy_hash,deploy_raw)
          VALUES (true,$1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [intent.chainId,intent.contract.toLowerCase(),intent.publisher.toLowerCase(),intent.deployHash,intent.raw]);
        const current=setup((await targetRow(query,true))!);
        // A competing setup may have prepared different bytes. Only the saved intent may be sent.
        if (current.chainId!==intent.chainId || current.publisher.toLowerCase()!==intent.publisher.toLowerCase())
          throw new StateConflict('ledger_identity_conflict','This database is already bound to another ledger publisher or chain.');
        return current;
      });
    },
    async finishSetup(identity:LedgerIdentity) {
      await db.transaction(async (query) => {
        const r=await targetRow(query,true);
        if (!r || !sameSetup(setup(r),{ ...identity,raw:null }))
          throw new StateConflict('ledger_identity_conflict','The deployment does not match the saved ledger identity.');
        if (r.deploy_block!==null && (Number(r.deploy_block)!==identity.deployBlock || r.deploy_block_hash!==identity.deployBlockHash))
          throw new StateConflict('ledger_identity_conflict','The deployment block changed. Existing ledger history was preserved.');
        await query('UPDATE sprout_ledger_target SET deploy_block=$1,deploy_block_hash=$2 WHERE singleton',
          [identity.deployBlock,identity.deployBlockHash]);
      });
    },
    async target() { return ready(await targetRow(db.query)); },
    async get(id:string) { const r=await find(db.query,id); return r?job(r):null; },
    async forBatch(id:number) {
      const { rows:[r] }=await db.query<JobRow>('SELECT * FROM sprout_ledger_jobs WHERE batch_id=$1',[id]);
      return r?job(r):null;
    },
    async overview() {
      const { rows:[r] }=await db.query<{ count:number }>(`SELECT count(*)::integer count FROM sprout_receipts r
        WHERE r.batch_id IS NULL AND ((r.type='donation' AND r.status='COMPLETED') OR (r.type='payout' AND r.status='SUCCESS'))
        AND NOT EXISTS (SELECT 1 FROM sprout_ledger_job_receipts j WHERE j.receipt_id=r.id)`);
      const { rows:[active] }=await db.query<JobRow>("SELECT * FROM sprout_ledger_jobs WHERE state<>'confirmed' ORDER BY created_at LIMIT 1");
      return { pendingCount:r.count,active:active?job(active):null };
    },
    async claim(kind:'sample'|'live',id?:string) {
      return db.transaction(async (query) => {
        const target=await targetRow(query,true), identity=ready(target);
        let current=id?await find(query,id):undefined;
        if (id && !current) throw new StateConflict('unknown_publication','No publication job with that code.',404);
        if (!current && kind==='sample') current=(await query<JobRow>('SELECT *,lease_until>now() AS busy FROM sprout_ledger_jobs WHERE batch_id=1')).rows[0];
        if (!current) {
          current=(await query<JobRow>("SELECT *,lease_until>now() AS busy FROM sprout_ledger_jobs WHERE state<>'confirmed' ORDER BY created_at LIMIT 1")).rows[0];
          if (current && current.kind!==kind) throw new StateConflict('ledger_busy','Resume the unfinished publication before starting another batch.');
        }
        if (!current) {
          // Payment mutations use this same lock. Select settled receipts and reserve their job together.
          await query('SELECT singleton FROM sprout_payment_meta WHERE singleton FOR UPDATE');
          let receipts:Receipt[]=sampleReceipts;
          if (kind==='live') {
            const { rows }=await query<{ id:string; type:'donation'|'payout'; cents:number; currency:'USD'; date:string; ref:string }>(`
              SELECT r.* FROM sprout_receipts r WHERE r.batch_id IS NULL
              AND ((r.type='donation' AND r.status='COMPLETED') OR (r.type='payout' AND r.status='SUCCESS'))
              AND NOT EXISTS (SELECT 1 FROM sprout_ledger_job_receipts j WHERE j.receipt_id=r.id)
              ORDER BY r.created_at,r.id LIMIT 64`);
            receipts=rows.map(({ cents,...r }) => ({ id:r.id,type:r.type,amount:cents/100,currency:r.currency,date:r.date,ref:r.ref }));
          }
          if (!receipts.length) throw new StateConflict('nothing_to_publish','No new settled PayPal receipts to publish yet.');
          if (receipts.some((r) => !Number.isSafeInteger(r.amount))) throw new StateConflict('ledger_amount_invalid','This ledger supports whole currency units only. Review the saved receipts.');
          const batchId=kind==='sample'?1:target!.next_batch;
          const input={ batchId,root:batchRoot(receipts),...batchTotals(receipts) };
          const made=await query<JobRow>(`INSERT INTO sprout_ledger_jobs(id,kind,chain_id,contract,batch_id,input,receipts)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) RETURNING *`,
            [`JOB-${randomUUID()}`,kind,identity.chainId,identity.contract,batchId,JSON.stringify(input),JSON.stringify(receipts)]);
          current=made.rows[0];
          if (kind==='live') {
            for (const receipt of receipts) await query('INSERT INTO sprout_ledger_job_receipts(receipt_id,job_id) VALUES ($1,$2)',[receipt.id,current.id]);
            await query('UPDATE sprout_ledger_target SET next_batch=next_batch+1 WHERE singleton');
          }
        }
        if (current.state==='confirmed' || current.state==='blocked') return { job:job(current),token:null };
        if (current.busy) throw new StateConflict('ledger_busy','This publication is being processed. Check its status shortly.');
        const token=randomUUID();
        await query("UPDATE sprout_ledger_jobs SET lease_token=$2,lease_until=now()+interval '90 seconds' WHERE id=$1",[current.id,token]);
        return { job:job(current),token };
      });
    },
    async saveSigned(id:string,token:string,transaction:SignedPublication) {
      await db.transaction(async (query) => {
        const r=await owned(query,id,token);
        if (r.raw_tx && (r.raw_tx!==transaction.raw || r.tx_hash!==transaction.hash))
          throw new StateConflict('ledger_transaction_conflict','This publication already has a different saved transaction.');
        await query("UPDATE sprout_ledger_jobs SET raw_tx=$3,tx_hash=$4,state='signed' WHERE id=$1 AND lease_token=$2",[id,token,transaction.raw,transaction.hash]);
      });
    },
    async submitted(id:string,token:string) {
      await db.transaction(async (query) => { await owned(query,id,token);
        await query("UPDATE sprout_ledger_jobs SET state='submitted' WHERE id=$1 AND lease_token=$2",[id,token]); });
    },
    async block(id:string,token:string) {
      await db.transaction(async (query) => { await owned(query,id,token);
        await query("UPDATE sprout_ledger_jobs SET state='blocked' WHERE id=$1 AND lease_token=$2",[id,token]); });
    },
    async confirm(id:string,token:string,result:StoredBatch) {
      await db.transaction(async (query) => {
        const r=await owned(query,id,token);
        await query("UPDATE sprout_ledger_jobs SET state='confirmed',result=$3::jsonb WHERE id=$1 AND lease_token=$2",[id,token,JSON.stringify(result)]);
        if (r.kind==='live') await query(`UPDATE sprout_receipts SET batch_id=$2 WHERE id IN
          (SELECT receipt_id FROM sprout_ledger_job_receipts WHERE job_id=$1)`,[id,r.input.batchId]);
      });
    },
    async release(id:string,token:string) {
      await db.query('UPDATE sprout_ledger_jobs SET lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2',[id,token]);
    },
  };
}
export type PublicationStore=ReturnType<typeof createPublicationStore>;
