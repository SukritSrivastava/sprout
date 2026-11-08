# ADR-003: Durable ledger publication and fixed identity

**Status:** Implemented for local verification; public-chain and hosted validation pending.
**Date:** 2026-11-08

## Context

[ADR-001](ADR-001-HOSTING.md) selects Vercel, Neon and Base Sepolia. [ADR-002](ADR-002-TRANSACTIONAL-STORAGE.md)
adds shared storage but disables database-backed ledger publication. A process queue cannot
coordinate publishers or recover a chain acceptance followed by a lost API/database reply.
Discovering a contract through a local file can also deploy a replacement after a cold start.

## Decision

Use the existing Postgres database for one immutable ledger target, deployment intent and
publication jobs. Migration 2 adds tables without resetting payment, permission or learning data.
The target records chain ID, contract, publisher, deployment transaction, block number and block
hash. Remote use is restricted to Base Sepolia 84532 over HTTPS; local tests use loopback 31337.

Setup is an explicit operator command. `ledger:setup -- --deploy` prepares and saves the signed
deployment before submission. Repeating it reuses the saved transaction. Alternatively, bind
an existing deployment after checking its creation bytecode, address, publisher and receipt.
API startup never creates a deployment. A missing or changed target fails closed. A database
cannot silently switch networks/contracts; use isolated databases or a reviewed migration.

A shared target-row lock creates or claims one unfinished publication. Live jobs snapshot up
to 64 settled receipts and reserve their IDs; sample jobs use only the fixed sample batch.
The root and totals come from that snapshot. A 90-second lease coordinates workers, with token
checks on later saves. Transactions never stay open during RPC calls.

Save the exact signed transaction and its hash before broadcasting. An interrupted worker
resumes the same job, receipt snapshot, batch number, nonce and signed bytes. No automatic
replacement transaction or fee bump is created. Reverted transactions, occupied batch numbers
with different contents, or inconsistent snapshots stop for staff review.

One request performs a bounded recovery attempt and returns 202 while confirmation is pending.
A staff action resumes it; no background task is assumed to survive a Vercel response. Two
canonical blocks plus a matching on-chain batch are required before marking receipts published.
This confirmation policy is not a guarantee against deeper reorganizations. Reads use fixed
contract calls and known transaction hashes rather than unbounded event scans or receipt polling.

Publication requires an unexpired NGO **admin** session, including when judge access is open.
The existing PIN unlock creates that session; credentials stay in component memory. Public
status, job snapshots and proofs remain readable without a wallet or PIN. Responses identify
their chain and contract; scoped reads and browser verification reject a different identity.
Neither raw signed transactions nor provider IDs appear in public jobs.

## Alternatives considered

- Process queues and automatic contract discovery retain the multi-instance/lost-reply defects.
- Saving only a transaction hash leaves a crash window between network submission and saving
  that hash. Saving signed bytes first closes that window and permits identical resubmission.
- A separate queue provider adds infrastructure without changing the need for durable intent,
  ownership and recovery. Request-driven continuation fits this judging prototype.
- Public write access would let visitors spend the publisher's test ETH. Existing admin sessions
  provide authorization without a new account system or a browser-held publisher secret.

## Consequences

The local file/Hardhat demo keeps its existing single-process path. Its chain-reset limitations
remain. Database publication can recover across API instances, while requiring explicit setup
and staff continuation. A dropped or underpriced transaction may need operator investigation;
there is no automatic cancellation/replacement flow. Published snapshots describe receipts at
selection time; later refunds update current payment reports without rewriting historical proofs.

The implementation uses existing `pg` and `viem` dependencies. Public Base Sepolia deployment,
RPC/funding checks, Neon pooling, Vercel packaging/routing and hosted failure tests remain release
gates. [Setup](SETUP.md), [ledger behavior](ledger.md) and [verification](../VERIFICATION.md)
own instructions, runtime details and observed test results.

References: [viem transaction preparation](https://viem.sh/docs/actions/wallet/prepareTransactionRequest),
[signed transaction submission](https://viem.sh/docs/actions/wallet/sendRawTransaction),
[Base chain IDs](https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_chainId).
