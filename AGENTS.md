# Instructions for AI coding assistants

This file is read automatically by many AI tools (Codex, Cursor, Copilot, Aider…). `CLAUDE.md`
and `GEMINI.md` point here too.

**First, read [`LLM_CONTEXT.md`](LLM_CONTEXT.md) in full.** It has the whole project: what's real,
the hackathon rules, setup, every file, the PayPal flow and its sandbox gotchas, the API, tests,
history and decisions.

## Must-follow rules (short version)

1. **Ask the user before any major change or tech decision.** Offer a few options with your
   recommendation first. Small fixes don't need asking.
2. The user is learning: keep code simple, small and commented in plain English. Site words go in
   `client/src/content/` (see `EDITING.md`). Give **numbered, one-step-at-a-time** instructions
   for anything the user must do themselves.
3. Keep the bold **neo-brutalist**, human-made look. Never make it look "AI-made" or "premium fintech".
4. Test everything: `npm test` and `npm run test:e2e` (Playwright, desktop + phone). Add tests
   with every feature.
5. Keep `LLM_CONTEXT.md`, `README.md`, `VERIFICATION.md`, `PHASES.md`, `EDITING.md`,
   `docs/LEARN.md`, `docs/mentor-api.md` up to date. Commit after each phase. **Don't push or
   deploy**: the user pushes.
6. **Secrets** live only in git-ignored `server/.env`, typed by the user. Never print, log, commit
   or ask for them in chat.
7. PayPal is **sandbox only** (USD test money); the sandbox business account must be in the US.
   Label anything that isn't real.

## Quick start

```sh
npm install
cp server/.env.example server/.env   # user adds GEMINI_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
npm run dev                          # http://127.0.0.1:5173 (web), :8787 (api), :8545 (chain)
npm test && npm run test:e2e
npm run check:paypal -w server       # are the PayPal sandbox keys working?
```
