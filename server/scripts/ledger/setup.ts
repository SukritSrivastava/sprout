import { loadConfig } from '../../src/config.js';
import { createDatabase,StateConflict } from '../../src/shared/storage/database.js';
import { checkSchema } from '../../src/shared/storage/schema.js';
import { createPublicationStore } from '../../src/features/ledger/postgres.js';
import { createFixedLedgerChain,deploymentIdentity,fixedClients,prepareDeployment } from '../../src/features/ledger/fixed-chain.js';
import { contract } from '../../src/features/ledger/chain.js';
import type { Abi } from 'viem';

let db:ReturnType<typeof createDatabase>|undefined;
async function setupLedger() {
  const config=loadConfig();
  if (!config.DATABASE_URL) throw new Error('Shared storage is required.');
  db=createDatabase(config.DATABASE_URL,config.DATABASE_SSL_CA); await checkSchema(db);
  const store=createPublicationStore(db), { reader,chain,account }=fixedClients(config);
  const completed=await store.target().catch(error=>{
    if(error instanceof StateConflict && error.code==='ledger_setup_required')return null;
    throw error;
  });
  if(completed) {
    await createFixedLedgerChain(config,completed).validate();
    console.log(JSON.stringify({configured:true,...completed}));
    return; // A missing confirmed deployment is never resubmitted onto a reset/replaced chain.
  }
  let intent=await store.setupIntent();
  if (!intent) {
    if (config.LEDGER_CONTRACT_ADDRESS && config.LEDGER_DEPLOY_TX) {
      if (await reader.getChainId()!==chain.id) throw new Error('Wrong RPC chain.');
      const publisher=await reader.readContract({ address:config.LEDGER_CONTRACT_ADDRESS as `0x${string}`,abi:contract.abi as Abi,functionName:'publisher' }) as `0x${string}`;
      const candidate={ chainId:chain.id,contract:config.LEDGER_CONTRACT_ADDRESS as `0x${string}`,publisher,deployHash:config.LEDGER_DEPLOY_TX as `0x${string}`,raw:null };
      const identity=await deploymentIdentity(config,candidate);
      if (!identity) throw new Error('Deployment is not confirmed.');
      intent=await store.saveSetup(candidate);
    } else {
      if (!process.argv.includes('--deploy')) throw new Error('Use explicit --deploy or configure an existing deployment.');
      intent=await store.saveSetup(await prepareDeployment(config));
    }
  }
  if (intent.chainId!==chain.id || (config.LEDGER_CONTRACT_ADDRESS && intent.contract.toLowerCase()!==config.LEDGER_CONTRACT_ADDRESS.toLowerCase()) ||
      (config.LEDGER_DEPLOY_TX && intent.deployHash!==config.LEDGER_DEPLOY_TX)) throw new Error('Saved identity conflicts with settings.');
  if (account && account.address.toLowerCase()!==intent.publisher.toLowerCase()) throw new Error('Publisher key does not match the saved deployment.');
  let identity=await deploymentIdentity(config,intent);
  if (!identity && intent.raw) {
    // Saved before the first network submission. Re-runs send these exact bytes, never a new deployment.
    try { await reader.sendRawTransaction({ serializedTransaction:intent.raw }); } catch { /* May already be accepted. Check the saved hash. */ }
    identity=await deploymentIdentity(config,intent);
  }
  if (!identity) console.log('Deployment intent is saved. Wait for two blocks, then repeat this command to confirm it.');
  else {
    await store.finishSetup(identity);
    console.log(JSON.stringify({ configured:true,...identity })); // Public metadata only.
  }
}
try { await setupLedger(); } catch {
  console.error('Ledger setup did not finish. Check the current schema, RPC chain, dedicated publisher funding and deployment settings. Preserve the database and retry the same setup; no replacement deployment is automatic.');
  process.exitCode=1;
} finally { await db?.close(); }
