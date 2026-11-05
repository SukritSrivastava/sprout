# sprout.io: complete project handoff for another LLM

Naming: the product is **sprout.io** (logo, tab title, footer, product sentences). The mascot
is still called **Sprout**. The folder, packages and code identifiers keep the name `sprout`.

Snapshot: 2026-11-05, after the bold neo-brutalist redesign. Read this first, then `PHASES.md`
(roadmap, decisions, phase status), `docs/REDESIGN.md` (agreed look), `DESIGN.md` (tokens and
motion rules) and `docs/LEARN.md` (codebase walkthrough). Source code wins if this file is stale.

## Handoff prompt

You are continuing Sprout, a financial-literacy demo for kids aged 8–17, run through NGOs, built
in a PayPal AI hackathon workspace. Preserve working interactions, the bold neo-brutalist look,
accessibility and motion behaviour, and honest labels ("Sample", "simulated", "AI, can make
mistakes"). Inspect source before editing. Distinguish implemented behaviour from planned
features: the Gemini mentor, PayPal **sandbox** donations/payouts with a Gemini donor note, and
the impact ledger on a local test blockchain are real; real money, authentication, a database
and a public blockchain are **not** implemented.

The user requires: **ask before any major change** and **before any tech decision** not already
recorded in `PHASES.md`; grill them with questions when direction is unclear; build frontend and
backend tracks in parallel; test with Playwright; keep this file, README, VERIFICATION and
PHASES current after every phase; commit after each phase. The user is learning the codebase, so
keep files small, commented in plain words, and update `docs/LEARN.md` when structure changes.
The user rejected a "premium fintech / AI-looking" style: keep it neo-brutalist and human-made.

## Product and scope

Kids do small useful activities at an NGO, a mentor approves, the reward lands in four virtual
jars (Save, Spend, Give, Invest), they plan goals, and ask Paisa Mentor money questions in
English or Hindi. The NGO holds real money; adults approve payouts to guardians. Rupees (₹).

**Current deliverable (PayPal AI Hackathon; PayPal must be central):** a two-page website with a
sample demo, plus an API server running the **live Gemini AI mentor**, **PayPal sandbox donations
(JS SDK button + Orders v2) and guardian payouts (Payouts v1)** in USD test money, a **Gemini
thank-you note** after each captured donation, and the **impact ledger publishing PayPal receipts
to a local Hardhat blockchain** (pretend wallet, fake ETH). PayPal receipts and the reward pool
live in server memory (restart resets). The `/app` jars are sample rupees in browser memory.
Everything else (NGO dashboard, Seedlings mode for 8–11, full Hindi UI, classroom, certificates)
is a clickable "Coming soon" preview with no real behaviour. The user said no demo video work and
no deploy; judges run it locally with their own free sandbox keys (README). Full plans for making them real
are kept in the "Later" section of `PHASES.md`.

## Repository and setup

App root: `sprout/` inside the `Paypal AI hack` workspace (which also has `skill-install-staging/`,
not app code, and a `.claude/launch.json` that starts `npm --prefix sprout run dev` for the
in-app preview). `sprout/` has its own git repo; commit only there. Nothing pushed or deployed.

History on `main`: `56eece5` baseline · `1827deb` Prettier format · `7f2f7b1` polish ·
`4b8e9dd` Phase 0 (server, proxy, Playwright, LEARN.md) · then the redesign commit.

Node 22+ (developed on 24.20) and npm workspaces `client` and `server`:

```sh
npm install
npx playwright install chromium   # once, for browser tests
npm run dev        # website 127.0.0.1:5173 + API 127.0.0.1:8787 (concurrently, coloured labels)
npm test           # client unit tests (5) + server tests (4)
npm run test:e2e   # Playwright: desktop 1366x768 + Pixel 7 phone
npm run build      # client to client/dist, server to server/dist
npm run preview    # production website on 4173 + compiled API
```

`client/vite.config.js` proxies `/api` to the API. The server reads `API_PORT` (not `PORT`, which
tools set for the website), `HOST`, `ALLOWED_ORIGIN`, `GEMINI_API_KEY`, `GEMINI_MODEL` from env or
`server/.env` (git-ignored; `.env.example` documents them), validated with zod.
`GET /api/health` → `{ ok, service, mentor: { aiConfigured } }`, never the key. Also
`ALLOWED_ORIGIN` (comma list, default local 5173/4173), `TRUST_PROXY`, `MENTOR_HOURLY_LIMIT`. Prettier 3
(width 100, single quotes) via npx, not a dependency. No lint or CI.

### Dependencies

Client: react 18, react-dom, react-router-dom 7, motion 14 (`motion/react`), lenis 1.3,
lucide-react, @fontsource-variable/bricolage-grotesque (opsz file). Server: fastify 5, zod 4,
@google/genai 2.32.
Dev: vite 6, typescript 7, tsx, @types/node, concurrently, @playwright/test.

## Source map

| File | Responsibility |
| --- | --- |
| `client/src/main.jsx` | BrowserRouter, font (Bricolage opsz), Lenis CSS, styles |
| `client/src/App.jsx` | shell: reduced-motion setting (OS + toggle, starts/stops Lenis), `useHashScrolling` (glide to `#section`, wait for fonts on first load, jump after page change), page transitions with `AnimatePresence` (instant swap when motion is off), routes, header/footer, tour |
| `client/src/components/landing/*.jsx` | home page sections: `Hero` (with `HeroCard`), `HowItWorks`, `MeetMentor`, `Trust`, `ComingSoon`, `Closing` |
| `client/src/content/` (✏️ edit-me) | all site words, so the user can edit by hand: `site.js` (nav, footer, tour button, 404), `home.js` (every home section), `demo.js` (`sampleKid`, `jars`, `demo.*` section words incl. small template functions, `mentorText` en/hi, `offlineAnswers`), `tour.js` (`tourSteps` `{path, id, seconds, en:{title,text}, hi:{title,text}}`, `tourDone`, `tourLanguages`). Components import from here; keep wording changes here, not in JSX |
| `client/src/lib/tour.js` | tour timing only: re-exports the content and adds `tourDuration`, `tourStart`, `tourIndex` (~84s, 8 steps) |
| `client/src/lib/useMentorChat.js` | mentor chat logic hook; `ChatBubble.jsx` draws one message |
| `client/src/lib/icons.js` | shared Lucide props `icon`, `iconSized(size, stroke)` |
| `DEMO_SCRIPT.md` | 3-minute judge script, pre-flight checklist, failure plan, likely questions |
| `client/src/pages/Landing.jsx` | `/`: hero (id `home`), how it works (`how`), mentor teaser (`meet-mentor`), trust (`trust`), coming soon (`soon`, 5 rows), closing |
| `client/src/pages/Demo.jsx` | `/app`: greeting + balance card, then Earn, Jars, Growth, Mentor, Withdraw; owns `earned` state and the cheer/burst |
| `client/src/pages/NotFound.jsx` | any other path |
| `client/src/pages/Soon.jsx` | `SoonHub` (`/soon`, lists `previews`) and `SoonPreview` (`/soon/:id`, unknown id → NotFound) |
| `client/src/previews/` | `index.js` registry (id, title, line, icon, color, component), `Walkthrough.jsx` (banner, steps `{title, render({next})}`, dots, Back/Next, auto "when it's live" last step, scrolls card into view on step change), `Donate`, `Payout`, `NgoDashboard`, `ImpactLedger`, `Seedlings`, `Safety`, `More` (`Hindi`, `Classroom` with sample PIN 1234, `Certificates` with code SPR-MB1-7Q4K) |
| `client/src/lib/ledger.js` | real SHA-256 leaf/node hashing, `buildTree`, `proofFor`, `verifyReceipt`, `short` (tested in `ledger.test.js`) |
| `client/src/components/Layout.jsx` | `Brand`, `SiteHeader` (nav links to `/#how`, `/#meet-mentor`, `/#soon`; motion toggle; demo/Home button; phone menu with Escape), `SiteFooter`, `TourLauncher` (label hides past 320px scroll; slides away while scrolling down) |
| `client/src/components/Mascot.jsx` | Sprout SVG, moods `happy`/`think`/`cheer`, blink + leaf sway idle, cheer bounce |
| `client/src/components/Tour.jsx` | tour panel: clock, EN/हिंदी caption switch, each step navigates to `path#id` (replace) and adds `.tour-target`; no voice |
| `client/src/components/demo/*.jsx` | `Earn` (ids `earn`), `Jars` (`jars`), `Growth` (`grow`), `Mentor` (`mentor`), `Withdraw` (`withdraw`) |
| `client/src/lib/model.js` | `money`, `splitReward`, `projectSavings`, `savingsGoals`, `monthlyOptions`, `monthsToGoal`, `describeMonths`, `tourSteps` (with `path`), `tourDuration`, `tourStart`, `tourIndex` |
| `client/src/lib/motion.jsx` | `ReducedMotion` context + `useReduced`, `ease`, `Reveal`, `Stagger`/`Stagger.Item`, `liftOnHover` |
| `client/src/lib/scroll.js` | Lenis start/stop, `scrollToId` (96px header offset), `scrollToTop`, `waitForId` |
| `client/src/lib/hooks.js` | `useCountUp` (instant when `data-reduced=true`) |
| `client/src/styles.css` | the design system (tokens → base → components → pages → tour → reduced motion → tablet/phone) |
| `server/src/*` | `config.ts`, `app.ts` (`buildApp(config, { model, rateLimit })`, 16KB body limit, JSON 404), `routes/health.ts`, `routes/mentor.ts` (NDJSON stream, AI-or-prepared, abort on disconnect/15s), `mentor/schema.ts`, `mentor/prompt.ts` (system rules), `mentor/model.ts` (only Gemini caller; `MentorModel` interface for fakes), `mentor/safety.ts`, `mentor/prepared.ts` (en+hi backups, suggestions), `rate-limit.ts` (per-key window, sweeps quiet keys), `index.ts`; `scripts/eval-mentor.ts` (`npm run eval:mentor`, 12 misuse cases vs real Gemini) |
| `client/src/lib/mentorApi.js` | `askMentor` (fetch + stream reader with onStart/onDelta/onDone), `mentorStatus`, `MentorError` |
| `server/src/paypal/` | `client.ts` (only PayPal caller; sandbox URL hard-coded; OAuth token cache; `createOrder`, `captureOrder`, `sendPayout`, `getPayout`; `PayPal` interface for fakes; `PayPalError.issue`), `store.ts` (in-memory receipts `DON-/PAY-yymm-nnnn`, salted `donor-`/`guardian-` codes, pool = donations − non-failed payouts, live batches from 101), `impactNote.ts` (Gemini donor note via `MentorModel`, prepared fallback), ✏️ `settings.ts` (amounts 5/10/25/50, $2 per reward, $50 max payout, approvers) |
| `server/src/routes/paypal.ts` | `/api/paypal/config|orders|orders/:id/capture|payouts|payouts/:batchId|receipts`; checks capture status/currency/exact amount vs the order it created; 2 different approvals + pool check for payouts; origin rule; rate limits. `routes/ledger.ts` adds `POST /api/ledger/publish-live` |
| `client/src/previews/` PayPal | `PayPalButton.jsx` (loads SDK via `lib/paypalSdk.js`, `PayPalSetupNotice`), `Donate.jsx`, `Payout.jsx`, `LivePayPalReceipts.jsx` (impact step 4). `Walkthrough` takes `realNote` (green banner, last step "What’s real here"); `index.js` entries take `live` (green stamp). `lib/api.js` shared fetch helper; `lib/paypalApi.js` |
| `e2e/*.spec.js` | `api`, `page`, `demo`, `tour`, `phone`; `fixtures.js` fails tests on console errors and has `goToSection` |
| `docs/` | `LEARN.md`, `REDESIGN.md`, `mentor-api.md` (contract for Phase 1) |

## Behaviour

- **Landing `/`**: animated hero (lines rise in sequence, sample jars card with Sprout peeking,
  bicycle meter fills), zig-zag three steps with UI cards, yellow mentor band with an
  English/Hindi sample chat, black trust band, ledger of five coming-soon items with stamps,
  "Start with ₹0" closing with cheering Sprout.
- **Demo `/app`**: balance starts ₹200. "Complete the activity" adds ₹200 (button disables, card
  turns mint, ₹ burst, Sprout cheers, balance counts up), "See your jars" glides to jars, "Reset"
  undoes. Jars: select one (aria-pressed), save slider 0–100 step 5, remainder 60/20/20, meters
  fill, amounts count up. Growth: goal chips (Headphones ₹1,000 / Bicycle ₹6,000 / Laptop
  ₹30,000), monthly chips (₹100/250/500), months-to-goal text, years slider 1–10, chart line
  draws, dashed goal line when it fits. Mentor (live AI): free text (600 chars, Enter sends, Shift+Enter new line), suggestion
  chips (from server `done`), English/हिंदी switch, status tag (Live AI / Offline mode), thinking
  dots until first words, streamed text with caret, "Prepared answer" tag, trusted-adult card when
  flagged, notices for 429/400, client prepared fallback if the server is unreachable, Clear chat.
  `Demo.jsx` owns `save`, `goalId`, `monthly` so the mentor gets live sample context. Withdraw: four-stage simulated trail ending "Preview only · no real
  transaction".
- **Tour**: 8 steps, about 84s: `/` home, how; `/app` earn, jars, grow, mentor; `/soon/impact`
  (section id `preview`); `/soon` (id `soon-hub`). Captions in English or Hindi. Pause/resume,
  previous/next (fast clicks safe), replay, Escape closes and returns focus, pauses when the tab
  is hidden. The robotic browser voice was removed; a Gemini voiceover is parked.
- **Motion off**: OS `prefers-reduced-motion` or header toggle (desktop ≥1100px) sets
  `html[data-reduced]`, stops Lenis, sets `MotionConfig reducedMotion="always"`, removes idle
  loops/bursts/typing delay, swaps pages instantly.

## Model contracts

`splitReward(amount, savePercent)` → `[save, spend, give, invest]` integers that always sum to
`amount` (invest absorbs rounding). `projectSavings(monthly, years, rate = 0.08)` month-end
deposits, monthly compounding → `{ balance, contributed, points }` (₹100 × 5y = ₹7,348).
`monthsToGoal(monthly, goal, rate = 0.08, max = 240)` → months or `null`. `describeMonths(n)` →
"2 years 2 months". `tourIndex(tourDuration)` = -1 (Tour handles completion); tour steps live in `content/tour.js`, timing in `lib/tour.js`.

## Verification

See `VERIFICATION.md` for dated evidence. As of Phase 6: 62 unit/server/contract tests and 162 Playwright
tests per run (one older animation-heavy test can time out under load; see VERIFICATION) (desktop + phone, 9 skipped by design), plus an opt-in `LIVE_AI=1` real-Gemini test; two consecutive full runs green. A
Playwright test enforces that no visible text on either page is under 14px.

Testing notes: the in-app preview pane freezes animations when hidden, so judge motion bugs with
Playwright, not a hidden pane. Under Playwright's fake clock, Motion finishes animations on
timers that only move with the clock; the full tour playthrough test runs with reduced motion and
checks the step counter, URL and highlighted section rather than animated captions.

## Roadmap and phase status

- Phase 0 (server, proxy, contract, Playwright, LEARN.md): **done** 2026-11-05.
- Redesign v2 (bold neo-brutalist, Bricolage, mascot, two pages, Motion + Lenis): **done**
  2026-11-05.
- Phases 1–2 (live AI mentor): **done** 2026-11-05. Model `gemini-3.5-flash-lite`, streamed,
  chat in `/app#mentor`, prepared fallback. Key is in git-ignored `server/.env` (the user pasted
  it in chat once; recommend rotating it after the hackathon). Misuse hardening done: goal label enum, empty-list fix, origin allow-list (403 + CORS),
  shared hourly cap `MENTOR_HOURLY_LIMIT` (300) + 20/5min per address, `TRUST_PROXY` (set true only
  behind a host proxy), limiter sweep, Hinglish safety words, prompt rule distrusting edited history;
  `npm run eval:mentor` 12/12.
- Phase 3 (Coming-soon previews): **done** 2026-11-05. Nine walkthroughs at `/soon/*`, all
  frontend-only sample data with a "Nothing here is real" banner; the ledger preview does real
  hashing in the browser. Header "Coming soon" → `/soon`; home rows link to previews.
- Simplified for hand editing (2026-11-05): `client/src/content/` holds all site words;
  mentor behaviour is in `server/src/mentor/prompt.ts` (`MENTOR_RULES`, `LANGUAGE_RULES`,
  `SENSITIVE_TOPIC_RULE`), `settings.ts` (`mentorSettings`: default model, temperature, reply
  tokens, timeout, question length, history size, per-device limit), `safety.ts`, `prepared.ts`.
  `EDITING.md` is the user's guide; keep it accurate when files move.
- **Phase 5 (blockchain) works on a local test chain** (the user asked for no real wallet).
  `chain/` workspace: Hardhat 3.21, `contracts/ImpactLedger.sol` (publisher-only
  `publishBatch(batchId, root, donated, rewarded, paidOut, receipts)`, write-once, event
  `BatchPublished`) + Solidity tests; `npm run build -w chain` exports `chain/build/ImpactLedger.json`
  (committed). Server: `server/src/ledger/merkle.ts` (same maths as client `lib/ledger.js`,
  parity-tested), `ledger/chain.ts` (viem 2.57; deploys on first use, remembers the address in
  git-ignored `chain/deployments/<chainId>.json`, one-at-a-time write queue, explorer details),
  `routes/ledger.ts` (`GET /api/ledger/status`, `POST /api/ledger/publish` with receipts only,
  `GET /api/ledger/batches/:id` returns `{batch}` or `{batch: null}`; 503 `chain_unreachable`),
  shared `origin.ts`. Config: `CHAIN_RPC_URL` (default http://127.0.0.1:8545),
  `PUBLISHER_PRIVATE_KEY` (optional; local default is Hardhat test account #0, refused on
  non-local RPCs). Client: `lib/ledgerApi.js`, `previews/ChainExplorer.jsx`,
  `previews/ImpactLedger.jsx` (publish button, explorer, verify against the on-chain root,
  mismatch warning). `npm run dev` starts web, api and chain; Playwright starts the chain too.
  Docs: `PHASE_5_BLOCKCHAIN.md`, `docs/mentor-api.md`.
- **Phase 6 (PayPal at the centre): done** 2026-11-05, to meet the hackathon rules. User chose:
  Donate + Payout on the real sandbox, Gemini donation impact note, PayPal receipts linked to the
  ledger, local run instructions (no deploy, no video). Config `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET` (user types them into `server/.env`; never in chat or code). USD because
  INR only works for Indian PayPal accounts. Payouts need "Payouts" enabled on the sandbox app.
  Manual sandbox check still pending until the user adds keys (see VERIFICATION).
- Phase 4: tour/demo hardening, deploy (client Vercel; server
  host to choose; add CORS for `ALLOWED_ORIGIN` then), docs.

Never put secrets in this file, client code or docs. Keys live only in `server/.env`, entered by
the user.
