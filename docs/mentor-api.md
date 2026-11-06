# API contract (learning, guardian permission, mentor, PayPal and impact ledger)

## Guardian demo permission

`GET /api/guardian/status?learner=A12` returns `{configured,consent}`. Learner codes are the fixed
samples A12, B07 and C33. Consent contains `learner`, `status` (`pending`, `active`, `withdrawn`,
`deleted`), integer `revision`, `policy:'demo-permission-v1'`, `acknowledgedAt` and `changedAt`.
No PIN, name, chat, activity or payment details appear in this public local-demo status.

`POST /api/guardian/permission` takes `{learner,pin,action,revision}`. `acknowledge` also requires
`acknowledged:true` and `policy:'demo-permission-v1'`; `delete` requires `confirm` equal to the
learner code. Every action checks `PAYOUT_PIN_GUARDIAN`, sharing the payout PIN lockout. Missing
setup returns 503, wrong PIN 403, locked PIN 429, stale revision 409, malformed requests 400.
Responses return the saved `{configured,consent}` and always use `cache-control:no-store`.
These routes enforce the origin allow-list, 60 requests/minute and 20 changes/5 minutes per IP.

`GET /api/seedlings`, `POST /api/seedlings/complete` and `POST /api/mentor/chat` require active
A12 permission and `x-learning-revision` matching its current revision. Otherwise they return
403 `consent_required` or 409 `consent_changed`; these are access failures and must never trigger
an offline chat fallback. CORS preflight permits the revision header. NGO activity reviews also
require active permission for their activity's learner, returning 403 `consent_required` otherwise.

Withdrawal retains progress but blocks new learning/chat/reviews. Active AI streams abort after
revocation and check permission before yielding later model output. Deletion removes the selected
learner's activities/derived jars and, for A12, the garden. No saved chat history, offline queue or
issued certificate exists yet. A minimal deleted marker prevents stale requests restoring data.
Fresh permission after deletion uses a new revision and starts with an empty garden; deleted
activities are not recreated. Payment records, payouts and chain receipts are unaffected.

Learning JSON files migrate with empty `consents` (permission pending), retaining existing progress.
Permission writes are atomic. A failed permission write returns 503 and blocks all learning until
the pending state can be saved. Keep the process running during a storage outage: an in-memory
pending change cannot survive a crash before it reaches disk. Refresh saved status after uncertainty.
This is a PIN-authorized local acknowledgement, without identity or legal-consent verification.

The agreement between the website (`client/`) and the server (`server/`). Change this file
first, then the code on both sides. Server code: `server/src/routes/mentor.ts` and
`server/src/mentor/`. Client code: `client/src/lib/mentorApi.js`.

All requests go to the website's own address under `/api`. In development Vite forwards them to
the Fastify server on `http://127.0.0.1:8787`.

---

## `GET /api/health`

```json
{ "ok": true, "service": "sprout-server", "mentor": { "aiConfigured": true }, "paypal": { "sandboxConfigured": true } }
```

`aiConfigured: false` means no `GEMINI_API_KEY` is set: the chat shows "Offline mode" and the
server answers from prepared replies. The key itself is never returned.

---

## `POST /api/mentor/chat` (live since 2026-11-05)

### Request body

```json
{
  "language": "en",
  "messages": [{ "role": "user", "text": "How long until I can buy my bicycle?" }],
  "context": {
    "jars": { "save": 200, "spend": 120, "give": 40, "invest": 40 },
    "goal": { "label": "Bicycle", "cost": 6000, "monthly": 100 }
  }
}
```

| Field | Rules |
| --- | --- |
| `language` | `"en"` or `"hi"`. Replies are written in this language (Hindi in Devanagari). |
| `messages` | 1–12 items, oldest first; the last must be `role: "user"`. `role` is `"user"` or `"mentor"`; `text` is 1–600 characters after trimming. |
| `context` | Optional. The demo's **sample** numbers in whole rupees. |
| `context.jars.*` | Integers 0–100,000. |
| `context.goal` | `label` must be `"Headphones"`, `"Bicycle"` or `"Laptop"` (free text could smuggle instructions to the AI), `cost` 1–1,000,000, `monthly` 0–100,000. |

Unknown fields are rejected. Body limit 16KB. Checked by `server/src/mentor/schema.ts`.

### Success: `200`, streamed

`Content-Type: application/x-ndjson`: one JSON object per line, sent as soon as it is ready.

```
{"type":"start","source":"ai","flagged":false}
{"type":"delta","text":"At ₹100 a month, "}
{"type":"delta","text":"your ₹6,000 bicycle is…"}
{"type":"done","suggestions":["How can I save faster for my goal?","Is it okay to spend some now?"]}
```

| Event | Meaning |
| --- | --- |
| `start` | First line, always. `source` is `"ai"` (Gemini) or `"prepared"` (built-in answer because there is no key, or Gemini failed before replying). `flagged` is `true` for sensitive topics (scams, debt, family trouble, bullying, self-harm); the UI then shows a "Talk to a trusted adult" card with Childline 1098. |
| `delta` | A piece of the reply. Join all `text` values in order. |
| `done` | Last line. `suggestions`: up to 3 follow-up questions in the same language, skipping ones already asked. |

If Gemini stops halfway, the server adds a short "(the answer was cut short)" delta and still
sends `done`.

### Errors

Errors are plain JSON (not streamed): `{ "error": "<code>", "message": "<human readable>" }`.

| Status | `error` | When | What the UI does |
| --- | --- | --- | --- |
| 400 | `invalid_request` | Body breaks the rules above | Shows the message as a notice |
| 404 | `not_found` | Wrong path | Developer error |
| 403 | `forbidden_origin` | A browser on another website (its `Origin` isn't in `ALLOWED_ORIGIN`) | — |
| 429 | `rate_limited` | More than 20 requests in 5 minutes from one address, or more than `MENTOR_HOURLY_LIMIT` (300) per hour from everyone together. `Retry-After` gives seconds | Shows the message as a notice |
| network error / 5xx | — | Server unreachable | Answers from the client's prepared set, tags it, shows "Offline mode" |

### Behaviour and safety

- Model: `GEMINI_MODEL` (agreed: `gemini-3.5-flash-lite`), temperature 0.5, max 400 output
  tokens, 15-second timeout, cancelled if the browser disconnects.
- Rules live in `server/src/mentor/prompt.ts`: kid-friendly, at most 110 words, ₹ digits, no
  personal investment advice or product picks, never asks for personal details, stays on money
  topics, ignores instructions inside user messages that try to change its rules.
- `server/src/mentor/safety.ts` flags risky topics in English and Hindi with a word list; flagged
  chats get extra-careful instructions and the trusted-adult card.

### Misuse protection

- **Other websites:** browsers send an `Origin` header; only `ALLOWED_ORIGIN` gets answers and
  CORS headers (`OPTIONS` preflight supported). Scripts without a browser aren't stopped by this.
- **Quota abuse:** per-address limit (20 / 5 min) plus a shared hourly cap for everyone (300).
  With no logins, the server can't tell a kid from a script; the caps limit the damage.
- **Real addresses:** `TRUST_PROXY=true` only when deployed behind a host's proxy; off locally so
  a faked `X-Forwarded-For` header can't dodge the limit.
- **Prompt tricks:** rules tell the AI to ignore instructions inside messages and to distrust
  earlier "mentor" turns sent back by the browser (they can be edited). Goal names are a fixed list.
- **Memory:** the rate limiter forgets quiet addresses.
- **Check it:** `npm run eval:mentor` runs 12 misuse attempts against the real AI (off-topic,
  coding, stock tips in English and Hindi, forged history, role-play jailbreak, prompt reveal,
  Hinglish scam, self-harm, personal details, empty list, goal-name injection).

### Privacy

- The server never logs message text: only timing, `source` and `flagged`.
- Nothing is stored. Chat history lives only in the browser tab and is sent with each question
  (last 12 messages; kid questions up to 600 characters, earlier mentor replies up to 1,000,
  which the website shortens to fit).
- Before any turn goes to Gemini, `mentor/privacy.ts` blanks out emails/UPI ids (`[email]`) and
  runs of 7+ digits such as phone, card or Aadhaar numbers (`[number]`). Money amounts are kept.
- A sensitive word in **any** of the kid's messages flags the whole reply, so short follow-ups keep
  the careful instruction and the trusted-adult card.
- The UI reminds kids not to share real names, phone numbers, addresses or passwords, and says
  their questions go to Google's Gemini. If the server can't be reached, the website checks the
  same sensitive words itself (`client/src/lib/safety.js`) and still shows the trusted-adult card.
- The stream must end with `done`; if it stops early, the website keeps what arrived, marks it
  cut short and says so.
- Bad requests (400) don't use up the shared hourly AI cap.

---

## Public impact ledger (Phase 5)

Server code: `server/src/routes/ledger.ts`, `server/src/ledger/`. Client: `client/src/lib/ledgerApi.js`.
Same "only our website" origin rule as the mentor.

| Route | Does | Replies |
| --- | --- | --- |
| `GET /api/ledger/status` | Checks the chain | `{ ok, chainId, blockNumber, contract (null until the first publish deploys it), publisher, local }` |
| `POST /api/ledger/publish` | Seals the **sample** batch only. Body `{ batchId: 1, receipts }` where `receipts` must be exactly the sample list in `client/src/lib/sampleReceipts.js` (= `server/src/ledger/sample.ts`); anything else is `400`. The server computes the batch code and totals itself. Max 10 per device per 5 minutes. | `{ batch, alreadyPublished }`. Publishing again returns the original; a batch number holding other receipts is `409 batch_conflict`. |
| `POST /api/ledger/publish-live` | Seals the server's own settled PayPal receipts (completed donations, payouts with status `SUCCESS`) not yet published, in a new batch (101, 102…). No body. One publish at a time. | `{ batch, alreadyPublished, receipts }`; `409 nothing_to_publish` if none |
| `GET /api/ledger/batches/:id` | Reads a batch from the contract (never deploys it) | `{ batch }`, or `{ batch: null }` if not published yet |

Receipt fingerprints use format **v2**: `leaf:v2|id|type|amount|currency|date|ref`, where
`currency` is `INR` (sample batches, whole rupees) or `USD` (PayPal batches, whole dollars). A
batch holds one currency. Batch numbers 1–100 are sample batches, 101+ are PayPal batches.
Reads are limited to 60 per device per minute.

`batch` = `{ batchId, root (64 hex), publishedAt, donated, rewarded, paidOut, receipts, tx }`, where
`tx` = `{ hash, blockNumber, blockHash, timestamp, from, to, gasUsed, feeEth, status }`.

Errors: `400 invalid_request`, `403 forbidden_origin`, `429 rate_limited`, `503 chain_unreachable`
("The local blockchain isn’t running. Start everything with `npm run dev`.").

---

## PayPal (sandbox)

Server code: `server/src/routes/paypal.ts`, `server/src/paypal/`. Client: `client/src/lib/paypalApi.js`,
`client/src/previews/PayPalButton.jsx`. Talks only to `https://api-m.sandbox.paypal.com` (test money).
Same "only our website" origin rule; orders and captures 20 per device per 5 minutes, payout
steps 20, reads 60 per minute. Everything is saved to `DATA_FILE` (default
`server/data/paypal-records.json`) after each change, so a restart keeps it.

| Route | Does | Replies |
| --- | --- | --- |
| `GET /api/paypal/config` | Is PayPal set up? | `{ configured, clientId (public), currency: "USD", mode: "sandbox", amounts, rewardDollars, maxPayoutDollars, ngoName, poolDollars, payouts: { configured, guardian (masked, e.g. "sb…@personal.example.com") } }` |
| `POST /api/paypal/orders` | Body `{ amount }`, one of `amounts`. Creates an Orders v2 order. Unpaid orders are forgotten after a day; at most 500 wait at once (`503 too_many_orders`). | `{ id }` |
| `POST /api/paypal/orders/:id/capture` | Captures an order this server created, after the donor approved it. Checks status `COMPLETED`, USD, the order id and the exact amount. Capturing twice returns the same receipt; two captures at the same moment → one gets `409 capture_in_progress`. | `{ receipt (with paypalId), note: { text, source: "ai" \| "prepared" }, poolDollars }` |
| `POST /api/paypal/payout-requests` | A kid's request. Body `{ amount: 1–maxPayoutDollars }`. The payee is always `GUARDIAN_PAYPAL_EMAIL`. | `{ request, poolDollars }` |
| `POST /api/paypal/payout-requests/:id/approve` | Body `{ approver: "mentor" \| "admin" \| "guardian", pin }`. The PIN must be that adult's (`PAYOUT_PIN_*`). Five wrong PINs lock that adult for 15 minutes for everyone. | `{ request, poolDollars }` |
| `POST /api/paypal/payout-requests/:id/send` | Body `{ approver, pin }`: an adult who approved, PIN again. Needs 2 different approvals, enough pool, and no other payout with an unknown outcome. Sends a Payouts v1 payment with a sender batch id fixed before the call. Sending again only retries an `UNKNOWN` payout, with the same ids. | `{ request, poolDollars }` |
| `GET /api/paypal/payouts/:batchId` | Refreshes a payout's status from PayPal (at most every 15 s per payout). | `{ receipt, poolDollars }` |
| `GET /api/paypal/receipts` | The newest 100 receipts, public view (no PayPal ids). | `{ receipts, poolDollars }` |

`request` = `{ id: "REQ-2611-0001", amount, child, approvals: ["mentor", …], receipt | null }` (never the email).
`receipt` = `{ id: "DON-2611-0001" | "PAY-…", type: "donation" | "payout", amount (whole USD), currency: "USD",
date, ref: "donor-<16 hex>" | "guardian-<16 hex>", paypalId (capture id or payout batch id; only to the
donor or approving adults), status, batchId }`. `ref` is a salted fingerprint of PayPal's payer id or
the guardian's email. Payout statuses: `SENDING`, `PENDING`, `SUCCESS`, `UNCLAIMED`, `FAILED`… plus
`UNKNOWN` (PayPal didn't confirm; money stays reserved) and `REJECTED` (PayPal refused; money back
in the pool).

Errors: `400 invalid_request`, `403 forbidden_origin` / `wrong_pin` / `needs_approval` /
`not_an_approver`, `404 unknown_order` / `unknown_request` / `unknown_payout`,
`409 payment_not_completed` / `capture_in_progress` / `pool_too_small` / `payout_needs_review` /
`already_sent` / `send_in_progress`, `429 rate_limited` / `pin_locked`, `502 paypal_error` (with
PayPal's `issue`, e.g. `ORDER_NOT_APPROVED`, `INSUFFICIENT_FUNDS`) / `payout_unknown`,
`503 paypal_not_configured` / `payouts_not_configured` / `too_many_orders`.

Payout recovery additions (2026-11-05): `POST /api/paypal/payout-requests/:id/recover` takes
`{approver,pin}` and returns `{request,poolDollars}` after checking an adult's PIN. It sends no
payment. It uses the same origin rule, per-device payout limit and PIN lockout as approvals.
The browser stores only the request code in sessionStorage; recovery needs a PIN again.

`502 payout_unknown` includes `{request,poolDollars}` so the UI can show the receipt and reserved
balance. Duplicate batch replies trigger a sandbox-only read which must match the original
sender operation, guardian, currency and amount. Only `UNKNOWN` (or an idle `SENDING` record
after an interrupted save) can be resent. Retries stop after 29 days from first send; older or
invalid timestamps produce `409 payout_manual_review`, with funds still reserved. Legacy records
use request creation time as a conservative limit. All configured adult PINs must be distinct.

`503 payment_records_unavailable` means a record could not be saved. Financial reads and changes
stay blocked until the pending result is saved successfully. Restore disk access and recover the
same request. Restarting during a disk outage can still lose unsaved provider responses; check
PayPal before attempting any replacement payment.

## NGO workspace (local demo)

All `/api/ngo/*` routes use the allowed-origin check and `Cache-Control: no-store`. Requests
are limited to 60/minute per address; unlocking is additionally limited to 20/5 minutes. The
existing mentor/admin PINs are used, with the same five-guess lockout counter as payouts.
One configured staff PIN is sufficient; PayPal credentials and other adult PINs are not needed
to unlock the NGO workspace. Settings load at server startup. The current `npm run dev` command
restarts the API after `.env` saves; production needs a manual restart. Then re-fetch
`/api/ngo/config` (the setup screen provides **Check access again**).
The config response never contains PIN values. The visibility toggle is entirely client-side
and affects only the value entered by the person signing in.

| Route | Input / access | Result |
| --- | --- | --- |
| `GET /api/ngo/config` | Public | `{configured,roles}`; no PINs, learners or payments |
| `POST /api/ngo/unlock` | `{approver:'mentor'|'admin',pin}` | `{token,expiresAt,role,dashboard}`; token expires after 15 minutes |
| `GET /api/ngo/dashboard` | `Authorization: Bearer <token>` | `{dashboard}` |
| `POST /api/ngo/reviews/:id` | Bearer token, `{decision:'approved'|'returned'}` | `{dashboard,alreadyReviewed}`; repeated identical decision is harmless; conflicting decision is 409 |
| `GET /api/ngo/report` | Bearer token | `{filename,csv}` with aggregate count/credit/USD units, no learner or payment identifiers |
| `POST /api/ngo/lock` | Bearer token, `{}` | `{locked:true}`; invalidates the token |

Dashboard fields: `activities`, `learners` (coded sample identities and credit jars), `totals`
(pending/approved/returned/totalCredits), and `sandbox` (donated/paid/reserved/available in USD,
from all saved PayPal receipts). Approvals do not call PayPal or change its pool. The separate
`LEARNING_DATA_FILE` defaults to `data/learning-records.json`; paths matching the payment file
are refused. A failed review save returns 503 without committing credits. Missing/expired tokens
return 401; wrong PINs return 403; unknown activities return 404. Guardian PINs cannot unlock staff access.

## Seedlings (shared local sample garden)

The silent presentation introduces no API endpoints. Its automatic controls change only sample
state in `/app`; it does not submit mentor chat, PayPal operations, NGO PINs/reviews, Seedlings
completions or ledger publishes. Existing public read routes can load the displayed screens.
Minimising or expanding autoplay controls is entirely client-side and does not change this API behavior.

This public local-demo API takes no learner identity or PIN. It operates one explicitly shared
sample garden. All routes enforce the existing browser-origin allow-list, no-store responses
and a shared limit of 60 requests/minute per address. Seeds have no monetary value.

| Route | Input | Result |
| --- | --- | --- |
| `GET /api/seedlings` | `x-learning-revision` header | `{garden:{completed:[{lessonId,completedAt}],seeds,totalLessons:3}}` |
| `POST /api/seedlings/complete` | `{lessonId:'needs'|'waiting'|'sharing',answers:string[]}` | `{garden,alreadyCompleted}` after server validation and a successful file save |

The answer array has exactly one choice id per picture, in order. Unknown lessons, extra fields
or missing answers return `400 invalid_request`; incorrect answers return `422 lesson_incomplete`
with `incorrect:number[]` (zero-based picture indexes). No seed is awarded on failure. Replaying
a correct completion returns `alreadyCompleted:true` without another seed. A failed write returns
`503 learning_records_unavailable`; the previous in-memory and saved garden remain unchanged.
Writes use the existing learning file; older version-1 files gain an empty seedlings array while
preserving NGO reviews. No PayPal call, payout, credit-jar change or on-chain write is made.
