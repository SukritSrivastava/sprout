# Learn the sprout.io codebase

A guided path through the code, in the order that makes it click. Only want to change words
or the AI mentor's behaviour? Read `EDITING.md` instead. Budget about an hour.
Keep this file next to the code in VS Code and open each file as you reach it.

---

## 1. The big picture

Sprout is two programs that run side by side, plus tests that drive them like a real person.

```
 Your browser
     │  opens http://127.0.0.1:5173
     ▼
┌─────────────────────────────┐        /api/*        ┌──────────────────────────────┐
│  client/  (the website)     │ ───────────────────▶ │  server/  (the API)          │
│  React + Vite, JavaScript   │   Vite forwards it   │  Fastify + TypeScript        │
│  port 5173                  │ ◀─────────────────── │  port 8787                   │
└─────────────────────────────┘        JSON          └──────────────┬───────────────┘
                                                                    │ Phase 1+
                                                                    ▼
                                                        Google Gemini (AI mentor)
                                                        key lives only in server/.env
```

- The **website** draws everything you see and keeps the demo's sample numbers in memory.
- The **server** exists for one reason: the Gemini key must never reach the browser. The website
  asks the server; the server asks Gemini.
- The browser only ever talks to port 5173. Vite quietly forwards `/api/...` to port 8787
  (see `client/vite.config.js`). That is called a **proxy**.

---

## 2. Run it

```bash
npm install
npm run dev
```

One terminal, two labelled outputs: `[web]` (green) is the website, `[api]` (magenta) is the
server. Open http://127.0.0.1:5173. Try http://127.0.0.1:5173/api/health too: that's the server
answering through the proxy.

| Command | What it does |
| --- | --- |
| `npm run dev` | Website + server together, both reload when you save a file |
| `npm run dev:web` / `npm run dev:api` | Just one of them |
| `npm test` | Fast unit tests (math in the client, routes in the server) |
| `npm run test:e2e` | Playwright opens Chromium and clicks through everything (desktop + phone) |
| `npx playwright test --ui` | Same, with a visual runner you can step through. Great for learning |
| `npx playwright show-report` | The last end-to-end report, with screenshots of any failure |
| `npm run build` | Production build of both |

---

## 3. Folder map

```
sprout/
├─ client/                    the website
│  ├─ index.html              the empty page React fills in
│  ├─ vite.config.js          dev server + the /api proxy
│  └─ src/
│     ├─ main.jsx             starts React and the router, loads the font and CSS
│     ├─ App.jsx              app shell: routes, page transitions, smooth scroll, motion toggle
│     ├─ styles.css           the whole design system: tokens at the top, phone rules at the end
│     ├─ pages/
│     │  ├─ Landing.jsx       "/"   the home page: just lists its sections, in order
│     │  ├─ Demo.jsx          "/app" the demo, built from the sections below
│     │  └─ NotFound.jsx      any other address
│     ├─ content/              ✏️ all the words on the site (see EDITING.md)
│     │  ├─ site.js           header, footer, tour button, 404
│     │  ├─ home.js           the home page
│     │  ├─ demo.js           the demo page, jars, sample kid, mentor chat words
│     │  └─ tour.js           the guided tour, English and Hindi
│     ├─ previews/             the nine Coming-soon walkthroughs (/soon/...)
│     │  ├─ index.js          the list of previews; add one here to get a page automatically
│     │  ├─ Walkthrough.jsx   shared frame: banner, steps, Back/Next, "when it's live"
│     │  └─ Donate.jsx …      one file per preview (More.jsx holds three small ones)
│     ├─ components/
│     │  ├─ Layout.jsx        header, footer, floating tour button
│     │  ├─ Mascot.jsx        Sprout the mascot (moods: happy, think, cheer)
│     │  ├─ Tour.jsx          the guided tour panel (its steps and words are in content/tour.js)
│     │  ├─ landing/          Hero, HowItWorks, MeetMentor, Trust, ComingSoon, Closing
│     │  └─ demo/             Earn, Jars, Growth, Mentor (+ ChatBubble), Withdraw sections of /app
│     └─ lib/
│        ├─ model.js          the maths: jar split, savings growth, goals
│        ├─ tour.js           the guided tour: 8 steps, where each goes, words in English + Hindi
│        ├─ useMentorChat.js  the mentor chat logic (send, stream, errors, offline answers)
│        ├─ icons.js          one shared size/stroke for every icon
│        ├─ model.test.js     unit tests for that maths
│        ├─ motion.jsx        shared animation pieces (Reveal, Stagger, reduced-motion flag)
│        ├─ scroll.js         Lenis smooth scrolling + "scroll to section" helpers
│        ├─ hooks.js          useCountUp: numbers that roll to their new value
│        ├─ mentorApi.js      sends a question to the server and reads the streamed reply
│        └─ ledger.js         real SHA-256 + Merkle-tree maths for the impact-ledger preview
├─ server/                    the API
│  ├─ src/
│  │  ├─ index.ts             starts the server
│  │  ├─ app.ts               builds the app and plugs in routes
│  │  ├─ config.ts            reads + checks settings from server/.env
│  │  ├─ routes/health.ts     GET /api/health
│  │  ├─ routes/mentor.ts     POST /api/mentor/chat: streams the AI mentor's reply
│  │  ├─ mentor/              schema (what a request may contain), prompt (the mentor's rules),
│  │  │                       model (talks to Gemini), safety (risky-topic word list),
│  │  │                       prepared (backup answers)
│  │  ├─ rate-limit.ts        max 20 questions per 5 minutes per address
│  │  ├─ routes/ledger.ts     publish and read impact-ledger batches (incl. real PayPal receipts)
│  │  ├─ routes/paypal.ts     PayPal sandbox: donations, payouts, receipts
│  │  ├─ paypal/              client.ts (talks to PayPal), store.ts (receipts + reward pool),
│  │  │                       impactNote.ts (AI thank-you), settings.ts (✏️ amounts)
│  │  └─ ledger/              merkle.ts (receipt maths), chain.ts (talks to the blockchain)
│  ├─ test/                  route tests with a fake Gemini (no real network needed)
│  ├─ scripts/eval-mentor.ts `npm run eval:mentor`: misuse attempts against the real AI
│  └─ .env.example            the settings you can set; copy to .env
├─ chain/                     the local test blockchain (Hardhat)
│  ├─ contracts/ImpactLedger.sol      the smart contract (stores batch codes, can't be edited)
│  ├─ contracts/ImpactLedger.t.sol    its tests, written in Solidity
│  └─ build/ImpactLedger.json         the compiled contract the server deploys
├─ e2e/                       Playwright browser tests
├─ docs/
│  ├─ LEARN.md                you are here
│  ├─ REDESIGN.md             the agreed look and feel
│  └─ mentor-api.md           the exact shape of every API request and reply
├─ DESIGN.md                  design tokens, components and motion rules
├─ PHASES.md                  the build plan, phase by phase
└─ LLM_CONTEXT.md             full project briefing for an AI assistant
```

---

## 4. Reading order

Read these in order. Each step says what to look for.

1. **`client/src/lib/model.js`**: plain functions, no React. `splitReward` divides money
   between four jars and always keeps every rupee. `projectSavings` and `monthsToGoal` do the
   "what if I save ₹100 a month" maths. Everything else on the page just shows these answers.
2. **`client/src/lib/model.test.js`**: how those functions are proven correct. Run `npm test`.
3. **`client/src/components/demo/Jars.jsx`**: `useState` holds the slider value; every time it
   changes React re-runs the function and the page updates. That is the core React idea.
4. **`client/src/pages/Demo.jsx`**: shared state (`earned`) lives in the page and flows down to
   sections as props (`<Jars balance={...} />`), so earning in one section updates another.
5. **`client/src/App.jsx`**: React Router picks a page from the address; `AnimatePresence` fades
   the old page out and the new one in; `useHashScrolling` glides to `#section` links.
6. **`client/src/lib/motion.jsx`** and **`lib/scroll.js`**: how every reveal and smooth scroll
   works, and how "motion off" switches it all off in one place.
7. **`client/src/components/Mascot.jsx`**: an SVG drawn in code, with Motion animating the blink
   and leaf sway, and different faces per `mood`.
8. **`client/src/components/Tour.jsx`**: `useEffect` = "do this when something changes, undo it
   when it stops". The tour's timer, keyboard listener and voice are each started and cleaned up
   this way; each step navigates to its page and section.
9. **`client/vite.config.js`**: the proxy that links the website to the server.
10. **`server/src/config.ts`** → **`app.ts`** → **`routes/health.ts`** → **`index.ts`**: settings
    are checked once with zod, routes are plugged into the app, then it listens.
11. **`server/test/health.test.ts`**: `app.inject()` sends a pretend request straight into the
    app. No port, no network, very fast.
12. **The AI mentor, end to end**: `components/demo/Mentor.jsx` (the chat screen) →
    `lib/useMentorChat.js` (what happens when you press Send) →
    `lib/mentorApi.js` (sends the question, reads the reply line by line) →
    `server/src/routes/mentor.ts` (checks the request, picks AI or backup answer, streams it) →
    `server/src/mentor/model.ts` (the only file that talks to Gemini). Read `mentor/prompt.ts` to
    see the mentor's rules.
13. **A preview**: `previews/Walkthrough.jsx` then `previews/Payout.jsx`. Each step is
    `{ title, render }`; state lives in the preview so it survives moving between steps.
    Then `lib/ledger.js` + `ledger.test.js` for how "verify a receipt" really works.
14. **`e2e/demo.spec.js`**: a real browser clicks buttons and checks what appears. Expected
    numbers are imported from `model.js`, so the test checks the page against the maths.

---

## 5. Ideas worth understanding

- **State → screen.** React components are functions of their state. Change state with the
  setter (`setSave(70)`), never by editing the page directly.
- **Effects clean up after themselves.** Every `useEffect` that adds a listener or timer returns
  a function that removes it. Forgetting this causes double listeners and leaks.
- **Updater functions run later.** `setElapsed((value) => value + delta)` may run after your code
  moves on, so compute `delta` *before* calling it. The tests caught exactly this bug in the tour
  clock (see the comment in `Tour.jsx`).
- **Secrets stay on the server.** Anything in `client/` ends up in the browser and can be read by
  anyone. That is why the AI key lives in `server/.env`.
- **Validate at the edge.** The server checks every setting (and, from Phase 1, every request)
  with zod before using it, so bad input fails early with a clear message.
- **Tests at three levels.** Unit tests for maths, route tests with `inject`, and Playwright for
  what a person actually sees. A fake clock (`page.clock`) makes timed things like the tour
  testable in milliseconds.

---

## 6. Try it yourself

Small exercises that touch each part. Undo them afterwards with `git checkout .`.

1. Add a fourth savings goal (e.g. "School bag", ₹800) in `savingsGoals` in `model.js`. Watch
   it appear in the calculator on /app. Which test would you add?
2. Change the default jar split from 50% to 30% saving in `components/demo/Jars.jsx`. Run `npm run test:e2e` and
   read which test fails and why.
3. Add `uptimeSeconds: Math.round(process.uptime())` to the health response in
   `server/src/routes/health.ts`, update its type, and fix the server test that now fails.
4. Give Sprout a new mood in `Mascot.jsx` (say, `'sleepy'` with half-closed eyes) and show it in
   the demo greeting.
5. Change the mentor's personality in `server/src/mentor/prompt.ts` (say, "answer like a cricket
   commentator"), ask it something in the demo, then change it back.
6. Run `npx playwright test --ui`, pick the tour test, and step through it frame by frame.

---

## 7. Words you'll see

| Word | Meaning here |
| --- | --- |
| Component | A function that returns part of the page (`Jars`, `Tour`) |
| State | Data a component remembers between renders (`useState`) |
| Props | Values a parent passes to a child component |
| Effect | Code that runs after render to talk to the outside world (`useEffect`) |
| Route | A server URL + method that does something (`GET /api/health`) |
| Proxy | Vite forwarding `/api` requests from the website to the server |
| Schema | A description of valid data that zod checks against |
| E2E test | End-to-end: a real browser using the real site |
| Workspace | One npm project (`client`, `server`) inside the root project |
| Route (website) | An address like `/` or `/app` that React Router maps to a page |
| Smooth scroll | Lenis easing the page toward where you scrolled, instead of jumping |
| Reduced motion | The setting (OS or header toggle) that turns animations off |
