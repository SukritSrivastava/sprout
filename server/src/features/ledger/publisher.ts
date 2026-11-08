import { StorageError, StateConflict } from '../../shared/storage/database.js';
import type { PublicationStore } from './postgres.js';
import { publicJob, sameBatch, type PublicationChain } from './publication.js';
import { batchRoot,batchTotals } from './merkle.js';

export function createPublisher(store:PublicationStore,chainFor:(target:Awaited<ReturnType<PublicationStore['target']>>) => PublicationChain) {
  return {
    async run(kind:'sample'|'live',id?:string) {
      const target=await store.target(), chain=chainFor(target);
      await chain.validate();
      const claim=await store.claim(kind,id);
      let current=claim.job;
      const { token }=claim;
      if (!token) return publicJob(current);
      try {
        if (current.chainId!==target.chainId || current.contract.toLowerCase()!==target.contract.toLowerCase() ||
            !sameBatch(current.input,{ batchId:current.input.batchId,root:batchRoot(current.receipts),...batchTotals(current.receipts) })) {
          await store.block(current.id,token);
          return publicJob((await store.get(current.id))!);
        }
        const existing=await chain.readBatch(current.input.batchId,current.hash??undefined);
        if (existing && !sameBatch(existing,current.input)) {
          await store.block(current.id,token);
        } else {
          if (!current.raw || !current.hash) {
            if (existing) { await store.block(current.id,token); return publicJob((await store.get(current.id))!); }
            const transaction=await chain.prepare(current.input);
            // No broadcast may happen before the exact signed bytes and hash are durable.
            await store.saveSigned(current.id,token,transaction);
            current={ ...current,raw:transaction.raw,hash:transaction.hash };
          }
          const { raw,hash }=current;
          if (!raw || !hash) throw new Error('The saved publication transaction is incomplete.');
          let outcome=await chain.outcome(hash);
          if (outcome==='pending') {
            await chain.broadcast({ raw,hash });
            await store.submitted(current.id,token);
            outcome=await chain.outcome(hash);
          }
          if (outcome==='reverted') await store.block(current.id,token);
          if (outcome==='success') {
            const stored=await chain.readBatch(current.input.batchId,hash);
            if (!stored || !sameBatch(stored,current.input) || stored.tx?.hash!==hash || stored.tx.status!=='success') await store.block(current.id,token);
            else await store.confirm(current.id,token,stored);
          }
        }
      } catch (error) {
        if (error instanceof StorageError || error instanceof StateConflict) throw error;
        // An RPC timeout does not establish whether a transaction was accepted. Resume the same job.
      } finally { await store.release(current.id,token); }
      return publicJob((await store.get(current.id))!);
    },
  };
}
