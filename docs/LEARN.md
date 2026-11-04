# Learn the Sprout codebase

A guided path through the code, in the order that makes it click. Budget about an hour.
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
│     ├─ main.jsx             starts React, loads fonts and CSS
│     ├─ App.jsx              every section of the page (start here)
│     ├─ styles.css           all styling: colour tokens at the top, phone rules at the bottom
│     ├─ components/
│     │  ├─ Art.jsx           drawings as code: icons, jars, Clicky, the flower
│     │  └─ Tour.jsx          Clicky's 75-second guided tour
│     └─ lib/
│        ├─ model.js          the maths: jar split, savings growth, goals, tour timing
│        ├─ model.test.js     unit tests for that maths
│        └─ hooks.js          useCountUp: numbers that roll to their new value
├─ server/                    the API
│  ├─ src/
│  │  ├─ index.ts             starts the server
│  │  ├─ app.ts               builds the app and plugs in routes
│  │  ├─ config.ts            reads + checks settings from server/.env
│  │  └─ routes/health.ts     GET /api/health
│  ├─ test/health.test.ts     route tests (no real network needed)
│  └─ .env.example            the settings you can set; copy to .env
├─ e2e/                       Playwright browser tests
├─ docs/
│  ├─ LEARN.md                you are here
│  └─ mentor-api.md           the exact shape of every API request and reply
├─ PHASES.md                  the build plan, phase by phase
└─ LLM_CONTEXT.md             full project briefing for an AI assistant
```

---

## 4. Reading order

Read these in order. Each step says what to look for.

1. **`client/src/lib/model.js`**: plain functions, no React. `splitReward` divides a reward
   between four jars and always keeps every rupee. `projectSavings` and `monthsToGoal` do the
   "what if I save ₹100 a month" maths. Everything else on the page just shows these answers.
2. **`client/src/lib/model.test.js`**: how those functions are proven correct. Run `npm test`.
3. **`client/src/App.jsx`**, the `Jars` function: `useState` holds the slider value; every
   time it changes React re-runs the function and the page updates. That is the core React idea.
4. **`App.jsx`**, the `App` function at the bottom: page-wide state (`earned`, `tourOpen`, the
   mobile `menu`) lives here and flows down to sections as props (`<Jars reward={...} />`).
5. **`client/src/components/Tour.jsx`**: `useEffect` = "do this when something changes, undo it
   when it stops". A timer, keyboard listener and voice are each started and cleaned up this way.
6. **`client/vite.config.js`**: the proxy that links the website to the server.
7. **`server/src/config.ts`** → **`app.ts`** → **`routes/health.ts`** → **`index.ts`**: settings
   are checked once with zod, routes are plugged into the app, then it listens.
8. **`server/test/health.test.ts`**: `app.inject()` sends a pretend request straight into the
   app. No port, no network, very fast.
9. **`e2e/demo.spec.js`**: a real browser clicks buttons and checks what appears. Note how the
   expected numbers are imported from `model.js`, so the test checks the page against the maths.
10. **`docs/mentor-api.md`**: the contract the AI mentor will follow in Phase 1.

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
   it appear in the calculator. Which test would you add?
2. Change the default jar split from 50% to 30% saving in `App.jsx`. Run `npm run test:e2e` and
   read which test fails and why.
3. Add `uptimeSeconds: Math.round(process.uptime())` to the health response in
   `server/src/routes/health.ts`, update its type, and fix the server test that now fails.
4. Run `npx playwright test --ui`, pick the tour test, and step through it frame by frame.

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
