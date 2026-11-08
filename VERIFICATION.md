# Verification

## Preview branch publication and Render plan — 2026-11-08

The user explicitly authorized committing/pushing the 345-path reviewed release selection.
Only that selection was staged; configured private values were absent, ignored/generated files
were excluded and the unrelated untracked dependency-audit output was left local. The staged
whitespace check found one extra blank line in the Hindi payment copy, which was removed.
Rename detection reports 237 changed files for those 345 added/modified/deleted paths.

Commit `34d314cf75a949977fc701e19236acd681bc7ca0` was pushed to `codex/sprout-preview` and
verified with `git ls-remote`. Main was not changed. Before publication, the Blueprint was
set explicitly to Singapore alongside Supabase and passed the published Render JSON Schema.
The local validator does not validate URI formats, which are unused by this Blueprint.
All 99 relative links/anchors in the eight changed guides resolved. No application behavior
changed after the full 193-test / 283-browser-check runs recorded below.

Render's connected planner accepted that exact commit with `planningOutcome: planned` and
no notices. It proposes one `CreateService`: free Node API `sprout-api-rf1v`, Singapore,
one instance, repository-root build, `/api/ready`, auto-deploys off and Blueprint auto-sync
off. No existing service, Render database or paid resource is part of this plan.
[Setup](docs/SETUP.md#current-preview) owns the Blueprint/sync IDs and review link.

The plan is **not applied**. Its required manual settings are `DATABASE_URL`,
`DATABASE_SSL_CA` and `ALLOWED_ORIGIN`. The user was given the reviewed dashboard plan
and the private-settings route; the eventual Vercel origin remains unknown. Available
Supabase, Vercel and Render tabs were opened for the user's sign-in. No preview URL,
deployment success, private DB connection, public-chain setup or live provider call follows
from source publication or infrastructure planning.

## Isolated Supabase preview — 2026-11-08

After the local release checks below, the user explicitly selected Render **My Workspace**
and **SukritSrivastava's Org** for a separate free Sprout preview. Supabase quoted **$0/month**.
The new project is healthy in Singapore; [setup](docs/SETUP.md#current-preview) owns its resource
IDs and dashboard link. Existing unrelated resources were left intact.

The fresh bootstrap captures `migrate()` from the application's schema source. It generates
the private fingerprint salt inside Postgres and refuses any existing Sprout relations.
Before applying it, an owned disposable PostgreSQL instance verified the exact SQL, the
version-4 result, denied browser-role grants and second-run refusal. That process was stopped.
Supabase then accepted migration `sprout_schema_v4_fresh_preview` (`20261108111851`).

| Hosted database check | Result |
| --- | --- |
| Current application schema | **4** |
| Protected Sprout tables | **16**, all with RLS enabled |
| Browser-role / PUBLIC grants on the 16 tables and 3 sequences | **0** |
| Relations not owned by the migration connection role | **0** |
| Synthetic sample learners / activities | **3 / 3** |
| Payment receipts / fixed ledger targets | **0 / 0** |
| Security advisor | Only the 16 informational `rls_enabled_no_policy` findings expected for the server-only, default-deny design |

The advisor's [no-policy finding](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
is intentional: browser roles receive no access and Fastify uses the database owner. Do not
add public policies to remove that informational result. Local preparation evidence is in
ignored `qa/cloud-bootstrap-check.log` and `qa/sprout-preview-bootstrap.sql`.

No Sprout Render service or Vercel deployment had been created at this database checkpoint.
The later source publication and unapplied Render plan are recorded above. Both available
dashboards are signed out. The connectors do not expose Supabase's Data API/enforced-SSL
toggles or password and provide no Vercel deployment tools in this session. These platform
settings, private database URL/CA, direct verified TLS/pooler connection, publisher funding,
Base Sepolia setup and actual API/frontend preview checks remain open. The cloud migration
did not import local records, submit chain transactions or call PayPal/Gemini.

## Remaining hosting/release implementation — 2026-11-08

Completed the local release gaps: approved-request retention, stable public receipt-history
pages, Render database readiness, read-only database access checks and accurate shared-storage
copy in English/Hindi. [ADR-006](docs/ADR-006-HOSTED-PERMISSION-AND-READINESS.md) records schema 4
and `demo-permission-v2`. Previous active acknowledgements require the new statement without
losing progress; withdrawn/deleted markers and payment/publication records remain. Policy
versions are stored per learner, so a late old-API acknowledgement cannot authorize protected
learning on the new API. The user confirmed hosting/release first; classroom/offline and
certificates remain previews.

| Check | Final result |
| --- | --- |
| `npm test` | **193 passed**: 27 client, 160 API/server, 6 Solidity; 3 optional external-service checks skipped |
| `npm run build` | **Passed**; existing approximately 662 KB JavaScript chunk advisory remains |
| Full desktop/phone browser suite | **283 passed, 9 intentional skips**, no failures/retries, 4.8 minutes |
| Node **22.23.4** targeted release checks | **8 passed**, covering retention, receipt pages, policy transitions, RLS checks and bounded readiness |
| Real local Postgres | **2 independent-instance suites passed** with separate fresh databases; schema 3→4 upgrade, preservation of a synthetic $25 pool, read-only `db:check`, healthy readiness and an actual DB outage also passed |
| Compiled output | `check:deployment` and API-only variant passed; compiled API/contract artifact load correctly |
| Render configuration | Published Blueprint schema passed with `/api/ready` as the probe |
| Documentation | Changed-guide links resolve; file map contains **196 unique entries** |
| Remote preview mode | **4 checks discovered**; not executed against a hosted URL |

Logs: `qa/release-phases-unit-final.log`, `qa/release-phases-build-complete.log`,
`qa/release-phases-e2e-final.log`, `qa/release-phases-final-browser-results.json`,
`qa/release-phases-node22.log` and `qa/release-phases-postgres.log`.
Browser command: `npm run test:e2e -- --config qa/release-phases-final.playwright.config.js --workers=2`.
The final frozen frontend bundle is `index-CQnV1S-t.js`.
Tests used installed Chrome, isolated APIs/records, fake PayPal/Gemini responses and local
Hardhat. Live AI was explicitly disabled. Real Postgres used an owned loopback process and
synthetic databases; that process was stopped. These checks do not establish Supabase TLS,
public RPC, live provider flows or actual Render/Vercel behavior.

The first full unit run had two old assertions expecting environment-variable instructions in
public payment errors. The new unavailable messages now have exact-text/error-code checks and
assertions that internal settings paths stay out of responses; the final suite passed. The
first browser run had 281 passes and two Seedlings wording failures. The shared-sample phrase
was restored in the corrected copy, with the original assertions intact; the final full rerun
passed. Early focused permission fixtures used an incorrect helper name, corrected to
`completeLesson` with its revision. The first disposable Postgres launcher held an inherited
output pipe open; only its owned process/database were stopped before the corrected run passed.

At the end of these local checks the hosting integrations were not connected, and no hosted
database, contract or deployment had been changed. The later isolated Supabase work is
recorded above. No user record file, push/publication or fresh live PayPal/Gemini call occurred
during this local phase. Private backend configuration, Base Sepolia setup, deployment and
actual-preview verification remain gates in [setup](docs/SETUP.md#render-vercel-and-supabase)
and the [release checklist](docs/DEPLOYMENT_CHECKLIST.md).

## Render backend, Vercel frontend and Supabase — 2026-11-08

The user changed the hosting target; [ADR-005](docs/ADR-005-RENDER-VERCEL-SUPABASE.md) supersedes
the earlier Vercel API/Neon choice. `render.yaml` now builds the compiled API from the repository
root, retaining the committed contract artifact. The Vercel frontend rewrites `/api` to the
configured Render origin. The obsolete Vercel backend config and API-function bundle checker
were removed. Render uses its assigned `PORT`, binds `0.0.0.0`, trusts one private ingress hop
and closes Fastify/database connections on shutdown with a 25-second bound.

Supabase remains server-only Postgres through `pg`, with a Session pooler URL and the downloaded
server CA. Explicit verified TLS survives pg's URL parsing. Schema 3 enables default-deny RLS
on all Sprout tables and removes table/sequence privileges from Supabase browser roles. It
preserves backend-owner access, payment balances, learning revisions and saved ledger work.
Migration remains explicit; startup/build never imports records or deploys contracts.

| Check | Result |
| --- | --- |
| `npm test` | **185 passed**: 27 client, 152 API/server, 6 Solidity; 3 existing optional external-service checks skipped |
| `npm run build` | **Passed**, retaining the existing approximately 656 KB JavaScript chunk advisory |
| Full desktop/phone browser suite | **281 passed, 9 intentional skips**, zero failures/retries, 4.9 minutes |
| Render Blueprint | Passed Render's published JSON schema using Ajv 2020 and a temporary YAML parser |
| Vercel frontend config | Passed its published configuration properties schema; Render origin retained in API routing |
| `npm run check:deployment` and `-- --api-only` | **Passed**, including compiled API health/404s and contract-artifact loading |
| Node **22.23.4** | API compilation, all 8 hosting checks, 2 selected migration/access checks and API-only output smoke **passed** |
| Documentation | **293 local links resolve** and **195 unique file-map entries** |

The hosting checks cover Render port/default-host selection without changing local port behavior,
missing hosted settings, trusted private ingress, forged earlier/Vercel IP headers, exact website
origins, API/SPA separation, pg certificate configuration, no-store responses and stream/preflight
headers. The Supabase migration test simulates version 2 with browser-role grants, upgrades it,
checks every table's RLS and revoked privileges, then re-grants access and verifies default-deny
RLS still hides receipts and rejects forged orders. The owner retains the original $25 pool.
The first focused attempt used a nonexistent test helper (`publicState`); the final test uses
the existing `poolDollars` method and preserves every access assertion.

Evidence is in ignored `qa/render-supabase-unit.log`, `qa/render-supabase-build.log`,
`qa/render-supabase-e2e.log`, `qa/render-supabase-browser-results.json`,
`qa/render-supabase-config-validation.log` and `qa/render-supabase-node22.log`.
Browser command: `npm run test:e2e -- --config qa/render-supabase.playwright.config.js --workers=2`.
It uses installed Chrome, compiled frontend assets, a disposable in-memory base API, isolated
fixture APIs, local Hardhat and fake PayPal/Gemini replies. The frontend bundle name remains
`index-HQBuKRcs.js`. SQL tests use PGlite; real Supabase certificate handshakes, pooler behavior,
Render ingress/restarts/wake-up and Vercel-to-Render streaming remain actual-preview gates.
No application dependency was added; the YAML validator/runtime are ignored QA tools.

No hosted migration, database/provider switch, contract setup, deployment, push or publication
was performed. Saved user payment/learning records were not modified. Before starting this
API on Supabase, supply its private URL/CA and run the explicit schema 3 migration. Follow
[setup](docs/SETUP.md#render-vercel-and-supabase) and the [release checklist](docs/DEPLOYMENT_CHECKLIST.md).

## Vercel configuration — 2026-11-08

Added separate website/API project configs, API-before-SPA routing, Node 22 selection,
workspace build commands and explicit inclusion of the committed contract artifact. The API
factory is now `server/src/build-app.ts`, leaving `src/index.ts` as the only detectable Fastify
entrypoint. Hosted startup requires shared storage, explicit HTTPS website origins, Vercel
proxy mode and Base Sepolia settings. All API replies, including errors and mentor streams,
send browser/CDN no-store directives. Logs redact authorization/cookies and omit raw mentor
provider error messages. These changes preserve the existing payment and permission checks.

| Check | Observed result |
| --- | --- |
| `npm test` | **182 passed**: 27 client, 149 API/server, 6 Solidity; 3 existing optional external-service checks skipped |
| `npm run build` | **Passed**; existing approximately 656 KB JavaScript chunk advisory remains |
| Desktop/phone `npm run test:e2e -- --config qa/vercel-phase.playwright.config.js --workers=2` | **281 passed, 9 intentional skips**, no failures or retries, 5.0 minutes |
| Six hosting regressions | **Passed**: hosted configuration guards, exact origins, API/SPA routing, spoofed-header budgets, no-store successes/errors/streams, authorization/revision preflights |
| Node **22.23.4** website/API build, compiled smoke check and six hosting regressions | **Passed** with a temporary integrity-checked runtime; no application dependency added |
| `npm run check:deployment` | **Passed** for local website output, single entrypoint, compiled API and contract-artifact loading |
| Vercel configuration properties | Website/API configs passed the downloaded official schema with the existing Ajv validator; its old draft declaration was removed for the local validator |
| Documentation | **276 local links resolve**, with **195 unique file-map entries** |
| `npm run test:preview -- --list` | **4 checks discovered**, desktop/phone; not executed against a hosted URL |

Local logs: `qa/vercel-phase-unit.log`, `qa/vercel-phase-build.log`,
`qa/vercel-phase-e2e.log`, `qa/vercel-phase-browser-results.json`,
`qa/vercel-node22-build.log`, `qa/vercel-node22-smoke.log` and
`qa/vercel-node22-hosting.log`. The final six-test run also covers a wildcard-backend rejection
added after the full suite. The final Node 22 frontend build retains the same JavaScript bundle
name (`index-HQBuKRcs.js`) as the build used by the full browser run.

Browser verification used installed Chrome, compiled frontend assets, an in-memory base API,
disposable fixture APIs and a local Hardhat node. PayPal/Gemini replies are fake; the presentation
retains its no-audio/no-write assertions. The preview-only tests are excluded from the local
suite and do not start services or mutate records. The full default unit suite uses PGlite for
SQL checks; real Postgres/public-chain integration was not repeated for these HTTP/config changes.

Initial sandbox build/watch attempts failed on Windows filesystem restrictions; normal-access
reruns passed. npm's temporary Node installation script also failed; a downloaded Node runtime
archive with its registry SHA-512 integrity checked supplied the successful Node 22 checks.
No assertion was weakened.

No actual Vercel function output, Linux clean install, Neon migration, public-chain setup,
hosted rewrite/client-IP behavior or live provider flow was verified in this phase. The
`check:deployment -- --bundle` option must inspect a real Vercel API build before release.
There was no deployment, push, publication, user-record import or saved payment/permission
change. [Setup](docs/SETUP.md#vercel-website-and-api) owns the next operator steps; the
[release checklist](docs/DEPLOYMENT_CHECKLIST.md) retains the actual-preview gates.

## Feature organization and documentation — 2026-11-08

Moved 150 implementation, stylesheet, script and test files into feature folders. Shared
transport/UI/HTTP/security/schema code has explicit shared locations. The unrelated Hindi,
classroom and certificate components from `More.jsx` now have separate feature files.
Editable copy remains centralized under `client/src/content/`. The [codebase guide](docs/LEARN.md),
[complete file map](docs/CODE_MAP.md), editing/setup/API references and agent handoff describe
the current paths. [ADR-004](docs/ADR-004-FEATURE-ORGANIZATION.md) records the convention.
Historical audit findings retain their original evidence and line references.

- `npm test`: **176 passed** (27 client, 143 API/server, 6 Solidity), zero failures.
  The three optional external-service checks are skipped in the default run and passed
  separately against owned local services below. Log: `qa/feature-organization-unit.log`.
- `npm run build`: **passed**, including API compilation. The existing approximately 656 KB
  frontend JavaScript chunk advisory remains. Log: `qa/feature-organization-build.log`.
- Full desktop/phone browser suite: **281 passed, 9 existing intentional skips**, zero failures
  or retries, 6.8 minutes. Both complete presentations retained their no-audio/no-write checks.
  Command: `npx playwright test --config qa/feature-organization.playwright.config.js --workers=2`.
  Log: `qa/feature-organization-e2e.log`; results: `qa/feature-organization-browser-results.json`.
- Real local Postgres: **2 passed**, each in a fresh disposable database with independent
  connection pools. Publisher/receipt coordination and payment/learning/security boundaries
  passed after the relocation. Logs: `qa/feature-organization-postgres.log` and
  `qa/feature-organization-storage-postgres.log`.
- Actual signed-chain recovery: **1 passed, no skips**, using a disposable loopback Hardhat
  node. Log: `qa/feature-organization-chain.log`.
- Moved ledger setup CLI: **passed** with disposable Postgres and a separate local node.
  Saved intent recovery, repeat setup without a new nonce and refusal to redeploy after a
  test-chain reset all passed. Log: `qa/feature-organization-cli-final.log`.
- Compiled API smoke check: **passed**. Compiled imports and the relocated contract-artifact
  URL load successfully; `/api/health` responds without providers or saved records.
- Static relocation check: **496 relative imports checked**, with no missing targets or case
  mismatches; all local Markdown links resolve. The file map covers every application source,
  script and test. Comparison with the pre-refactor snapshot found only import/path/comment
  changes in relocated modules; all three split component bodies match their originals exactly.
  Log: `qa/feature-organization-paths.log`.

The first standalone setup harness invocation omitted its required `--import tsx` loader and
failed before running checks. The corrected invocation passed; its initial diagnostic remains
in `qa/feature-organization-cli.log`. No assertions were changed to make the relocation pass.

Browser verification used installed Chrome, the compiled frontend, an in-memory base API,
isolated fixture APIs and fake PayPal/Gemini responses. The local Postgres and chain checks used
owned disposable processes, which were stopped afterward. No live PayPal/Gemini calls, hosted
deployment, user-record import or push was performed. Public hosting readiness remains pending.

## Durable ledger publication — 2026-11-08

Schema 2 adds fixed deployment identity, saved signed deployment/publication transactions,
receipt snapshots, publisher leases and request-driven recovery. Shared publishing uses an NGO
admin session even in open demo mode; viewing proofs stays public. Batch reads and browser
verification check chain/contract scope. The file-mode local demo remains available.

- Final `npm test`: **176 passed** (27 client, 143 API/server, 6 Solidity), no failures.
  Three optional real-service checks are skipped in this default run and were run separately
  as described below. Log: `qa/ledger-phase-final-unit.log`.
- Final `npm run build`: **passed**, including the API TypeScript check. The existing frontend
  chunk-size advisory remains. Log: `qa/ledger-phase-final-build.log`.
- Focused desktop/phone ledger checks: **18 passed**, no skips or retries. New coverage includes
  admin unlock, pending-job recovery after reload, credentials staying out of browser storage,
  proof-scope rejection, phone layout and older pending receipts outside the visible window.
  Existing real local-chain publication/verification assertions passed unchanged.
  Log: `qa/ledger-phase-focused-e2e-final.log`.
- Real local Postgres: **two separate checks passed**, each using its own fresh database and
  independent pools. One verifies shared publisher/receipt claims; the other retains the payment,
  permission and security contention checks after migration 2. Logs:
  `qa/ledger-phase-real-postgres.log`, `qa/ledger-phase-storage-postgres.log`.
- Actual signed-chain integration: **1 passed, no skips**, against a disposable Hardhat node.
  It prepares and saves deployment, verifies fixed metadata, publishes real signed transactions,
  resumes through a fresh driver, checks the hash/root and confirms no extra nonce is spent.
  Log: `qa/ledger-phase-real-chain-final.log`.
- Actual setup CLI: **passed** using disposable Postgres and a separate local node. Repeated
  setup reuses the saved intent/confirmed identity; after resetting only that test node, setup
  refuses to redeploy and preserves database metadata. Log: `qa/ledger-phase-cli.log`.
- Full desktop/phone browser suite: **281 passed, 9 intentional skips, no failures or retries**,
  7.9 minutes. Both complete presentations passed, including the no-write/no-audio assertions.
  New staff flows also verify Hindi labels before unlocking. Log: `qa/ledger-phase-full-e2e.log`;
  structured results: `qa/ledger-phase-browser-results.json`.

Initial focused browser verification had **15 passed, 3 failed**: the new scope warning was
hidden in another walkthrough step on both devices, and pending publication overflowed on the
phone. Both were fixed with the same assertions retained. Initial SQL/chain test attempts also
needed fixture/assertion-wrapper corrections before their recorded passing runs.

Browser checks use installed Chrome, the compiled frontend, a disposable base API, isolated
record files and fake PayPal/Gemini responses. The new staff UI fixtures stand in for the shared
backend; API tests and the separate real Postgres/chain checks cover its persistence and signing.
Temporary database and chain processes were stopped. No live PayPal/Gemini calls, public Base
Sepolia deployment, Neon changes, user-record import, Vercel deployment or push were performed.
These local checks do not establish hosted RPC, pooling, packaging or network behavior. See
[setup](docs/SETUP.md#fixed-shared-ledger-setup), [ADR-003](docs/ADR-003-DURABLE-LEDGER.md) and
[remaining work](docs/ROADMAP.md).

## Review fixes — 2026-11-07

Regression coverage now checks recipient settlement independently of batch completion,
refund/return accounting in both payment backends, rejection of stale payout responses,
seven-digit and Unicode number redaction before model submission, draft preservation on tab
focus, permission-revision resets in open/protected modes, withdrawal clicks and gentle tour
scrolling. Existing assertions were retained.

- `npm test`: **166 passed** (27 client, 133 API/server, 6 Solidity), no failures. The optional
  real-Postgres check is skipped in this default run. Log: `qa/review-fix-unit.log`.
- `npm run build`: **passed**, including the API TypeScript check. The existing frontend
  bundle-size advisory remains. Log: `qa/review-fix-build.log`.
- Focused desktop/phone browser checks: **10 passed**, no skips or retries. Both UI flows that
  failed during review pass with their existing assertions. Log: `qa/review-fix-focused.log`.
- Real local Postgres: **1 passed, no skips**, using a new disposable database and two
  independent connection pools. In addition to existing concurrency checks, this run tests a
  refund racing with a stale pending response and rejects a later stale success. Pool totals
  and publication eligibility remain correct. The temporary server was stopped afterward.
  Log: `qa/review-fix-real-postgres.log`.
- Full desktop/phone browser suite: **275 passed, 9 intentional skips, no failures or retries**,
  6.0 minutes. Both complete automatic presentations and all new regressions passed.
  Log: `qa/review-fix-e2e.log`; structured results: `qa/review-fix-browser-results.json`.

Browser checks use installed Chrome, the final frontend build, a disposable base API with no
provider keys or record files, isolated test APIs and fake provider responses. No live PayPal or
Gemini call, saved user-record change, deployment or push was performed. These checks do not
establish hosted Neon/Vercel behavior. See [the code guide](docs/LEARN.md) and
[API contract](docs/mentor-api.md) for the resulting behavior.

## Transactional shared storage — 2026-11-07

`DATABASE_URL` now selects normalized Postgres payment, learning and security records. Local
file mode remains available. The migration creates synthetic activities and an empty payment
pool once; it never imports or resets saved local records. Database-backed ledger publication
returns 503 until durable publication jobs are implemented.

- Final `npm test`: **163 passed** (27 client, 130 API/server, 6 Solidity), no failures;
  **one optional real-Postgres test skipped** in this default run. The added tests cover duplicate
  captures, integer cents, competing reservations, send leases and recovery IDs, rollback before
  provider submission, failed result saves, the 29-day cutoff and recovery fields, permission
  races/deletion, unique rewards, stream revocation, sessions, lockouts and shared AI budgets.
  Log: `qa/storage-final-unit.log`.
- The optional integration test also **passed separately with no skips** against a disposable
  local **PostgreSQL 18.6** process using two independent connection pools. It checks two $40
  reservations against $50, transactional rollback, competing permission changes, unique lesson
  completion, shared session revocation, PIN lockouts and simultaneous AI budget consumption.
  Log: `qa/storage-real-postgres.log`. The temporary process was stopped afterward. This is
  real local Postgres verification, not a Neon or transaction-pooler preview test. Default SQL
  tests use PGlite, whose serialized transactions alone do not establish real lock contention.
- Final `npm run build`: **passed**, including the API type check and added Hindi database-error
  copy. The existing frontend bundle-size advisory remains. Log: `qa/storage-final-build.log`.
- Full desktop/phone browser suite: **267 passed, 2 failed, 9 intentional skips**, 6.3 minutes.
  The desktop sample-withdrawal button remained unstable during its click; the phone tour
  launcher retained `pointer-events:none` after an upward wheel event. Both failures reproduced
  in an unchanged focused run: **2 passed, 2 failed** across both devices. Assertions were not
  weakened. These UI checks remain unresolved; this is not a full browser-suite pass.
  Logs: `qa/storage-e2e.log`, `qa/storage-recheck.log`; traces/screenshots are retained in their
  corresponding ignored result folders.
- Browser verification used installed Chrome, the frozen frontend build, a disposable base API
  with no provider keys or record files, and the suite's isolated API/provider fixtures. It passed
  the payment, guardian, NGO, lessons, Hindi and full silent-presentation flows. The final rebuild
  adds database-error translations; a full browser run was not repeated for that copy-only edit.
- Initial sandbox attempts blocked the existing dev-watcher test and Vite config resolution;
  the final unit suite/build ran with normal filesystem access. The temporary browser runner's
  initial entrypoint-format error was corrected before the recorded browser run.

No Vercel/Neon/Base environment was configured or deployed, and no live PayPal/Gemini call or
saved local permission/payment change was made. Hosted failure/restart checks and release gates
remain open. [Setup](docs/SETUP.md#shared-postgres-storage) explains migration and recovery;
[ADR-002](docs/ADR-002-TRANSACTIONAL-STORAGE.md) records the storage boundaries.

## PIN-free judge demo — 2026-11-07

The default demo opens learning, NGO reviews/reports, guardian controls, sandbox payout
approvals/recovery/sending and the classroom preview without a PIN. The English/Hindi notice
explains that PIN protection is implemented and disabled. The protected path remains available
with `DEMO_OPEN_ACCESS=false`; opening the demo does not record guardian acknowledgement.

- `npm test`: **150 passed** (27 client, 117 API/server, 6 Solidity), no failures or skips.
  This includes four new open-access API checks and the retained protected-mode security tests.
  Log: `qa/demo-access-unit.log`.
- Final `npm run build`: **passed**. Log: `qa/demo-access-build.log`.
- Isolated final browser run: **8 passed**, desktop and Pixel 7, reduced motion, no retries.
  It covers direct access, a saved NGO review and CSV download, guardian acknowledgement/
  withdrawal/deletion, payout approval/recovery/send, and the Hindi notice. Test APIs use
  disposable records and fake providers. No live payment or saved guardian permission changed.
  Command: `npx playwright test --config qa/demo-pin.playwright.config.js --workers=1`.
  The local config uses installed Chrome and separate artifacts. Log: `qa/demo-pin-final.log`.
- Full browser run: **217 passed, 22 failed, 9 skipped**, 24.3 minutes. The run overlapped
  other workspace edits and tests. Failures include obsolete Hindi-preview expectations,
  navigation/presentation timeouts and missing trace files; this is not a full-suite pass.
  The new phone NGO case completed its assertions but failed trace cleanup with `ENOENT`;
  the isolated final run passed it. Log: `qa/demo-access-e2e.log`.
- The running local API and `npm run check:config -w server` report open demo access with
  PIN checks disabled. No deployment or push was performed.

## Shared English/Hindi — 2026-11-07

- One stored preference controls navigation, main pages, lesson text/read-aloud, mentor reply
  settings, forms, known API feedback and presentation captions. It syncs between tabs, accepts
  the old Seedlings preference and works without browser storage. Switching preserves lesson
  answers, calculator choices and typed forms; it submits no action.
- `npm test`: **150 passed** (27 client, 117 API, 6 Solidity). The final client suite also passed
  all 27 checks, including unchanged route/policy IDs, formatted amounts and variable errors.
  `npm run build` and the frozen production frontend build passed. The existing bundle-size
  advisory remains. No application dependency was added.
- A browser inspection covered every page and walkthrough step at 1366px and 375px, with no
  page exceptions or horizontal page overflow. Evidence: `qa/hindi-*-phone.png`,
  `qa/hindi-home-desktop.png` and `qa/hindi-visible-audit.json`. Remaining English was receipt
  identifiers and one test-ETH fee suffix; the suffix was then connected to its Hindi template
  without changing the numeric fee.
- The first Hindi-specific run had **31 passed, 1 failed**: the error-form test enumerated
  checkboxes before loading completed. It now waits for all three statements. Intermediate
  live-server regression attempts encountered page reloads during source edits and were
  stopped; these are not full passes. Final regression uses the unchanged suite against the
  frozen `qa/hindi-site` build, so hot reload cannot reset test state.
- The test-only preview proxy maps its own 4173 origin to the already-approved 5173 origin;
  other origins are untouched. No credentials or saved server access settings were changed.
  This checks local UI behavior, not hosted routing/CORS readiness.
- Full frozen-build desktop/phone run: **269 passed, 9 intentional skips, no failures**, in
  7.7 minutes. This includes all **32 dedicated Hindi checks** and both complete automatic
  presentation checks. Log: `qa/hindi-final-e2e.log`.
- Final `npm test` again passed **150 checks**; final `npm run build` passed. Its JavaScript
  bundle (`index-DVQXc5Lz.js`) is identical to the frozen bundle that passed the browser suite.
  Logs: `qa/hindi-final-unit.log`, `qa/hindi-final-build.log`. Live development site returned
  HTTP 200 at `http://127.0.0.1:5173` and remains running.
- Payment tests use fake PayPal responses; live Gemini tests remain opt-in. Existing user/AI
  messages and donor notes retain their source language. PayPal's external checkout controls
  its own language. Technical IDs, INR/USD amounts and reporting fields are not translated or
  converted. Both open-demo and protected PIN modes are included.


## Top-menu spacing — 2026-11-07

Desktop links now have consistent gaps, aligned labels/status text and no accidental wrapping.
At 1300px and below, navigation uses full-width collapsible rows. The header fits 320px phones
with both languages reachable. Route/hash changes and Escape close the menu.

- Installed-Chrome layout audit: **26 English/Hindi viewport combinations passed**, spanning
  320–1920px and both sides of the breakpoint. No overlapping links or horizontal overflow;
  desktop gaps measured at least 21px and menu links were at least 52px tall.
- **36 destination checks passed**: all nine links in both languages on desktop and phone.
  Compact-menu dismissal and Escape focus restoration also passed. Evidence:
  `qa/navigation-audit.log` and `qa/nav-after-*.png`.
- Focused page/navigation suite: **30 passed, 7 intentional skips, 1 failed**. The separate
  phone tour-launcher scroll-animation check then **passed unchanged on its focused rerun**.
  Logs: `qa/navigation-final.log`, `qa/navigation-tour-recheck.log`. All menu checks passed.
  Home-return tests now click the visible brand link; the separate Home button is hidden in
  the existing phone header. Their URL and heading assertions remain.
- `npm test`: **150 passed** (27 client, 117 API, 6 Solidity). Full build and the final frontend
  rebuild passed, with the existing bundle-size advisory.
- The broad browser attempt was stopped after a disposable test API exceeded its 20-second
  startup limit before the Hindi demo-notice assertions. This is not a full-suite pass.

## Code and documentation cleanup — 2026-11-07

The cleanup applies Addy Osmani's code-simplification/documentation workflows and the installed natural-writing rules. It removes unused translation setup and no-op JSX translation wrappers, shares NGO/guardian/Seedlings no-store/rate-limit handling, reuses payout responses and replaces ledger-handler `any` parameters with Fastify types. No feature or access-mode change was intended.

The workspace already contained substantial uncommitted demo-access and Hindi work, with further edits arriving during verification. Those changes were preserved. Counts below describe the tested working tree, not a clean checkout of the last commit.

| Check | Observed result |
| --- | --- |
| Baseline `npm test` | 147 passed: 24 client, 117 server, 6 Solidity |
| Post-cleanup `npm test` | 150 passed: 27 client, 117 server, 6 Solidity; no failures |
| `npm run build` | Passed; Vite retains a JavaScript chunk-size advisory |
| Documentation checks | Local Markdown links resolve; all 25 registered API routes are documented |
| Full desktop/phone Playwright run | 259 passed, 11 failed, 8 skipped during concurrent source/test edits |
| Targeted browser recheck | 11 passed, no failures, with one worker and live AI disabled |

Local evidence is in ignored `qa/cleanup-baseline-unit.log`, `qa/cleanup-unit.log`, `qa/cleanup-build.log`, `qa/cleanup-e2e.log` and `qa/cleanup-browser-results.json`. `qa/cleanup-before/` preserves pre-cleanup files locally; Git history retains deleted tracked documents. The normal `qa/` artifacts are not part of a fresh clone.

The targeted run covers every non-live failure from the full run, plus phone cross-tab language synchronization. It verifies open-demo reviews/guardian controls/payouts, protected guardian deletion and cross-tab revocation, bilingual presentation controls, automatic sample actions, the entire no-write/no-audio presentation, and phone home navigation. Evidence: `qa/cleanup-browser-recheck.log` and `qa/cleanup-recheck-results.json`. These rechecks passed; a new clean full-suite run is not claimed.

The full run encountered disposable API startup limits, a stale English-only tour locator, a 90-second presentation budget, and a test title changing while workers were running. Cross-tab tests now foreground each page before interacting or checking its rendered language; the tour locator accepts its English/Hindi accessible names. The full presentation retains every assertion with a 180-second budget.

The initial runner set `LIVE_AI=0`, which the old truthy check treated as enabled. Its isolated API startup failed before chat assertions, so it produced no live-AI verification. The guard now requires exactly `LIVE_AI=1`; targeted rechecks cleared that variable. An intermediate language recheck had three passes and one phone failure before the second tab was explicitly foregrounded; all affected cases passed in the final recheck.

The restricted Windows sandbox initially blocked Node temporary-directory access and Vite path resolution. The unit suite and build passed with normal filesystem access. Browser verification uses installed Chrome with the same desktop/phone projects and separate output paths; application assertions remain in the tracked tests.

## Reproduce

Run from the `sprout` folder:

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:e2e -- --workers=2
```

Tests use fake providers, memory stores and disposable records. Protected suites explicitly set `DEMO_OPEN_ACCESS=false`; open-demo tests exercise the default mode. Do not point disposable test paths at saved payment/learning records.

The optional `LIVE_AI=1` browser test and `npm run eval:mentor` call Gemini. The PayPal checker creates a sandbox order; its optional recipient argument also sends a sandbox payout. See [setup](docs/SETUP.md) before using live-provider commands. No fresh live-provider or hosted-release claim follows from mocked tests.

## Earlier evidence and unresolved work

The deployment audit at `b4429e6` recorded 143 passing unit/API/contract checks and a passing build. Its full browser rerun had 229 passes, two autoplay timeouts and nine intentional skips. The same autoplay assertions passed in a diagnostic copy with 180 seconds instead of 90. These are historical results, not the current run.

`node --import tsx --test server/scripts/audit-deployment.ts` is a defect-reproduction harness outside `npm test`. Its 13 historical passing cases mean defects were reproduced, not repaired. They include cross-instance overspending, stale permission restoration, independent sessions/limits and unsafe publication recovery. See [the deployment audit](DEPLOYMENT_AUDIT.md).

The earlier manual PayPal sandbox check on 2026-11-05 captured a donation and accepted a payout. It does not verify this working tree or a hosted service. Automated PayPal browser coverage replaces checkout/provider responses with fixtures.

The [security audit](SECURITY_AND_BUG_AUDIT.md) retains earlier findings and deferred issues. File persistence, open/PIN demo access, redaction and local-chain proofs do not establish production readiness. No Vercel/Neon/Base deployment was performed as part of this cleanup. The [release checklist](docs/DEPLOYMENT_CHECKLIST.md) remains open.
