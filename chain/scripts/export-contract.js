// After `hardhat build`, copies just what the server needs (the contract's ABI and bytecode)
// into chain/build/ImpactLedger.json. That file is committed, so the server can deploy the
// contract without compiling Solidity itself.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const artifact = JSON.parse(
  readFileSync(new URL('../artifacts/contracts/ImpactLedger.sol/ImpactLedger.json', import.meta.url), 'utf8'),
);
mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../build/ImpactLedger.json', import.meta.url),
  `${JSON.stringify({ contractName: artifact.contractName, abi: artifact.abi, bytecode: artifact.bytecode }, null, 2)}\n`,
);
console.log('Exported chain/build/ImpactLedger.json');
