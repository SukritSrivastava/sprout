# Find your way around the code

Start the app with `npm run dev`, then follow a visible action from its feature component to
its API caller, server route and store. [Setup](SETUP.md) owns environment configuration;
[the API contract](mentor-api.md) owns endpoints. [The file map](CODE_MAP.md) lists every
source, script and test file by responsibility.

## Feature ownership

Related code lives under `client/src/features/<feature>/` and
`server/src/features/<feature>/`. A feature folder contains its screen, hooks, API operations
and domain logic as needed. Server `routes.ts` handles HTTP; `store.ts` defines the local
store and common contract; `postgres.ts` implements that contract with shared records.
Some features only need browser code or use the shared learning store.

| Feature | Browser entrypoint | Server entrypoint | What it owns |
| --- | --- | --- | --- |
| Home | `features/home/Landing.jsx` | — | Landing sections and the product introduction |
| Practice | `features/practice/Demo.jsx` | — | Temporary rupee calculator, jars, goals and withdrawal illustration |
| Mentor | `features/mentor/Mentor.jsx` | `features/mentor/routes.ts` | Chat lifecycle, stream protocol, safety, privacy and prepared/model replies |
| Payments | `features/payments/Donate.jsx`, `Payout.jsx` | `features/payments/routes.ts` | PayPal checkout, two-role payouts, reservations and recovery |
| Ledger | `features/ledger/ImpactLedger.jsx` | `features/ledger/routes.ts` | Receipts, proofs, fixed chain identity and publication recovery |
| NGO | `features/ngo/NgoDashboard.jsx` | `features/ngo/routes.ts` | Staff workspace, activity reviews, learning-credit jars and reports |
| Seedlings | `features/seedlings/Seedlings.jsx` | `features/seedlings/routes.ts` | Picture lessons, checked answers and saved seeds |
| Guardian | `features/guardian/Safety.jsx` | `features/guardian/routes.ts` | Permission controls, revision-driven learning gate and demo-access notice |
| Learning | — | `features/learning/store.ts` | Records and revision checks shared by NGO, guardian, Seedlings and mentor |
| Language | `features/language/language.jsx`, `Hindi.jsx` | — | Shared English/Hindi preference and localized structured content |
| Presentation | `features/presentation/Tour.jsx` | — | Silent walkthrough, cursor, schedule and temporary sample-action registration |
| Catalog | `features/catalog/Soon.jsx`, `registry.js` | — | `/soon` listing and stable `/soon/:id` component registration |
| Classroom | `features/classroom/Classroom.jsx` | — | Shared-tablet/offline preview with temporary sample state |
| Certificates | `features/certificates/Certificates.jsx` | — | Sample certificate checker; no certificate issuance |

Paths in the table are relative to each workspace's `src/`. `chain/contracts/ImpactLedger.sol`
belongs to the ledger feature. Hardhat's conventional contract, script and artifact directories
stay in `chain/`; the API reads the exported `chain/build/ImpactLedger.json` artifact.

## Shared code and entrypoints

`client/src/main.jsx` loads providers, fonts and styles. `app/App.jsx` owns routes, page
transitions and reduced motion; `app/Layout.jsx` owns navigation; `app/NotFound.jsx` handles
unknown routes. Keep the CSS import order in `main.jsx`: shared styles first, then NGO,
Seedlings, guardian and presentation styles.

`client/src/shared/` contains reusable UI, animation, scrolling, generic hooks and JSON
transport. `shared/api.js` retains recovery fields on HTTP errors while forcing `ok:false`.
Each feature's `api.js` names its own server operations. A component used by only one feature
stays with that feature. Promote code to `shared/` when multiple features need the same behavior.

Editable words remain under `client/src/content/`, named for their feature. They are kept
together so copy editing does not require searching through implementation files. Translation
keys are normalized English strings; preserve IDs and stored values. Translate strings, not
JSX trees. See [editing](../EDITING.md).

`server/src/config.ts` loads and validates settings. `index.ts` supplies persistent file paths
and starts listening. `app.ts` selects file or Postgres stores and registers feature routes.
It maps persistence failures to 503 responses. Keeping these entrypoints at the workspace
root preserves configuration and data-path resolution in source and compiled output.

`server/src/shared/http/` owns health, browser-origin checks and local request budgets.
Origins do not authenticate scripts. Route groups have separate no-store/429 budgets;
mentor replies and donation notes share an AI cap. `shared/security/` owns PIN verification,
shared sessions, role lockouts and database-backed quotas. `shared/storage/` owns bounded
connection pools, transactions and the versioned schema. Startup checks the schema; it never
migrates on a cold start. The database stores neither chat nor raw PINs, tokens or IP addresses.
See [ADR-002](ADR-002-TRANSACTIONAL-STORAGE.md).

Operator scripts live under `server/scripts/<feature>/`. `platform/` holds the development
watcher and configuration/audit checks; `storage/` holds migration. Use the workspace's named
npm commands so callers do not depend on internal script paths. Voice generation remains
optional and parked; the presentation is silent.

The browser sends `/api/*` to its own origin. Vite proxies those requests to Fastify on 8787.
`buildApp()` constructs an API without listening, so tests inject requests with fake providers
and disposable records.

## Follow an action

For a payout, start at `client/src/features/payments/Payout.jsx`, then read that folder's
`api.js`, followed by `server/src/features/payments/routes.ts`, `store.ts` and `postgres.ts`.
`client.ts` is the PayPal sandbox adapter; `settings.ts` sets allowed amounts and reward values.

1. The server records an allowed donation order. The donor approves it in PayPal's SDK.
2. Capture verifies the provider's order ID, status, amount and USD currency before crediting the pool.
3. A payout fixes its amount and configured recipient; two different roles approve it.
4. The store reserves funds and saves stable sender IDs before calling PayPal.
5. A confirmed result updates the receipt. Uncertainty keeps the reservation and reuses the IDs.

Only a recipient item's `SUCCESS` confirms payment. A completed batch without an item result
stays pending and reserved. Both stores accept later refunds/returns, correct reports, and
reject late responses that would undo settlement. Automatic retry stops after 29 days;
see [recovery](SETUP.md#records-and-recovery).

For a Seedlings lesson, read `client/src/features/seedlings/Seedlings.jsx` and
`useSeedlings.js`, then `server/src/features/seedlings/routes.ts` and `answers.ts`.
The route checks the answer before calling the shared `features/learning/` store. Learning
credits and seeds update only after a successful save. Lesson uniqueness and review status
prevent repeated rewards. Guardian deletion removes selected learning data and preserves
payment records.

The learning store keeps permission revisions. `features/learning/access.ts` checks A12's
revision and, in protected mode, active permission. Database revision checks and writes share
a transaction. Mentor streams also stop on a revision change. In a storage outage, pending
permission changes block learning. Returning to a browser tab rechecks permission without
resetting unsent questions or calculator choices when the revision is unchanged.

`DEMO_OPEN_ACCESS` is server-owned and defaults to true. Open mode uses sample approval roles
without credentials. Protected mode requires PINs, staff sessions where appropriate and active
learner permission. Revision checks remain active in both modes. Shared ledger publication
always needs an NGO admin session, including in open mode. Keep PINs, staff tokens and chat
out of browser storage. A stored payout request code is a recovery reference, not authorization
in protected mode.

## AI and ledger details

`server/src/features/mentor/schema.ts` validates messages and fixed sample goal names.
`privacy.ts` redacts emails and numbers of seven or more decimal digits, including Devanagari
digits, before model submission. `safety.ts` marks sensitive topics. `prompt.ts` owns model
instructions; `prepared.ts` supplies fallback answers. The stream protocol distinguishes
prepared and AI text; access failures must not become offline answers.

Receipt maths lives in `client/src/features/ledger/merkle.js` and
`server/src/features/ledger/merkle.ts`. Parity tests keep their formats aligned; different
hashing APIs justify separate implementations. In the server ledger folder, `chain.ts` serves
the local file-mode chain. `fixed-chain.ts` validates shared identity and prepares/broadcasts
signed transactions; `postgres.ts` owns durable deployment/job records and leases.
`publisher.ts` performs one bounded continuation. `server/scripts/ledger/setup.ts` is the
explicit operator setup entrypoint. [The ledger guide](ledger.md) explains proofs and recovery;
[ADR-003](ADR-003-DURABLE-LEDGER.md) records the design.

## Tests and new changes

Client unit tests sit beside the code they cover. Server tests live in
`server/test/<feature>/`; browser flows live in `e2e/<feature>/`. Cross-feature test helpers
belong in each suite's `support/` folder. `server/test/platform/` covers configuration, health,
demo mode and audit checks; `server/test/storage/` checks shared transactions across features.
`e2e/shell/` covers navigation, responsive layout, the feature hub and default access.
The npm test commands discover nested test files, so new feature tests run automatically.

For a new feature, add its implementation under the matching feature folders, editable copy
under `content/`, and tests under the same feature name. Register a `/soon/:id` screen in
`features/catalog/registry.js`; wire a new API route in `server/src/build-app.ts`. Use direct imports
to make dependencies visible. Keep persistence and recovery rules inside the owning feature.
Update the file map and API/copy guides when their responsibilities change.

Run `npm test`, `npm run build` and the desktop/phone Playwright suite. Client tests cover
calculations, response handling, language and presentation maths. API tests use `app.inject()`,
fake providers and disposable stores. Solidity tests enforce publisher-only immutable batches.
Optional real Postgres contention and local-chain signing checks remain separate from hosted
validation. [Verification](../VERIFICATION.md) records results and skips.

The local file backend supports one process. Render requires shared Postgres records. Schema 3
restricts Supabase browser roles through RLS and revoked privileges; the Fastify backend uses
the migration/table owner. `shared/storage/database.ts` supplies verified TLS and the Supabase
CA to `pg`. `shared/http/hosting.ts` owns single-ingress proxy trust and no-store response headers.
`src/index.ts` starts/closes the Render process; `src/build-app.ts` constructs injectable apps.
`render.yaml` builds from the repository root to retain the chain artifact. Build-time Vercel
website routing lives outside browser source in `client/hosting.mjs` and points to Render.
Actual hosted routing and recovery checks remain on the [roadmap](ROADMAP.md).

Schema 4 stores `consent_policy` per learner. A row from an older policy cannot authorize
protected learning; v2 re-acknowledgement preserves existing progress. Local-file policy markers
follow the same transition. `/api/ready` checks the database/schema with bounded shared work;
`db:check` adds operator-only ownership/RLS/grant checks in a read-only transaction. Public
receipt pagination stays inside the payment store adapters; the ledger UI prepends older pages
without changing publication. [ADR-006](ADR-006-HOSTED-PERMISSION-AND-READINESS.md) records these choices.
