# Mentor API contract

The agreement between the website (`client/`) and the server (`server/`). Both sides build
against this file; change it first, then the code on both sides.

All requests go to the website's own address under `/api`. In development Vite forwards them to
the Fastify server on `http://127.0.0.1:8787`.

---

## `GET /api/health` (live since Phase 0)

Is the server up, and does the mentor have an AI key?

```json
{ "ok": true, "service": "sprout-server", "mentor": { "aiConfigured": false } }
```

- `aiConfigured: false` means no `GEMINI_API_KEY` is set. The chat should show an
  "Offline mode" tag and expect prepared answers.
- The key itself is never returned.

---

## `POST /api/mentor/chat` (built in Phase 1)

### Request body

```json
{
  "language": "en",
  "messages": [
    { "role": "user", "text": "How long until I can buy my bicycle?" }
  ],
  "context": {
    "jars": { "save": 200, "spend": 120, "give": 40, "invest": 40 },
    "goal": { "label": "Bicycle", "cost": 6000, "monthly": 100 }
  }
}
```

| Field | Rules |
| --- | --- |
| `language` | `"en"` or `"hi"`. The reply is written in this language (Hindi in Devanagari). |
| `messages` | 1–12 items, oldest first, last item must be `role: "user"`. `role` is `"user"` or `"mentor"`. `text` is 1–600 characters after trimming. |
| `context` | Optional. The demo's **sample** numbers, in whole rupees. |
| `context.jars.*` | Integers 0–100,000. |
| `context.goal.label` | 1–40 characters. |
| `context.goal.cost` | Integer 1–1,000,000. |
| `context.goal.monthly` | Integer 0–100,000. |

Unknown fields are rejected. The whole body must be under 16KB.

### Success: `200`

```json
{
  "text": "At ₹100 a month, your ₹6,000 bicycle is about 4 years and 3 months away...",
  "source": "ai",
  "flagged": false,
  "suggestions": ["What if I save ₹250 a month?", "Is it okay to spend some now?"]
}
```

| Field | Meaning |
| --- | --- |
| `text` | The mentor's reply, plain text, about 120 words or fewer. |
| `source` | `"ai"` from Gemini, or `"prepared"` when the server used a built-in answer (no key, timeout, quota or error). The UI shows a "Prepared answer" tag for these. |
| `flagged` | `true` for sensitive topics (scams, debt, family conflict, bullying, self-harm). The UI shows a "Talk to a trusted adult" card. |
| `suggestions` | 0–3 short follow-up questions in the same language. |

### Errors

All errors use one shape: `{ "error": "<code>", "message": "<human readable>" }`.

| Status | `error` | When | What the UI does |
| --- | --- | --- | --- |
| 400 | `invalid_request` | Body breaks the rules above | Show "Something was wrong with that message" and keep the text |
| 404 | `not_found` | Wrong path | Developer error |
| 429 | `rate_limited` | More than ~20 requests in 5 minutes from one address | "Let's take a short break" with a retry timer |
| 503 | `mentor_unavailable` | Server can't produce any answer at all | Fall back to the prepared answers bundled in the client |

### Privacy rules

- The server never logs message text, only timing, status and `flagged`.
- No names, phone numbers, addresses, passwords or OTPs are asked for or stored.
- Chat history lives only in the browser tab (agreed default; see `PHASES.md` Phase 2).
