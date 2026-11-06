# ADR-001: Free hosting for the hackathon demo

**Status:** Accepted by the user on 2026-11-06; implementation pending.
**Date:** 2026-11-06
**Deciders:** The user

## Context

The user now wants a public demo ready in two days, using free hosting only. This supersedes the
earlier local-only direction for deployment planning. They approved a dedicated test-only signing
key held by the server, with no wallet connection required from visitors. Existing instructions
about keeping credentials private and PayPal sandbox-only still apply.

Sprout has a React/Vite frontend, a Fastify Node.js API, JSON payment/learning records and a
local Hardhat chain. Rate limits, staff sessions, PIN lockouts and transaction queues currently
also use process memory. Local test results do not establish cloud deployment readiness.

The official hackathon rules accept a hosted demo OR complete runnable-repository instructions.
They require access through the end of judging, December 15, 2026. A hosted demo is still the
preferred experience for judges. The listed submission deadline is November 12 at noon PST
(November 13 at 01:30 IST); the user's requested two-day target is earlier.

Source: [official rules](https://paypalaihackathon.devpost.com/rules).

## Decision

Use Vercel Hobby for both the compiled React website and the Fastify API, Neon
Free Postgres for durable records, and Base Sepolia for the public test ledger. Use the supplied
HTTPS platform addresses. PayPal remains sandbox-only; Gemini remains server-side and must stay
within the user's free allowance. The target is zero hosting spend within provider quotas, not
guaranteed uptime or unlimited capacity.

Use two Vercel projects from this repository: website root `client` (output `dist`) and API root
`server` (native Fastify Node.js Function). Route browser `/api/*` requests to the API project
using Vercel's external rewrites. Serve other app paths
with the SPA fallback, preserving direct links such as `/soon/safety` and `/app#mentor`.

## Options considered

| Dimension | A: Vercel frontend + Render API + Neon | B: Vercel frontend/API + Neon | C: Render frontend/API + Neon |
| --- | --- | --- | --- |
| Cost | Free within quotas | Free within quotas | Free within quotas |
| Complexity for this code | Medium: database migration, proxy and cloud configuration | Higher: database migration plus shared state/concurrency changes for multiple function instances | Medium: database migration plus production asset serving |
| First visit | Website loads while API wakes | No Render-specific minute-long wake-up; function/database cold starts still possible | Whole website can wait for Render to wake |
| Scaling | One API instance; appropriate target for a small judging demo | Automatic function scaling requires database-backed coordination | One instance |
| Existing design fit | Closest to current long-running Fastify process while keeping the website available separately | Fastify is supported, but current files and process state cannot be treated as durable/shared | Close to the current process model, but needs static asset hosting in Fastify |

**Selected:** B. The user explicitly chose Vercel for the API to avoid Render's wake-up delay
and accepted the additional refactoring. Function/database cold starts can still occur.
This supersedes the earlier recommendation of A.

References: [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Fastify on Vercel](https://vercel.com/kb/guide/ship-a-fastify-app-on-vercel),
[external rewrites](https://vercel.com/docs/routing/rewrites),
[Vercel filesystem](https://vercel.com/docs/functions/runtimes),
[Render free services](https://render.com/docs/free).

## Trade-offs and consequences

- Vercel runs Fastify as an autoscaling Function. Existing `listen()` and Node readable streaming
  are supported; there is no requirement to rewrite the app in Next.js. Project roots,
  executable entrypoint detection and contract-artifact packaging still need a preview build.
- The deployment filesystem is read-only except temporary scratch storage. The current JSON
  files cannot be the hosted source of truth; `/tmp` does not solve durability or coordination.
- Pool reservations, permission revisions, staff sessions, PIN lockouts, quotas and publication
  jobs must be shared across instances. The audit reproduced stale-copy overspending and
  permission restoration. Moving whole JSON snapshots into a database is insufficient.
- Use short database transactions and durable job claims, not transactions held open during
  external calls. Neon pooling uses transaction mode; session-level advisory locks are unsuitable.
- Hobby Fluid Compute has a 300-second invocation maximum, including streaming. Persist
  external-operation IDs and recovery state before submission; bound waits and resume safely.
- Neon Free currently has no plan expiration, requires no credit card, and includes 1 GB and
  100 compute-unit hours monthly per project. Usage limits still apply. Vercel Hobby is for
  personal non-commercial use. Keep all services within free quotas; do not enable paid upgrades.
- Base Sepolia replaces the laptop-only chain. Fund a dedicated server publisher using free
  test ETH, persist a fixed contract address/deployment block, and limit who can trigger writes.
  Pin chain ID 84532 and use `https://sepolia.basescan.org` for verification. Do not redeploy a
  contract during function cold starts. Scope publication history by chain ID and contract.
  The public Hardhat development key must never be used on the hosted public network.
- Secrets belong in backend environment settings, never browser build variables or the public
  repository. The public demo should use sample learners and sandbox accounts only.
- Preview and judging databases must be separate, using synthetic records. Credentials belong
  only in backend host settings, never in `VITE_*` variables or the public judge guide.

Sources: [Vercel Fastify](https://vercel.com/docs/frameworks/backend/fastify),
[function duration](https://vercel.com/docs/functions/limitations),
[monorepos](https://vercel.com/docs/monorepos),
[Neon pooling](https://neon.com/docs/connect/connection-pooling),
[Neon pricing](https://neon.com/pricing),
[Base network](https://docs.base.org/get-started/connect-to-base),
[free test ETH](https://docs.base.org/get-started/get-funds).

## Implementation and release gates

1. Fix the blockers in [the completed deployment audit](../DEPLOYMENT_AUDIT.md), beginning with
   durable database storage, payment reservations and permission revisions.
2. Design durable Postgres storage that preserves payment idempotency, consent/deletion and
   learning rewards; do not silently reset existing records or reuse local development data.
3. Prepare cloud port/host/origin/proxy settings, SPA routing, builds and contract artifact packaging.
4. Configure and verify the public test chain and durable deployment metadata.
5. Prepare sample-only judge access, secret settings and safe handling of public mutations.
6. Validate restart recovery, cold starts, concurrent requests, live AI streaming, sandbox payment
   flows, public-origin browser checks and desktop/phone navigation against the hosted environment.
7. Pass [the release checklist](DEPLOYMENT_CHECKLIST.md) on the actual preview. Keep the demo
   accessible through December 15, with quotas monitored and runnable-repository instructions
   retained as a fallback. Deploy only once the prepared result is reviewable.

The audit is complete; implementation and hosted validation are pending. No provider project
was created and no deployment was performed during this decision/audit.
