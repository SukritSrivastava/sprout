# ADR-006: Hosted permission statements and release checks

**Status:** Implemented locally; hosted migration and preview validation pending.
**Date:** 2026-11-08

## Context

The hosted demo uses shared server storage, but the old guardian statement said progress stayed
on this computer. That statement needs a new acknowledgement rather than a copy-only change.
The release checklist also retained approved-request pruning, receipt pagination and dependency
readiness gaps. [ADR-005](ADR-005-RENDER-VERCEL-SUPABASE.md) owns the provider choice.

## Decision

Use `demo-permission-v2` for the statement explaining shared sample records on the demo server.
Schema 4 adds each learner's `consent_policy` and moves previously active acknowledgements to
pending while advancing their revisions. It preserves activities, lessons, learning credits,
payment records, signed jobs and withdrawn/deleted markers. A new acknowledgement records v2.
New API instances treat an active row carrying an old policy as pending, including an old API
write that finishes during deployment. The old API must still be stopped before new writes are
allowed; it cannot be trusted to enforce a policy it does not know.

Local learning files retain their format and migrate old policy markers on loading. Active old
markers become pending with the next revision; blocked markers stay blocked. The atomic save
must succeed before the store is usable. No real record file was migrated during implementation.
The PIN-free demo still allows learning by design; policy updates do not change that access mode.

Keep `/api/health` as liveness/configuration. Add `/api/ready` for a live database/schema check,
with a three-second deadline, shared in-flight work and a two-second success cache. Render probes
readiness. Dependency failure returns a private 503 and consumes no provider calls or mutations.
`db:check` separately verifies schema, table ownership, RLS and denied browser-role privileges in
a read-only transaction. It prints no connection details.

Retain any payout request with an approval; only untouched file-mode requests may be pruned.
Public receipt pages use a stable previous-receipt cursor and at most 100 records. Loading older
history changes no publication/payment state and never exposes provider IDs. Global pending
counts remain independent of the visible history page and the 64-receipt publication bound.

## Alternatives considered

- Rewording an active acknowledgement would imply acceptance of a new storage statement.
- A global policy version alone cannot distinguish a late old-API acknowledgement from a new one.
- Liveness alone can report success while database-backed operations cannot run.
- Returning the entire receipt history in one response creates unbounded public reads.

## Consequences

Run the explicit schema migration before starting this API. Protected learners previously active
under v1 must acknowledge v2 again; their existing progress remains. Stop old API instances during
the policy transition. Do not restore old active markers or erase provider history to roll back.
A rollback build must understand schema 4 and v2; a schema-3 binary fails the version check.
UI-only rollback may keep the current API. Publication stays with the user.

The actual Render/Supabase/Vercel environment, Base Sepolia setup and live sandbox/provider flow
checks still require connected accounts and private backend configuration. Local tests do not
complete those hosted gates. See [setup](SETUP.md#render-vercel-and-supabase) and
[verification](../VERIFICATION.md).
