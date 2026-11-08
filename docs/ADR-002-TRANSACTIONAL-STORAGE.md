# ADR-002: Transactional Postgres records

**Status:** Implemented for local verification; hosted validation pending.
**Date:** 2026-11-07

## Context

[ADR-001](ADR-001-HOSTING.md) selects Neon and a Vercel API with multiple instances. The
deployment audit reproduced stale-copy overspending and permission restoration with JSON
files. A database containing those same whole-file snapshots would retain both defects.

## Decision

Use `pg` and normalized Postgres tables for payment orders, receipts, payout requests,
approvals, learner permission markers, activities, lesson completions and security state.
Keep the existing local file backend when `DATABASE_URL` is absent. The hosted API requires that URL.

Use integer cents in payment tables; API amounts remain sandbox USD. A payment metadata row
locks the balance check and reservation together. Save provider operation IDs before sending,
then release the database transaction before calling PayPal. A 90-second send lease rejects
concurrent senders; expired recovery reuses the same receipt, sender ID and first-send date.
Lease tokens prevent an older worker from replacing a newer recovery result. Unknown outcomes
retain their reservation; automatic resends stop after 29 days.

Permission changes lock the learner row and compare the submitted revision. Completion and
review transactions acquire the same lock. Deletion removes learning rows and keeps the
revision marker. Completion uniqueness is enforced by `(learner, lesson_id)`; approval
uniqueness is enforced by `(request_id, approver)`.

Sessions store token hashes. PIN attempts and sliding-window limits are shared tables, with
separate route scopes and one AI budget used by mentor replies and donation notes. Raw IPs,
PINs, chat and bearer tokens are not stored. Queries use parameters, bounded pools and waits;
transactions use checked-out connections and transaction-level locks compatible with pooling.

Schema migration is explicit and transactional. The first migration creates fixed synthetic
learners and activities with an empty payment pool. It never reads local records. Re-running
it does not restore deleted data or reset payments. App startup checks the schema version.

## Alternatives considered

- Whole JSON documents in Postgres retain stale snapshot overwrites and were rejected.
- A new ORM adds another migration/type system to this small Fastify service. Direct SQL keeps
  the row-lock and uniqueness boundaries visible without changing the accepted stack.
- Sessions or quotas in process memory cannot coordinate separate instances.

## Consequences

Local files remain a single-process option. Switching backends selects different records;
it is not a history migration or rollback of completed payments. Existing local records must
be retained. Any later import needs a checked, backed-up migration with receipt identity intact.

Database-backed ledger publication was initially disabled pending durable jobs and fixed
metadata. [ADR-003](ADR-003-DURABLE-LEDGER.md) now supplies that implementation and its setup
requirements. Local file-mode behavior is retained. Local tests do not establish
Neon/Vercel/Base readiness; the preview release gates remain open.

References: [node-postgres transactions](https://node-postgres.com/features/transactions),
[Neon transaction pooling](https://neon.com/docs/connect/connection-pooling).

## Hosting amendment — 2026-11-08

[ADR-005](ADR-005-RENDER-VERCEL-SUPABASE.md) supersedes the original providers with Render and
Supabase. The `pg` adapter and transaction boundaries remain. Schema 3 enables RLS and removes
Supabase browser-role access without altering records; the backend uses its migration/table
owner. Supabase CA configuration keeps certificate/hostname verification enabled.
