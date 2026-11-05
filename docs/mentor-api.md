# API contract (mentor, PayPal and impact ledger)

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
  (last 12 messages).
- The UI reminds kids not to share real names, phone numbers, addresses or passwords.

---

## Public impact ledger (Phase 5)

Server code: `server/src/routes/ledger.ts`, `server/src/ledger/`. Client: `client/src/lib/ledgerApi.js`.
Same "only our website" origin rule as the mentor.

| Route | Does | Replies |
| --- | --- | --- |
| `GET /api/ledger/status` | Checks the chain | `{ ok, chainId, blockNumber, contract, publisher, local }` |
| `POST /api/ledger/publish` | Body `{ batchId: 1–1,000,000, receipts: [{ id: "RWD-2611-0108", type: "donation" \| "reward" \| "payout", amount: 0–10,000,000, date: "YYYY-MM-DD", ref: "kid-a12" }] }` (1–64 receipts, codes only). The server computes the batch code and totals itself; a browser can't send a code. Max 10 per device per 5 minutes. | `{ batch, alreadyPublished }`. Publishing a batch number twice returns the original. |
| `POST /api/ledger/publish-live` | Seals the server's own PayPal receipts not yet published, in a new batch (101, 102…). No body. | `{ batch, alreadyPublished, receipts }`; `409 nothing_to_publish` if none |
| `GET /api/ledger/batches/:id` | Reads a batch from the contract | `{ batch }`, or `{ batch: null }` if not published yet |

`batch` = `{ batchId, root (64 hex), publishedAt, donated, rewarded, paidOut, receipts, tx }`, where
`tx` = `{ hash, blockNumber, blockHash, timestamp, from, to, gasUsed, feeEth, status }`.

Errors: `400 invalid_request`, `403 forbidden_origin`, `429 rate_limited`, `503 chain_unreachable`
("The local blockchain isn’t running. Start everything with `npm run dev`.").

---

## PayPal (sandbox)

Server code: `server/src/routes/paypal.ts`, `server/src/paypal/`. Client: `client/src/lib/paypalApi.js`,
`client/src/previews/PayPalButton.jsx`. Talks only to `https://api-m.sandbox.paypal.com` (test money).
Same "only our website" origin rule; orders and captures 20 per device per 5 minutes, payouts 10.

| Route | Does | Replies |
| --- | --- | --- |
| `GET /api/paypal/config` | Is PayPal set up? | `{ configured, clientId (public), currency: "USD", mode: "sandbox", amounts, rewardDollars, maxPayoutDollars, ngoName, poolDollars }` |
| `POST /api/paypal/orders` | Body `{ amount }`, one of `amounts`. Creates an Orders v2 order. | `{ id }` |
| `POST /api/paypal/orders/:id/capture` | Captures an order this server created, after the donor approved it. Checks status `COMPLETED`, USD and the exact amount. Capturing twice returns the same receipt. | `{ receipt, note: { text, source: "ai" \| "prepared" }, poolDollars }` |
| `POST /api/paypal/payouts` | Body `{ email, amount: 1–maxPayoutDollars, approvals: ["mentor" \| "admin" \| "guardian"] }`. Needs 2 different approvals and enough pool. Sends a Payouts v1 payment. | `{ receipt, poolDollars }` |
| `GET /api/paypal/payouts/:batchId` | Refreshes a payout's status from PayPal. | `{ receipt, poolDollars }` |
| `GET /api/paypal/receipts` | All live receipts. | `{ receipts, poolDollars }` |

`receipt` = `{ id: "DON-2611-0001" | "PAY-…", type: "donation" | "payout", amount (whole USD), date,
ref: "donor-3fa9c1" | "guardian-81bd02", currency, paypalId (capture id or payout batch id), status, batchId }`.
`ref` is a salted fingerprint of PayPal's payer id or the guardian's email; the email itself is never stored.

Errors: `400 invalid_request`, `403 forbidden_origin` / `needs_approval`, `404 unknown_order` /
`unknown_payout`, `409 payment_not_completed` / `pool_too_small`, `429 rate_limited`,
`502 paypal_error` (with PayPal's `issue`, e.g. `ORDER_NOT_APPROVED`, `INSUFFICIENT_FUNDS`),
`503 paypal_not_configured`.
