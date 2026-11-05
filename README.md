# sprout.io

**Money skills for every kid, funded through PayPal.** Kids aged 8–17 learn money by doing small
activities at an NGO; donors fund their rewards with **PayPal**, adults approve **PayPal payouts**
to guardians, an **AI mentor** (Google Gemini) answers kids' money questions in English or Hindi,
and every PayPal payment becomes a receipt sealed on a **blockchain** so anyone can check it.

Built for the PayPal AI Hackathon. MIT licensed (see [`LICENSE`](LICENSE)).

## What works today

| Feature | Where | What's real |
| --- | --- | --- |
| **Donate with PayPal** | `/soon/donate` | Official PayPal button (JS SDK). Our server creates and captures a **PayPal Orders v2** order on the **sandbox**, checks PayPal's answer (status, currency, exact amount) and makes a receipt. |
| **AI thank-you note** | after a donation | **Gemini** writes the donor a short note on what their captured amount funds, from server-checked facts only (never the donor's identity). Prepared text if no AI key. |
| **Payout to a guardian** | `/soon/payout` | Two of three adults approve, then the server sends a **PayPal Payouts v1** payment to the guardian's sandbox PayPal account and tracks its status. Only money that donors put in the pool can be paid out. |
| **Impact ledger** | `/soon/impact` | PayPal receipts (codes only, no names or emails) are sealed into one Merkle code and published to the `ImpactLedger` smart contract on a local Hardhat blockchain. The browser rebuilds the code and checks it against the chain. |
| **Paisa Mentor (AI)** | `/app` → Mentor | Live Gemini chat for kids, English and Hindi, with safety rules, a trusted-adult card for risky topics, rate limits and offline fallback. |
| Sample demo | `/app` | Earn, four savings jars, goal calculator (sample data, clearly labelled). |
| Previews | `/soon` | NGO dashboard, Seedlings mode, consent, Hindi, classroom, certificates: clickable walkthroughs with sample data, marked "Coming soon". |

Everything with money uses **PayPal sandbox test money**: nothing real is ever charged or paid.
The server's PayPal address is hard-coded to `api-m.sandbox.paypal.com`.

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

1. Log in at [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials** →
   make sure **Sandbox** is selected → **Create App** (type: Merchant).
2. In the app's settings, make sure **Payouts** is ticked under features.
3. Copy the **Client ID** and **Secret** into `server/.env`:

   ```sh
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   ```

4. Under **Testing Tools → Sandbox Accounts** you'll find a **personal** (buyer) account and its
   password (click "…" → View/Edit). Use it to approve donations, and use its email as the
   guardian's email for payouts.

**3. Gemini key (optional, free)**: get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
and set `GEMINI_API_KEY=` in `server/.env`.

Restart `npm run dev` after editing `server/.env`.

**4. Try the whole flow**

1. `/soon/donate`: pick $25 → **Next** → PayPal button → log in with the sandbox **personal**
   account → approve. You get a receipt with PayPal's capture id and an AI thank-you note.
2. `/soon/payout`: pick an amount → approve as two adults → enter the sandbox personal
   account's email → **Send with PayPal Payouts** → **Check status with PayPal**.
3. `/soon/impact` → step 4: **Publish PayPal receipts to the blockchain**. The explorer shows the
   block and the page confirms the code matches the receipts.
4. `/app`: ask Paisa Mentor a money question, in English or हिन्दी.

Receipts and the reward pool live in the server's memory: restarting `npm run dev` starts fresh.

## Tests

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
- Payouts need two different approvals and enough money in the pool. Receipts store salted codes
  (`donor-3fa9c1`, `guardian-81bd02`), never names or emails, so nothing personal goes on chain.
- Only our own website can call the API from a browser; every route is rate-limited.

## Limits (honest scope)

A hackathon prototype, not a finished financial app: no logins (so the demo can't prove *who*
approved a payout), no database (receipts reset on restart), PayPal **sandbox** only, and the
blockchain runs locally. Kids' jars on `/app` are sample data. The plan for each is in
[`PHASES.md`](PHASES.md).

## Files

- `server/src/paypal/`: PayPal client, receipt store, AI note, ✏️ `settings.ts` (amounts, reward value).
- `server/src/routes/`: `paypal.ts`, `ledger.ts`, `mentor.ts`, `health.ts`.
- `client/src/previews/`: `Donate.jsx`, `Payout.jsx`, `PayPalButton.jsx`, `ImpactLedger.jsx`, previews.
- `chain/`: the `ImpactLedger` Solidity contract and tests.
- `docs/mentor-api.md`: the API contract. `PHASE_5_BLOCKCHAIN.md`: the ledger explained.
- `DEMO_SCRIPT.md`: a short live-presentation script. `EDITING.md`: change words by hand.
- `LLM_CONTEXT.md`: full briefing for an AI assistant. `docs/LEARN.md`: codebase tour.

All illustrations (the Sprout mascot) are drawn in code in this repository.
