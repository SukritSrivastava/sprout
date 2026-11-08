# ADR-005: Render API, Vercel website and Supabase Postgres

**Status:** Accepted by the user; code/configuration and isolated Supabase migration complete, hosted API/frontend validation pending.
**Date:** 2026-11-08

## Context

The user selected Render for the backend, Vercel for the frontend and Supabase for the database.
This supersedes [ADR-001](ADR-001-HOSTING.md)'s Vercel API/Neon choice. The React/Vite,
Fastify/TypeScript and Hardhat/viem stack, Base Sepolia target and sandbox-only payments remain.
The user later authorized a separate free preview. Its Supabase database is created and
migrated; [setup](SETUP.md#current-preview) owns the current resource details and remaining work.

## Decision

Run the compiled Fastify API as a Render Node web service. Keep the Render root at the Git
repository root so `server/dist` and the committed `chain/build/ImpactLedger.json` stay together.
`render.yaml` defines the free service, Node 22, build/start commands and readiness check.
Render supplies `PORT`; the API listens on that port and `0.0.0.0`. SIGTERM/SIGINT close
Fastify and its database pool with a 25-second shutdown bound. Existing durable operation IDs
and leases still govern recovery if a process is terminated.

Keep Vercel's website root at `client`, output `dist`. Its build-time `SPROUT_API_ORIGIN`
points to the actual Render HTTPS origin. Browser requests remain relative `/api` URLs;
external rewrites precede the SPA fallback. Backend settings and credentials live on Render.
Exact production/preview website origins remain mandatory. Render mode trusts one private
ingress hop and the last valid forwarded IP, ignoring earlier values and Vercel-specific IP
headers. Actual ingress addresses and Vercel-to-Render forwarding need a hosted check; missing
trusted metadata shares a socket budget rather than accepting an arbitrary client address.

Use Supabase as server-only Postgres through the existing `pg` adapter. Prefer the Session
pooler from Supabase's Connect panel, port 5432, for the persistent Render process and IPv4
compatibility. Keep the three-connection local pool and short transactions. Set `sslmode=verify-full`
and supply the downloaded Supabase server root certificate through `DATABASE_SSL_CA`.
The driver receives an explicit verified TLS configuration; URL SSL settings cannot replace
the CA. No Supabase SDK, browser database connection or public/secret Supabase API key is needed.

Schema 3 enables default-deny RLS on every Sprout table and revokes table/sequence privileges
from `anon` and `authenticated` when those roles exist. The trusted backend connects as the
migration/table owner; it keeps existing transaction and authorization behavior. The migration
does not force RLS on that owner, add browser policies, reseed records or reset payments/jobs.
Disable Supabase's Data API for this dedicated database too. Migration remains an explicit
operator action; neither builds nor API startup mutate the schema or deploy contracts.

## Alternatives considered

- Keeping the Vercel API/Neon setup contradicts the user's new provider selection.
- Replacing SQL with the Supabase browser API would change payment transactions and permission
  checks, expose a second access path and require new authentication policies.
- Render's ephemeral files cannot preserve payment/learning state across restarts or sleep.
- Disabling TLS certificate verification would weaken the existing hosted database requirement.

## Consequences

Run the schema migration before starting this version against an existing database. Versions
1/2 upgrade transactionally without moving records between providers. Pointing at a new
Supabase database creates a separate synthetic demo; it does not import or reconcile old files
or another provider's payment history. Preserve those records and use separate preview/judging
environments. Fixed-ledger setup is still explicit and uses only test ETH.

The free Render service can sleep and has an ephemeral filesystem. Test cold-start behavior
through the Vercel rewrite, streaming, client IPs, Supabase TLS/pooling, restarts and saved-job
recovery on the actual preview. Publication remains with the user.

References: [Render web services](https://render.com/docs/web-services),
[Blueprint fields](https://render.com/docs/blueprint-spec),
[Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Supabase API access](https://supabase.com/docs/guides/api/securing-your-api),
[node-postgres SSL](https://node-postgres.com/features/ssl).
