# Deployment audit: Vercel website and API

**Date:** 2026-11-06. **Application baseline:** `b4429e6`.

**Current hosting:** the user changed the target to Render API, Vercel website and Supabase on
2026-11-08; [ADR-005](docs/ADR-005-RENDER-VERCEL-SUPABASE.md) supersedes the provider choice in
this historical audit. Shared-state, privacy, transaction and recovery findings still apply.
The obsolete Vercel API config has been removed; use the current [setup](docs/SETUP.md#render-vercel-and-supabase).
**Verdict:** Do not deploy this version unchanged. Vercel + Neon + Base Sepolia is viable;
the current files and process-local state cannot safely act as shared cloud records.

This audit records issues and repairs needed, not a completed database migration or hosted
validation. See [the accepted hosting decision](docs/ADR-001-HOSTING.md) and
[the release checklist](docs/DEPLOYMENT_CHECKLIST.md).

This is a historical baseline. Shared storage and durable ledger publication were implemented
later; [verification](VERIFICATION.md) records their local checks and remaining hosted gates.
Source paths and line numbers in the findings retain their original meaning. After the
2026-11-08 feature reorganization, use the [file map](docs/CODE_MAP.md) for current locations.

Vercel project/routing configuration was added on 2026-11-08, with explicit hosted origins,
platform IP handling, no-store API responses and local compiled-artifact checks. D10's real
preview checks and D6's actual function-artifact inclusion remain release gates. See
[setup](docs/SETUP.md#vercel-website-and-api); the historical findings below are retained.

## Scope and evidence

Reviewed application construction/configuration, origins, mentor streaming/privacy, guardian
permission/deletion, learning persistence/rewards, staff sessions, PayPal ordering, capture,
approvals and recovery, ledger publishing, the Solidity contract, client API/payment/learning
helpers, presentation behavior, workspace packaging and test configuration.

A read-only inventory covered 150 source/test/config/artifact files before adding the audit
harness. The relative-import check found no missing targets or case mismatches; the client scan
found no `dangerouslySetInnerHTML`, `eval()` or matching Gemini-key literal. Those limited scans
are not a complete security proof. Generated files, dependencies, private `.env` contents and
ignored payment/learning records were outside the source inventory.

[The audit harness](server/scripts/platform/audit-deployment.ts) reproduces baseline defects with
fake providers, in-memory apps and disposable synthetic files. **Passing these audit checks means
the defects were reproduced, not fixed.** They deliberately live outside the normal regression
suite. From the repository root:

```sh
node --import tsx --test server/scripts/platform/audit-deployment.ts
```

## Fix before a public judging demo

### D1 — P1: startup requires writable application files

**Locations:** `server/src/app.ts:52–58`, `server/src/paypal/store.ts:85–108`,
`server/src/learning/store.ts:45–57`, `server/src/index.ts:7`.

The production entrypoint supplies JSON-file paths. Both stores load whole snapshots and
immediately persist them, before the app error handler is installed. The reproduction confirms
an unusable storage path prevents construction. Vercel's deployment filesystem is read-only;
temporary `/tmp` storage would still lose records and split state between instances.

No Postgres adapter, migrations or `DATABASE_URL` setting exists yet. Move payment and learning
state to Neon, fail closed on DB errors and remove runtime contract-metadata writes too.
Source: [Vercel runtimes](https://vercel.com/docs/functions/runtimes).

### D2 — P1: separate instances can overspend the same pool

**Locations:** `server/src/paypal/store.ts:71–106,177–248`, `server/src/routes/paypal.ts:73–75`.

Two API instances load the same pool once, then reserve/send against independent copies.
The audit seeded one synthetic $50 pool, loaded two apps and approved one $40 request in each.
Both sends returned 200: the fake provider received $80. **No real payment was made.** Local
sets and atomic file renames do not coordinate reservations or prevent stale overwrites.

Use DB uniqueness for order/capture/request/sender IDs and a transaction to reserve the pool
and persist the operation before calling PayPal. Save the result afterward in a new transaction;
do not hold locks over network calls. Preserve stable retry IDs, recipient/amount verification,
reserved `UNKNOWN` results and the existing 29-day retry cutoff. A database holding whole stale
JSON snapshots would retain this bug.

### D3 — P1: stale instances can reverse permission withdrawal

**Locations:** `server/src/learning/store.ts:45–57,90–145`, `server/src/learning/access.ts`.

Revision checks use the local snapshot. Instance B withdrew A12 permission; stale A then accepted
a lesson with the old revision, returned 200 and rewrote the file with permission active again.
Separate ephemeral files would also leave A unaware of B's withdrawal. Browser polling cannot
fix the server-side race. Streaming revocation likewise currently reads local state.

Check permission/revision and save progress in one DB transaction. Withdrawal/deletion must
advance a shared revision atomically. Enforce one reward per learner/lesson and recheck shared
permission before later streamed output. Test races against lessons, NGO reviews and AI output,
including deletion followed by fresh acknowledgement without restoring old progress.

### D4 — P1: staff tokens work on only the issuing instance

**Location:** `server/src/routes/ngo.ts:18,34–35,61`.

Sessions live in a local `Map`. A token issued on A returned 200 on A and 401 on B. Restarts also
forget it. Store short-lived sessions in Postgres, preferably as token hashes, or use securely
signed expiring tokens with a shared revocation strategy. Preserve expiry/role checks and keep
PINs out of browser storage.

### D5 — P1: lockouts and quotas are not shared

**Locations:** `server/src/paypal/pins.ts:21`, `server/src/rate-limit.ts:5`,
`server/src/routes/mentor.ts`, `server/src/routes/paypal.ts` (donation notes).

Five wrong PINs locked A (429), while a correct PIN on B succeeded (200). This shows the lockout
boundary fails, not that an incorrect PIN was accepted. With an hourly AI cap of one, each of
two independently constructed apps still called the model. Scaling/cold starts reset counters;
donation impact notes also bypass the mentor's hourly budget.

Use atomic shared expiring counters for PIN lockouts, route limits and an AI budget covering
both mentor and donation-note calls. Verify real client-IP/proxy behavior on Vercel; blindly
trusting arbitrary forwarded headers is insufficient. Keep a global budget even for varied IPs.

### D6 — P1: contract discovery depends on a local deployment file

**Location:** `server/src/ledger/chain.ts:87–113,198–204`.

The first publish lazily deploys and writes the address/deployment block to ignored
`chain/deployments/<chainId>.json`. That write cannot be durable on Vercel. A cold instance can
find no address and deploy another contract. Separate instances also have separate deployment/
write queues and can conflict on the signing account's nonce.

Deploy one Base Sepolia contract as setup, then store a fixed chain ID, address, transaction
and deployment block durably. Coordinate publisher claims/nonces across instances. Missing or
mismatched identity must disable writes, not create a replacement contract. The ABI/bytecode
file `chain/build/ImpactLedger.json` **is committed**; inclusion across the chosen API project
root remains a preview-build gate, not a confirmed missing-file defect.

### D7 — P1: lost chain replies duplicate immutable batches

**Location:** `server/src/routes/ledger.ts:130–146`.

After batch 101 is accepted but its reply is lost, receipts remain pending. A retry skips occupied
101 and republishes the same root as 102. The fake-chain reproduction confirms both roots match.
Multiple API instances create related races because the route queue is process-local.

Persist a publication intent with receipt IDs, root, totals, chain/contract and batch ID, then
persist the transaction hash through submission. Retry/reconcile that same intent and compare
the existing batch instead of allocating another ID. Use durable leases with recovery so a
function timeout/crash leaves recoverable work.

### D8 — P1 when carrying records: proofs omit chain/contract identity

**Locations:** `server/src/paypal/store.ts:282–298`, `server/src/routes/ledger.ts:130`.

Receipts store only `batchId`. Switching from local Hardhat to an empty public contract leaves
receipts marked published. The reproduction gets `nothing_to_publish`, while the new chain has
no batch 101 and the receipt still advertises 101.

Scope publication membership by chain ID and contract. Preserve local references as old history
and explicitly create public-ledger jobs, or seed a separate synthetic hosted database with a
documented starting state. Never reset payment history or represent local proofs as public ones.

### D9 — P1: anonymous visitors can trigger server signing

**Locations:** `server/src/routes/ledger.ts:52–60,96–146`, `server/src/ledger/chain.ts:123–135`.

Publish routes check origin/rate, but require no staff authorization. An anonymous injected
request used the configured fake publisher successfully. Live publication is also unauthenticated.
This does not permit arbitrary roots: sample content is checked and live receipts are derived
server-side. It does let strangers trigger writes and consume test gas when work is available.
Origin checks do not authenticate scripts. A dedicated configured key also has no expected-84532
check in `chainInfo()`.

Require authorized staff publication or an explicitly bounded server-controlled workflow; budget
and limit it globally. Pin chain ID 84532 and the fixed contract before signing. Keep public
verification reads available. Source: [Base settings](https://docs.base.org/get-started/connect-to-base).

### D10 — P1: production routing and host settings are unfinished

**Locations:** `client/vite.config.js`, `client/src/lib/api.js`, `server/src/config.ts:25–37`,
`server/src/index.ts`, repository workspace layout.

Relative `/api` requests work through Vite's development proxy, which does not configure the
hosted website. There is no committed production rewrite/SPA setup. The repo root is a workspace,
not the API's entrypoint directory. Default origins reject a Vercel website (403 reproduced);
the default RPC still targets localhost:8545.

Configure two Vercel projects: website root `client`, API root `server`. Verify workspace install,
build/output settings and the executable Fastify entrypoint if detection sees both `src/app.ts`
and `src/index.ts`. Forward `/api/*` before SPA fallback; set exact allowed origins, backend-only
provider/DB settings and the public-chain configuration. Verify deep-link refresh, JSON API 404s,
auth/revision headers and streaming through the rewrite.

Fastify and Node readable streams are supported natively. `listen()` alone is not a blocker and
no Next.js rewrite is needed. Sources: [Fastify](https://vercel.com/docs/frameworks/backend/fastify),
[monorepos](https://vercel.com/docs/monorepos), [rewrites](https://vercel.com/docs/routing/rewrites).

## Other actionable defects

### D11 — P2: pruning removes approved payout requests

**Location:** `server/src/paypal/store.ts:191–192`.

The 200-request retention bound treats every request without `receiptId` as unused, including
approved ones. After two approvals and 200 newer requests, the original disappears. Public
request creation and process-local limits make this easier to reach when hosted. Preserve
approved/pending operations; expire abandoned ones by explicit status/age and use shared limits.

### D12 — P2: the newest-100 list hides older pending receipts

**Locations:** `server/src/paypal/store.ts:280–287`, `client/src/previews/LivePayPalReceipts.jsx`.

The client derives pending count/button visibility from the newest 100 receipts. With 101
receipts and the newest 100 published, the backend still has one pending but the UI hides the
publish button. Return a full-history pending count and pagination; distinguish page size from
the 64-receipt publication batch limit.

### D13 — P2: the privacy filter misses exactly seven digits

**Location:** `server/src/mentor/privacy.ts:11`.

The comment promises seven-or-more digit redaction, but `(?:\+?\d[\s-]?){7,}\d` requires at
least eight. `My code is 1234567` remains unchanged before the downstream prompt path. Correct
the boundary with checks for seven digits, separators and short money amounts. Shape filtering
cannot guarantee all personal information is detected.

### D14 — P2: autoplay test budget is too short on this machine

**Location:** `e2e/tour.spec.js:125`.

The full autoplay check advances a 108-second presentation and verifies every route/target,
completion, replay and absence of writes/audio. Its 90-second wall-clock budget expired on
desktop and phone. A diagnostic copy changing only that budget to 180 seconds passed both
checks, without application changes. Give this test sufficient headroom or improve clock
advancement efficiency while retaining all assertions. This is not a confirmed product stall.

## Recovery and preview risks

- **Donation recovery:** `PayPalButton.jsx` retains no order-recovery path across reload. A
  capture can succeed while its reply is lost; another checkout makes a new order. Add a secure
  recovery/status path; a lost browser reply must not be described as proof of failed payment.
- **Payout reconciliation:** status refresh is currently user-triggered. Keep an authenticated
  recovery path for pending/unknown results. Verified idempotent webhooks are an option, not a
  prerequisite if manual reconciliation suffices. Never retry unknown results with fresh IDs.
- **Invocation/RPC bounds:** receipt polling and event searches need total deadlines, durable
  continuation and range pagination. Per-RPC timeouts do not bound a polling loop. No public RPC
  failure was tested here. Hobby Fluid Compute has a 300-second invocation limit including
  streaming. Source: [function limits](https://vercel.com/docs/functions/limitations).
- **Hosted UI:** ledger/explorer labels still describe local Hardhat; error/setup screens tell
  visitors to edit files or start `npm run dev`. Show actual Base Sepolia identity/explorer links,
  sandbox status, useful hosted failures and truthful shared-server storage/privacy words.
- **Shared learners:** A12 is a shared sample gate/garden, not private authenticated learner
  isolation. Use synthetic data, plan initial permission for judges, and define deletion's impact
  on other visitors. Never publish payout-authorizing staff PINs just to unlock learning.
- **Caching and logs:** prevent CDN caching of sessions, permissions, learning and payment
  responses. Verify another browser receives no cached private response. Do not log authorization,
  PINs, provider secrets or learner text. Isolate preview and judging data/keys.
- **DB operations:** use bounded pooling, TLS, migrations and indexes; test outages, contention
  and reconnects. Neon transaction pooling does not support session-level advisory locks; use
  transactional row locks/durable leases. Source: [pooling](https://neon.com/docs/connect/connection-pooling).
- **Build/runtime:** check clean Linux install, selected Node version, production dependencies,
  contract artifact inclusion and streamed `done` on the actual preview. The ~541 KB client
  bundle warning is an optimization, not a deployment blocker.
- **Free quotas:** enforce shared provider budgets and inspect Vercel/Neon/Gemini usage. Free
  does not mean unlimited or guaranteed uptime. Retain runnable instructions through judging.
  Sources: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon Free](https://neon.com/pricing).
- **Presentation verification:** D14 isolates the autoplay failures to the test budget on this
  machine. Both extended-budget diagnostics passed; the original suite is still recorded as
  having two timeouts. Do not describe it as an unqualified green run.

## Verification

| Check | Result | Ignored local evidence |
| --- | --- | --- |
| `npm test` | 143 passed: 24 client, 113 server, 6 Solidity | `qa/deployment-audit-unit.log` |
| `npm run build` | Passed; existing size advisory | `qa/deployment-audit-build.log` |
| Full browser rerun | 229 passed, 2 autoplay timeouts, 9 intentional skips | `qa/deployment-audit-e2e-rerun.log` |
| Focused autoplay diagnostic | Desktop + phone passed with 180-second budget and identical assertions | `qa/deployment-audit-tour-extended.log` |
| Audit harness | 13 defects reproduced; not repaired | `qa/deployment-audit-reproductions.log` |
| Production dependency audit | 0 reported vulnerabilities | `qa/deployment-audit-production-dependencies.json` |
| All dependencies | 3 high package entries through dev-only Hardhat/Zod | `qa/deployment-audit-dependencies.json` |
| Source inventory | 151 files including harness (150 application/test/config files), no import/case faults found | `qa/deployment-audit-source-inventory.json` |

The first browser attempt had 200 passes, 31 failures and 9 skips. Most failures were connection
refusals during a shared local web-server outage; a phone walkthrough also missed a transition.
The fresh full rerun passed that walkthrough and all other cases except the two autoplay checks.
Both autoplay diagnostics passed with a longer test budget; details are in `VERIFICATION.md`.

Browser PayPal fixtures replace provider/SDK replies. This audit made no real PayPal calls, did
not repeat live Gemini evaluation and did not deploy to Vercel/Neon/Base. Local passes do not
validate a shared DB, public RPC or hosted approval flow. Do not force a dependency downgrade
to suppress the dev-only Hardhat advisory without compatibility checks.

## Two-day repair order

1. Postgres schema, payment reservations/idempotency and permission/deletion revisions first;
   then learning uniqueness, shared sessions, lockouts and a common AI budget.
2. Fixed Base Sepolia contract, durable publication recovery, chain-scoped proofs and authorized
   writes; fix the smaller defects and hosted copy.
3. Both Vercel projects, secure settings, exact origins, API/SPA routing and a sample judge flow.
4. Pass independent-instance/failure checks and the actual preview checklist before publishing
   the judging URL. Keep migrations compatible with rollback. A successful build is insufficient.
