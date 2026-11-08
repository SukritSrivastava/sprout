# Project instructions

Read [LLM_CONTEXT.md](LLM_CONTEXT.md) first. The source code wins when a document disagrees with it; fix the document.

- Keep the existing React/Vite, Fastify/TypeScript and Hardhat stack. Ask before a new major feature, dependency or architecture decision unless the current request already authorizes it.
- Preserve other uncommitted work. Keep changes reviewable; never commit unrelated edits. The user pushes and publishes.
- Use simple code and plain English. Keep editable copy in `client/src/content/`; explain any manual work as numbered steps with one action per step.
- Group implementation under `client/src/features/<feature>/` and `server/src/features/<feature>/`. Keep generic infrastructure in `shared/`, client unit tests beside their modules, and API/browser tests in feature folders. Follow `docs/LEARN.md`; update `docs/CODE_MAP.md` when adding or moving files.
- Preserve the neo-brutalist design, existing URLs, keyboard access, honest sample labels and reduced-motion behavior.
- PayPal stays sandbox-only. Learning credits, seeds, sample rupees and sandbox USD are separate.
- `DEMO_OPEN_ACCESS=true` intentionally opens the judge demo. Preserve the protected path selected by `false`; never change the server access mode through browser state.
- Secrets belong only in ignored `server/.env` or backend host settings. Never print, commit or request them in chat.
- Supabase is server-only Postgres. Keep default-deny RLS on Sprout tables, no browser policies/grants, and the database owner connection/CA only in backend settings.
- Preserve payment reservations, stable retry IDs, settled-only publication, permission revisions and failure-to-save blocking. Understand these checks before refactoring them.
- Run `npm test`, `npm run build` and desktop/phone `npm run test:e2e`. Keep failures, skips and fake/live-provider boundaries explicit in `VERIFICATION.md`. Never weaken assertions to make a refactor pass.
- Keep one owner for each fact: setup in `docs/SETUP.md`, implementation in `docs/LEARN.md`, endpoints in `docs/mentor-api.md`, future work in `docs/ROADMAP.md`. Update the relevant guide when behavior changes; do not duplicate it in every file.
- The accepted hosting target is Render API + Vercel website + Supabase Postgres + Base Sepolia. The isolated Supabase preview has schema 4; API/frontend deployment and hosted validation remain pending. Read `docs/SETUP.md`, `docs/ADR-005-RENDER-VERCEL-SUPABASE.md` and the historical `DEPLOYMENT_AUDIT.md` before cloud work. ADR-005 supersedes ADR-001's providers.

## Cleanup workflow

Use the installed [code-simplification](https://github.com/addyosmani/agent-skills/blob/main/skills/code-simplification/SKILL.md) and [documentation-and-adrs](https://github.com/addyosmani/agent-skills/blob/main/skills/documentation-and-adrs/SKILL.md) skills when available. They are agent guidance, not application dependencies.

Understand why a check exists, remove demonstrated duplication or dead code, then verify behavior with the existing tests. Prefer readable control flow over compressed expressions. Keep comments that explain recovery, privacy or ordering; remove comments that repeat an endpoint table or narrate obvious code. Write docs in plain language using the installed `natural-writing` skill. Preserve audit evidence and accepted decisions when consolidating old plans.
