# Remaining work

This replaces the old phase prompts and duplicate feature plan. Current feature status is in [README](../README.md); test evidence is in [verification](../VERIFICATION.md). Deliver one feature at a time and verify it before starting the next.

## Hosting comes first

The accepted target is **Render API + Vercel website + Supabase Postgres + Base Sepolia**, with a dedicated server-held test key and no visitor wallet. The choice is recorded in [ADR-005](ADR-005-RENDER-VERCEL-SUPABASE.md), which supersedes ADR-001. It has not been deployed.

1. **Storage implementation added on 2026-11-07; isolated Supabase migration completed on 2026-11-08.** `DATABASE_URL` selects normalized Postgres payment/learning records and shared sessions, PIN lockouts, route limits and AI quotas. Reservations and permission revisions are transactional. The separate free preview has schema 4, synthetic activities and an empty payment pool; existing local files were not imported. Direct backend TLS/pooler checks remain pending. The local file backend remains available. See [storage decision](ADR-002-TRANSACTIONAL-STORAGE.md), [current preview](SETUP.md#current-preview) and [verification](../VERIFICATION.md).
2. **Durable ledger implementation added on 2026-11-08; public deployment pending.** Schema 2 stores fixed deployment identity, signed deployment/publication transactions, frozen receipt batches and recovery leases. Shared publishing requires an NGO admin session; proofs remain public and chain/contract-scoped. Explicit setup and pending-job continuation are documented in [setup](SETUP.md#fixed-shared-ledger-setup) and [ADR-003](ADR-003-DURABLE-LEDGER.md). The Supabase preview has ledger tables but no deployment identity or Base Sepolia contract.
3. **Render/Vercel/Supabase configuration implemented on 2026-11-08; hosted validation pending.** Render starts the compiled API from the repository root and Vercel forwards `/api` before its SPA fallback. Supabase uses verified Postgres TLS and the server CA; schema 3 restricts browser roles. Hosted startup requires shared records, exact HTTPS origins and Render-specific proxy handling. See [setup](SETUP.md#render-vercel-and-supabase) and [verification](../VERIFICATION.md).
4. **Remaining local release implementation added on 2026-11-08.** Receipt history now has bounded cursor pages, approved payout requests survive pruning, and Render checks database readiness. Schema 4 records the shared-storage acknowledgement and protects old-policy transitions; `db:check` verifies ownership/RLS/grants without writes. See [ADR-006](ADR-006-HOSTED-PERMISSION-AND-READINESS.md).
5. **Hosted phase partially complete:** the user selected the target workspace/organization and the new free Supabase preview is migrated and checked for default-deny RLS. The user authorized committing/pushing the preview branch. Finish its platform settings/private connection, publish the tested branch, review/apply the Render plan, configure Vercel, complete fixed-ledger setup and pass the [release checklist](DEPLOYMENT_CHECKLIST.md) on a real preview. Check Render wake-up, streaming, proxy IPs and database access after restart. Dashboard sign-ins and private settings remain required; see [current preview](SETUP.md#current-preview).

PayPal remains sandbox-only. Do not switch hosting providers or introduce real-money behavior as part of cleanup.

## Product queue

NGO reviews, Seedlings, guardian controls and shared English/Hindi are implemented in the current working tree. Classroom/offline and certificates remain previews.

| Feature | Required behavior before calling it complete |
| --- | --- |
| Classroom/offline | Separate learner progress, cached lesson assets, durable completion queue and idempotent reconnect sync; no cached PINs, payments or AI chat |
| Certificates | Issue only after a completed track; printable view and saved verification code; revoke on learner deletion; public verification reveals no learner name |

Full adult accounts, provider webhooks and broader payment reconciliation are separate follow-ups. They are not implied by PIN-based demo access. Video and voiceover work remain parked unless requested.

The historical [security audit](../SECURITY_AND_BUG_AUDIT.md) retains deferred local-demo issues, including file-mode chain-reset reconciliation and broader privacy limits. Approved-request pruning, receipt pagination, full-history pending counts and number redaction have local regressions recorded in [verification](../VERIFICATION.md). Hosted confirmation and the other deferred issues remain open.
