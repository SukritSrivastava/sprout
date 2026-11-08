# Setup

Start with the commands in [README](../README.md). Local backend settings belong in the git-ignored `server/.env`; hosted backend settings belong in the Render service's environment settings. Never put secrets in frontend files or `VITE_*` variables.

The dev runner reloads saved `.env` changes. A compiled production API needs a restart. Run `npm run check:config -w server` to catch invalid settings without printing credentials.

## Choose the access mode

`DEMO_OPEN_ACCESS=true` is the default. NGO reviews, guardian controls, learning and sandbox payout approvals work without PINs. Payouts still require two different sample roles, the fixed guardian recipient and enough pool funds. This mode is for sample-data demonstrations.

To exercise protected flows:

1. Set `DEMO_OPEN_ACCESS=false` in `server/.env`.
2. Set a different `PAYOUT_PIN_MENTOR`, `PAYOUT_PIN_ADMIN` and `PAYOUT_PIN_GUARDIAN`. Each must be 6–64 characters. Never publish their values.
3. Save the file and wait for the API to reload.
4. Open `/soon/safety`, select A12 and read the permission statements.
5. Tick the statements, enter the guardian PIN and select **Record demo permission**.

A12 owns the AI/practice demo and shared Seedlings garden. B07 and C33 have their own sample NGO activities and permission state. Protected NGO access needs one mentor/admin PIN; reviewing activities also needs permission for the relevant learner. Full protected payouts need all three distinct PINs and the guardian email.

Five wrong PINs lock that role for 15 minutes across guardian, NGO and payout checks. Staff sessions last 15 minutes and stay in page memory. A reload requires unlocking again. The page's **Show PIN** reveals only typed input; **Check access again** reloads configured staff roles.

## PayPal sandbox

1. Sign in to [PayPal Developer](https://developer.paypal.com/).
2. Under **Testing Tools → Sandbox Accounts**, create a **Business** account in the **United States**. This is the account configuration verified for this project's USD donation/payout flow.
3. Under **Apps & Credentials → Sandbox**, create a Merchant app linked to that account.
4. Enable **Payouts** for the app.
5. Add its `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to `server/.env`.
6. Set `GUARDIAN_PAYPAL_EMAIL` to a sandbox **Personal** account email for payouts.
7. Save the file and open `/soon/donate` in Chrome or Edge with pop-ups allowed.
8. Approve checkout using the sandbox Personal account, not a real PayPal login.

In open demo mode no PIN configuration is needed for payouts. In protected mode use the distinct adult PINs described above. A sandbox donation funds the pool before a payout can be sent.

`npm run check:paypal -w server` contacts PayPal and creates an unpaid $5 sandbox order. Adding `-- <sandbox-email>` also sends a $1 sandbox payout. Use that optional argument only when you intend to send the test payout.

If PayPal reports `UNSUPPORTED_PAYEE_CURRENCY` or `PAYOUT_NOT_AVAILABLE`, check the sandbox business country, the app's linked account and Payouts setting. A blocked checkout pop-up usually needs an external browser with pop-ups allowed.

## Gemini

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Set `GEMINI_API_KEY` in `server/.env`.
3. Save the file and ask a question in `/app#mentor`.

The configured default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` overrides it. With no key, the mentor and donor note use prepared text. `MENTOR_HOURLY_LIMIT` caps mentor calls and donation notes together. A donation still gets a prepared note when that budget is exhausted. Provider quotas still apply.

## Shared Postgres storage

Leave `DATABASE_URL` blank for the existing local file backend. Setting it selects shared
Postgres for payment, learning and security records. No local record file is imported or
modified by this switch. Use a fresh, isolated database for the synthetic preview; keep existing
payment files and their proofs intact.

1. Create an isolated Supabase project with the Data API disabled.
2. Save its Session pooler URL privately as backend `DATABASE_URL`, with `sslmode=verify-full`, and its root certificate as `DATABASE_SSL_CA`.
3. Run `npm run db:migrate -w server` from the project folder.
4. Start the API with `npm run dev:api` or its compiled start command.
5. Check guardian status and the empty sandbox pool before using the new environment.

The migration creates three coded sample learners and activities, pending permission and an
empty payment pool. It runs in a transaction; a repeat run changes no records. App startup
checks schema version 4 and fails if the schema is unavailable or mismatched. Upgrading version
1 adds ledger tables without reseeding or resetting existing records. Version 3 restricts Supabase browser-role access without changing saved records. Plaintext
connections are accepted only for loopback development. Never put the URL in `VITE_*`, logs
or chat. `npm run check:config -w server` checks settings, not database connectivity.

Database-backed ledger publication requires the one-time setup below. Until then, ledger
requests return `503 ledger_setup_required`; payment and learning records remain usable.
Readiness on Render/Supabase remains a separate preview check. A `RENDER=true` API cannot start without
`DATABASE_URL`.

For actual database contention checks, set `SPROUT_TEST_DATABASE_URL` privately to an empty,
disposable Postgres database, then run `node --import tsx --test --test-name-pattern="real Postgres" server/test/storage/storage.test.ts`.
The test refuses an existing Sprout schema, installs the migration and leaves synthetic records
for inspection. Regular `npm test` uses disposable embedded Postgres and skips that one optional
network test. The publication suite has its own optional contention test in
`server/test/ledger/publication.test.ts`; use a separate empty database for each suite. Neither contacts
PayPal or Gemini. The optional signed-chain check uses `SPROUT_TEST_LEDGER_RPC` and refuses
non-loopback nodes; only point it at a disposable test node.

## Fixed shared ledger setup

These are operator steps, not instructions for site visitors. Keep existing local files and
databases intact. Public-chain setup spends only test ETH from a dedicated publisher account.
The normal API never deploys a contract, even when records or RPC replies are missing.

For a new Base Sepolia deployment:

1. Set backend `DATABASE_URL` to the isolated database intended for this deployment.
2. Run `npm run db:migrate -w server`.
3. Set backend `CHAIN_RPC_URL` to an HTTPS Base Sepolia endpoint.
4. Set backend `LEDGER_CHAIN_ID=84532`.
5. Set backend `PUBLISHER_PRIVATE_KEY` to a dedicated test-only publisher key.
6. Fund that publisher with free Base Sepolia test ETH.
7. Run `npm run ledger:setup -w server -- --deploy`.
8. Repeat that exact command after two blocks if it reports that confirmation is pending.
9. Set a private `PAYOUT_PIN_ADMIN` for the staff member who will publish receipts.
10. Restart the API with these settings.

The setup saves signed deployment bytes before submitting them. If submission or its reply is
lost, the same saved deployment is checked/resubmitted. Once confirmed, setup only validates
that identity and never recreates a missing contract. The command prints public metadata only.

To bind an existing compatible deployment, set both `LEDGER_CONTRACT_ADDRESS` and
`LEDGER_DEPLOY_TX`, then run `npm run ledger:setup -w server` without `--deploy`. The command
checks the creation bytecode, chain, publisher, address and canonical deployment block. Existing
database identity wins over a competing setup; conflicting settings fail instead of replacing it.

For disposable local verification, use a loopback Hardhat RPC with `LEDGER_CHAIN_ID=31337`.
Only this local path may use Hardhat's built-in test account. The file backend does not need
shared-ledger setup and keeps its existing automatic local deployment path.

At `/soon/impact`, everyone can view and verify proofs. A shared publisher requires an NGO admin
PIN to unlock publication, even when `DEMO_OPEN_ACCESS=true`. A pending publication shows its
saved job code and **Check saved publication** action. Reloading preserves the server job;
staff unlock again before continuing it. Tokens and PINs are never stored in browser storage.

Do not change a job's batch number, signed bytes or transaction hash to clear an uncertain
outcome. After a terminated worker, recovery waits for its 90-second lease to expire. Blocked,
reverted, dropped or underpriced transactions need staff/operator investigation; there is no
automatic fee bump, cancellation or replacement. Changing networks/contracts requires an
isolated database or a separately reviewed migration. See [ledger lifecycle](ledger.md).

<a id="vercel-website-and-api"></a>

## Render, Vercel and Supabase

The current target is Render for the API, Vercel for the website, Supabase for Postgres and
Base Sepolia for the ledger. [ADR-005](ADR-005-RENDER-VERCEL-SUPABASE.md) supersedes the previous
Vercel API/Neon choice. The isolated preview database is created and migrated; API/frontend
deployment and public-contract setup remain pending. The user handles publication unless
they explicitly authorize it.

### Current preview

On 2026-11-08 the user selected Render **My Workspace** and Supabase
**SukritSrivastava's Org** for a separate free Sprout preview. Use these targets; keep their
existing unrelated applications/projects intact.

| Resource | Confirmed state |
| --- | --- |
| Render workspace | `tea-db5va3ss728c7395toe0`; one new free Singapore API is planned, not applied |
| Render Blueprint | `exs-dbo6iqbm8hqs73fmqje0`; [review sync `exe-dbo6iqrm8hqs73fmqkkg`](https://dashboard.render.com/blueprint/exs-dbo6iqbm8hqs73fmqje0/sync/exe-dbo6iqrm8hqs73fmqkkg) for `sprout-api-rf1v`; automatic sync and deploys disabled |
| Supabase organization | `wnywynycogkfsnqtazqa`; free plan |
| Supabase project | [sprout-preview](https://supabase.com/dashboard/project/kajgeyaedubckbswpucs), ref `kajgeyaedubckbswpucs`, Singapore (`ap-southeast-1`), healthy |
| Database migration | Schema **4**, migration `20261108111851` / `sprout_schema_v4_fresh_preview` |
| Vercel frontend | No project/deployment created; deployment tools are absent and dashboard sign-in is required |
| Git release | [codex/sprout-preview](https://github.com/SukritSrivastava/sprout/tree/codex/sprout-preview) pushed at `34d314c` under explicit user authorization; main unchanged |
| Base Sepolia | No fixed ledger deployment or target saved |

The fresh Supabase migration used the application's own versioned schema statements, with the
private payment fingerprint salt generated inside Postgres. It seeded only the three coded
sample learners and activities. No local records were imported. See [hosted verification](../VERIFICATION.md#isolated-supabase-preview--2026-11-08).

Remaining operator work:

1. Sign in to the Supabase dashboard for this preview.
2. Disable its Data API.
3. Enable enforced SSL in its database SSL settings.
4. Download its server root certificate.
5. Save its Session pooler URL and certificate privately in backend settings as described below.
6. Review the linked Render Blueprint plan from the pushed preview branch.
7. Approve the plan in Render if its single free API matches the review.
8. Save the database URL and CA on the new service's Environment page.
9. Sign in to Vercel and configure the frontend project using the table below.
10. Save the actual Vercel frontend origin as Render `ALLOWED_ORIGIN`.
11. Complete fixed-ledger and actual-preview checks in this guide.

The Render plan targets commit `34d314cf75a949977fc701e19236acd681bc7ca0` and creates only
`sprout-api-rf1v`. It requires `DATABASE_URL`, `DATABASE_SSL_CA` and `ALLOWED_ORIGIN`. The
connector requires user approval of the reviewed plan before applying it. Use dashboard
approval and private service settings to keep credentials out of chat/tool arguments; an
initial deploy can fail until all required values are present. The Vercel origin must come
from the actual frontend project. Do not substitute a guessed URL or a wildcard.

The connectors do not expose the Data API/SSL platform toggles or the database password.
Those settings and the direct Render-to-Supabase verified TLS connection are still unverified.
Do not send credentials in chat. The existing unrelated Supabase project and Render service
have not been changed.

| Setting | Vercel website | Render API |
| --- | --- | --- |
| Root directory | `client` | Repository root (`.`), not `server` |
| Configuration | `client/vercel.mjs` | Root `render.yaml` |
| Runtime | Node `22.x` for build | Node `22.23.4` |
| Region | Vercel CDN | Singapore, alongside the Supabase preview |
| Install/build | `cd .. && npm ci`, then `npm run build` | `npm ci --include=dev && npm run build -w server && npm run check:deployment -- --api-only` |
| Output/start | `dist` | `node server/dist/index.js` |
| Health check | Website and `/api` smoke checks | `/api/ready` |
| Automatic deploys | User controls publication | Disabled in Blueprint (`autoDeployTrigger: off`) |

Enable Vercel's **Include source files outside Root Directory** for its workspace install.
Render uses the whole repository so the compiled API can read the committed
`chain/build/ImpactLedger.json`. It does not build/run a Hardhat node. The obsolete
`server/vercel.json` has been removed; create only the frontend project on Vercel.

Render supplies `RENDER=true` and `PORT`. The API binds `0.0.0.0` and that port, ignoring local
`API_PORT`/`HOST` overrides there. The default Render port is 10000. Local development still
uses `API_PORT=8787` and `HOST=127.0.0.1`; a local `PORT` variable cannot change it.
SIGTERM/SIGINT close Fastify and the database pool, with a 25-second shutdown bound. Saved
payout/publication IDs and leases remain authoritative after a forced termination.

### Supabase database and certificate

Use a dedicated Supabase project for the synthetic preview. The existing `pg` adapter talks
directly to Postgres; no Supabase SDK, publishable key, service-role API key or browser DB client
is needed. In the Supabase project, turn off the **Data API** because only Fastify should expose
these records. Do not add browser-readable policies to Sprout's tables.

Choose **Connect > Session pooler**, port **5432**, for the persistent Render process. This
supports IPv4 without the direct database connection's IPv6 requirement. Keep the username
and hostname supplied by Supabase; do not construct them from a guessed region. Preserve
password URL encoding and append `sslmode=verify-full` to the private connection URL.

Download the **server root certificate** from Supabase **Database Settings > SSL Configuration**.
Set `DATABASE_SSL_CA` to its PEM text in Render. A multiline value or literal `\n` separators
works. Supply the same certificate to local migration/setup commands through the ignored
`server/.env`. Do not put `sslrootcert`, `ssl=false` or other SSL overrides in the URL: the
adapter passes the CA directly to `pg` and keeps certificate/hostname verification enabled.
Never resolve a certificate error with `rejectUnauthorized=false`.

Schema **3** enables default-deny RLS on every Sprout table and removes table/sequence grants
from Supabase's `anon` and `authenticated` roles. It creates no browser policies. The backend
uses the migration/table-owner database connection, which bypasses those RLS filters. Versions
1/2 upgrade transactionally without resetting payment/learning records, permissions, sessions,
ledger identities or signed jobs. An unrelated custom runtime role needs a separately reviewed
privilege setup; the provided owner connection is the supported path.

The current schema is **4**. It records each learner's acknowledgement policy. The v2 statement
explains shared sample records on the demo server. Active v1 acknowledgements become pending
at a new revision; progress, credits, payments and blocked/deleted markers remain. Protected
learners must acknowledge again. The open judge demo remains open by design. Stop old API
instances during this transition. Do not roll back by restoring old active permission markers;
a rollback API must understand schema 4 and v2. [ADR-006](ADR-006-HOSTED-PERMISSION-AND-READINESS.md)
records this boundary. Local learning files upgrade their old markers atomically when loaded.

Migrations are explicit: run `npm run db:migrate -w server` before starting this API against
that database. Startup checks schema 4; build/start never migrates or imports local records.
The free Render plan does not provide a pre-deploy command, so the Blueprint does not configure
one. Run migrations from the local checkout with the private database settings. Keep
`TRUST_PROXY=false` locally when running operator commands; Render mode is for Render only.
Run `npm run db:check -w server` after migrating. It uses a read-only transaction to verify the
current schema, table ownership, RLS and denied browser-role privileges, without printing the
connection URL. Complete fixed-ledger setup above before publishing receipts.

### Environment settings

Use different values/data for preview and judging environments:

| Location | Setting | Value |
| --- | --- | --- |
| Vercel website build | `SPROUT_API_ORIGIN` | Actual HTTPS Render service origin, without path/trailing slash |
| Render service | `DATABASE_URL` | Private Supabase Session pooler URL, `sslmode=verify-full` |
| Render service | `DATABASE_SSL_CA` | Downloaded Supabase server root certificate as PEM |
| Render service | `ALLOWED_ORIGIN` | Exact HTTPS Vercel website origins, comma-separated, without trailing slashes |
| Render service | `TRUST_PROXY` | `render` |
| Render service | `CHAIN_RPC_URL` | HTTPS Base Sepolia RPC; Blueprint uses `https://sepolia.base.org` |
| Render service | `LEDGER_CHAIN_ID` | `84532` |
| Render service | `DEMO_OPEN_ACCESS` | `true` for the existing PIN-free synthetic judge demo |
| Render service | PayPal/Gemini keys, payee, PINs, publisher | Backend-only values described above; add when enabling those providers/features |

`render.yaml` prompts for the DB URL, certificate and allowed origins through `sync: false`.
When updating an existing Render service, add new settings manually; Blueprint sync does not
update those private values. Optional credentials are never committed or requested in chat.
No browser preference changes server access mode. Shared publication still requires the admin
PIN even in the open demo.

`SPROUT_API_ORIGIN` is a public routing address. Vercel consumes it at build time; changing it
requires rebuilding the frontend. Local Vite builds do not need it. Do not put credentials or
bypass tokens in a rewrite destination. `/api` and `/api/*` are forwarded with their paths intact;
the SPA fallback excludes that namespace. Direct links such as `/soon/safety` and `/app#mentor`
load the React app, while unknown APIs remain JSON 404s. API success/error/stream replies send
browser/CDN no-store directives.

Render proxy mode accepts the last valid forwarded IP only behind one private ingress peer.
It ignores earlier client-supplied values and `x-vercel-forwarded-for`; missing/untrusted
metadata shares the socket's budget. Actual Render ingress and Vercel-to-Render forwarding
must be checked on the preview. Do not broaden trust to arbitrary public proxies to make an
IP check pass. Global shared AI budgets apply even if multiple visitors share a proxy address.

### Deployment sequence

1. Create the isolated Supabase project.
2. Disable its Data API.
3. Save its Session pooler URL privately in the local backend environment.
4. Save its downloaded CA certificate as `DATABASE_SSL_CA` there.
5. Run `npm run db:migrate -w server` against that database.
6. Run `npm run db:check -w server` against that database.
7. Complete the explicit fixed-ledger setup above for the same environment.
8. Create a Render Blueprint from the repository's `render.yaml`.
9. Enter the private database settings and exact Vercel website origin in Render.
10. Deploy the Render API.
11. Create the Vercel frontend project with root `client`.
12. Set its `SPROUT_API_ORIGIN` to the actual Render HTTPS origin.
13. Update Render's `ALLOWED_ORIGIN` with every exact website origin used by the preview.
14. Redeploy the Render API after that environment change.
15. Deploy the Vercel frontend.
16. Run the preview checks below.
17. Complete the [release checklist](DEPLOYMENT_CHECKLIST.md) before publication.


If a Vercel project already exists, reuse its assigned domain in the Render allow-list. Provider
setup order does not authorize deleting old records: a new Supabase database is a separate
empty demo pool, not a transfer of previous payment history.

### Local and hosted checks

From the repository root, run `npm run build` followed by `npm run check:deployment`.
The checker loads the compiled API without provider credentials or saved record files and
checks the committed artifact. `npm run check:deployment -- --api-only` is the Render build
variant and does not require frontend output. The previous Vercel API `--bundle` check no
longer applies.

For read-only desktop/phone checks through the real website rewrite, in PowerShell:

```powershell
$env:SPROUT_PREVIEW_URL = 'https://YOUR-WEBSITE-PREVIEW.vercel.app'
npm run test:preview
```

This config starts no local services and submits no payments, saved lessons, permission changes,
publication or AI requests. It checks deep links, real API routing, JSON 404s, no-store and
origin/preflight rules. It requires a website accessible without a Vercel login. Set
`PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome if needed.

The Render free service can sleep after inactivity and show a wake-up page before the API is
ready. Test the first request through Vercel after idle time, real streaming, restart/session
continuity, Supabase TLS, browser-role denial and saved-operation recovery. `/api/ready` checks
the shared schema with a three-second deadline and a two-second success cache. `/api/health`
remains liveness/configuration; neither endpoint verifies PayPal, Gemini or the ledger. Record failures and live/fake boundaries in [verification](../VERIFICATION.md).

References: [Render web services](https://render.com/docs/web-services),
[Blueprint fields](https://render.com/docs/blueprint-spec),
[Render free services](https://render.com/docs/free),
[Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Supabase API access](https://supabase.com/docs/guides/api/securing-your-api),
[node-postgres SSL](https://node-postgres.com/features/ssl).

## Settings reference

| Setting | Default / meaning |
| --- | --- |
| `DEMO_OPEN_ACCESS` | `true`; set `false` for PIN and permission enforcement |
| `API_PORT`, `HOST` | `8787`, `127.0.0.1` |
| `ALLOWED_ORIGIN` | Exact comma-separated HTTP(S) website origins; explicit HTTPS Vercel website origins required on Render |
| `TRUST_PROXY` | `false` locally; `render` on Render; `true` only behind another separately trusted proxy |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional server key and model override |
| `MENTOR_HOURLY_LIMIT` | `300` mentor/donor-note calls/hour; shared across database-backed instances |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox app credentials; the SDK client ID is public by design |
| `PAYOUT_PIN_MENTOR`, `PAYOUT_PIN_ADMIN`, `PAYOUT_PIN_GUARDIAN` | Distinct optional adult PINs; protected mode enforces them |
| `GUARDIAN_PAYPAL_EMAIL` | Fixed sandbox recipient; never chosen by the browser |
| `DATA_FILE` | `data/paypal-records.json`, relative to `server/` |
| `LEARNING_DATA_FILE` | `data/learning-records.json`, separate from payment records |
| `DATABASE_URL` | Blank uses local files; a Supabase/Postgres URL selects shared records and security state |
| `DATABASE_SSL_CA` | Supabase server root certificate as PEM; remote TLS verification stays enabled |
| `CHAIN_RPC_URL` | `http://127.0.0.1:8545` |
| `PUBLISHER_PRIVATE_KEY` | Dedicated test-only signer; Hardhat's public default is allowed only on loopback chain 31337 |
| `LEDGER_CHAIN_ID` | Config default `84532`; the example file selects `31337` for local shared-ledger tests |
| `LEDGER_CONTRACT_ADDRESS`, `LEDGER_DEPLOY_TX` | Optional pair for binding an existing compatible deployment; confirmed identity lives in Postgres |

## Records and recovery

PayPal and learning records survive API restarts. In file mode, keep the files separate. Never delete payment records to resolve an uncertain payout: check PayPal and recover the existing request with the same operation IDs. A local disk outage can leave an unsaved result in process memory; restore disk access while the API is running before restarting.

In database mode a reserved payout and its provider IDs are committed before sending. A lost
response or failed result save leaves it reserved as `SENDING` or `UNKNOWN`. Another worker
waits for the 90-second lease before recovering the same operation. Retry the existing request;
do not create a replacement payout. A retry after 29 days requires manual provider review.
Changing backends selects a different pool; it does not reconcile or transfer payment history.

Restarting the Hardhat node creates an empty chain. Saved receipt publication markers can then refer to the previous chain. This is a known reconciliation gap, not a reason to erase payment records. Use disposable test data for a fresh demo; see the [ledger guide](ledger.md).

Changing an RPC URL alone does not complete the approved Base Sepolia migration. Run fixed-ledger
setup first; public RPC/funding and hosted storage validation remain release gates. See
[deployment blockers](../DEPLOYMENT_AUDIT.md) and [the current ledger decision](ADR-003-DURABLE-LEDGER.md).
