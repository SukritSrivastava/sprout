# sprout.io

Sprout is a financial-literacy demo for children aged 8–17, built for the PayPal AI Hackathon. Children practise saving and planning, ask an English/Hindi AI mentor questions, and complete picture lessons. Donors fund a separate PayPal sandbox pool; guardian payouts and receipt verification demonstrate how the money flow could work.

All payments use sandbox USD. Learning credits, seeds and the demo's rupee balances have no cash value and do not convert into payouts.

## Run locally

Requires Node.js 22+ and npm. Run these commands from this folder:

```sh
npm ci
```

Copy `server/.env.example` to `server/.env` if it does not already exist. On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

On macOS/Linux, use `cp server/.env.example server/.env`. Keep an existing settings file: it may contain your private credentials.

```sh
npm run dev
```

Open [the local site](http://127.0.0.1:5173). This starts Vite on port 5173, Fastify on 8787 and Hardhat on 8545. Without provider keys, the mentor uses prepared answers and PayPal pages show setup instructions.

The default `DEMO_OPEN_ACCESS=true` lets judges explore without PINs. The yellow notice explains this. Set `DEMO_OPEN_ACCESS=false` on the server to restore PIN checks and guardian permission gates. See [setup](docs/SETUP.md) for both modes and provider configuration.

## What works

| Feature | Route | Scope |
| --- | --- | --- |
| Practice app and Paisa Mentor | `/app` | Sample jars/goals; streamed Gemini replies when configured, otherwise prepared answers |
| Donate | `/soon/donate` | PayPal JS SDK and Orders v2 sandbox capture; optional Gemini thank-you note |
| Guardian payout | `/soon/payout` | Two distinct approval roles, fixed sandbox recipient, reserved funds and recovery |
| Impact ledger | `/soon/impact` | Merkle proofs; local Hardhat demo or fixed shared test-chain contract with durable publication/recovery |
| NGO workspace | `/soon/ngo` | Saved sample activity reviews, learning-credit jars and aggregate CSV reports |
| Seedlings | `/soon/seedlings` | Three server-checked picture lessons, one seed per lesson, optional device read-aloud |
| Guardian controls | `/soon/safety` | Sample permission acknowledgement, withdrawal and learner-data deletion |
| Shared English/Hindi | `/soon/hindi` | Site language follows navigation and persists after reload |
| Presentation | Floating Sprout launcher | Silent manual or automatic walkthrough; only temporary sample controls are automated |
| Classroom and certificates | `/soon/classroom`, `/soon/certificates` | Clickable previews; no offline queue or issued certificate |

Open demo mode deliberately bypasses learning, review and payout PIN/permission gates. Shared
ledger publishing always requires an NGO admin session; viewing proofs stays public. Protected
mode uses PINs, not verified adult accounts. Both modes retain sample labels, revision, amount,
persistence and retry checks.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start website, API and test chain |
| `npm test` | Client, API and Solidity tests with fake providers |
| `npx playwright install chromium` | Install the browser used by the test suite |
| `npm run test:e2e -- --workers=2` | Desktop and phone browser tests |
| `npm run build` | Build the website and type-check/compile the API |
| `npm run check:deployment` | Check local compiled output, entrypoint and contract artifact |
| `npm run test:preview` | Read-only desktop/phone checks against `SPROUT_PREVIEW_URL`; no local services |
| `npm run preview` | Preview compiled website/API; start the chain separately if needed |
| `npm run check:config -w server` | Validate local settings without printing credentials |
| `npm run db:migrate -w server` | Install shared Postgres records when `DATABASE_URL` is configured |
| `npm run db:check -w server` | Read-only database version, ownership, RLS and browser-grant checks |
| `npm run ledger:setup -w server -- --deploy` | Explicitly prepare/recover a dedicated test-chain deployment; see setup before running |

Tests use disposable records and mocked payment providers. Live checks have separate commands and may use provider quotas; see [verification](VERIFICATION.md).

## Find the right document

| Need | Read |
| --- | --- |
| Configure PayPal, Gemini or protected access | [Setup](docs/SETUP.md) |
| Understand the code and storage | [Codebase guide](docs/LEARN.md) |
| Find a feature's source, scripts and tests | [File map](docs/CODE_MAP.md) |
| Change words, lessons, settings or design | [Editing guide](EDITING.md) and [design](DESIGN.md) |
| Integrate with the API | [API contract](docs/mentor-api.md) |
| Understand receipt proofs | [Ledger](docs/ledger.md) |
| Present the working demo | [Judge guide](JUDGE_GUIDE.md) |
| Check test evidence and limitations | [Verification](VERIFICATION.md) |
| See remaining work | [Roadmap](docs/ROADMAP.md) |

## Hosting status

The selected target is **Render backend, Vercel frontend and Supabase Postgres**, with Base
Sepolia for the ledger. `render.yaml` builds the API from the repository root and starts the
compiled Fastify server. Vercel forwards website `/api` requests to Render. Shared payment,
learning, security and ledger records remain transactional. Schema 3 adds default-deny browser
access for Supabase. Schema 4 records the hosted-storage permission policy and requires fresh
protected acknowledgements while preserving progress. Verified TLS accepts Supabase's server root certificate. Local file mode remains
available for development.

Run the explicit migration before starting a database-backed API. The isolated Supabase preview
now has schema 4. Render/Vercel deployment, Base setup and actual hosted validation remain pending. See
[hosting setup](docs/SETUP.md#render-vercel-and-supabase),
[ledger setup](docs/SETUP.md#fixed-shared-ledger-setup) and
[the current hosting decision](docs/ADR-005-RENDER-VERCEL-SUPABASE.md).

Render uses `/api/ready` to check the shared database. `/api/health` remains liveness and
credential-presence information. The receipt history supports older pages without changing
publication, and approved payout requests survive new request creation.

Read the [deployment audit](DEPLOYMENT_AUDIT.md), [hosting decision](docs/ADR-001-HOSTING.md) and [release checklist](docs/DEPLOYMENT_CHECKLIST.md) before deploying. The [security audit](SECURITY_AND_BUG_AUDIT.md) records earlier findings and remaining limits. These are historical reports, not certification of the current working tree.

React/Vite runs the website; Fastify/TypeScript and Zod handle the API; Google Gemini supplies AI; PayPal supplies sandbox checkout and payouts; Hardhat/Solidity and viem supply the local ledger. [MIT licensed](LICENSE).
