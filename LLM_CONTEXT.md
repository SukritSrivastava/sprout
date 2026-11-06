# sprout.io: complete project handoff for another LLM

Read this whole file before touching anything. It is written so that any AI assistant (Claude,
ChatGPT/Codex, Gemini, Cursor, Copilot…) can continue the project without the earlier
conversations. **The source code wins if this file disagrees with it**, and then fix this file.

Snapshot: **2026-11-06**, after guardian consent/deletion, Seedlings and the silent presentation feature.
Baseline commit: `138164b`; the guardian environment follow-up is recorded in `VERIFICATION.md`.
The user pushes to GitHub themselves.

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
| NGO dashboard | `/soon/ngo` | Working local demo: staff PIN, saved sample reviews/jars, separate sandbox totals, aggregate CSV |
| Seedlings (8–11) | `/soon/seedlings` | Working shared sample garden, three checked lessons, saved one-time seeds, en/hi read-aloud |
| Guardian consent/safety | `/soon/safety` | Working local demo: guardian PIN acknowledgement, withdrawal and selected-learner deletion |
| Hindi everywhere, classroom, certificates | `/soon/*` | "Coming soon" clickable previews, sample data |
| Silent presentation | floating "Present with Sprout" / "Tour with Sprout" | Manual or automatic, 12 steps, reference cursor, mascot gaze, en/hi captions, no audio |

Not implemented: real money, full adult accounts (adults approve payouts with PINs from
`server/.env`), a real database (PayPal records are one JSON file, `server/data/paypal-records.json`),
a public blockchain, deployment.

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
| `npm test` | client node tests (24) + server tests (113) + Solidity contract tests (6) |
| `npm run test:e2e` | Playwright (starts/reuses chain, api, web) |
| `npm run test:all` | both |
| `npm run build` | client → `client/dist`, server → `server/dist` |
| `npm run preview` | production web on 4173 + compiled API |
| `npm run check:paypal -w server [-- email]` | checks PayPal sandbox keys: creates a $5 order; with an email also sends a $1 payout and reads its status |
| `npm run eval:mentor` | 12 misuse attempts against the real Gemini |
| `npm run build -w chain` | recompile the contract and export `chain/build/ImpactLedger.json` |
| `npm run make:voice` | parked Gemini TTS script |

`client/vite.config.js` proxies `/api` → `http://127.0.0.1:8787`. `server/scripts/dev.mjs` keeps
`tsx watch` for source edits and also polls `.env` metadata for saves/replacements,
asking tsx to restart. Production `npm run start` still needs a manual restart after settings edits.
`npm run check:config -w server` validates local settings without printing credentials.

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
| `PAYOUT_PIN_MENTOR` / `_ADMIN` / `_GUARDIAN` | – | each adult's payout PIN (6+ chars); all three + guardian email switch payouts on |
| `GUARDIAN_PAYPAL_EMAIL` | – | the only payee; a sandbox personal account email |
| `DATA_FILE` | `data/paypal-records.json` | where PayPal records are saved (relative to `server/`; git-ignored) |

Note: the user's `.env` has short `#…` comments after the PayPal values; Node's env parser treats
them as comments, which is fine.

### Dependencies

Client: react 18, react-dom, react-router-dom 7, motion 14 (`motion/react`), lenis 1.3,
lucide-react, @fontsource-variable/bricolage-grotesque. Dev: vite 6.
Server: fastify 5, zod 4, @google/genai 2.32, viem 2.57. Dev: typescript 7, tsx, @types/node,
@breezystack/lamejs (voice script only). Chain: hardhat 3.21 (dev). Root dev: @playwright/test,
concurrently. **No PayPal npm package**: the server calls PayPal's REST API with `fetch`, and the
browser loads PayPal's SDK script from `https://www.paypal.com/sdk/js`. Prettier 3 via npx (width
100, single quotes), no lint, no CI. `npm audit` flags an old zod 3 bundled inside Hardhat (dev
tool only; no patched zod 3 exists, and forcing zod 4 into Hardhat was tried and rejected on
2026-11-05; accepted until Hardhat updates).

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
| `content/` ✏️ | **all site words**: `site.js` (nav, footer note, tour button, 404), `home.js` (hero, how, mentor band, trust, "Live and coming soon" list `show: ['donate','payout','impact','ngo','seedlings']`, closing), `demo.js` (`sampleKid`, `jars`, demo words, `mentorText` en/hi, `offlineAnswers`), `tour.js` (12 steps `{path,id,seconds,cues,en,hi}` and `tourUi` controls) |
| `pages/Landing.jsx` | `/` sections ids `home`, `how`, `meet-mentor`, `trust`, `soon` |
| `pages/Demo.jsx` | `/app`: Earn, Jars, Growth, Mentor, Withdraw; owns `earned`, `save`, `goalId`, `monthly` |
| `pages/Soon.jsx` | `SoonHub` (`/soon`, lists previews, green "Live" stamps) and `SoonPreview` |
| `pages/NotFound.jsx` | 404 |
| `components/Layout.jsx` | `Brand`, `SiteHeader` (nav: How it works, Mentor, Coming soon; motion toggle; phone menu), `SiteFooter`, `TourLauncher` |
| `components/Mascot.jsx` | Sprout SVG, moods `happy`/`think`/`cheer` |
| `components/Tour.jsx` | silent mode chooser, manual/automatic clock, pause, route readiness, en/hi captions and focus restoration |
| `components/PresentationCursor.jsx`, `lib/presentation.jsx`, `lib/usePresentationPointer.js` | reference SVG cursor; shared motion values and sample-action allow-list; cue tracking/camera/cleanup |
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
| `previews/NgoDashboard.jsx`, `Seedlings.jsx` | Working local sample workspace and saved picture lessons |
| `previews/Safety.jsx`, `content/guardian.js`, `lib/permission.jsx` | Working guardian demo permission, withdrawal, selected-learner deletion and learning gate |
| `previews/More.jsx` (`Hindi`, `Classroom` PIN 1234, `Certificates` code SPR-MB1-7Q4K) | Coming-soon previews |
| `lib/api.js` | `call(path, options)` / `post(path, body)` → `{ok:true,...}` or `{ok:false,status,message}`, never throws; a 200 that isn't a JSON object counts as a failure |
| `lib/paypalApi.js` | `paypalConfig`, `liveReceipts`, `createOrder`, `captureOrder`, `requestPayout`, `approvePayout`, `sendPayout`, `payoutStatus`, `dollars` |
| `lib/paypalSdk.js` | loads `https://www.paypal.com/sdk/js?client-id=…&currency=USD&intent=capture&components=buttons` once; any failure or a 20 s timeout clears it so a retry works |
| `lib/sampleReceipts.js` | the six sample receipts (INR) of batch 1; must equal `server/src/ledger/sample.ts` (tested) |
| `lib/safety.js` | copy of the server's sensitive-word list for offline use; must equal `server/src/mentor/safety.ts` (tested) |
| `lib/ledger.js` | SHA-256 Merkle maths: `leafHash`, `buildTree`, `proofFor`, `verifyReceipt`, `short` |
| `lib/ledgerApi.js` | `ledgerStatus`, `readBatch`, `publishBatch`, `publishLiveReceipts`, `shortHex` |
| `lib/mentorApi.js`, `lib/useMentorChat.js` | mentor streaming client (needs a `done` event, else `cutShort`) and chat hook (message ids + a round counter so a cleared chat ignores late replies; long mentor replies trimmed to 1,000 chars in history; offline sensitive check) |
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
| `src/paypal/store.ts` | receipts, pool, open orders and payout requests, saved to `DATA_FILE` after every change (temp file + rename). Ids `DON/PAY/REQ-yymm-nnnn` from counters that never go back; refs `donor-<16 hex>` / `guardian-<16 hex>` (salted SHA-256; salt saved in the file); pool = donations − payouts not failed (`UNKNOWN` stays reserved); a `SENDING` payout found at start-up becomes `UNKNOWN`; `unpublished()` = completed donations + `SUCCESS` payouts only; public list hides `paypalId`; orders expire after 24 h, max 500; live batches start at **101** |
| `src/paypal/pins.ts` | constant-time PIN check; 5 wrong PINs lock that adult 15 min (shared by all addresses) |
| `src/paypal/impactNote.ts` | Gemini donor note (`NOTE_RULES` ✏️: 2–3 sentences, ≤60 words, facts only), via `MentorModel`, 10s timeout, prepared fallback |
| `src/paypal/settings.ts` ✏️ | `ngoName`, `donationAmounts [5,10,25,50]`, `rewardDollars 2`, `maxPayoutDollars 50`, `approvers ['mentor','admin','guardian']` |
| `src/routes/paypal.ts` | PayPal routes (§9): donations, payout request → PIN approvals → send, status (15 s cache) |
| `src/mentor/privacy.ts` | blanks out emails and 7+ digit numbers before Gemini sees any turn |
| `src/ledger/merkle.ts` | same receipt maths as the client (parity-tested), format v2 with currency; `batchTotals` refuses mixed currencies |
| `src/ledger/sample.ts` | the fixed sample receipts; the only ones `/api/ledger/publish` accepts |
| `src/ledger/chain.ts` | viem client: deploys `ImpactLedger` on the first **publish** only (address + deploy block saved in git-ignored `chain/deployments/<chainId>.json`); reads never deploy; event search starts at the deploy block; published batches cached; exact-loopback `isLocal`; Hardhat key only on chain 31337; one-at-a-time write queue |
| `src/routes/ledger.ts` | ledger routes (§9) incl. `publish-live`; publishes queued one at a time; reads rate-limited |
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

**Payout flow (since the 2026-11-05 audit fixes):** `POST /api/paypal/payout-requests {amount}`
makes a request bound to that amount and to `GUARDIAN_PAYPAL_EMAIL` → two different adults
`POST …/:id/approve {approver, pin}` with their own `PAYOUT_PIN_*` → one of them
`POST …/:id/send {approver, pin}` (PIN again) → checks the pool and that no payout is `UNKNOWN` →
receipt reserved (`SENDING`) and a sender batch id saved **before** the Payouts v1 call → receipt
gets PayPal batch id + status. A clear 4xx refusal on the first try → `REJECTED` (money back in
the pool, id kept). A timeout, lost answer or 5xx → `UNKNOWN` (money reserved, new payouts
blocked); sending the same request again retries with the same ids. Duplicate responses are
resolved through a sandbox-only lookup and checked against the operation, payee and amount.
Retries are limited to 29 days from first send (legacy records use request creation time).
Older unknown payouts stay reserved for manual review. Distinct adult PINs are enforced at startup.
`POST …/:id/recover {approver,pin}` restores a request after reload; sessionStorage remembers
only the request code. The API helper preserves recovery data even on HTTP errors.
If a record save fails, store reads/changes remain blocked until the pending result can be saved.
Do not restart during a disk outage: unsaved results still require provider reconciliation after a crash.
`GET /api/paypal/payouts/:batchId` refreshes status; failed/returned/blocked statuses put money
back in the pool. The email never reaches the browser; receipts store a salted code.

**Ledger link:** `POST /api/ledger/publish-live` takes the server's own settled receipts
(completed donations, `SUCCESS` payouts), up to 64, computes the Merkle root from
`v2|id|type|amount|currency|date|ref`, skips batch numbers already on the chain, publishes,
checks the chain holds exactly that batch, and only then marks them (101, 102…).

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
| `POST /api/paypal/payout-requests` | `{amount}` → `{request, poolDollars}` |
| `POST /api/paypal/payout-requests/:id/approve` | `{approver, pin}` → `{request, poolDollars}` |
| `POST /api/paypal/payout-requests/:id/send` | `{approver, pin}` → `{request, poolDollars}` |
| `POST /api/paypal/payout-requests/:id/recover` | PIN-authenticated read, no payment sent; restores request + approvals after reload |
| `GET /api/paypal/payouts/:batchId` | refreshed `{receipt, poolDollars}` |
| `GET /api/paypal/receipts` | `{receipts, poolDollars}` |
| `GET /api/ledger/status` | `{ok, chainId, blockNumber, contract, publisher, local}` |
| `POST /api/ledger/publish` | sample batch only: `{batchId: 1, receipts: <the exact sample list>}`; server computes the root |
| `POST /api/ledger/publish-live` | real PayPal receipts → `{batch, alreadyPublished, receipts}` |
| `GET /api/ledger/batches/:id` | `{batch}` or `{batch:null}` |

Error shape: `{ error: '<code>', message: '<human readable>' }`. PayPal errors → `502 paypal_error`
with `issue` and friendly messages (`ORDER_NOT_APPROVED`, `INSUFFICIENT_FUNDS`,
`PAYOUT_NOT_AVAILABLE`, `AUTHORIZATION_ERROR`, bad keys); no keys → `503 paypal_not_configured`;
chain down → `503 chain_unreachable`. Rate limits: PayPal orders/captures 20, payout steps 20,
ledger publishes 10, per device per 5 minutes; PayPal and ledger reads 60 per minute; wrong PINs
lock an adult after 5.

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
- **Presentation**: choose manual or automatic before any navigation. Twelve steps, 108 seconds
  automatically, across home, sample app, donation/payout, impact, NGO, Seedlings and hub. No audio.
  Automatic cursor follows cues; mascot eyes follow its actual position. Sample actions only:
  earn, save 65%, headphones goal, ₹500 monthly. No API writes are automated. Pause/visibility
  freezes playback; manual takeover hides cursor/gaze without restarting. Reduced motion jumps.
  Autoplay defaults to a ~62px-high bottom bar with Pause/Resume, Stop and expand controls.
  Captions/settings expand on demand; minimise preserves pause/time and updates cursor framing.
  Completed autoplay stays compact with Replay/Stop. Manual/chooser panels retain their full view.
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

`npm test`: **143 pass** (24 client, 113 server, 6 contract), after the guardian environment fix.
Latest full browser run: 230 pass, 9 intentional skips; one phone presentation trace-cleanup
error passed a dedicated rerun. All 22 guardian browser checks passed. Build and local saved-PIN
validation passed; no saved consent was submitted by the assistant.
The earlier full Playwright run with `LIVE_AI=1`, two workers had **232 pass, 8 intentional skips**, no failures or
retries (desktop + phone; details in `VERIFICATION.md`). Guardian API tests also passed five
consecutive repeats (55 checks). Build and all 12 live Gemini evaluation checks passed.
PayPal browser tests (`e2e/paypal.spec.js`) replace PayPal's
SDK with a stand-in button and fake `/api/paypal` answers, because approving a real payment needs
a human login; the real sandbox was checked by hand (§8). Opt-in `LIVE_AI=1` test hits real Gemini.

Earlier runs had intermittent animation timing failures. The NGO delivery also fixed a concrete
phone anchor-scroll bug: Lenis now synchronizes with native scroll position before gliding to
an absolute target with one header offset. The full browser run then passed without retries.
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
| `18ac6ab` | AI-assistant handoff docs |
| (next) | Security audit fixes (`SECURITY_AND_BUG_AUDIT.md`): PIN-approved payouts to a fixed guardian, JSON-file records, safe capture/payout retries, settled-only ledger, receipt format v2 with currency, mentor privacy/safety/stream fixes. The user chose PINs over full accounts and a JSON file over SQLite. |

Key decisions the user made (don't reopen without asking): React+Vite, Fastify+TS, Gemini
`gemini-3.5-flash-lite`; neo-brutalist look with mascot; one "edit me" content folder; Phase 5
on a **local Hardhat chain with a pretend wallet** ("Do not use any wallet"), publish button +
mini explorer; Phase 6 **Donate + Payout** on the real sandbox, **donation impact note** as the
AI-PayPal link, PayPal receipts **linked to the ledger**, judges run **locally** (no Render/deploy);
no video; voiceover parked; product name sprout.io (brand only).

---

## 13. Ideas for next steps (ask the user before starting any)

The user approved FEATURE_IMPLEMENTATION_PLAN.md on 2026-11-05, with **one feature at a time** and
testing/polish before the next. First delivery: NGO workspace at `/soon/ngo`, using existing staff
PINs and a separate `LEARNING_DATA_FILE` (default `data/learning-records.json`). `learning/store.ts`
persists sample activity decisions before changing memory; each can be approved/returned once.
Learning credits (not money) split 50/30/10/remainder into sample jars; fractional shares stay
in Invest so every jar remains nonnegative and the total is conserved. Staff get full-history
PayPal USD aggregates and a names-free CSV. Fifteen-minute staff tokens stay in page memory;
PIN lockouts are shared with payouts. UI words: `content/ngo.js`; scoped theme: `ngo.css`.
NGO/guardian access follow-up: the old source-only watcher missed `.env` saves. The dev runner
now reloads saved settings automatically; an already-running old command needs one restart.
The guardian incident also exposed matching admin/guardian PINs; validation now names the actual
conflicting settings instead of always blaming the mentor PIN. Keep production restart guidance
in the setup state and `JUDGE_GUIDE.md`. **Check access again**
fetches roles without remounting the page; the form chooses an available role. **Show PIN**
reveals only typed input, resets on submit, and never reads a configured PIN from the server.
Do not publish actual PINs in the judge guide: these credentials are also used for payouts.
Seedlings was implemented on 2026-11-06. `learning/seedlings.ts` owns correct lesson answers;
`routes/seedlings.ts` checks all answers before the shared learning store saves a completion.
Existing version-1 learning files default to an empty `seedlings` array and retain NGO decisions.
There is one shared sample garden, no private learner identity or money. Each of needs/wants,
waiting and sharing earns one seed once. Failed saves do not mutate memory; retry is idempotent.
The client uses `content/seedlings.js`, `lib/useSeedlings.js`, `previews/Seedlings.jsx` and
`seedlings.css`. Only the lesson language preference is in localStorage. Speech stops on exit
and lesson/language changes. Requests have a 12-second timeout and discard late replies.
The header directly links to the working learning, PayPal, NGO and ledger flows; Mentor opens
the actual chat. Desktop uses two rows and scrolling measures the header height. Blockchain
labels say test blockchain; current network is local Hardhat, with no Sepolia deployment.
The user explicitly requested the parent phase on 2026-11-06 and confirmed it means guardian
consent/deletion. That phase was brought forward on its own. `routes/guardian.ts` records the
`demo-permission-v1` acknowledgement with the configured guardian PIN. Fixed sample codes are
A12/B07/C33; A12 owns Seedlings and the AI demo. No adult identity is verified. `/app` and
Seedlings require permission; NGO reviews check the activity's learner. The client supplies
`x-learning-revision` so old requests cannot recreate progress after withdrawal/deletion and
fresh permission. Deletion removes that learner's activities, derived jars and A12's garden;
it preserves separate PayPal records and keeps only a minimal blocked permission marker.
Pending permission writes block all learning reads/writes until durable; keep the server running
through a storage outage. The client clears learning/chat on revision changes, cross-tab storage
events and foreground checks; it rechecks every 15 seconds while visible. PINs stay out of storage.
No offline queues or issued certificates exist yet. Guardian words are in `content/guardian.js`;
the gate/provider are `lib/permission.jsx`. Existing feature tests explicitly inject permitted
samples; guardian tests use the real blocked-by-default app and disposable data. The live mentor
eval also uses a permitted in-memory synthetic sample, never the user's saved permission.
Hindi across the main site is next. Classroom and certificates remain queued; do not implement
them together. Shared behavior is recorded in `UX-CONTRACT.md`.

- Move PayPal records from the JSON file to a database (SQLite) if many people ever use it.
- PayPal webhooks (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.PAYOUTSBATCH.*`) for status (needs a public URL/tunnel).
- Full accounts instead of PINs, so each adult approves from their own login.
- Publish to a public test network (Base Sepolia): set `CHAIN_RPC_URL` + `PUBLISHER_PRIVATE_KEY` (user types the key).
- Investigate any further animation-timing failures from their traces while preserving motion.
- Optional hosted demo (Render is a sponsor) only if the user changes their "no deploy" decision.

Never put secrets in this file, client code or docs.
