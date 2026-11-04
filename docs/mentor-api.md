# Mentor API contract

The agreement between the website (`client/`) and the server (`server/`). Change this file
first, then the code on both sides. Server code: `server/src/routes/mentor.ts` and
`server/src/mentor/`. Client code: `client/src/lib/mentorApi.js`.

All requests go to the website's own address under `/api`. In development Vite forwards them to
the Fastify server on `http://127.0.0.1:8787`.

---

## `GET /api/health`

```json
{ "ok": true, "service": "sprout-server", "mentor": { "aiConfigured": true } }
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
| `context.goal` | `label` 1–40 chars, `cost` 1–1,000,000, `monthly` 0–100,000. |

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
| 429 | `rate_limited` | More than 20 requests in 5 minutes from one address. `Retry-After` header gives seconds | Shows "Let's take a short break…" |
| network error / 5xx | — | Server unreachable | Answers from the client's prepared set, tags it, shows "Offline mode" |

### Behaviour and safety

- Model: `GEMINI_MODEL` (agreed: `gemini-3.5-flash-lite`), temperature 0.5, max 400 output
  tokens, 15-second timeout, cancelled if the browser disconnects.
- Rules live in `server/src/mentor/prompt.ts`: kid-friendly, at most 110 words, ₹ digits, no
  personal investment advice or product picks, never asks for personal details, stays on money
  topics, ignores instructions inside user messages that try to change its rules.
- `server/src/mentor/safety.ts` flags risky topics in English and Hindi with a word list; flagged
  chats get extra-careful instructions and the trusted-adult card.

### Privacy

- The server never logs message text: only timing, `source` and `flagged`.
- Nothing is stored. Chat history lives only in the browser tab and is sent with each question
  (last 12 messages).
- The UI reminds kids not to share real names, phone numbers, addresses or passwords.
