# Sprout: complete project handoff for another LLM

Snapshot: 2026-11-04. This document describes the code and local documentation available at that date. Read it first when continuing this project. Source code takes precedence if this snapshot becomes stale.

## Handoff prompt

You are continuing Sprout, a financial-literacy frontend concept for teens aged 15–17, developed in a PayPal AI hackathon workspace. Preserve the existing working interactions, visual identity, accessibility behavior, and honest demo labels unless the user requests changes. Inspect the relevant source before editing. Distinguish implemented behavior from proposed features. Do not claim that payments, AI, authentication, or blockchain work: they are not implemented. Ask the user for their next objective if none is supplied. This file is context, not a request to implement every future feature.

## Product and scope

Sprout helps teens learn money skills through NGO-backed activities, learning rewards, four virtual money jars, hypothetical savings growth, and mentorship. The concept has NGOs managing real funds and authorized adults approving withdrawals. Currency examples use Indian rupees.

The current deliverable is a responsive, locally runnable, presentation-led website with bounded interactive demonstrations. It is not a complete financial application. There is no backend, authentication, database, persistent ledger, actual activity submission, independent approval, live AI, PayPal API integration, wallet, smart contract, or blockchain transaction. A refresh resets React state. There are no required API keys or environment variables.

Only the current source, README, DESIGN.md, and VERIFICATION.md were available when compiling this handoff. Earlier conversations, a complete hackathon brief, judging criteria, and unrecorded decisions are not recoverable from these files. Planned features below are concept descriptions, not proof of a finalized specification.

## Repository and setup

Application root: `sprout/` within the surrounding `Paypal AI hack` workspace. Run npm commands from `sprout/`, not the parent directory. The sibling `skill-install-staging/` contains agent skill material and is not application code.

The app has its own `.git` directory inside a parent workspace that also has `.git`. At inspection, the app's branch was `main`, with no commits and all app files untracked. Check `git status` in the intended repository before committing. No commit, push, or deployment was performed for this handoff.

Stack: JavaScript, React 18, React DOM, Vite 6, npm workspaces, plain CSS, and original SVG/CSS illustrations. No TypeScript, router, UI library, state library, chart library, server framework, or external AI SDK is present. The MIT license is in `LICENSE`.

README specifies Node.js 22+ and npm:

```sh
cd sprout
npm install
npm run dev
npm test
npm run build
npm run preview
```

Development and preview bind to `127.0.0.1`. Vite normally prints `http://127.0.0.1:5173` for development; use its actual printed URL. Production output is `client/dist/`. Use the committed/present `package-lock.json` for exact resolved versions; manifest versions use compatible ranges. Installation requires internet. Installed app assets and fonts are local; optional browser speech may depend on device/network voices.

Root scripts delegate dev/build/preview to the `client` workspace. Tests run `node --test client/src/lib/model.test.js`. No lint, end-to-end test, or CI script is configured. `.gitignore` excludes `node_modules/`, `dist/`, `.env`, `*.local`, `.DS_Store`, and `qa/`.

## Source map

| File | Responsibility |
| --- | --- |
| `package.json` | npm workspace and root commands |
| `package-lock.json` | resolved dependencies |
| `client/package.json` | React, Vite, bundled-font dependencies and client commands |
| `client/index.html` | English document shell, metadata, favicon and JSX entry |
| `client/public/sprout.svg` | original favicon |
| `client/src/main.jsx` | mounts App in React.StrictMode; imports fonts and CSS |
| `client/src/App.jsx` | entire landing page, section components, demo state, motion and navigation |
| `client/src/components/Art.jsx` | Icon, Clicky, Flower and JarArt illustrations |
| `client/src/components/Tour.jsx` | tour UI, clock, scrolling, speech, focus and cleanup; exports goTo |
| `client/src/lib/model.js` | currency formatting, allocation math, growth math, tour schedule |
| `client/src/lib/model.test.js` | three Node tests for math and timing |
| `client/src/styles.css` | canonical tokens, CSS layers, layouts, illustration styling, motion, responsive rules |
| `DESIGN.md` | visual intent, tokens and motion/access contract |
| `VERIFICATION.md` | prior manual checks, build/test evidence and limitations |
| `README.md` | setup, demo instructions and scope |

## Page narrative and implemented behavior

This is one document with anchor navigation, not multiple routes. Section IDs also drive the tour: `home`, `earn`, `jars`, `grow`, `mentor`, `trust`, `start`. Main content has ID `main` for the skip link.

1. **Hero:** “Small earnings. Big beginnings.” Original floating goal/reward cards, a sample headphones goal of ₹650/₹1,000, CTA to the activity, and “Explain me” tour launcher. Hero artwork is illustrative and independent of demo account state.
2. **Earn:** sample 30-minute community reading activity worth ₹200. Initial sample balance is ₹200; completing the activity flips `earned` to true and supplies ₹400 to Jars. Button disables to prevent a second reward. Reset returns to ₹200. Approval is simulated immediately in the same client.
3. **Four jars:** Save, Spend, Give, Invest. Selecting a jar changes explanatory text. Save percentage begins at 50%; range is 0–100 in steps of 5. The remainder uses a fixed 60/20/20 Spend/Give/Invest split. This is not a fully editable four-way allocation tool. Jar colors and explanatory copy are defined in App.jsx. Giving is optional in the concept; the demo remainder formula itself is fixed.
4. **Growth:** ₹100 monthly contribution, years range 1–10, default 5, illustrative annual rate 8% compounded monthly with deposits at month-end. SVG chart is derived from annual points. Growth never changes the sample balance. Display includes contributed amount and hypothetical-return disclosure.
5. **Paisa Mentor:** three prepared questions: saving, compound interest, and whether giving is required. Selecting one swaps static question/answer content. There is no input box, model request, conversation memory, or live language support.
6. **Trust:** independent sample ₹100 withdrawal timeline. Starts at “Withdrawal requested”; button progresses through “Approved by a mentor”, “Payout simulated”, and “Receipt preview ready”, then replays. Final status says “Preview only · no transaction published”. It does not deduct from jars or create a payment.
7. **Closing/footer:** links back to the demo and tour; footer year comes from the browser date.

App owns tour visibility, earned state, mobile menu state, reduced-motion state, pointer ring ref, and tour trigger ref. Jars, Growth, Mentor, Trust, and Tour each own local state. There is no persistence or centralized store and no network data flow.

## Model contracts

`money(value)` uses `Intl.NumberFormat('en-IN')`, INR currency, zero displayed fractional digits.

`splitReward(amount, savePercent)` returns integer amounts in `[save, spend, give, invest]` order:

```js
save = Math.round(amount * savePercent / 100)
rest = amount - save
spend = Math.round(rest * 0.6)
give = Math.round(rest * 0.2)
invest = rest - spend - give
```

For the UI's inputs this conserves every rupee, with Invest absorbing rounding. Example: `splitReward(200, 50)` gives `[100, 60, 20, 20]`. UI bounds are the current input guard; these helpers do not validate arbitrary external/untrusted values. Monetary demo arithmetic is not a production ledger design.

`projectSavings(monthly, years, annualRate = 0.08)` begins at zero, loops for `years * 12` months, and applies `balance = balance * (1 + annualRate / 12) + monthly`. It returns rounded final `balance`, total `contributed`, and rounded annual `points` starting with zero. Five years at ₹100/month returns ₹7,348 from ₹6,000 contributions; ten years displays ₹18,295 from ₹12,000.

Tour exports: `tourSteps`, `tourDuration`, `tourStart(index)`, `tourIndex(seconds)`. The schedule is 10/11/12/12/11/12/7 seconds in page-section order, totaling 75 seconds. `tourIndex(75)` returns -1; Tour handles completion separately.

## Clicky guided tour

Clicky is the original cursor mascot. Entry points include hero, floating launcher, closing section and footer. Tour is a non-modal aside so the page remains usable. It scrolls to and highlights each chapter. Captions define the schedule; voice is optional and off when opened.

Playback updates every 100ms using performance.now deltas. Pause/resume, previous/next, completion and replay are implemented. A hidden tab pauses playback; resume is manual. Seventy-five seconds means active playback, not guaranteed wall-clock duration including pauses.

Optional Web Speech API narration uses `SpeechSynthesisUtterance`, `en-IN`, rate 1.15. Unsupported speech disables the voice control. Speech errors fall back to captions. Closing cancels speech and timers/listeners through effect cleanup. Escape closes; opening focuses Close; closing restores the originating launcher's focus. Preserve cleanup and React.StrictMode compatibility when editing.

## Design and accessibility contract

Visual identity: soft neo-brutalism, geometric oversized headings, pastel surfaces, dark outlines, offset shadows, tactile controls, editorial section variety, and original illustrations. Grail was recorded as a composition/motion reference; no Grail assets are bundled. Reference URL in existing docs: https://grail-app.com/ . It was not re-reviewed for this handoff.

Canonical CSS tokens in `styles.css`, `@layer base`, `:root`:

| Token | Value/use |
| --- | --- |
| `--ink` | `#1b2922`, text/outlines |
| `--paper` | `#faf9f4`, paper |
| `--mint` | `#d9efdf`, main surface |
| `--green` | `#a8cfb4`, Save |
| `--purple` | `#c1aff0`, Spend/guide |
| `--peach` | `#f3b4a2`, Give |
| `--yellow` | `#f9ca6b`, Invest/mentor |
| `--muted` | `#56645b`, secondary text |
| `--border` | `2px solid var(--ink)` |
| `--shadow` | `5px 5px 0 var(--ink)` |
| `--radius` | `12px` |

Display font: bundled Space Grotesk 500/700. Body: bundled DM Sans 400/500/700. Occasional Georgia italic adds contrast. CSS layers are reset, base, components, responsive. Some art/jar colors also appear directly in JSX, so inspect both files for palette changes.

Motion includes IntersectionObserver reveals, floating cards, ticker, jar transitions and pointer click rings. Native document scrolling is primary. Reduced motion follows OS preference and the desktop header toggle via `document.documentElement.dataset.reduced`; OS changes are listened for. Pointer effects are restricted by device/motion behavior. Preserve reduced-motion CSS and usable content when changing animations.

Responsive behavior includes collapsing hero/editorial layouts at 640px, a two-column jar grid, expandable mobile navigation, and a tour panel within the viewport. Body minimum width is 300px. Prior verification covered 320px and 390px screens.

Existing access features include skip link, semantic landmarks, native labeled range controls, live status/answer updates, aria-pressed selection state, expanded mobile-menu state, keyboard navigation, Escape-close and focus restoration. Formal WCAG/screen-reader certification has not been performed.

## Verification evidence and limits

`VERIFICATION.md` records prior 2026-11-04 checks: installation, all three tests, production build (Vite 6.4.5), development HTTP 200, desktop/mobile review, reward duplicate prevention, slider keyboard End behavior, mentor answer swap, receipt transitions, mobile navigation, tour controls/focus, full 75-second completion, reduced motion, and no console errors/warnings during that session. A screenshot was recorded at ignored `qa/sprout-desktop.png`. These are historical results, not a guarantee about future edits.

Tests assert allocation conservation/nonnegative integers for selected amounts and percentages, zero-return and five-year savings examples, and all tour chapter boundaries/total duration. They do not cover DOM interaction, payment authorization, AI, persistence, or external services. Voice audibility/device quality and full screen-reader behavior were not verified. A prior sandbox issue required approved local execution for the dev server; that is environment-specific.

For changes, run the relevant tests and build from the app root. For UI changes, additionally review desktop/mobile layouts and affected keyboard, motion, and tour behavior. Do not describe old browser evidence as freshly rerun.

## Planned integrations and open decisions

The concept mentions PayPal sandbox payouts to approved adult recipients, live Paisa Mentor AI, and blockchain receipts for tamper evidence. No provider configuration, API routes, schema, chain, model, credentials, recipient onboarding, deployment target, or persistence architecture has been selected in the available code.

A future working implementation needs decisions and server-side implementation for identity and roles, independent adult approval, NGO fund custody/accounting, durable reward/withdrawal records, payout authorization/status/reconciliation and retries, AI service behavior, and receipt publication/verification. Client role simulation cannot authorize payments. On-chain receipts can reveal changed records but cannot establish the truth of the original claim or guarantee fraud prevention. Keep public demo labels until behavior is actually integrated and verified.

Never place secret credentials in this file or browser code. If backend work is requested, establish its requirements and security boundaries with the user; do not silently turn illustrative savings into real investing or sample balances into spendable funds.

## Keeping this handoff current

Update this file when architecture, commands, integration status, interactions, or model contracts change. Maintain README for quick setup, DESIGN.md for visual intent, and VERIFICATION.md for actual validation evidence. Share this file alone for conceptual context; provide the source repository as well when the receiving LLM needs to make code changes.
