// Talks to the blockchain that holds the public impact ledger, using the viem library.
//
// By default this is the LOCAL TEST CHAIN that `npm run dev` starts (Hardhat, on port 8545):
// a real Ethereum chain that lives only on this laptop. Its "wallet" is Hardhat's built-in test
// account #0, which is pre-loaded with fake ETH. That key is public (every Hardhat user has it),
// so it's only ever allowed on a local chain.
//
// This adapter serves the file-mode local demo. Shared/public deployments use fixed-chain.ts
// and explicit database-backed setup; API requests never deploy a public contract.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEventLogs,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Config } from '../../config.js';

// The compiled contract (made by `npm run build -w chain`).
export const contract = JSON.parse(
  readFileSync(new URL('../../../../chain/build/ImpactLedger.json', import.meta.url), 'utf8'),
) as { abi: readonly unknown[]; bytecode: `0x${string}` };
const abi = contract.abi as any;

// Hardhat's public test account #0. Fake money, local chain only.
export const HARDHAT_TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export type BatchInput = {
  batchId: number;
  root: string; // 64 hex characters
  donated: number;
  rewarded: number;
  paidOut: number;
  receipts: number;
};

// What the website's mini block explorer shows about one transaction.
export type TxDetails = {
  hash: Hash;
  blockNumber: number;
  blockHash: Hash;
  timestamp: number; // seconds since 1970
  from: Address;
  to: Address;
  gasUsed: number;
  feeEth: string; // the (fake) ETH the publisher paid for this transaction
  status: 'success' | 'reverted';
};

export type StoredBatch = BatchInput & { publishedAt: number; tx: TxDetails | null };

export interface LedgerChain {
  // `contract` is null until the first publish deploys it.
  status(): Promise<{ chainId: number; blockNumber: number; contract: Address | null; publisher: Address; local: boolean }>;
  publish(batch: BatchInput): Promise<{ batch: StoredBatch; alreadyPublished: boolean }>;
  readBatch(batchId: number): Promise<StoredBatch | null>;
}

export const isLocal = (value: string) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password;
};

export function createLedgerChain(config: Config): LedgerChain {
  const local = isLocal(config.CHAIN_RPC_URL);
  const key = config.PUBLISHER_PRIVATE_KEY ?? (local ? HARDHAT_TEST_KEY : undefined);
  if (!key) throw new Error('PUBLISHER_PRIVATE_KEY is required for a non-local chain.');
  if (!local && key === HARDHAT_TEST_KEY) throw new Error('The public Hardhat test key must never be used off your laptop.');
  if (!local) throw new Error('Public ledgers require shared storage and explicit fixed-contract setup.');

  const account = privateKeyToAccount(key as `0x${string}`);
  const transport = http(config.CHAIN_RPC_URL, { timeout: 8000, retryCount: 0 });
  const reader = createPublicClient({ transport });
  const writer = createWalletClient({ account, transport });

  // The contract is deployed by the first PUBLISH (never by a read, so reading costs no fees).
  // A local chain forgets everything when it restarts, so we check the contract is still there.
  // The address and its deploy block are remembered in chain/deployments/<chain id>.json
  // (git-ignored), so restarting the server finds the same contract and its earlier batches.
  let address: Address | null = null;
  let deployBlock = 0n; // searching for batch announcements starts here, not at block 0
  let deploying: Promise<Address> | null = null; // so two requests at once deploy only one copy
  const savedFile = (chainId: number) => new URL(`../../../../chain/deployments/${chainId}.json`, import.meta.url);
  async function existingContract(): Promise<Address | null> {
    if (address && (await reader.getCode({ address }))) return address;
    address = null;
    batchCache.clear(); // the chain was restarted: forget what it held
    const { id } = await chainInfo();
    if (existsSync(savedFile(id))) {
      const saved = JSON.parse(readFileSync(savedFile(id), 'utf8')) as { address: Address; deployBlock?: string };
      if (await reader.getCode({ address: saved.address })) {
        deployBlock = BigInt(saved.deployBlock ?? 0);
        return (address = saved.address);
      }
    }
    return null;
  }
  async function contractAddress(): Promise<Address> {
    const found = await existingContract();
    if (found) return found;
    deploying ??= (async () => {
      const chain = await chainInfo();
      const hash = await writer.deployContract({ abi, bytecode: contract.bytecode, chain, account });
      const receipt = await reader.waitForTransactionReceipt({ hash });
      address = receipt.contractAddress!;
      deployBlock = receipt.blockNumber;
      batchCache.clear();
      mkdirSync(new URL('../../../../chain/deployments/', import.meta.url), { recursive: true });
      writeFileSync(savedFile(chain.id), `${JSON.stringify({ address, deployTx: hash, deployBlock: String(deployBlock) }, null, 2)}\n`);
      return address;
    })().finally(() => {
      deploying = null;
    });
    return deploying;
  }

  // viem needs to know which chain it's writing to; we read the id from the node itself.
  let chainCache: any = null;
  async function chainInfo() {
    if (chainCache) return chainCache;
    const id = await reader.getChainId();
    if (key === HARDHAT_TEST_KEY && id !== 31337) {
      throw new Error('The public Hardhat test key is only allowed on chain 31337.');
    }
    chainCache = {
      id,
      name: local ? 'Local test chain' : `Chain ${id}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.CHAIN_RPC_URL] } },
    };
    return chainCache;
  }

  async function txDetails(hash: Hash): Promise<TxDetails> {
    const receipt = await reader.getTransactionReceipt({ hash });
    const block = await reader.getBlock({ blockHash: receipt.blockHash });
    return {
      hash,
      blockNumber: Number(receipt.blockNumber),
      blockHash: receipt.blockHash,
      timestamp: Number(block.timestamp),
      from: receipt.from,
      to: receipt.to ?? (address as Address),
      gasUsed: Number(receipt.gasUsed),
      feeEth: formatEther(receipt.gasUsed * receipt.effectiveGasPrice),
      status: receipt.status,
    };
  }

  // Finds the transaction that published a batch by searching the contract's announcements.
  async function findPublishTx(contractAt: Address, batchId: number): Promise<Hash | null> {
    const logs = await reader.getContractEvents({
      address: contractAt,
      abi,
      eventName: 'BatchPublished',
      args: { batchId: BigInt(batchId) },
      fromBlock: deployBlock,
    });
    return (logs[0]?.transactionHash as Hash) ?? null;
  }

  // Published batches never change, so each is read from the chain once, then remembered.
  const batchCache = new Map<number, StoredBatch>();
  async function readBatch(batchId: number): Promise<StoredBatch | null> {
    const contractAt = await existingContract();
    if (!contractAt) return null; // nothing deployed yet, so nothing published yet
    const cached = batchCache.get(batchId);
    if (cached) return cached;
    const [root, publishedAt, donated, rewarded, paidOut, receipts] = (await reader.readContract({
      address: contractAt,
      abi,
      functionName: 'batches',
      args: [BigInt(batchId)],
    })) as [Hash, bigint, bigint, bigint, bigint, number];
    if (publishedAt === 0n) return null;
    const hash = await findPublishTx(contractAt, batchId);
    const batch: StoredBatch = {
      batchId,
      root: root.slice(2),
      publishedAt: Number(publishedAt),
      donated: Number(donated),
      rewarded: Number(rewarded),
      paidOut: Number(paidOut),
      receipts: Number(receipts),
      tx: hash ? await txDetails(hash) : null,
    };
    if (batchCache.size > 1000) batchCache.clear();
    batchCache.set(batchId, batch);
    return batch;
  }

  // Writes from one wallet must go one at a time: each transaction needs the next number
  // ("nonce"), and two at once would grab the same number and one would be rejected.
  let writeQueue: Promise<unknown> = Promise.resolve();
  const oneAtATime = <T>(work: () => Promise<T>): Promise<T> => {
    const run = writeQueue.then(work, work);
    writeQueue = run.catch(() => undefined);
    return run;
  };

  return {
    async status() {
      const contractAt = await existingContract();
      const chain = await chainInfo();
      return {
        chainId: chain.id,
        blockNumber: Number(await reader.getBlockNumber()),
        contract: contractAt,
        publisher: account.address,
        local,
      };
    },

    publish: (batch) => oneAtATime(async () => {
      const existing = await readBatch(batch.batchId);
      if (existing) {
        if (['root', 'donated', 'rewarded', 'paidOut', 'receipts'].some((field) =>
          existing[field as keyof BatchInput] !== batch[field as keyof BatchInput])) {
          throw new Error('Batch id already contains different receipts.');
        }
        return { batch: existing, alreadyPublished: true };
      }
      const contractAt = await contractAddress();
      const hash = await writer.writeContract({
        address: contractAt,
        abi,
        functionName: 'publishBatch',
        args: [
          BigInt(batch.batchId),
          `0x${batch.root}`,
          BigInt(batch.donated),
          BigInt(batch.rewarded),
          BigInt(batch.paidOut),
          batch.receipts,
        ],
        chain: await chainInfo(),
        account,
      });
      const receipt = await reader.waitForTransactionReceipt({ hash });
      // Make sure the contract really announced it (a failed transaction wouldn't).
      parseEventLogs({ abi, logs: receipt.logs, eventName: 'BatchPublished' });
      return { batch: (await readBatch(batch.batchId))!, alreadyPublished: false };
    }),

    readBatch,
  };
}
