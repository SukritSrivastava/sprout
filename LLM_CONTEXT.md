# Sprout: complete project handoff for another LLM

Snapshot: 2026-11-05, after the bold neo-brutalist redesign. Read this first, then `PHASES.md`
(roadmap, decisions, phase status), `docs/REDESIGN.md` (agreed look), `DESIGN.md` (tokens and
motion rules) and `docs/LEARN.md` (codebase walkthrough). Source code wins if this file is stale.

## Handoff prompt

You are continuing Sprout, a financial-literacy demo for kids aged 8–17, run through NGOs, built
in a PayPal AI hackathon workspace. Preserve working interactions, the bold neo-brutalist look,
accessibility and motion behaviour, and honest labels ("Sample", "simulated", "AI, can make
mistakes"). Inspect source before editing. Distinguish implemented behaviour from planned
features: payments, live AI, authentication, database and blockchain are **not** implemented.

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

**Current deliverable:** a two-page website with a sample demo, plus a small API server running
the **live Gemini AI mentor** (the only real feature). All money is sample data in browser memory;
a refresh resets it. Everything else (PayPal donations/payouts, NGO dashboard,
public impact ledger on Base Sepolia, Seedlings mode for 8–11, full Hindi UI) will be clickable
"Coming soon" previews with no real behaviour (Phase 3). Full plans for making them real are kept
in the "Later" section of `PHASES.md`.

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
| `client/src/pages/Landing.jsx` | `/`: hero (id `home`), how it works (`how`), mentor teaser (`meet-mentor`), trust (`trust`), coming soon (`soon`, 5 rows), closing |
| `client/src/pages/Demo.jsx` | `/app`: greeting + balance card, then Earn, Jars, Growth, Mentor, Withdraw; owns `earned` state and the cheer/burst |
| `client/src/pages/NotFound.jsx` | any other path |
| `client/src/components/Layout.jsx` | `Brand`, `SiteHeader` (nav links to `/#how`, `/#meet-mentor`, `/#soon`; motion toggle; demo/Home button; phone menu with Escape), `SiteFooter`, `TourLauncher` (label hides past 320px scroll; slides away while scrolling down) |
| `client/src/components/Mascot.jsx` | Sprout SVG, moods `happy`/`think`/`cheer`, blink + leaf sway idle, cheer bounce |
| `client/src/components/Tour.jsx` | 75s tour across both pages; each step navigates to `path#id` (replace) and adds `.tour-target` |
| `client/src/components/demo/*.jsx` | `Earn` (ids `earn`), `Jars` (`jars`), `Growth` (`grow`), `Mentor` (`mentor`), `Withdraw` (`withdraw`) |
| `client/src/lib/model.js` | `money`, `splitReward`, `projectSavings`, `savingsGoals`, `monthlyOptions`, `monthsToGoal`, `describeMonths`, `tourSteps` (with `path`), `tourDuration`, `tourStart`, `tourIndex` |
| `client/src/lib/content.js` | `jars` (name, colour var, note, detail), six prepared `answers`, `sampleKid` (Aanya, ₹200 base, ₹200 reward) |
| `client/src/lib/motion.jsx` | `ReducedMotion` context + `useReduced`, `ease`, `Reveal`, `Stagger`/`Stagger.Item`, `liftOnHover` |
| `client/src/lib/scroll.js` | Lenis start/stop, `scrollToId` (96px header offset), `scrollToTop`, `waitForId` |
| `client/src/lib/hooks.js` | `useCountUp` (instant when `data-reduced=true`) |
| `client/src/styles.css` | the design system (tokens → base → components → pages → tour → reduced motion → tablet/phone) |
| `server/src/*` | `config.ts`, `app.ts` (`buildApp(config, { model, rateLimit })`, 16KB body limit, JSON 404), `routes/health.ts`, `routes/mentor.ts` (NDJSON stream, AI-or-prepared, abort on disconnect/15s), `mentor/schema.ts`, `mentor/prompt.ts` (system rules), `mentor/model.ts` (only Gemini caller; `MentorModel` interface for fakes), `mentor/safety.ts`, `mentor/prepared.ts` (en+hi backups, suggestions), `rate-limit.ts` (per-key window, sweeps quiet keys), `index.ts`; `scripts/eval-mentor.ts` (`npm run eval:mentor`, 12 misuse cases vs real Gemini) |
| `client/src/lib/mentorApi.js` | `askMentor` (fetch + stream reader with onStart/onDelta/onDone), `mentorStatus`, `MentorError` |
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
- **Tour**: 8 steps, 75s (`/` home 9, how 9, trust 8; `/app` earn 10, jars 10, grow 10,
  mentor 11, withdraw 8). Pause/resume, previous/next (fast clicks safe), replay, optional
  `en-IN` voice, Escape closes and returns focus, pauses when the tab is hidden. The clock adds
  real elapsed time computed outside the state updater (a bug the tests caught earlier).
- **Motion off**: OS `prefers-reduced-motion` or header toggle (desktop ≥1100px) sets
  `html[data-reduced]`, stops Lenis, sets `MotionConfig reducedMotion="always"`, removes idle
  loops/bursts/typing delay, swaps pages instantly.

## Model contracts

`splitReward(amount, savePercent)` → `[save, spend, give, invest]` integers that always sum to
`amount` (invest absorbs rounding). `projectSavings(monthly, years, rate = 0.08)` month-end
deposits, monthly compounding → `{ balance, contributed, points }` (₹100 × 5y = ₹7,348).
`monthsToGoal(monthly, goal, rate = 0.08, max = 240)` → months or `null`. `describeMonths(n)` →
"2 years 2 months". `tourIndex(75)` = -1 (Tour handles completion).

## Verification

See `VERIFICATION.md` for dated evidence. As of the AI mentor: 19 unit/server tests and 99 Playwright
tests per run (desktop + phone, 9 skipped by design), plus an opt-in `LIVE_AI=1` real-Gemini test; two consecutive full runs green. A
Playwright test enforces that no visible text on either page is under 14px.

Testing notes: the in-app preview pane freezes animations when hidden, so judge motion bugs with
Playwright, not a hidden pane. Under Playwright's fake clock, Motion finishes animations on
timers that only move with the clock; the 75s tour playthrough test runs with reduced motion and
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
- Phase 3: Coming-soon previews · Phase 4: tour/demo hardening, deploy (client Vercel; server
  host to choose; add CORS for `ALLOWED_ORIGIN` then), docs.

Never put secrets in this file, client code or docs. Keys live only in `server/.env`, entered by
the user.
