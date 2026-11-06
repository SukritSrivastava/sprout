# Sprout judging-demo release checklist

Target: Vercel website + Vercel Fastify API + Neon Free + Base Sepolia, PayPal sandbox only.
These are release gates, not claims of completion. [Decision](ADR-001-HOSTING.md),
[findings](../DEPLOYMENT_AUDIT.md).

## Before the first preview

- [ ] Replace runtime JSON snapshots with Postgres migrations, indexes and durable records;
  use integer monetary units and keep payment/learning concerns separate.
- [ ] Test independent-instance reservations: two $40 sends against $50, duplicate captures,
  stable retry IDs, lost provider replies and DB failure before/after external acceptance.
- [ ] Test atomic permission revisions with completion/review/AI races, deletion and fresh
  acknowledgement; old work must never restore deleted data or permission.
- [ ] Share staff sessions, PIN lockouts, route limits and an AI budget for all model callers.
  Verify expiry, roles, PIN-authenticated recovery and client-IP/proxy behavior.
- [ ] Fix approved-request pruning, pending-receipt counts/pagination and seven-digit redaction.
- [ ] Deploy one contract on chain 84532; persist fixed address, publisher, deployment hash/block.
  Fund only a dedicated test key. Never launch a hosted Hardhat background process.
- [ ] Add authorized publishing, durable intent/transaction IDs and publisher leases; test lost
  chain replies and terminated functions without duplicating batches or redeploying contracts.
- [ ] Scope proofs by chain and contract. Document a synthetic hosted seed or checked migration;
  preserve payment history and old local proofs without mislabelling them.
- [ ] Verify API bundle includes the committed contract artifact. Bound DB/provider/RPC waits
  and total invocation time; persist recovery before external work.
- [ ] Test migrations on disposable data, back up imported records and document compatible
  rollback. Separate preview from judging DB/contract/data.

## Host configuration

- [ ] Configure website root `client`/output `dist` and API root `server`; verify clean workspace
  install/build, the executable Fastify entrypoint and supported Node runtime.
- [ ] Put `/api/*` external rewrites before SPA fallback. Deep-link refresh must work; unknown
  APIs return JSON 404. Preserve authorization/revision headers and streaming.
- [ ] Put secrets only in backend settings: pooled TLS DB URL, sandbox PayPal, distinct adult
  PINs, fixed sandbox payee, Gemini and test publisher. No secrets in `VITE_*` or public docs/logs.
- [ ] Set exact production/preview origins. Verify preflight, trusted proxy behavior and rejection
  of spoofed forwarded IPs. Do not equate origin checks with authentication.
- [ ] Prevent shared caching of stateful/private APIs; check browser headers without breaking
  PayPal pop-ups/SDK or AI streaming. Inspect logs for secret/learner-text leakage.
- [ ] Make the submitted site usable in signed-out/incognito browsing without a Vercel account;
  provide separate judge test access through appropriate submission instructions.
- [ ] Confirm free plans/quotas, no paid upgrades and enough test ETH; allow for cold starts.
- [ ] Update local-file/Hardhat labels and errors to actual hosted sample behavior and explorer
  links. Plan initial demo permission without publishing payout-authorizing PINs.

## Verify the actual preview

- [ ] Run final `npm test` and `npm run build`; add meaningful DB integration tests with
  disposable records and separately constructed app instances.
- [ ] Add remote-base-URL browser mode without local-server startup, isolate records and never
  automatically submit real-money payments. Give the full autoplay test adequate wall-clock
  headroom while retaining every route, no-write and no-audio assertion (audit D14).
- [ ] Check desktop/phone deep links, guardian gate/deletion, NGO review, Seedlings and the silent
  presentation. The presentation must still submit no payment, PIN or saved lesson actions.
- [ ] Verify real Gemini English/Hindi streaming, first chunks, `done`, cancellation, quota errors
  and revocation stopping later output. Preserve truthful offline labels.
- [ ] Complete a PayPal sandbox approval in an external browser using sandbox buyer access.
  Check USD/exact amount, one receipt, impact-note source, fixed guardian payee, two approvals,
  one payout, status refresh and lost-response recovery.
- [ ] Publish settled receipts and compare browser/server/contract roots plus real explorer links;
  repeat reads after cold start/redeploy with the same contract and intact history.
- [ ] Exercise multiple clients/instances, DB/RPC outages, expired job leases, lockouts and session
  continuity. Distinguish configured credentials/liveness from dependency readiness.
- [ ] Record mocked/live boundaries, failures and skips in `VERIFICATION.md`. Repeat broad suites
  after relevant changes or unresolved failures, not merely to collect more green runs.

## Publish and retain access

- [ ] Review final diff, migration outcome and judge instructions before the user's publication
  step. Promoting frontend/API must not reset DB or chain state.
- [ ] If release fails, roll back code with compatible schema intact. Disable new writes while
  reconciling uncertain provider operations; never retry them using fresh operation IDs.
- [ ] Keep a runnable repository fallback and access through December 15, 2026. Confirm public
  repository/license and submission details separately. A public YouTube demo under three
  minutes is also required; video work remains parked with the user.
  Source: [official rules](https://paypalaihackathon.devpost.com/rules).
