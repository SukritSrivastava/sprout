# Receipt verification

The ledger records a fingerprint of a batch. The browser can rebuild that fingerprint from receipts and compare it with the contract. It detects edits made after publication; it does not prove that an NGO activity happened or that a payout was used well.

## Receipt format

Each leaf hashes this UTF-8 text with SHA-256:

```text
leaf:v2|id|type|amount|currency|date|ref
```

`type` is donation, reward or payout. Amounts are whole INR for sample receipts or whole USD for PayPal sandbox receipts. Currency participates in the hash, and a batch cannot mix units. PayPal references are salted codes; provider IDs and personal names are excluded from the hash input.

Pairs of leaf hashes become `SHA256("node:" + left + right)`. An odd final hash pairs with itself. Repeating this produces one root. A proof contains the sibling hashes needed to rebuild that root from a receipt. Browser and server implementations have parity tests.

## Publishing

`POST /api/ledger/publish` accepts only sample batch 1 and the exact server-owned sample receipt list. `POST /api/ledger/publish-live` selects up to 64 unpublished, settled PayPal receipts: completed donations and payouts whose status is `SUCCESS`. Live receipt batches start at 101.

The server computes the root and totals. The file backend uses a per-process publication queue;
the shared backend uses durable jobs described below. `ImpactLedger.sol` accepts writes only
from its publisher and refuses replacement of an existing batch. After a live publish, the
server checks the returned batch against its input before marking receipts published.

The explorer reads transaction and block details from the selected test chain. Base Sepolia
transactions link to its public explorer. Verification compares the calculated proof with the
stored root and, in shared mode, checks chain/contract identity. Editing an amount or supplying
another contract's proof fails verification. See the [API contract](mentor-api.md#ledger).

## Shared publication lifecycle

Schema 2 stores one fixed ledger target and its deployment intent. Operator setup validates
creation bytecode, publisher, chain, address and canonical deployment block/hash. Runtime reads
and writes validate that identity; they never discover or deploy a replacement. See
[setup](SETUP.md#fixed-shared-ledger-setup) and [ADR-003](ADR-003-DURABLE-LEDGER.md).

An admin publication action creates or resumes a job. Live jobs freeze up to 64 settled receipt
snapshots and reserve their IDs in the same transaction. They exclude pending, failed, unknown
and already reserved payments. Later payment-status changes cannot change this snapshot.
Refunds still correct current payment reports; historical proof bytes remain unchanged.

The publisher prepares a signed transaction, saves those exact bytes and its hash, then sends
it. A 90-second lease and owner token coordinate separate API instances. A lost RPC reply or
database result save leaves that same job recoverable. A new worker checks the saved hash and
resubmits identical bytes only when needed. It never signs a replacement or allocates a fresh
batch for an uncertain send.

After two canonical blocks, the transaction must have succeeded and the contract must hold
the exact saved root, totals and count. Only then are publication markers saved atomically.
A revert or conflicting batch stops the job for review without marking receipts published.
Two confirmations are a demo policy, not protection against every deeper reorganization.

Each API attempt is bounded and may return 202. Staff use **Check saved publication** to
continue after a slow chain or interrupted request; no background worker is assumed. Reads
never trigger submission. Admin credentials stay in memory and must be re-entered after reload
or expiry. Viewing jobs and proofs stays public, including while judge access is open.

Status and batch responses include fixed identity; saved job responses include the snapshot
and transaction hash but exclude signed bytes and provider IDs. Batch reads can be scoped to
the observed chain ID and contract. The newest-100 receipt table has a full-history pending
count, and each publish action selects at most 64 receipts.

## Local lifecycle and limits

`npm run dev` starts Hardhat at port 8545. The server uses local test account 0 and deploys the compiled `chain/build/ImpactLedger.json` when needed. No visitor wallet or real ETH is required. `npm run build -w chain` recompiles/exports the artifact; `npm test -w chain` runs Solidity tests.

A Hardhat restart erases its chain. Payment JSON persists separately, including publication markers. Reconciling those markers with a reset chain is an unresolved issue: do not delete payment records to work around it. The local queue also cannot coordinate multiple API instances or repair every lost-response case.

Base Sepolia is the approved public test target. The fixed shared implementation is locally
verified, while public RPC/funding, hosted configuration and preview validation remain pending.
Never use Hardhat's public development key on a public network. Database mode accepts only
loopback chain 31337 or Base Sepolia 84532; remote legacy auto-deployment is refused.
