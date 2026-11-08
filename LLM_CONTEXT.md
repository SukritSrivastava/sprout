# Sprout handoff

Current code: local PayPal AI Hackathon prototype, React/Vite client, Fastify/TypeScript API, Hardhat ledger. The product is called sprout.io; the mascot is Sprout. See [project instructions](AGENTS.md) before editing.

## Current behavior

- PayPal Orders v2 funds a sandbox USD pool. Payouts v1 pays one server-configured guardian after two different role approvals. Gemini powers the mentor and donation note when configured.
- `/app` uses temporary sample rupee balances. NGO reviews save separate learning credits. Seedlings awards one seed per checked lesson in one shared A12 garden. None of these balances converts into sandbox dollars.
- Guardian controls manage fixed samples A12/B07/C33. Deleting learning data preserves PayPal records and receipt proofs.
- `DEMO_OPEN_ACCESS` defaults to `true`: the judge demo requires no PIN and does not gate learning on active permission. `false` restores PINs, staff sessions, shared lockouts and guardian gating. Revisions still invalidate stale writes/streams in both modes.
- English/Hindi is shared across site navigation, lessons, mentor reply settings and presentation. User messages and provider-generated text retain their original language.
- The presentation is silent. Its allow-list changes only temporary earning, savings split and goal controls; it never submits API mutations.
- Classroom/offline and certificates are previews. No offline queue or issued certificate exists.
- `DATABASE_URL` selects transactional Postgres payment/learning/security records; blank retains local files. Run the explicit migration before startup. Schema 2 adds durable ledger deployment/jobs without resetting version-1 records. Shared publication requires explicit fixed-target setup and an NGO admin session even in open mode. See [ledger decision](docs/ADR-003-DURABLE-LEDGER.md).
- Schema 3 adds default-deny RLS and removes Supabase browser-role privileges. The API connects as the table owner; browsers never connect to the database. Supabase uses verified TLS with `DATABASE_SSL_CA`.
- Schema 4 records each learner's policy version. `demo-permission-v2` explains shared server storage. Old active acknowledgements become pending at the next revision; progress, blocked markers and payments remain. Stop old API instances before the transition. See [ADR-006](docs/ADR-006-HOSTED-PERMISSION-AND-READINESS.md).
- Render probes `/api/ready` for bounded database/schema readiness; `/api/health` is liveness. `db:check` verifies database access in a read-only transaction. Receipt history uses bounded cursor pages; approved file-mode payout requests are never pruned.

## Checks that must survive cleanup

- PayPal's host is sandbox-only. Capture verifies order ID, status, USD and exact amount.
- Reserve before sending. A lost payout response stays reserved as `UNKNOWN`; retry the same operation IDs. Stop automatic retry after 29 days. Do not reset records to clear uncertainty.
- Local file save failures block financial/learning operations until pending changes persist. Database writes are transactional: failed writes credit or award nothing; a failed provider-result save retains the committed payout reservation and retry IDs. In-memory pending file results cannot survive a crash.
- Protected learning checks the current consent and `x-learning-revision`. Refresh and unmount stale client state on revision changes. Deletion retains a minimal revision marker.
- Publish only completed donations and `SUCCESS` payouts. Compute the root on the server; verify the stored batch before marking receipts published. Public views hide provider IDs.
- Shared ledger setup and publication save exact signed bytes before submission. Preserve job IDs, snapshots, hashes, lease ownership and fixed chain/contract/deployment identity. Never automatically redeploy or sign a replacement to clear an uncertain outcome. Runtime GETs never submit transactions.
- Keep samples, INR, USD and local-chain labels accurate. The chain is not a public deployment.

## Documentation map

| Subject | Owner |
| --- | --- |
| Quick start and feature status | [README](README.md) |
| Environment and provider setup | [Setup](docs/SETUP.md) |
| Architecture, storage and code navigation | [Codebase guide](docs/LEARN.md) |
| Feature ownership and complete source inventory | [File map](docs/CODE_MAP.md) |
| Requests, responses and limits | [API contract](docs/mentor-api.md) |
| Merkle proofs and chain lifecycle | [Ledger](docs/ledger.md) |
| Copy and design | [Editing](EDITING.md), [design](DESIGN.md), [UI behavior](UX-CONTRACT.md) |
| Demo and verification | [Judge guide](JUDGE_GUIDE.md), [verification](VERIFICATION.md) |
| Next work | [Roadmap](docs/ROADMAP.md) |

## Accepted direction

The user selected **Render API + Vercel website + Supabase Postgres** on 2026-11-08, superseding
the old Vercel API/Neon choice. Base Sepolia and no visitor wallet remain. [ADR-005](docs/ADR-005-RENDER-VERCEL-SUPABASE.md)
records the change. Render builds/starts from the repository root; Vercel's website root is
`client`. `SPROUT_API_ORIGIN` points its `/api` rewrite to Render. Render uses its assigned
`PORT`, binds `0.0.0.0` and requires shared records, exact HTTPS origins and `TRUST_PROXY=render`.
The storage, ledger and hosting changes have local checks. The user approved a separate free
preview in Render's My Workspace and SukritSrivastava's Supabase organization. Its new Supabase
project has schema 4, 16 default-deny RLS tables, three synthetic learners/activities and no
payment receipts or ledger target. See [current preview setup](docs/SETUP.md#current-preview).
Render has a reviewed-plan handoff for one separate free Singapore API; the plan is not applied
and no Sprout service exists yet. The tested release was pushed to `codex/sprout-preview` at
`34d314c` under explicit user authorization; main was unchanged. See [current preview setup](docs/SETUP.md#current-preview)
for the Blueprint review link. Vercel deployment tools are unavailable in this session and
the dashboards require sign-in. Private database URL/CA and a dedicated test publisher key
are not configured. Base setup, deployment and real preview checks remain pending. Do not
claim hosted API/TLS/provider checks passed from the database migration alone.
Classroom/offline and certificates remain the separate product queue.
The file backend still supports one local API process. Preserve the historical [hosting ADR](docs/ADR-001-HOSTING.md),
[deployment audit](DEPLOYMENT_AUDIT.md) and [release checklist](docs/DEPLOYMENT_CHECKLIST.md).

Implementation, scripts and tests are grouped by feature; generic infrastructure lives in
`shared/`. Editable copy remains under `client/src/content/`. [ADR-004](docs/ADR-004-FEATURE-ORGANIZATION.md)
records this convention. Historical audit paths refer to the layout at the time of each audit;
the file map explains the current locations.

The user handles publication. Video and voiceover work remain parked. Older phase prompts and duplicate setup/demo documents were consolidated into the guides above; Git history retains them.
