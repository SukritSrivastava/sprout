# ADR-004: Group source and tests by feature

**Status:** Implemented.
**Date:** 2026-11-08

## Context

Feature work crossed generic `lib/`, `previews/`, `components/`, route and storage folders.
For example, a ledger change required finding UI, hooks, receipt maths, routes, chain drivers
and database jobs in separate categories. The user requested updated documentation and files
arranged by the features they implement.

## Decision

Use `client/src/features/<feature>/` and `server/src/features/<feature>/` for feature code.
Keep reusable transport, UI, HTTP, security and database infrastructure under `shared/`.
The application shell owns route composition; features import their dependencies directly.
The learning store remains a separate shared domain used by guardian, NGO, Seedlings and mentor.

Keep editable copy in `client/src/content/`, named for its feature. Client unit tests live
beside their modules; server tests, browser tests and operator scripts use feature folders.
Cross-feature test harnesses live in `support/`. The test commands discover nested tests.

Keep `server/src/app.ts`, `config.ts`, `index.ts` and `client/src/main.jsx` as stable entrypoints.
Retain Hardhat's conventional contract/build folders and public URLs, endpoint names, npm
command names, persisted records and environment settings. Rebase imports, contract artifact
URLs and test fixture paths. Split the unrelated Hindi, classroom and certificate components
from `More.jsx` into their own features without changing their behavior.

[LEARN.md](LEARN.md) owns navigation and extension rules. [CODE_MAP.md](CODE_MAP.md) owns the
complete current file inventory and the old-directory migration guide. Existing dated audits
retain their evidence and original paths.

## Alternatives considered

- Keeping generic folders and adding comments leaves the same feature scattered across the tree.
- Adding compatibility re-exports preserves two competing locations and obscures ownership.
- Moving copy into implementation folders makes routine copy editing harder and breaks the
  existing content convention. It remains centralized and grouped through descriptive filenames.
- Creating separate packages for each feature adds build boundaries and dependencies that this
  prototype does not need. The existing three workspaces stay intact.

## Consequences

Imports and direct script/test paths change, so build, unit/API/contract, desktop/phone and
ledger integration checks must verify the relocation. Named npm commands remain the supported
entrypoints. New files must follow the feature convention and update the file map. Shared
infrastructure must stay generic; feature-specific persistence belongs with its feature.
This organization does not change the hosting roadmap or establish hosted readiness.

## Hosting amendment — 2026-11-08

The injectable factory moved from `server/src/app.ts` to `server/src/build-app.ts`. Vercel
detects both `src/app.ts` and `src/index.ts` as potential Fastify entrypoints; only `index.ts`
executes the server. The new name leaves one executable candidate without compatibility exports
that would restore the ambiguity. Imports and the file map follow the new name. The feature
organization and public application routes are unchanged.
