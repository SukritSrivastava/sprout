# sprout.io

**Money skills for every kid, funded through PayPal.** Kids aged 8–17 learn money by doing small
activities at an NGO; donors fund their rewards with **PayPal**, adults approve **PayPal payouts**
to guardians, an **AI mentor** (Google Gemini) answers kids' money questions in English or Hindi,
and every PayPal payment becomes a receipt sealed on a **blockchain** so anyone can check it.

Built for the PayPal AI Hackathon. MIT licensed (see [`LICENSE`](LICENSE)).

## Hosted demo plan

Selected on 2026-11-06: **Vercel for the website and Fastify API, Neon Free Postgres, and
Base Sepolia** with a dedicated server-held test key. Visitors will not need a wallet.
The two-day target uses free plans within their quotas; PayPal remains sandbox-only.

**Implementation is pending.** The deployment audit reproduced cross-instance payment,
permission, session and ledger failures. Run this version locally until those release blockers
are fixed. See [`DEPLOYMENT_AUDIT.md`](DEPLOYMENT_AUDIT.md),
[`the hosting decision`](docs/ADR-001-HOSTING.md) and
[`the release checklist`](docs/DEPLOYMENT_CHECKLIST.md). No public URL has been deployed.

## What works today

| Feature | Where | What's real |
| --- | --- | --- |
| **Donate with PayPal** | `/soon/donate` | Official PayPal button (JS SDK). Our server creates and captures a **PayPal Orders v2** order on the **sandbox**, checks PayPal's answer (status, currency, exact amount) and makes a receipt. |
| **AI thank-you note** | after a donation | **Gemini** writes the donor a short note on what their captured amount funds, from server-checked facts only (never the donor's identity). Prepared text if no AI key. |
| **Payout to a guardian** | `/soon/payout` | Two of three adults approve, then the server sends a **PayPal Payouts v1** payment to the guardian's sandbox PayPal account and tracks its status. Only money that donors put in the pool can be paid out. |
| **Impact ledger** | `/soon/impact` | PayPal receipts (codes only, no names or emails) are sealed into one Merkle code and published to the `ImpactLedger` smart contract on a local Hardhat blockchain. The browser rebuilds the code and checks it against the chain. |
| **Paisa Mentor (AI)** | `/app` → Mentor | Live Gemini chat for kids, English and Hindi, with safety rules, a trusted-adult card for risky topics, rate limits and offline fallback. |
| **NGO workspace (local demo)** | `/soon/ngo` | A mentor/admin PIN opens saved sample activity reviews, learning-credit jars, separate PayPal sandbox totals and a downloadable CSV report. |
| **Seedlings (local demo, ages 8–11)** | `/soon/seedlings` | Three English/Hindi picture lessons, server-checked answers, one seed per lesson and a saved shared sample garden. Device read-aloud where supported. Seeds have no cash value. |
| **Guardian permission (local demo)** | `/soon/safety` | Guardian PIN saves a dated demo acknowledgement for each sample learner; withdrawal blocks learning/AI; deletion removes that learner’s learning records. |
| Sample demo | `/app` | Earn, four savings jars, goal calculator (sample data, clearly labelled). |
| **Silent presentation** | **Present with Sprout** launcher | Choose manual steps or a 108-second automatic presentation. The reference-style cursor demonstrates temporary sample controls while Sprout's eyes follow it. No audio or automatic payment/PIN submission. |
| Previews | `/soon` | Full-site Hindi, classroom, certificates: clickable walkthroughs with sample data, marked "Coming soon". |

Everything with money uses **PayPal sandbox test money**: nothing real is ever charged or paid.
The server's PayPal address is hard-coded to `api-m.sandbox.paypal.com`.

Working features are linked directly in the top menu with status labels. The impact ledger
currently uses a **local Hardhat test blockchain**, not a configured public Sepolia deployment.
Seedlings uses one shared sample garden on this computer (no names or private learner accounts).
Its seeds are saved with learning records and never change NGO credit jars or the PayPal pool.

To present the site with your own voice-over:

1. Click the floating **Present with Sprout** button (the Sprout mascot on a phone).
2. Choose **Present manually** to move between steps yourself, or **Present automatically**.
3. Use the arrows to change steps; automatic mode also has **Pause / Resume**.
4. Press **Escape** to close the presentation.

Switch between **Manual** and **Automatic** in the presentation panel without restarting.
Autoplay automatically minimises to a small bottom bar with **Pause / Resume**, **Stop** and
an up arrow to expand captions/settings. The down arrow minimises it again without restarting.
Manual mode leaves the website controls in your hands. Automatic mode changes only temporary
sample earning, the savings split and the goal calculator; it shows PayPal, NGO, ledger and
Seedlings screens without submitting payments, PINs, AI questions or saved lesson completions.
Reduced motion makes the cursor jump between targets. Both modes are silent.

## Tools used

| Tool | How it's used |
| --- | --- |
| **PayPal REST APIs (sandbox)**: Orders v2, Payouts v1, OAuth 2.0 | `server/src/paypal/client.ts`: create and capture donations, send and track guardian payouts. Secret stays on the server. |
| **PayPal JavaScript SDK** | `client/src/previews/PayPalButton.jsx`: the official PayPal button; the donor approves in PayPal's own window. |
| **Google Gemini** (`gemini-3.5-flash-lite`, `@google/genai`) | `server/src/mentor/`: the kids' money mentor (streaming, safety rules). `server/src/paypal/impactNote.ts`: the donor's thank-you note after a PayPal capture. |
| **Hardhat + Solidity, viem** | `chain/`: the `ImpactLedger` contract and its tests; `server/src/ledger/`: publishing PayPal receipt batches. |
| React, Vite, Fastify, zod, Playwright | Website, API, input checks, browser tests. |
| Claude Code (Anthropic) | AI coding assistant used while building. |

## Run it (about 10 minutes)

Requires **Node.js 22+** and npm.

**1. Install and start**

```sh
npm install
cp server/.env.example server/.env
npm run dev
```

Open http://127.0.0.1:5173. `npm run dev` starts the website (5173), the API (8787) and a local
test blockchain (8545). Without any keys, everything opens: the mentor uses prepared answers and
the PayPal pages explain how to add keys.

**2. PayPal sandbox keys (free)**

1. Log in at [developer.paypal.com](https://developer.paypal.com). Under **Testing Tools →
   Sandbox Accounts → Create account**, make a **Business** account with country **United
   States**. (PayPal makes your default test business account in your own country; an Indian one
   can't take USD or send Payouts, and checkout shows "Things don't appear to be working".)
2. **Apps & Credentials** → make sure **Sandbox** is selected → **Create App** (type: Merchant),
   and pick that US business account as the app's sandbox account.
3. In the app's settings, make sure **Payouts** is ticked under features.
4. Copy the **Client ID** and **Secret** into `server/.env`:

   ```sh
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   ```

5. Under **Testing Tools → Sandbox Accounts** you'll find a **personal** (buyer) account and its
   password (click "…" → View/Edit). Use it to approve donations.

**3. Switch on payouts (PINs and the guardian's email)**

Each adult approves a payout with their own PIN, and the server always pays one guardian
email. Add these four lines to `server/.env` (make up your own PINs, at least 6 characters each,
all different):

   ```sh
   PAYOUT_PIN_MENTOR=...
   PAYOUT_PIN_ADMIN=...
   PAYOUT_PIN_GUARDIAN=...
   GUARDIAN_PAYPAL_EMAIL=sb-...@personal.example.com
   ```

For `GUARDIAN_PAYPAL_EMAIL`, use the sandbox **personal** account's email from step 2.5. Without
these lines, donations still work and the payout page explains how to switch payouts on.

**4. Gemini key (optional, free)**: get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
and set `GEMINI_API_KEY=` in `server/.env`.

Restart `npm run dev` after editing `server/.env`. Check your keys without a browser:
`npm run check:paypal -w server` (add `-- <email>` to also send a $1 test payout). Approve
payments in Chrome or Edge with pop-ups allowed; some built-in app browsers block PayPal's window.

**5. Try the whole flow**

1. `/soon/donate`: pick $25 → **Next** → PayPal button → log in with the sandbox **personal**
   account → approve. You get a receipt with PayPal's capture id and an AI thank-you note.
2. `/soon/payout`: pick an amount → **Next** → two adults each type their PIN and press
   **Approve** → **Next** → choose who is sending, type their PIN again → **Send with PayPal
   Payouts** → **Check status with PayPal**.
3. `/soon/impact` → step 4: **Publish PayPal receipts to the blockchain**. Only completed
   donations and payouts PayPal marks as paid (`SUCCESS`) are sealed, so check the payout's
   status first. The explorer shows the block and the page confirms the code matches.
4. `/soon/safety`: record demo permission for A12 with the guardian PIN, then open `/app` and ask Paisa Mentor a money question, in English or हिन्दी.

Receipts, the reward pool and payout requests are saved in `server/data/paypal-records.json`
(git-ignored), so restarting the server keeps them. Do not delete it to resolve an uncertain
payment: first reconcile the payment in PayPal. Reset only disposable test records. (The local
blockchain still starts empty on every `npm run dev`.)

## Tests

Before using `/app`, Seedlings or approving NGO activities:

1. Set a unique `PAYOUT_PIN_GUARDIAN` (6–64 characters) in local `server/.env`. `npm run dev` reloads saved settings automatically; restart the API when using a production build.
2. Open `/soon/safety`, choose the sample learner and read all three permission statements.
3. Tick the statements, enter the guardian PIN and select **Record demo permission**.

Sample A12 owns the shared Seedlings garden and AI demo. B07 and C33 have NGO activities.
The guardian screen also withdraws permission or deletes the selected learner’s learning data;
deletion requires re-entering the PIN and typing the learner code. It leaves PayPal records and
blockchain receipts intact. Existing learning files start with permission pending until a guardian
agrees. This is a local demo acknowledgement, not verified adult identity or production legal consent.
For the full automatic presentation, record A12 permission first; the presentation never agrees for you.

If a saved PIN is not available, run `npm run check:config -w server`. It checks the actual local
settings without printing credentials. Admin, mentor and guardian PINs must differ; duplicate-PIN
errors name the conflicting settings. An older dev command started before this fix needs one restart.

**NGO workspace:** open `/soon/ngo` and use an existing mentor/admin payout PIN. For a judge-ready
walkthrough and setup troubleshooting, see [JUDGE_GUIDE.md](JUDGE_GUIDE.md). One staff PIN opens the workspace;
reviewing a learner also needs their guardian permission as described above. For staff access,
set `PAYOUT_PIN_ADMIN` in `server/.env`, restart the API, then choose **NGO admin**. The form's
**Check access again** button reloads the available roles after setup. **Show PIN** reveals only
the value you typed, and submitting clears and hides it. The server never publishes stored PINs.
No PayPal keys are
needed to review sample activities. Approve or send back each sample once, inspect the learning
jars and download a report. Learning credits never spend or convert the PayPal USD pool.
Reviews are saved separately in `server/data/learning-records.json` (`LEARNING_DATA_FILE`). Staff
access expires after 15 minutes; closing/reloading the page requires a PIN again. PINs and session
tokens are kept out of browser storage. This is a local demo with coded sample learners.

| Command | What it does |
| --- | --- |
| `npm test` | Client maths, server routes (PayPal, mentor, ledger) with fake PayPal/Gemini, and the Solidity contract tests |
| `npm run test:e2e` | Playwright in Chromium at laptop and phone size (first time: `npx playwright install chromium`) |
| `npm run build` | Production build of website and API |

The browser tests stand in for PayPal's window, since approving a real sandbox payment needs a
person to log in. `VERIFICATION.md` lists the manual sandbox checks.

## Safety and privacy

- PayPal secret and Gemini key live only in git-ignored `server/.env`, never in the browser.
- The server decides every amount; the browser picks from a fixed list. Captured amounts are
  checked against what the server asked PayPal for; capturing twice is harmless.
- Payouts: two different adults approve one fixed request with their own PIN, and one of them
  types it again to send. Five wrong PINs lock that adult for 15 minutes. The guardian's email
  comes from `server/.env`, never from the browser.
- If PayPal doesn't answer a payout (timeout, lost connection), the money stays reserved and
  sending again reuses the same PayPal ids. Duplicate responses are looked up and checked against
  the original recipient and amount. Automatic retries stop after 29 days; older payouts need
  manual review in the PayPal sandbox dashboard.
- After a reload, step 1 of `/soon/payout` can recover a request with an adult's PIN. Only its
  request code is remembered in the browser tab; PINs are never saved there. Duplicate adult PINs
  are rejected when the server starts.
- If the records file cannot be saved, payment operations return 503 and the unsaved result
  stays blocked in memory. Once disk access is restored, the result is saved before proceeding.
  Keep the server running during recovery; a file cannot protect unsaved results after a crash.
- Receipts store salted codes (`donor-…`, `guardian-…`), never names or emails, so nothing
  personal goes on chain. The public receipt list hides PayPal's ids.
- The mentor blanks out emails and long numbers (phones, accounts) before anything reaches Gemini.
- Only our own website can call the API from a browser; every route, reads included, is rate-limited.
- The latest security review and what was fixed: [`SECURITY_AND_BUG_AUDIT.md`](SECURITY_AND_BUG_AUDIT.md).

## Limits (honest scope)

A hackathon prototype, not a finished financial app: adults use PINs, not full accounts; records
are a JSON file, not a database; PayPal **sandbox** only; and the blockchain runs locally. Kids'
jars on `/app` are sample data. Run it on your own computer only (the server listens on
127.0.0.1) until the hosted release gates above pass. The plan is in [`PHASES.md`](PHASES.md).

## Files

- `server/src/paypal/`: PayPal client, receipt store (saved to a JSON file), PIN checks, AI note, ✏️ `settings.ts` (amounts, reward value).
- `server/src/routes/`: `paypal.ts`, `ledger.ts`, `mentor.ts`, `health.ts`.
- `client/src/previews/`: `Donate.jsx`, `Payout.jsx`, `PayPalButton.jsx`, `ImpactLedger.jsx`, previews.
- `chain/`: the `ImpactLedger` Solidity contract and tests.
- `docs/mentor-api.md`: the API contract. `PHASE_5_BLOCKCHAIN.md`: the ledger explained.
- `DEMO_SCRIPT.md`: a short live-presentation script. `EDITING.md`: change words by hand.
- `LLM_CONTEXT.md`: full briefing for any AI assistant (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md` point to it). `docs/LEARN.md`: codebase tour.

All illustrations (the Sprout mascot) are drawn in code in this repository.
