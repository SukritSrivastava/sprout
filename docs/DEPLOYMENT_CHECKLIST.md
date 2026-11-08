# Sprout judging-demo release checklist

Target: Vercel website + Render Fastify API + Supabase Postgres + Base Sepolia, PayPal sandbox only.
These are release gates, not claims of completion. [Current decision](ADR-005-RENDER-VERCEL-SUPABASE.md),
[findings](../DEPLOYMENT_AUDIT.md).

## Before the first preview

Storage implementation and local Postgres verification were added on 2026-11-07; see
[verification](../VERIFICATION.md). The boxes below remain release gates for the actual hosted
environment. Durable ledger jobs/fixed identity were added on 2026-11-08 with local validation;
see [ADR-003](ADR-003-DURABLE-LEDGER.md). The separate free Supabase preview now has schema 4;
[current preview](SETUP.md#current-preview) records its target and remaining settings. No
public-chain deployment or local-file import has been performed.

Render/Vercel/Supabase configuration and schema 3 browser-access restrictions were added on
2026-11-08, superseding the old Vercel API config. A
separate `npm run test:preview` mode starts no local services and checks a real website URL
without mutations. [Setup](SETUP.md#render-vercel-and-supabase) owns project/environment steps.
The unchecked host items below still require an actual Render/Vercel/Supabase preview.

Local release fixes now include approved-request retention, public receipt pagination, readiness,
read-only database checks and the hosted-storage acknowledgement. [ADR-006](ADR-006-HOSTED-PERMISSION-AND-READINESS.md)
records schema 4 and its rollback boundary. Local passes do not complete the hosted boxes.

- [ ] Replace runtime JSON snapshots with Postgres migrations, indexes and durable records;
  use integer monetary units and keep payment/learning concerns separate.
- [ ] Test independent-instance reservations: two $40 sends against $50, duplicate captures,
  stable retry IDs, lost provider replies and DB failure before/after external acceptance.
- [ ] Test atomic permission revisions with completion/review/AI races, deletion and fresh
  acknowledgement; old work must never restore deleted data or permission.
- [ ] Share staff sessions, PIN lockouts, route limits and an AI budget for all model callers.
  Verify expiry, roles, PIN-authenticated recovery and client-IP/proxy behavior.
- [x] Preserve approved payout requests and provide bounded public receipt-history pages.
- [x] Return a full-history pending-receipt count and bound each publication to 64 receipts.
- [x] Fix seven-digit and Unicode number redaction before model submission; covered by the 2026-11-07 review regressions.
- [ ] Deploy one contract on chain 84532; persist fixed address, publisher, deployment hash/block.
  Fund only a dedicated test key. Never launch a hosted Hardhat background process.
- [ ] Add authorized publishing, durable intent/transaction IDs and publisher leases; test lost
  chain replies and terminated functions without duplicating batches or redeploying contracts.
- [ ] Scope proofs by chain and contract. Document a synthetic hosted seed or checked migration;
  preserve payment history and old local proofs without mislabelling them.
- [ ] Verify the Render checkout/compiled API includes the committed contract artifact. Bound DB/provider/RPC waits
  and total invocation time; persist recovery before external work.
- [ ] Test migrations on disposable data, back up imported records and document compatible
  rollback. Separate preview from judging DB/contract/data.

## Host configuration

- [ ] Configure Vercel website root `client`/output `dist` and Render API root at the repository
  root; verify clean workspace build, `PORT`/`0.0.0.0`, Node 22 and the compiled Fastify entrypoint.
- [ ] Put `/api/*` external rewrites before SPA fallback. Deep-link refresh must work; unknown
  APIs return JSON 404. Preserve authorization/revision headers and streaming.
- [ ] Put secrets only in backend settings: pooled TLS DB URL, sandbox PayPal, distinct adult
  PINs, fixed sandbox payee, Gemini and test publisher. No secrets in `VITE_*` or public docs/logs.
- [x] Create the separate free Supabase preview, apply schema 4 and confirm default-deny RLS
  on all 16 tables, owner access and no browser-role/PUBLIC grants on tables or sequences.
- [ ] Set the Supabase Session pooler URL and server CA in Render; verify certificate/hostname
  checking. Disable Supabase's Data API and enable enforced SSL in its platform settings.
- [ ] Run `db:check` on the isolated hosted database; verify `/api/ready` fails privately during
  an outage and recovers. Stop old API instances for the v2 acknowledgement transition.
- [ ] Set exact production/preview origins. Verify preflight, trusted proxy behavior and rejection
  of spoofed forwarded IPs. Do not equate origin checks with authentication.
- [ ] Prevent shared caching of stateful/private APIs; check browser headers without breaking
  PayPal pop-ups/SDK or AI streaming. Inspect logs for secret/learner-text leakage.
- [ ] Make the submitted site usable in signed-out/incognito browsing without a Vercel account;
  provide separate judge test access through appropriate submission instructions.
- [ ] Confirm free plans/quotas, no paid upgrades and enough test ETH; test Render wake-up through
  the Vercel rewrite after idle time and graceful shutdown/recovery on redeploy.
- [ ] Update local-file/Hardhat labels and errors to actual hosted sample behavior and explorer
  links. Plan initial demo permission without publishing payout-authorizing PINs.

## Verify the actual preview

- [ ] Run final `npm test` and `npm run build`; add meaningful DB integration tests with
  disposable records and separately constructed app instances.
- [x] Provide a read-only remote browser mode without local-server startup; retain full autoplay
  headroom and all no-write/no-audio assertions locally.
- [ ] Run that browser mode on the actual isolated hosted preview; verify older receipt pages
  and new guardian acknowledgements there before the separate sandbox payment flows.
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
  step. Redeploying frontend/API must not reset DB or chain state.
- [ ] If release fails, roll back code with compatible schema intact. Disable new writes while
  reconciling uncertain provider operations; never retry them using fresh operation IDs.
- [ ] Keep a runnable repository fallback and access through December 15, 2026. Confirm public
  repository/license and submission details separately. A public YouTube demo under three
  minutes is also required; video work remains parked with the user.
  Source: [official rules](https://paypalaihackathon.devpost.com/rules).
