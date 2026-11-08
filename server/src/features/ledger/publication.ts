import type { BatchInput, StoredBatch } from './chain.js';
import type { Receipt } from './merkle.js';

export type LedgerIdentity = {
  chainId: number; contract: `0x${string}`; publisher: `0x${string}`;
  deployHash: `0x${string}`; deployBlock: number; deployBlockHash: `0x${string}`;
};
export type SetupIntent = Omit<LedgerIdentity,'deployBlock'|'deployBlockHash'> & { raw: `0x${string}` | null };
export type SignedPublication = { raw: `0x${string}`; hash: `0x${string}` };
export type PublicationJob = {
  id: string; kind: 'sample'|'live'; chainId: number; contract: string;
  input: BatchInput; receipts: Receipt[]; state: 'prepared'|'signed'|'submitted'|'confirmed'|'blocked';
  raw: `0x${string}` | null; hash: `0x${string}` | null; result: StoredBatch | null;
};
export interface PublicationChain {
  identity: LedgerIdentity;
  validate(): Promise<void>;
  prepare(input: BatchInput): Promise<SignedPublication>;
  broadcast(transaction: SignedPublication): Promise<void>;
  outcome(hash: `0x${string}`): Promise<'pending'|'success'|'reverted'>;
  readBatch(id: number, hash?: `0x${string}`): Promise<StoredBatch|null>;
}
export const sameBatch = (a: BatchInput,b: BatchInput) =>
  (['batchId','root','donated','rewarded','paidOut','receipts'] as const).every((key) => a[key]===b[key]);
export const publicJob = ({ raw:_,...job }: PublicationJob) => job;
