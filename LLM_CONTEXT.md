# sprout.io: complete project handoff for another LLM

Read this whole file before touching anything. It is written so that any AI assistant (Claude,
ChatGPT/Codex, Gemini, Cursor, Copilot…) can continue the project without the earlier
conversations. **The source code wins if this file disagrees with it**, and then fix this file.

Snapshot: **2026-11-05**, after Phase 6 (PayPal sandbox live, verified with the user's keys).
Last commit at writing: `1359975`. The user pushes to GitHub themselves.

---

## 1. Handoff prompt (paste this into a new assistant if needed)

> You are continuing **sprout.io**, a financial-literacy app for kids aged 8–17 run through NGOs,
> built for the **PayPal AI Hackathon** (Devpost). PayPal must be central and AI must be
> meaningful. The app is a React website + Fastify API + local Hardhat blockchain. Real today:
> the Gemini AI mentor, PayPal **sandbox** donations and guardian payouts, a Gemini thank-you
> note after each donation, and PayPal receipts sealed on a local blockchain. Everything else is
> clearly labelled sample data or a "Coming soon" preview. The user is learning the code: keep it
> simple, commented in plain English and hand-editable. **Ask before any major change or tech
> decision.** Test with Playwright, keep `LLM_CONTEXT.md` current, commit after each phase,
> never deploy, never commit or print secrets. Start by reading `LLM_CONTEXT.md` fully.

---

## 2. How the user wants you to work (standing rules)

These came from the user over many sessions. Follow all of them.

| Rule | Detail |
| --- | --- |
| Ask first | **Ask before any major change and before any tech decision** not already in `PHASES.md`. The user likes being "grilled" with focused multiple-choice questions, with a recommended option first. Small fixes don't need asking. |
| Explain simply | The user is non-expert and learning. They said "Bro ts is confusing guide me step by step": give **numbered, one-action-per-step** instructions for anything they must do on a website (PayPal dashboard etc.), and avoid jargon. |
| Code style | Small files, a plain-English header comment on every file, simple code the user can edit by hand. Words live in `client/src/content/` (✏️ edit-me files); see `EDITING.md`. |
| Frontend + backend | Work on both together. |
| Test everything | Unit tests + Playwright (desktop 1366×768 and Pixel 7 phone). Add tests with every feature. |
| Docs | Keep `LLM_CONTEXT.md` (this), `README.md`, `VERIFICATION.md`, `PHASES.md`, `EDITING.md`, `docs/LEARN.md`, `docs/mentor-api.md` current after every phase. |
| Commits | Commit after each phase in `sprout/` (its own git repo, branch `main`). End messages with the attribution line the tool requires. **Do not push**: the user pushes (`git push origin main`). |
| No deploy | "Do not deploy." Judges run it locally. |
| No video | The user said "no video": don't produce demo-video work. |
| Voiceover | Parked ("lets not do voice over now"). Don't restart it unless asked. |
| Look | Bold **neo-brutalist**, must **not look AI-made** or like "premium fintech". Thick black borders, hard offset shadows, flat pastel colours, Bricolage Grotesque, the Sprout mascot. Smooth scroll + purposeful motion, always with a reduced-motion path. |
| Honesty | Label everything that isn't real ("Sample", "Coming soon", "PayPal sandbox · test money", "AI, can make mistakes"). |
| Secrets | Keys live only in git-ignored `server/.env`, typed by the user. Never print, log, commit or put them in docs/client code. Before committing, check no key is tracked (`git grep --cached` for a key fragment). The Gemini key was once pasted in chat: recommend rotating it after the hackathon. Never use passwords the user pastes; tell them not to. |

---

## 3. The hackathon (what judges require) and how we meet it

PayPal AI Hackathon requirements, as pasted by the user:

| Requirement | How sprout.io meets it |
| --- | --- |
| Meaningfully integrate a PayPal technology (sandbox) | PayPal **JS SDK** button, **Orders v2** create/capture, **Payouts v1** send/track, OAuth 2.0 client credentials. PayPal is the money flow of the whole product (donor → NGO pool → guardian). |
| Meaningfully incorporate AI | **Google Gemini** (`gemini-3.5-flash-lite`): Paisa Mentor (kids' money chat, English/Hindi, safety rules) and the donor **impact note** written from PayPal's captured amount. |
| Working prototype | Runs locally with `npm run dev`; verified live on the sandbox (see `VERIFICATION.md`). |
| Documentation | `README.md` (features, **Tools used** table, setup from zero), `docs/mentor-api.md`, `PHASE_5_BLOCKCHAIN.md`. |
| Functional demo for judges | Local run instructions (no hosted URL, by the user's choice). Judges need their own free PayPal sandbox app + optional Gemini key. |
| Public repo with licence | github.com/SukritSrivastava/sprout, public, MIT `LICENSE` (copyright Sukrit Srivastava). |
| Demo video < 3 min on YouTube | **User's job; they said not to do video work.** |
| No third-party trademarks without permission | Only the official PayPal button (rendered by PayPal's SDK) and plain "PayPal" text. No copied brand styling. |

Sponsor tools (AG Grid, Postman, Render, Zapier…) are optional and **not used**.

---

## 4. Product

**sprout.io** (the brand; the mascot is **Sprout**; folders/packages/code keep `sprout`).
Kids do small useful activities at an NGO (e.g. a reading hour), a mentor approves, the reward
lands in four jars (**Save, Spend, Give, Invest**), they plan goals, and ask **Paisa Mentor** money
questions in English or Hindi. The NGO holds the real money; donors fund a reward pool with PayPal;
two adults approve payouts, which go to a guardian's PayPal, never to the kid. Every money movement
becomes a receipt; receipts are sealed on a blockchain so anyone can check nothing was edited.
Kid-facing money is in rupees (₹); PayPal sandbox money is **USD** (see §8).

### What is real vs sample

| Feature | Route | Status |
| --- | --- | --- |
| Paisa Mentor (Gemini) | `/app#mentor` | **Real** AI, streamed, en/hi, safety, offline fallback |
| Donate with PayPal | `/soon/donate` | **Real PayPal sandbox** (test money) |
| AI donor thank-you | after donating | **Real** Gemini (prepared text if no key) |
| Payout to guardian | `/soon/payout` | **Real PayPal sandbox** Payouts |
| Impact ledger | `/soon/impact` | **Real** Merkle maths + contract + local chain; steps 1–3 use sample receipts, step 4 uses the real PayPal receipts |
| Demo jars, earn, goals, withdraw | `/app` | Sample data in the browser (refresh resets); withdraw is simulated |
| NGO dashboard, Seedlings (8–11), consent/safety, Hindi everywhere, classroom, certificates | `/soon/*` | "Coming soon" clickable previews, sample data |
| Guided tour | button "Tour with Sprout" | Real UI feature, captions en/hi, no voice |

Not implemented: real money, logins/authentication, a database (PayPal receipts + pool live in
server memory and reset on restart), a public blockchain, deployment.

---

## 5. Repository, setup and commands

Workspace: `C:\Users\Administrator\Documents\ChatGPT\Paypal AI hack\`. App root: **`sprout/`**
(own git repo, remote `origin` = github.com/SukritSrivastava/sprout, branch `main`). The parent
folder is a separate git repo with no commits plus `skill-install-staging/` (not app code): leave
it alone. The parent's `.claude/launch.json` starts `npm --prefix sprout run dev` (port 5173) for
the Claude desktop app's preview pane.

Node **22+** (developed on 24.20), npm workspaces `client`, `server`, `chain`. Windows 11 machine.

```sh
npm install
npx playwright install chromium        # once, for browser tests
cp server/.env.example server/.env     # then the user fills in keys
npm run dev                            # web 127.0.0.1:5173 + api 127.0.0.1:8787 + chain 127.0.0.1:8545
```

| Command (from `sprout/`) | What it does |
| --- | --- |
| `npm run dev` | concurrently: `[web]` Vite, `[api]` tsx watch, `[chain]` Hardhat node |
| `npm run dev:web` / `dev:api` / `dev:chain` | one of them |
| `npm test` | client node tests (11) + server tests (45) + Solidity contract tests (6) |
| `npm run test:e2e` | Playwright (starts/reuses chain, api, web) |
| `npm run test:all` | both |
| `npm run build` | client → `client/dist`, server → `server/dist` |
| `npm run preview` | production web on 4173 + compiled API |
| `npm run check:paypal -w server [-- email]` | checks PayPal sandbox keys: creates a $5 order; with an email also sends a $1 payout and reads its status |
| `npm run eval:mentor` | 12 misuse attempts against the real Gemini |
| `npm run build -w chain` | recompile the contract and export `chain/build/ImpactLedger.json` |
| `npm run make:voice` | parked Gemini TTS script |

`client/vite.config.js` proxies `/api` → `http://127.0.0.1:8787`. The API only reloads `.env` on
restart: `tsx watch` restarts when a `server/src` file changes, so touching `server/src/index.ts`
reloads it.

### `server/.env` settings (validated with zod in `server/src/config.ts`; documented in `.env.example`)

| Name | Default | Meaning |
| --- | --- | --- |
| `API_PORT` | 8787 | not `PORT` (tools set that for the website) |
| `HOST` | 127.0.0.1 | |
| `ALLOWED_ORIGIN` | local 5173/4173 on 127.0.0.1 and localhost | browsers from other origins get 403 |
| `TRUST_PROXY` | false | true only behind a host's proxy |
| `MENTOR_HOURLY_LIMIT` | 300 | mentor questions per hour from everyone |
| `GEMINI_API_KEY` | – | secret; without it the mentor/notes use prepared text |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | |
| `PAYPAL_CLIENT_ID` | – | sandbox app client id (public; sent to the browser for the SDK) |
| `PAYPAL_CLIENT_SECRET` | – | secret; server only |
| `CHAIN_RPC_URL` | http://127.0.0.1:8545 | |
| `PUBLISHER_PRIVATE_KEY` | – | only for a real public chain later; local uses Hardhat test account #0 |

Note: the user's `.env` has short `#…` comments after the PayPal values; Node's env parser treats
them as comments, which is fine.

### Dependencies

Client: react 18, react-dom, react-router-dom 7, motion 14 (`motion/react`), lenis 1.3,
lucide-react, @fontsource-variable/bricolage-grotesque. Dev: vite 6.
Server: fastify 5, zod 4, @google/genai 2.32, viem 2.57. Dev: typescript 7, tsx, @types/node,
@breezystack/lamejs (voice script only). Chain: hardhat 3.21 (dev). Root dev: @playwright/test,
concurrently. **No PayPal npm package**: the server calls PayPal's REST API with `fetch`, and the
browser loads PayPal's SDK script from `https://www.paypal.com/sdk/js`. Prettier 3 via npx (width
100, single quotes), no lint, no CI. `npm audit` flags an old zod bundled inside Hardhat (dev
only; accepted).

---

## 6. Architecture

```
Browser (React, :5173)                 API server (Fastify, :8787)                 Outside
───────────────────────                ───────────────────────────                 ───────
/app mentor chat ── POST /api/mentor/chat ──▶ mentor/ (rules, safety) ──────────▶ Google Gemini
/soon/donate  PayPal SDK button
   createOrder ── POST /api/paypal/orders ──▶ paypal/client.createOrder ────────▶ PayPal sandbox
   (donor approves in PayPal's pop-up)                                             Orders v2
   onApprove ── POST /api/paypal/orders/:id/capture ▶ captureOrder, checks, ────▶ (capture)
                                               store.addDonation, impactNote ──▶ Gemini
/soon/payout ── POST /api/paypal/payouts ──▶ 2 approvals + pool check, sendPayout ▶ PayPal Payouts v1
             ── GET /api/paypal/payouts/:id ▶ getPayout
/soon/impact ── POST /api/ledger/publish(-live) ▶ ledger/merkle (batch code) ─────▶ Hardhat chain :8545
             ── GET /api/ledger/batches/:id ──▶ ledger/chain (viem)                 ImpactLedger contract
```

Server rules shared by all routes: `origin.ts` (`onlyOurWebsite`: other websites' browsers → 403,
CORS + preflight for ours), `rate-limit.ts` (in-memory sliding window, forgets quiet keys), 16KB
body limit, JSON 404s. `app.ts` → `buildApp(config, { model, chain, paypal, rateLimit, logger })`;
tests inject fakes (`model: null` = prepared answers, fake chain, fake PayPal).

---

## 7. Source map (every tracked file that matters)

### Client (`client/src/`)

| File | Responsibility |
| --- | --- |
| `main.jsx` | BrowserRouter, font, Lenis CSS, styles |
| `App.jsx` | shell: reduced-motion (OS + header toggle, starts/stops Lenis), `useHashScrolling`, page transitions (`AnimatePresence`, instant when motion is off), routes `/`, `/app`, `/soon`, `/soon/:id`, 404, header/footer, tour |
| `content/` ✏️ | **all site words**: `site.js` (nav, footer note, tour button, 404), `home.js` (hero, how, mentor band, trust, "Live and coming soon" list `show: ['donate','payout','impact','ngo','seedlings']`, closing), `demo.js` (`sampleKid`, `jars`, demo words, `mentorText` en/hi, `offlineAnswers`), `tour.js` (8 steps `{path,id,seconds,en,hi}`) |
| `pages/Landing.jsx` | `/` sections ids `home`, `how`, `meet-mentor`, `trust`, `soon` |
| `pages/Demo.jsx` | `/app`: Earn, Jars, Growth, Mentor, Withdraw; owns `earned`, `save`, `goalId`, `monthly` |
| `pages/Soon.jsx` | `SoonHub` (`/soon`, lists previews, green "Live" stamps) and `SoonPreview` |
| `pages/NotFound.jsx` | 404 |
| `components/Layout.jsx` | `Brand`, `SiteHeader` (nav: How it works, Mentor, Coming soon; motion toggle; phone menu), `SiteFooter`, `TourLauncher` |
| `components/Mascot.jsx` | Sprout SVG, moods `happy`/`think`/`cheer` |
| `components/Tour.jsx` | tour panel: clock, en/hi captions, navigates `path#id`, highlights `.tour-target` |
| `components/landing/*.jsx` | `Hero`, `HowItWorks`, `MeetMentor`, `Trust`, `ComingSoon` (rows use `live` stamp), `Closing` |
| `components/demo/*.jsx` | `Earn`, `Jars`, `Growth`, `Mentor` + `ChatBubble`, `Withdraw` (simulated trail) |
| `previews/index.js` | registry `{ id, title, live?, line, icon, color, component }`; `live` = green stamp text ("Live · PayPal sandbox", "Live · local blockchain") for donate, payout, impact |
| `previews/Walkthrough.jsx` | shared step frame: banner (yellow "Coming soon · Nothing here is real", or green `realNote` for live pages), step dots, Back/Next, last step "What this will do when it's live" or "What’s real here" |
| `previews/PayPalButton.jsx` | real PayPal SDK button: `createOrder` → our API, `onApprove` → capture; `onBusy`, `onError` (pop-up-blocked message), `onPaid`; also `PayPalSetupNotice` (no keys) |
| `previews/Donate.jsx` | amount chips ($5/10/25/50) → PayPal → receipt card (id, capture id, donor code, pool) + AI note card ("Written by AI (Gemini)" / "Prepared note (AI offline)"); amounts lock after paying |
| `previews/Payout.jsx` | Aanya asks $5/8/12, pool shown, 2-of-3 approvers (mentor, admin, guardian), guardian sandbox email form, "Send $X with PayPal Payouts", status words, "Check status with PayPal" |
| `previews/ImpactLedger.jsx` | 6 steps: fingerprints (sample receipts), batch code + publish to chain + explorer, verify a receipt, **step 4 "Now with real PayPal receipts"**, proves/doesn't, what's real |
| `previews/LivePayPalReceipts.jsx` | lists live receipts, "Publish N PayPal receipts to the blockchain", explorer, browser-rebuilt code must match chain |
| `previews/ChainExplorer.jsx` | mini block explorer (status, block, tx, time, from, to, code, gas, fee in test ETH) |
| `previews/NgoDashboard.jsx`, `Seedlings.jsx`, `Safety.jsx`, `More.jsx` (`Hindi`, `Classroom` PIN 1234, `Certificates` code SPR-MB1-7Q4K) | Coming-soon previews |
| `lib/api.js` | `call(path, options)` / `post(path, body)` → `{ok:true,...}` or `{ok:false,status,message}`, never throws |
| `lib/paypalApi.js` | `paypalConfig`, `liveReceipts`, `createOrder`, `captureOrder`, `sendPayout`, `payoutStatus`, `dollars` |
| `lib/paypalSdk.js` | loads `https://www.paypal.com/sdk/js?client-id=…&currency=USD&intent=capture&components=buttons` once |
| `lib/ledger.js` | SHA-256 Merkle maths: `leafHash`, `buildTree`, `proofFor`, `verifyReceipt`, `short` |
| `lib/ledgerApi.js` | `ledgerStatus`, `readBatch`, `publishBatch`, `publishLiveReceipts`, `shortHex` |
| `lib/mentorApi.js`, `lib/useMentorChat.js` | mentor streaming client and chat hook |
| `lib/model.js` | `money`, `splitReward`, `projectSavings`, `monthsToGoal`, `describeMonths`, goals |
| `lib/tour.js`, `motion.jsx`, `scroll.js`, `hooks.js`, `icons.js` | tour timing, animation helpers, Lenis scrolling, `useCountUp`, icon props |
| `styles.css` | the whole design system (tokens → components → pages → tour → reduced motion → tablet/phone) |
| `*.test.js` in `lib/` | `model`, `ledger`, `tour` unit tests (node:test) |

### Server (`server/`)

| File | Responsibility |
| --- | --- |
| `src/index.ts` | starts the server |
| `src/config.ts` | env loading (`process.loadEnvFile`) + zod validation |
| `src/app.ts` | builds the app, creates model/chain/PayPal/store, registers routes |
| `src/origin.ts`, `src/rate-limit.ts` | origin allow-list + CORS; rate limiter |
| `src/routes/health.ts` | `GET /api/health` → `{ ok, service, mentor:{aiConfigured}, paypal:{sandboxConfigured} }` |
| `src/routes/mentor.ts` | `POST /api/mentor/chat`, NDJSON stream `start`/`delta`/`done` |
| `src/mentor/` | `prompt.ts` ✏️ (`MENTOR_RULES`, `LANGUAGE_RULES`, `SENSITIVE_TOPIC_RULE`), `settings.ts` ✏️ (model, temperature 0.5, 400 tokens, 15s, 600 chars, 12 messages, 20 per 5 min), `safety.ts` (risky-topic words incl. Hindi/Hinglish), `prepared.ts`, `schema.ts` (goal names enum), `model.ts` (only Gemini caller; `MentorModel` interface) |
| `src/paypal/client.ts` | **only PayPal caller.** `PAYPAL_SANDBOX_API = https://api-m.sandbox.paypal.com` hard-coded; `CURRENCY = 'USD'`; token cache; `createOrder`, `captureOrder`, `sendPayout`, `getPayout`; `PayPal-Request-Id` for safe retries; `PayPalError(status, issue)` |
| `src/paypal/store.ts` | in-memory receipts + pool. Ids `DON-yymm-nnnn` / `PAY-yymm-nnnn`; refs `donor-<6 hex>` (salted SHA-256 of PayPal payer id) and `guardian-<6 hex>` (of email); random salt per server start; pool = donations − payouts not failed; payouts reserved as `SENDING` before calling PayPal; live batches start at **101** |
| `src/paypal/impactNote.ts` | Gemini donor note (`NOTE_RULES` ✏️: 2–3 sentences, ≤60 words, facts only), via `MentorModel`, 10s timeout, prepared fallback |
| `src/paypal/settings.ts` ✏️ | `ngoName`, `donationAmounts [5,10,25,50]`, `rewardDollars 2`, `maxPayoutDollars 50`, `approvers ['mentor','admin','guardian']` |
| `src/routes/paypal.ts` | PayPal routes (§9) |
| `src/ledger/merkle.ts` | same receipt maths as the client (parity-tested) + `batchTotals` |
| `src/ledger/chain.ts` | viem client: lazy deploy of `ImpactLedger` (address saved in git-ignored `chain/deployments/<chainId>.json`), one-at-a-time write queue (avoids nonce clashes), `status`, `publish`, `readBatch` with tx details |
| `src/routes/ledger.ts` | ledger routes (§9) incl. `publish-live` |
| `scripts/check-paypal.ts` | `npm run check:paypal -w server` |
| `scripts/eval-mentor.ts`, `scripts/make-voice.ts` | misuse eval; parked voice |
| `test/*.test.ts` | `health`, `mentor`, `ledger`, `paypal` (node:test + `app.inject`, fakes only) |

### Chain (`chain/`)

`contracts/ImpactLedger.sol` (Solidity 0.8.28): `publisher` = deployer (immutable);
`publishBatch(uint64 batchId, bytes32 root, uint128 donated, uint128 rewarded, uint128 paidOut,
uint32 receipts)` publisher-only, write-once (`AlreadyPublished`), non-empty root (`EmptyRoot`),
event `BatchPublished`; `batches(id)`. `contracts/ImpactLedger.t.sol`: 6 Solidity tests.
`scripts/export-contract.js` writes the committed `build/ImpactLedger.json` (abi + bytecode).
`hardhat.config.js`: `defineConfig({ solidity: '0.8.28' })`. Chain id 31337. Pretend wallet =
Hardhat test account #0 `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (public key, refused on any
non-local RPC). Contract usually lands at `0x5fbdb2315678afecb367f032d93f642f64180aa3`.
Restarting `npm run dev` gives a fresh empty chain.

### Tests and docs

`e2e/`: `api`, `page`, `demo`, `mentor`, `tour`, `phone`, `soon`, **`paypal`** specs;
`fixtures.js` fails any test that logs a browser console error unless listed in
`expectedConsoleErrors`. `playwright.config.js` starts chain, api, web (reuses running ones).
Docs: `README.md` (judges), `EDITING.md` (hand edits), `PHASES.md` (decisions + phases + "Later"),
`PHASE_5_BLOCKCHAIN.md` (ledger for judges), `VERIFICATION.md` (dated evidence),
`DEMO_SCRIPT.md` (live presentation), `DESIGN.md` + `docs/REDESIGN.md` (look),
`docs/LEARN.md` (codebase tour), `docs/mentor-api.md` (full API contract).

---

## 8. PayPal integration in detail (the centre of the project)

**Donation flow:** donor picks an allowed amount → PayPal SDK button → `createOrder` calls
`POST /api/paypal/orders {amount}` → server checks the amount is in the list, creates an Orders v2
order (`intent: CAPTURE`, USD) and remembers `orderId → amount` → donor approves in PayPal's
pop-up → `onApprove` calls `POST /api/paypal/orders/:id/capture` → server captures and only makes
a receipt if status is `COMPLETED`, currency USD and the amount equals what it created (404 for
orders it didn't create; capturing twice returns the same receipt) → Gemini writes the impact note
from the amount and reward count only (never donor data) → page shows receipt + note.

**Payout flow:** `POST /api/paypal/payouts {email, amount, approvals}` → needs ≥2 **different**
approvers from the list and `amount ≤ pool` → receipt reserved (`SENDING`) → Payouts v1 call →
receipt gets PayPal batch id + status (usually `PENDING`, later `SUCCESS`/`UNCLAIMED`); if PayPal
refuses, the receipt is dropped and the pool is untouched; `GET /api/paypal/payouts/:batchId`
refreshes status; failed/returned/blocked statuses put money back in the pool. The guardian email
goes only to PayPal; the receipt stores a salted code. Approvals are honour-based (no logins):
this is stated on the page and in the README.

**Ledger link:** `POST /api/ledger/publish-live` takes the server's own unpublished receipts (not
`SENDING`), up to 64, computes the Merkle root from `id|type|amount|date|ref` only, skips batch
numbers already on the chain, publishes, and marks them with the batch id (101, 102…).

**Sandbox gotchas found with the user (important for anyone setting it up):**
1. **The sandbox business account must be in the United States.** PayPal creates the default
   sandbox business account in the developer's own country. The user's was Indian, which caused
   checkout error `UNSUPPORTED_PAYEE_CURRENCY` ("Things don't appear to be working at the moment"
   in the pop-up; the base64 `code=` in the error URL decodes to the reason) and payouts error
   `403 PAYOUT_NOT_AVAILABLE`. Fix: Testing Tools → Sandbox Accounts → Create account → Business,
   country United States; then Apps & Credentials → Create App (Merchant) linked to that account;
   tick **Payouts** in the app's Features; put the new Client ID/Secret in `server/.env`.
2. **Pop-ups:** the Claude desktop app's built-in browser blocks PayPal's pop-up. Use Chrome or
   Edge with pop-ups allowed. `PayPalButton` shows a clear message when the pop-up is blocked.
3. The buyer logs in with the sandbox **Personal** account (`sb-…@personal.example.com`), not the
   business one and not a real PayPal login.
4. Why USD: INR only works for Indian in-country PayPal accounts.
5. If the user pastes keys without names, add `PAYPAL_CLIENT_ID=` / `PAYPAL_CLIENT_SECRET=`.
   Client IDs start with `A`, secrets with `E`.

Live check passed on 2026-11-05: $25 donation captured (receipt `DON-2611-0001`), $8 payout
accepted (PENDING), both sealed as batch #101 in block #3 with a matching code.

---

## 9. API summary (full contract in `docs/mentor-api.md`)

| Route | Notes |
| --- | --- |
| `GET /api/health` | ok + whether Gemini and PayPal keys are set |
| `POST /api/mentor/chat` | `{language:'en'\|'hi', messages[1–12], context?}` → NDJSON stream; 20 per 5 min per device + hourly cap |
| `GET /api/paypal/config` | `{configured, clientId, currency, mode:'sandbox', amounts, rewardDollars, maxPayoutDollars, ngoName, poolDollars}` |
| `POST /api/paypal/orders` | `{amount}` → `{id}` |
| `POST /api/paypal/orders/:id/capture` | → `{receipt, note:{text,source}, poolDollars}` |
| `POST /api/paypal/payouts` | `{email, amount, approvals}` → `{receipt, poolDollars}` |
| `GET /api/paypal/payouts/:batchId` | refreshed `{receipt, poolDollars}` |
| `GET /api/paypal/receipts` | `{receipts, poolDollars}` |
| `GET /api/ledger/status` | `{ok, chainId, blockNumber, contract, publisher, local}` |
| `POST /api/ledger/publish` | sample batch `{batchId, receipts}`; server computes the root |
| `POST /api/ledger/publish-live` | real PayPal receipts → `{batch, alreadyPublished, receipts}` |
| `GET /api/ledger/batches/:id` | `{batch}` or `{batch:null}` |

Error shape: `{ error: '<code>', message: '<human readable>' }`. PayPal errors → `502 paypal_error`
with `issue` and friendly messages (`ORDER_NOT_APPROVED`, `INSUFFICIENT_FUNDS`,
`PAYOUT_NOT_AVAILABLE`, `AUTHORIZATION_ERROR`, bad keys); no keys → `503 paypal_not_configured`;
chain down → `503 chain_unreachable`. Rate limits: PayPal orders/captures 20, payouts 10, ledger
publishes 10, per device per 5 minutes.

---

## 10. Behaviour details (UI)

- **Home `/`**: animated hero with sample jars card and Sprout; three steps; yellow mentor band
  with en/hi sample chat; black trust band (says donations/payouts run on real PayPal sandbox);
  "Live and coming soon" list (donate, payout, impact stamped Live; ngo, seedlings); "Start with ₹0".
- **Demo `/app`**: balance ₹200; "Complete the activity" +₹200 with burst and cheer; jars with a
  save slider (rest split 60/20/20); goals Headphones ₹1,000 / Bicycle ₹6,000 / Laptop ₹30,000,
  monthly ₹100/250/500, 8% growth chart; Paisa Mentor chat (Live AI / Offline mode tag, thinking
  dots, streaming, suggestions, Hindi switch, trusted-adult card with Childline 1098 for risky
  topics, 429/400 notices, client fallback); simulated Withdraw trail.
- **`/soon` hub**: nine rows, three with green Live stamps. Previews use `Walkthrough`.
- **Tour**: 8 steps, ~84 s, across `/`, `/app`, `/soon/impact`, `/soon`; en/hi captions; last
  step "Real PayPal, and more coming".
- **Motion**: Lenis smooth scroll + Motion animations; off via OS reduced-motion or the header
  toggle (desktop ≥1100 px), which also stops Lenis and swaps pages instantly. Hover effects only
  on mouse devices (`@media (hover:hover) and (pointer:fine)`).
- **Design tokens** (`styles.css`): ink `#111111`, paper `#faf9f4`, mint `#d9efdf`, green
  `#a8cfb4`, green-strong `#5fa877`, purple `#c1aff0`, lavender `#eee9f7`, peach `#f3b4a2`, yellow
  `#f9ca6b`; borders 3px/2px ink; hard shadows 3/6/8px; radius 14/10px; font Bricolage Grotesque
  with Devanagari fallbacks. Body text ≥14 px everywhere (a Playwright test enforces it).

### Model contracts (`lib/model.js`)

`splitReward(amount, savePercent)` → `[save, spend, give, invest]` integers summing to `amount`.
`projectSavings(monthly, years, rate=0.08)` → `{balance, contributed, points}` (₹100 × 5y = ₹7,348).
`monthsToGoal(monthly, goal, rate=0.08, max=240)` → months or null. `describeMonths(n)` → "2 years
2 months".

---

## 11. Verification status

`npm test`: **62 pass** (11 client, 45 server, 6 contract). `npx playwright test`: **162 pass, 9
skipped by design** (desktop + phone). PayPal browser tests (`e2e/paypal.spec.js`) replace PayPal's
SDK with a stand-in button and fake `/api/paypal` answers, because approving a real payment needs
a human login; the real sandbox was checked by hand (§8). Opt-in `LIVE_AI=1` test hits real Gemini.

**Known flake:** on a busy laptop, one older animation-heavy test per full run (a different one
each time: tour entry points, Withdraw, `#section` landing) can time out while smooth-scroll is
still moving; each passes alone. Not fixed yet (a candidate: run those with reduced motion).
Testing note: the Claude app's preview pane freezes animations when hidden; judge motion with
Playwright.

---

## 12. History (commits on `main`, oldest first) and decisions

| Commit | What |
| --- | --- |
| `56eece5` | baseline Sprout frontend demo |
| `1827deb` | Prettier format |
| `7f2f7b1` | polish: projector-readable text, goal picker, count-ups |
| `4b8e9dd` | Phase 0: API server, proxy, Playwright, `docs/LEARN.md` |
| `253019e` | Redesign v2: neo-brutalist, Sprout mascot, Lenis + Motion, two pages |
| `b3049b0` | Phases 1–2: live Paisa Mentor on Gemini |
| `3377677` | mentor misuse hardening (origin, hourly cap, Hinglish safety, eval) |
| `f37b753`, `620fa31` | Phase 3: nine Coming-soon previews at `/soon` |
| `dbb853f`, `477eb26` | Phase 4: bilingual tour, voiceover parked, readability pass, demo script |
| `be38cda` | rename to sprout.io; hover only on mouse devices |
| `6c983f9` | hand-editable content folder + `EDITING.md`; Phase 5 plan |
| `1dbed94` | Phase 5: ImpactLedger on a local Hardhat chain, publish + explorer + verify |
| `a000dbe` | Phase 6: PayPal sandbox donations/payouts, Gemini donor note, live receipts on chain, judge README |
| `1359975` | PayPal verified live; US-account setup; `check:paypal`; pop-up message |

Key decisions the user made (don't reopen without asking): React+Vite, Fastify+TS, Gemini
`gemini-3.5-flash-lite`; neo-brutalist look with mascot; one "edit me" content folder; Phase 5
on a **local Hardhat chain with a pretend wallet** ("Do not use any wallet"), publish button +
mini explorer; Phase 6 **Donate + Payout** on the real sandbox, **donation impact note** as the
AI-PayPal link, PayPal receipts **linked to the ledger**, judges run **locally** (no Render/deploy);
no video; voiceover parked; product name sprout.io (brand only).

---

## 13. Ideas for next steps (ask the user before starting any)

- Persist PayPal receipts and the pool (SQLite or a hosted DB) so restarts don't clear them.
- PayPal webhooks (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.PAYOUTSBATCH.*`) for status (needs a public URL/tunnel).
- Real logins so each adult approves from their own account.
- Publish to a public test network (Base Sepolia): set `CHAIN_RPC_URL` + `PUBLISHER_PRIVATE_KEY` (user types the key).
- Fix the animation-timing flake in older Playwright tests.
- Optional hosted demo (Render is a sponsor) only if the user changes their "no deploy" decision.

Never put secrets in this file, client code or docs.
