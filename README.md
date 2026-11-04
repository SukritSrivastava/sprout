# Sprout

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

Optional: to use the real AI mentor (from Phase 1), copy `server/.env.example` to `server/.env`
and paste your own Google AI Studio key. Without a key everything still runs, and the mentor
uses prepared answers.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the client maths and the server routes |
| `npm run test:e2e` | Playwright browser tests in Chromium at laptop and phone size (first time: `npx playwright install chromium`) |
| `npm run test:all` | Both of the above |
| `npm run build` | Production build of website and API |
| `npm run preview` | Serves the production build (website on port 4173, API on 8787) |

Installation needs internet; the installed app and bundled fonts run locally without network access. Optional narration uses the browser's available speech engine; it may not provide an offline voice.

## Delivery stages

1. **Direction:** Grail reference review, Sprout content and story, visual tokens and motion direction in DESIGN.md.
2. **Frontend:** responsive landing page, illustrated floating cards, interactive reward example, four jar allocations, compound growth slider, sample mentor conversation, simulated accountability trail, and Clicky guided tour.
3. **Verification:** model tests, production build, desktop/mobile browser review, tour controls, and reduced-motion/keyboard checks. Actual results live in VERIFICATION.md.

## Try it

- Click **Explain me** in the hero or the floating cursor for the 75-second tour. Captions are always available. Voice is opt-in. Pause, skip, go back, replay, or press Escape to close. Active playback is 75 seconds; pausing extends the tour.
- Complete the demo activity: a simulated mentor approval adds a sample ₹200 to the starting ₹200. Reset is available beside the success message.
- Select jars and move the savings allocation slider; the total is always conserved. The remaining amount uses a fixed illustrative 60/20/20 Spend/Give/Invest split. This is not a complete allocation editor.
- Pick a savings goal (headphones, bicycle, laptop) and a monthly amount to see how long it could take, then move the years slider. Uses an illustrative annual rate of 8%. Returns are not guaranteed and never credited to the sample balance.
- Select one of six prepared mentor questions (including budgeting, investing vs gambling, and spotting scams). The mentor shows a short typing pause before answering.
- Step through simulated withdrawal approval, payout, and receipt preview. No real transactions occur.
- Turn motion off using the desktop header control; the OS reduced-motion setting also applies on every screen size.

## Files

- `LLM_CONTEXT.md`: self-contained project context and implementation handoff for another LLM.
- `PHASES.md`: agreed decisions and the phase-by-phase build plan.
- `docs/LEARN.md`: guided tour of the codebase for people learning it.
- `docs/mentor-api.md`: the API contract between website and server.
- `server/src/`: Fastify API (`config.ts` settings, `app.ts` app builder, `routes/health.ts`, `index.ts` entry).
- `e2e/`: Playwright browser tests (`fixtures.js` fails any test that logs a browser error).

- `client/src/App.jsx`: page sections and bounded sample interactions.
- `client/src/components/Art.jsx`: original SVG icons, jars, flower and cursor mascot.
- `client/src/components/Tour.jsx`: guide, narration, playback, section scrolling, focus and cleanup.
- `client/src/styles.css`: tokens, layouts, animation and responsive rules.
- `client/src/lib/model.js`: allocation, savings math, goal timing and tour schedule.
- `client/src/lib/hooks.js`: count-up animation for money values (skipped when motion is off).
- `client/src/lib/model.test.js`: allocation invariants, savings calculation and tour timing.

## Scope boundary

This is a demo, not a complete financial application. The API server currently only answers a health check; the AI mentor arrives in Phase 1. There is no authentication, database, server approvals, PayPal integration, or on-chain writes; those are planned as clearly labelled previews. A refresh resets sample state. Real payout permission, independent oversight, durable accounting, and fraud threat modeling remain backend work. The client role simulation is not an authorization system.

## Dependencies

- React + React DOM: UI components and state.
- Vite: local development and production bundling.
- @fontsource/space-grotesk + @fontsource/dm-sans: self-hosted fonts, so no third-party font request is required at runtime.
- Fastify: the API server. zod: checks settings and request data.
- TypeScript + tsx (dev): typed server code, run with auto-restart.
- concurrently (dev): runs website and API in one terminal.
- @playwright/test (dev): browser tests.

All illustrations are authored in this repository. Grail is a composition and motion reference only; no Grail assets are bundled.
