# sprout.io

Financial literacy for kids, run through NGOs. A React + Vite website (`client/`) and a small
Fastify + TypeScript API (`server/`) that will power the AI Paisa Mentor. New here? Read
[`docs/LEARN.md`](docs/LEARN.md). The build plan is in [`PHASES.md`](PHASES.md).

## Run

Requires Node.js 22 or newer and npm. From this folder:

```sh
npm install
npm run dev
```

This starts the website on http://127.0.0.1:5173 and the API on http://127.0.0.1:8787 in one
terminal. The website forwards `/api/*` to the API, so you only ever open port 5173.

**AI mentor:** copy `server/.env.example` to `server/.env` and paste your own Google AI Studio
key into `GEMINI_API_KEY` (`GEMINI_MODEL=gemini-3.5-flash-lite`). Restart `npm run dev`. Without a
key everything still runs and the mentor uses prepared answers, tagged "Offline mode".
`LIVE_AI=1 npm run test:e2e` adds one test that calls the real AI. `npm run eval:mentor` tries
12 misuse attempts (off-topic, jailbreaks, scams, stock tips…) on the real AI and reports each.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the client maths and the server routes |
| `npm run test:e2e` | Playwright browser tests in Chromium at laptop and phone size (first time: `npx playwright install chromium`) |
| `npm run test:all` | Both of the above |
| `npm run build` | Production build of website and API |
| `npm run preview` | Serves the production build (website on port 4173, API on 8787) |

Installation needs internet; the installed app and bundled fonts run locally without network access. Optional narration uses the browser's available speech engine; it may not provide an offline voice.

## What's in it

- **`/` home page**: what sprout.io is, how it works, Paisa Mentor, how money is kept safe, and
  what's coming soon.
- **`/app` demo**: a sample kid's sprout.io. Earn ₹200, split it into four jars, pick a savings goal,
  chat with **Paisa Mentor, a live AI (Google Gemini)** in English or Hindi, and step through a
  simulated withdrawal. All money is sample data; the mentor knows the sample jars and goal.
- **`/soon` previews**: nine clickable walkthroughs of what's coming (PayPal donations, payouts
  to guardians, NGO dashboard, public impact ledger with real receipt checking, Seedlings mode for
  ages 8–11, guardian consent and safety, Hindi everywhere, classroom mode, certificates). Sample
  data only, clearly labelled.
- **Guided tour**: about 1½ minutes across the home page, demo, live mentor and previews, with
  captions in English or Hindi. (A human voiceover is parked for later.)
- **Sprout the mascot** guides the tour across both pages (captions always on, voice
  optional, pause/skip/replay, Escape to close).
- **Motion**: smooth scrolling (Lenis) and purposeful animation (Motion). Turn it off with the
  header toggle on desktop, or your device's reduced-motion setting.

## Files

- `LLM_CONTEXT.md`: full project briefing for an AI assistant.
- `EDITING.md`: **start here to change words or the AI mentor's behaviour by hand.**
- `PHASES.md`: agreed decisions and the phase-by-phase plan.
- `PHASE_5_BLOCKCHAIN.md`: the public impact ledger explained for judges (why, how, what's real).
- `DEMO_SCRIPT.md`: a 3-minute script for presenting to judges, with backup plans.
- `DESIGN.md`: colours, fonts, components and motion rules. `docs/REDESIGN.md`: the agreed look.
- `docs/LEARN.md`: guided tour of the codebase. `docs/mentor-api.md`: the API contract.
- `client/src/`: the website (`pages/`, `components/`, `lib/`, `styles.css`).
- `server/src/`: the API (`config.ts`, `app.ts`, `routes/health.ts`, `index.ts`).
- `e2e/`: Playwright browser tests.

## Scope boundary

This is a demo, not a complete financial application. The API server runs the live AI mentor and a health check. There is no authentication, database, server approvals, PayPal integration, or on-chain writes; those are planned as clearly labelled previews. A refresh resets sample state. Real payout permission, independent oversight, durable accounting, and fraud threat modeling remain backend work. The client role simulation is not an authorization system.

## Dependencies

- React + React DOM, React Router: pages and state.
- Motion and Lenis: animation and smooth scrolling. Lucide: icons.
- @fontsource-variable/bricolage-grotesque: self-hosted font, no font requests at runtime.
- Fastify + zod: the API server and its input checks. @google/genai: the Gemini AI mentor.
- Vite, TypeScript, tsx, concurrently, Playwright: build, dev and test tools.

All illustrations (the Sprout mascot) are drawn in code in this repository.
