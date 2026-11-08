import {
  createPublicClient,createWalletClient,defineChain,encodeFunctionData,formatEther,
  getContractAddress,http,keccak256,TransactionReceiptNotFoundError,type Abi,type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Config } from '../../config.js';
import { StateConflict } from '../../shared/storage/database.js';
import { contract,HARDHAT_TEST_KEY,isLocal,type BatchInput,type StoredBatch,type TxDetails } from './chain.js';
import type { LedgerIdentity,PublicationChain,SetupIntent } from './publication.js';

const abi=contract.abi as Abi;
const equal=(a:string|null|undefined,b:string) => a?.toLowerCase()===b.toLowerCase();

export function fixedClients(config:Config) {
  const local=isLocal(config.CHAIN_RPC_URL);
  if (config.LEDGER_CHAIN_ID!==(local?31337:84532)) throw new Error('The ledger must use local chain 31337 or Base Sepolia 84532.');
  if (!local && new URL(config.CHAIN_RPC_URL).protocol!=='https:') throw new Error('Public ledger RPC must use HTTPS.');
  const key=config.PUBLISHER_PRIVATE_KEY??(local?HARDHAT_TEST_KEY:undefined);
  if (!local && key?.toLowerCase()===HARDHAT_TEST_KEY) throw new Error('The public Hardhat test key is forbidden on public networks.');
  const account=key?privateKeyToAccount(key as Hex):undefined;
  const chain=defineChain({ id:config.LEDGER_CHAIN_ID,name:local?'Local test chain':'Base Sepolia',
    nativeCurrency:{ name:'Ether',symbol:'ETH',decimals:18 },rpcUrls:{ default:{ http:[config.CHAIN_RPC_URL] } } });
  const transport=http(config.CHAIN_RPC_URL,{ timeout:3000,retryCount:0 });
  return { local,account,chain,reader:createPublicClient({ chain,transport }),writer:createWalletClient({ chain,transport,account }) };
}

export async function deploymentIdentity(config:Config,intent:SetupIntent):Promise<LedgerIdentity|null> {
  const { reader,chain }=fixedClients(config);
  if (await reader.getChainId()!==chain.id || intent.chainId!==chain.id) throw new Error('Ledger chain identity mismatch.');
  let receipt;
  try { receipt=await reader.getTransactionReceipt({ hash:intent.deployHash }); }
  catch (error) { if (error instanceof TransactionReceiptNotFoundError) return null; throw error; }
  const transaction=await reader.getTransaction({ hash:intent.deployHash });
  if (receipt.status!=='success' || !equal(receipt.contractAddress,intent.contract) || !equal(receipt.from,intent.publisher) ||
      transaction.to!==null || transaction.input.toLowerCase()!==contract.bytecode.toLowerCase()) throw new Error('Ledger deployment mismatch.');
  if ((await reader.getBlockNumber({ cacheTime:0 }))<receipt.blockNumber+1n) return null;
  const block=await reader.getBlock({ blockNumber:receipt.blockNumber });
  if (block.hash!==receipt.blockHash || !await reader.getCode({ address:intent.contract }) ||
      !equal(await reader.readContract({ address:intent.contract,abi,functionName:'publisher' }) as string,intent.publisher))
    throw new Error('Ledger contract identity mismatch.');
  return { chainId:intent.chainId,contract:intent.contract,publisher:intent.publisher,deployHash:intent.deployHash,
    deployBlock:Number(receipt.blockNumber),deployBlockHash:receipt.blockHash };
}

export async function prepareDeployment(config:Config):Promise<SetupIntent> {
  const { reader,writer,account,chain }=fixedClients(config);
  if (!account) throw new Error('A dedicated publisher key is required.');
  if (await reader.getChainId()!==chain.id) throw new Error('Ledger RPC chain mismatch.');
  const request=await writer.prepareTransactionRequest({ account,chain,data:contract.bytecode });
  const raw=await writer.signTransaction(request);
  return { chainId:chain.id,publisher:account.address,contract:getContractAddress({ from:account.address,nonce:BigInt(request.nonce) }),
    deployHash:keccak256(raw),raw };
}

export function createFixedLedgerChain(config:Config,identity:LedgerIdentity):PublicationChain {
  const { reader,writer,account,chain }=fixedClients(config);
  let validated:Promise<void>|undefined;
  const validate=() => validated??= (async () => {
    if (identity.chainId!==chain.id || (account && !equal(account.address,identity.publisher)) ||
        (config.LEDGER_CONTRACT_ADDRESS && !equal(config.LEDGER_CONTRACT_ADDRESS,identity.contract)) ||
        (config.LEDGER_DEPLOY_TX && config.LEDGER_DEPLOY_TX!==identity.deployHash)) throw new Error('Configured ledger identity mismatch.');
    const actual=await deploymentIdentity(config,{ ...identity,raw:null });
    if (!actual || actual.deployBlock!==identity.deployBlock || actual.deployBlockHash!==identity.deployBlockHash)
      throw new Error('The fixed ledger deployment is missing or has changed.');
  })();
  const transactionReceipt=async (hash:Hex) => {
    try { return await reader.getTransactionReceipt({ hash }); }
    catch (error) { if (error instanceof TransactionReceiptNotFoundError) return null; throw error; }
  };
  return {
    identity,validate,
    async prepare(batch) {
      if (!account) throw new StateConflict('ledger_publisher_unavailable','The ledger publisher is unavailable.',503);
      const data=encodeFunctionData({ abi,functionName:'publishBatch',args:[BigInt(batch.batchId),`0x${batch.root}`,
        BigInt(batch.donated),BigInt(batch.rewarded),BigInt(batch.paidOut),batch.receipts] });
      const request=await writer.prepareTransactionRequest({ account,chain,to:identity.contract,data });
      const raw=await writer.signTransaction(request);
      return { raw,hash:keccak256(raw) };
    },
    async broadcast(transaction) {
      if (keccak256(transaction.raw)!==transaction.hash) throw new Error('Saved ledger transaction hash mismatch.');
      await reader.sendRawTransaction({ serializedTransaction:transaction.raw });
    },
    async outcome(hash) {
      const receipt=await transactionReceipt(hash);
      if (!receipt) return 'pending';
      if (receipt.status==='reverted') return 'reverted';
      if ((await reader.getBlockNumber({ cacheTime:0 }))<receipt.blockNumber+1n) return 'pending';
      const block=await reader.getBlock({ blockNumber:receipt.blockNumber });
      if (block.hash!==receipt.blockHash) return 'pending';
      return 'success';
    },
    async readBatch(batchId,hash) {
      await validate();
      const [root,publishedAt,donated,rewarded,paidOut,count]=await reader.readContract({ address:identity.contract,
        abi,functionName:'batches',args:[BigInt(batchId)] }) as [Hex,bigint,bigint,bigint,bigint,number];
      if (publishedAt===0n) return null;
      let tx:TxDetails|null=null;
      if (hash) {
        const receipt=await transactionReceipt(hash);
        if (receipt) {
          const block=await reader.getBlock({ blockNumber:receipt.blockNumber });
          if (block.hash!==receipt.blockHash || !equal(receipt.to,identity.contract)) throw new Error('Ledger transaction identity mismatch.');
          tx={ hash,blockNumber:Number(receipt.blockNumber),blockHash:receipt.blockHash,timestamp:Number(block.timestamp),
            from:receipt.from,to:identity.contract,gasUsed:Number(receipt.gasUsed),
            feeEth:formatEther(receipt.gasUsed*receipt.effectiveGasPrice),status:receipt.status };
        }
      }
      return { batchId,root:root.slice(2),publishedAt:Number(publishedAt),donated:Number(donated),rewarded:Number(rewarded),paidOut:Number(paidOut),receipts:Number(count),tx } satisfies StoredBatch;
    },
  };
}
