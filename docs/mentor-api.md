# API contract

Requests use the site's `/api` paths. Vite proxies them to Fastify locally. JSON bodies have a **32 KiB** limit; feature schemas reject unknown fields. Errors normally contain `{error,message}`. Payment errors can also include recovery data: an HTTP failure must remain a failure even if its body says `ok:true`.

These contracts work with the local file backend or the optional transactional Postgres backend.
The Vercel website rewrites to the Render API; actual hosted validation remains pending. See [hosting setup](SETUP.md#render-vercel-and-supabase).
Database outages return `503 shared_records_unavailable`, without driver details or credentials.
All API replies, including streams and errors, send `Cache-Control: no-store` and matching
CDN directives. Unknown API paths return JSON 404 responses and never use the website fallback.

## Access modes

`DEMO_OPEN_ACCESS=true` is the server default. Guardian status, NGO config and PayPal config include `demoOpenAccess`. Open mode permits NGO operations without a token, using the sample mentor role for reviews. Guardian changes and payout approve/recover/send accept an omitted or empty PIN. Learning does not require active permission. Opening the demo does not record consent.

Both modes retain revision checks, deletion confirmations, fixed payout recipient, two distinct approving roles, available funds, persistence and retry rules. Set the backend switch to `false` to restore protected requirements below. Browser preferences cannot change it. PINs are shared secrets, not verified adult identity.

Feature routes check browser origins against `ALLOWED_ORIGIN`, including reads. CORS permits revision and NGO authorization headers where needed. This does not authenticate non-browser callers.

## Health

`GET /api/health` returns:

```json
{"ok":true,"service":"sprout-server","mentor":{"aiConfigured":false},"paypal":{"sandboxConfigured":false}}
```

Flags indicate credentials are present, not provider readiness. No secret is returned.

`GET /api/ready` returns `{ok:true,storage:"postgres"}` after checking the current shared schema,
or `{ok:true,storage:"local"}` for local-file/memory development. A database outage, missing schema
or three-second deadline returns `503 not_ready` with no driver details. Checks share in-flight
work and cache success for two seconds. This endpoint makes no provider calls or mutations.
Render uses readiness; it is not a full PayPal/Gemini/ledger check.

## Guardian permission

| Route | Input | Result |
| --- | --- | --- |
| `GET /api/guardian/status` | Query `learner=A12` (default), `B07` or `C33` | `{configured,demoOpenAccess,consent}` |
| `POST /api/guardian/permission` | `{learner,action,revision,pin?}` | The same shape with saved status |

`consent` contains `learner`, `status` (`pending`, `active`, `withdrawn`, `deleted`), integer `revision`, `policy`, `acknowledgedAt` and `changedAt`. Current policy: `demo-permission-v2`.

Schema 4 records the policy per learner. Old active acknowledgements become pending with an
advanced revision and require the shared-storage statement again. Progress and blocked markers
remain. An old-policy write cannot authorize protected learning on the current API.

Actions are `acknowledge`, `withdraw` and `delete`. Acknowledgement also needs `acknowledged:true` and the current `policy`. Deletion needs `confirm` equal to the learner code. A stale revision returns `409 consent_changed`.

Protected mode checks `PAYOUT_PIN_GUARDIAN`: missing configuration is 503, missing PIN 400, wrong PIN 403 and locked PIN 429. Both modes require acknowledgement/deletion confirmations. Status reveals no credentials, activities or payment details.

Withdrawal retains progress. Deletion removes selected activities/derived jars and A12's garden, preserves payment records, and retains a minimal revision marker. Fresh permission does not recreate deleted activities. File save failures return `503 learning_records_unavailable` and block learning until saved. Database mode locks revision checks and changes together; outages return `503 shared_records_unavailable`. Refresh status after uncertainty; restore local disk access before restarting a file-backed API.

## Mentor

`POST /api/mentor/chat` needs A12's current `x-learning-revision` and, in protected mode, active permission. Access failures are 403/409 and must not trigger client offline answers.

```json
{
  "language":"en",
  "messages":[{"role":"user","text":"How can I save for my bicycle?"}],
  "context":{
    "jars":{"save":200,"spend":120,"give":40,"invest":40},
    "goal":{"label":"Bicycle","cost":6000,"monthly":100}
  }
}
```

Language is `en` or `hi`. Send 1–12 turns ending with `user`. Trimmed user text is 1–600 characters; earlier `mentor` text is 1–1,000. Optional context contains both jars and goal. Jars are integer sample rupees, 0–100,000 each. Goal labels are `Headphones`, `Bicycle` or `Laptop`; cost is 1–1,000,000, monthly contribution 0–100,000.

The shared website switch sets the next mentor request's language. A reply already streaming keeps its original language; its old-language follow-up suggestions cannot replace the new language's defaults. Goal labels remain canonical English API values when displayed in Hindi. API error codes/messages and CSV fields retain their existing schema; the client translates known errors at display time.

Success streams `application/x-ndjson`, one JSON event per line:

```text
{"type":"start","source":"ai","flagged":false}
{"type":"delta","text":"Try saving "}
{"type":"delta","text":"a little each month."}
{"type":"done","suggestions":["How can I plan my goal?"]}
```

Source is `ai` or `prepared`. Missing configuration/failure before the first AI chunk uses prepared text. Sensitive topics in any user turn set `flagged`. A later model error adds a cut-short notice before `done`; a connection ending without `done` is incomplete. Revision changes stop later output without completing a normal answer.

Defaults: `gemini-3.5-flash-lite`, 400 output tokens, 15-second timeout. Disconnects cancel model work. Instructions request short, age-appropriate guidance; they do not guarantee correctness. Emails/UPI addresses and numbers of seven or more decimal digits (including Devanagari, with optional spaces/dashes) are redacted before model submission. Chat is not persisted; redaction is not complete anonymization. Malformed bodies return 400; quotas return 429. Code: `server/src/features/mentor/`, `routes.ts`, and `client/src/features/mentor/api.js`.

## PayPal sandbox

Only `api-m.sandbox.paypal.com` is used. Amounts are whole USD. The server fixes allowed donation amounts and the guardian recipient.

| Route | Input / behavior | Result |
| --- | --- | --- |
| `GET /api/paypal/config` | Public SDK/setup information | `{configured,clientId,currency,mode,demoOpenAccess,amounts,rewardDollars,maxPayoutDollars,ngoName,poolDollars,payouts}` |
| `GET /api/paypal/receipts` | Optional `limit` 1–100 and `before` previous receipt code; pending count covers full history | `{receipts,nextCursor,poolDollars,pendingCount}` |
| `POST /api/paypal/orders` | `{amount}` from configured amounts | `{id}` |
| `POST /api/paypal/orders/:id/capture` | Capture an order created here and approved through PayPal | `{receipt,note,poolDollars}` |
| `POST /api/paypal/payout-requests` | `{amount}`, integer 1–`maxPayoutDollars` | `{request,poolDollars}` |
| `POST /api/paypal/payout-requests/:id/approve` | `{approver,pin?}` | `{request,poolDollars}` |
| `POST /api/paypal/payout-requests/:id/recover` | `{approver,pin?}`; sends no payment | `{request,poolDollars}` |
| `POST /api/paypal/payout-requests/:id/send` | `{approver,pin?}` from an approving role | `{request,poolDollars}` |
| `GET /api/paypal/payouts/:batchId` | Refresh stored payout, at most once/15 seconds per batch | `{receipt,poolDollars}` |

`payouts` contains `{configured,guardian}` with a masked recipient. The SDK client ID is intentionally public. A request contains `{id,amount,child,approvals,receipt}`; approvals list roles (`mentor`, `admin`, `guardian`), not credentials.

Protected payouts need three distinct configured PINs and a guardian email. Approve/recover/send checks the selected role's PIN. Sending needs that role's approval and two different approved roles. Open mode bypasses PIN checks while retaining role checks.

Receipts contain `{id,type,amount,currency,date,ref,status,batchId}`. Owner responses also include `paypalId`; public lists omit it. Capture verifies order ID, `COMPLETED`, USD and the exact expected amount. Repeat capture returns the same receipt with `note:null`; a simultaneous capture in one process returns `409 capture_in_progress`. Cross-instance captures reuse the provider idempotency key; database uniqueness prevents a second pool credit. New notes contain `{text,source:'ai'|'prepared'}`.

Funds and sender IDs are saved before sending. A definite first-attempt refusal becomes `REJECTED`; uncertainty becomes `UNKNOWN` with funds reserved. Retrying `UNKNOWN`/idle `SENDING` reuses the same IDs. Duplicate-provider lookups must match operation, payee, currency and amount. Automatic retries stop after 29 days from first send (legacy records use creation time).

Send and refresh use the recipient item's status. Batch `SUCCESS` without an item result is
reported as `PENDING`, keeps funds reserved and cannot qualify for ledger publication. A later
`REFUNDED`, `RETURNED` or `REVERSED` status restores the pool and corrects reports in both
storage backends. Stale pending/unknown responses cannot undo `SUCCESS`; stale success cannot
undo returned funds. These rules do not alter an already published historical ledger batch.

`502 payout_unknown` and `409 payout_manual_review` include request/pool recovery data. Preserve it. `503 payment_records_unavailable` blocks financial operations until pending results persist. Do not delete records or create replacement payments to clear uncertainty.

Database-backed sends claim a 90-second lease and recheck approvals and funds inside the
reservation transaction. Another sender gets `409 send_in_progress`. After lease expiry,
recovery reuses the committed receipt and operation IDs; a failed result save leaves the
original reservation intact. Database storage failures return `503 shared_records_unavailable`.

Other errors include `400 invalid_request`; `403 wrong_pin`, `not_an_approver`, `needs_approval`; `404 unknown_order`, `unknown_request`, `unknown_payout`; `409 pool_too_small`, `already_sent`, `send_in_progress`, `payment_not_completed`, `payout_needs_review`; `429 pin_locked`, `rate_limited`; `502 paypal_error` with provider `issue`; and `503 paypal_not_configured`, `payouts_not_configured`, `too_many_orders`.

## NGO workspace

| Route | Input / protected access | Result |
| --- | --- | --- |
| `GET /api/ngo/config` | Public | `{configured,demoOpenAccess,roles}` |
| `POST /api/ngo/unlock` | `{approver:'mentor'|'admin',pin}` | `{token,expiresAt,role,dashboard}` |
| `GET /api/ngo/dashboard` | Bearer token | `{dashboard}` |
| `POST /api/ngo/reviews/:id` | Bearer token; `{decision:'approved'|'returned'}` | `{dashboard,alreadyReviewed}` |
| `GET /api/ngo/report` | Bearer token | `{filename,csv}` |
| `POST /api/ngo/lock` | Bearer token; `{}` | `{locked:true}` |

Open-mode workspace operations need no token; the UI bypasses unlock. Unlock itself still validates configured staff credentials. Protected sessions expire after 15 minutes; guardian PINs cannot unlock staff access.

Dashboard fields: `activities`, coded `learners`, credit `totals`, USD `sandbox` aggregates. Protected reviews require that learner's permission. Repeating a decision is harmless; changing it returns `409 already_reviewed`. Missing activity is 404; missing/expired session 401. Failed saves return 503 without awarding credits. Reviews never call PayPal or spend dollars. CSV contains aggregate metrics/units without names or payment IDs. Responses are no-store.

## Seedlings

Both routes need current A12 `x-learning-revision` and, in protected mode, active permission.

| Route | Input | Result |
| --- | --- | --- |
| `GET /api/seedlings` | Revision header | `{garden}` |
| `POST /api/seedlings/complete` | `{lessonId:'needs'|'waiting'|'sharing',answers:string[]}` | `{garden,alreadyCompleted}` |

Garden contains `{completed:[{lessonId,completedAt}],seeds,totalLessons:3}`. Supply one ordered choice ID per picture. Missing/invented answers return 400; incorrect answers return `422 lesson_incomplete` with zero-based `incorrect` indexes. A correct, saved lesson earns one seed; replay returns `alreadyCompleted:true`. Save failures return `503 learning_records_unavailable`. Seeds never change credits, PayPal or the chain. Responses are no-store.

## Ledger

| Route | Input | Result |
| --- | --- | --- |
| `GET /api/ledger/status` | None | Local chain status, or fixed identity plus `publicationMode:'staff'`, network label, pending count and active job |
| `GET /api/ledger/batches/:id` | Positive safe integer; optional `chainId`/`contract` scope | `{batch}`; database responses also include `identity` |
| `POST /api/ledger/publish` | `{batchId:1,receipts}` matching the exact server sample list | `{batch,alreadyPublished}` |
| `POST /api/ledger/publish-live` | No body; up to 64 settled unpublished PayPal receipts | `{batch,alreadyPublished,receipts}` |
| `GET /api/ledger/jobs/:id` | Public job code | `{job,identity}`; no signing bytes or provider IDs |
| `POST /api/ledger/jobs/:id/resume` | NGO admin bearer session in shared mode | Continue the same saved publication |

Batch contains `{batchId,root,publishedAt,donated,rewarded,paidOut,receipts,tx}`. Root is 64 hex characters; `receipts` here is a count. Transaction fields include hash, block number/hash, timestamp, sender, recipient, gas, fee and status. Live batches start at 101. Status can return a null contract before publication; reads do not deploy it.

Conflicting contents return `409 batch_conflict`; no eligible live receipts returns `409 nothing_to_publish`; unavailable chain returns `503 chain_unreachable`. The server computes roots and verifies the returned batch before saving publication markers. See [ledger format/lifecycle](ledger.md).

Database publication and resume require an unexpired **admin** bearer token from
`POST /api/ngo/unlock`, including in open demo mode. Mentor/guardian access cannot publish.
Public reads require no session. CORS preflights allow `authorization`.

Shared jobs contain `id`, `kind`, `chainId`, `contract`, server-computed `input`, receipt snapshot,
`state`, transaction `hash` and optional confirmed `result`. States are `prepared`, `signed`,
`submitted`, `confirmed` or `blocked`. Signed bytes are private to storage. An unfinished job
reserves its receipt IDs so another request cannot create a second batch for them.

Shared publication returns **202** with `{job,identity}` while pending, **200** with the job and
confirmed batch/receipts when finished, or **409** with a blocked job and `ledger_manual_review`.
Busy claims return `409 ledger_busy`; another worker may recover after a 90-second lease.
No request waits indefinitely or starts a background publisher. Resume performs a bounded check
and, when needed, resubmits the exact saved transaction. It never chooses new receipt/batch IDs.

`503 ledger_setup_required` means explicit operator setup is incomplete. Chain/config/deployment
mismatches fail closed and never deploy a replacement. Fixed identities contain `chainId`,
`contract`, `publisher`, `deployHash`, `deployBlock` and `deployBlockHash`. A scoped batch request
that disagrees with that identity returns `409 ledger_identity_conflict`. Database batch objects
also carry this identity, which browser verification checks before accepting a proof.

## Limits

Limits are per address unless stated otherwise. Database-backed instances share budgets; file
mode limits apply to one process. Limited responses use 429 and `Retry-After` seconds. Disallowed
browser origins receive `403 forbidden_origin`. The shared AI cap covers mentor replies and donor
notes; an exhausted donor-note budget selects prepared text without undoing a captured donation.

| Operation | Budget |
| --- | --- |
| Mentor | 20/5 minutes; shared hourly AI cap defaults to 300 |
| PayPal orders + captures | 20/5 minutes combined |
| Payout request/approve/recover/send | 20/5 minutes combined |
| PayPal reads | 60/minute |
| Ledger publishes / reads | 10/5 minutes combined / 60 per minute |
| NGO routes | 60/minute; unlock also 20/5 minutes |
| Guardian routes | 60/minute; changes also 20/5 minutes |
| Seedlings routes | 60/minute |
| Wrong PIN | 5 guesses per role, then 15-minute shared lockout |

The presentation introduces no endpoints and submits no API mutations.

Receipt history defaults to the newest 100 entries, returned oldest-to-newest within that page.
Pass the returned `nextCursor` as `before` to load older entries; `null` means no earlier page.
New receipts do not shift an existing cursor. Invalid page sizes/codes return 400; provider
identifiers remain private. `pendingCount` is full-history, independent of the page size.
