# Verification

## Phase 0: server, proxy and browser tests (2026-11-05)

Fresh results from this phase, on Windows 11, Node 24.20.0, Chromium via Playwright 1.64.

- `npm test`: 9 passed (client: 5 maths/timing tests; server: 4 route/config tests). 0 failed.
- `npx playwright test`: 65 passed, 5 skipped by design (desktop-only checks on phone and the
  reverse), 0 failed. Run twice in a row (`--repeat-each=2`): 130 passed, 0 failed, no flaky tests.
- `npm run build`: website built with Vite 6.4.5; server compiled with `tsc` to `server/dist`.
- Compiled server started with `node dist/index.js` and answered `/api/health` with
  `{"ok":true,"service":"sprout-server","mentor":{"aiConfigured":false}}`.
- `npm run dev` started both processes; `/api/health` answered 200 through the Vite proxy in the
  in-app browser.

Browser tests cover (desktop 1366×768 and Pixel 7 phone): page title and headline, no sideways
scroll, all tour sections present, skip link, header links, motion toggle, OS reduced motion,
earn activity (reward, disable, reset, "See your jars"), jar selection, jar split conservation at
0/35/100%, goal picker for three goal/amount pairs, goal line visibility, years slider, all six
mentor questions' typing then answer (fake clock), reduced-motion mentor, trust timeline full
cycle and replay, tour open/focus/Escape/focus return, next/previous incl. fast clicks, pause and
resume, full 75-second playthrough and replay (fake clock), voice toggle, all tour entry points,
phone menu open/navigate/close and Escape, API health and JSON 404 through the proxy. Every test
also fails if the page logs a console error.

Bug found by these tests and fixed: the tour clock lost time when the browser was busy, because
the time step was computed inside a delayed React state update (`client/src/components/Tour.jsx`).

Not covered yet: the AI mentor (Phase 1), real screen-reader use, audible voice quality.

---

## Earlier verification (historical, 2026-11-04, before Phase 0)


Verified on 2026-11-04. All three requested delivery stages are complete for the frontend scope.

## Commands and results

- `npm install --no-audit --no-fund`: successful. Network permission was needed in this agent environment.
- `npm test`: 3 tests passed. Allocation conservation including boundary values, month-end compounding and zero returns, and all tour chapter boundaries with a total duration of 75 seconds.
- `npm run build`: successful, Vite 6.4.5; output in `client/dist`.
- `npm run dev`: successfully serves http://127.0.0.1:5173/. The Windows agent sandbox blocked dependency scanning on the initial attempt; running the same command with approved local execution permission resolved it. HTTP readiness check returned 200.

## Actual browser checks

- Desktop rendering and original illustrated hero reviewed in the in-app browser.
- Activity completion increases the sample balance from 200 to 400 and disables duplicate completion.
- Allocation slider's keyboard End action puts all 400 into Save and zero into the other jars.
- Savings slider's keyboard End action displays 18,295 after ten years, with 12,000 contributed.
- Selecting the optional giving question replaces the prepared mentor response.
- All three simulated receipt transitions work and finish with “Preview only · no transaction published”.
- Mobile navigation expands, navigates to jars, and collapses.
- 390px and 320px layouts checked. A 10px overflow at 320px caused by the minimum body width plus scrollbar gutter was fixed. Final 320px check: clientWidth = scrollWidth = 310px.
- Tour captions, pause/resume control state, next step, Escape close, and launcher focus restoration checked. Closing returns focus to the original launcher.
- Full unattended tour observed through automatic completion at 75/75 seconds. Replay returns to the first chapter.
- Reduced-motion toggle checked: root scroll behavior becomes auto and floating-card animation becomes none. Normal motion restored afterward.
- Browser console error/warning inspection returned an empty list during testing.
- Temporary viewport override reset and the finished homepage left open as a deliverable.
- Desktop screenshot saved at `qa/sprout-desktop.png` (ignored by Git).

## Limits

This is a presentation-led frontend with bounded local demonstrations. Real API failure, payment authorization, on-chain integrity, persistent balances, and live AI are not implemented or tested. Narration uses opt-in browser speech; audible output and individual device voice quality were not verified. No full screen-reader or formal WCAG audit was performed. User-paused/hidden-tab time extends tour wall-clock duration; active playback is 75 seconds.

## Changed files and purpose

Base path: `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/`.

| Exact path | Purpose |
| --- | --- |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/package.json` | Root npm workspace and run commands |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/package-lock.json` | Reproducible dependency versions |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/.gitignore` | Exclude installed/build/runtime/QA outputs |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/package.json` | Frontend dependencies and Vite scripts |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/index.html` | Accessible document shell, metadata and entry point |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/public/sprout.svg` | Original favicon |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/main.jsx` | React mounting and locally bundled fonts |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/App.jsx` | Responsive page narrative and sample interactions |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/styles.css` | Neo-brutalist theme, layout, motion and responsive rules |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/components/Art.jsx` | Original vector illustrations and cursor mascot |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/components/Tour.jsx` | Timed guided tour, captions, optional speech, navigation and focus cleanup |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/lib/model.js` | Allocation and growth calculations plus the tour schedule |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/client/src/lib/model.test.js` | Calculation and timing regression tests |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/DESIGN.md` | Visual direction, canonical runtime tokens and motion contract |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/README.md` | Setup, stages, feature instructions and implementation limits |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/LICENSE` | MIT license requested in the project brief |
| `C:/Users/Administrator/Documents/ChatGPT/Paypal AI hack/sprout/VERIFICATION.md` | Verification evidence and complete changed-file inventory |

No source has been committed, pushed, or deployed. The draft is saved locally in the requested repository folder.
