# Editing sprout.io by hand

You don't need to understand the code to change what the site says or how the AI mentor
behaves. Everything you'd normally want to change lives in a few files marked **✏️ EDIT ME**
at the top.

## The rules for every "edit me" file

- Change the words **inside the quotes** `'like this'`. Leave the names on the left (`title:`)
  alone.
- Keep the punctuation around them: the commas at the ends of lines, the brackets `[ ]` and
  braces `{ }`.
- If your text contains a straight apostrophe `'`, use the curly one `’` instead (as in
  `it’s`), or the quotes will break. All existing text already does this.
- Some entries look like `(years) => `${years} years from now``. Change the words, but keep
  the `${...}` bits: they insert numbers.
- Save the file. If `npm run dev` is running, the page updates by itself.

## Where things are

| I want to change… | Open |
| --- | --- |
| Header links, footer, the floating tour button, the "page not found" text | `client/src/content/site.js` |
| Anything on the home page (headline, three steps, sample chat, trust, coming soon, closing) | `client/src/content/home.js` |
| Anything on the demo page (`/app`), the jar names, the sample kid's name and money | `client/src/content/demo.js` |
| The mentor chat's fixed words (greeting, suggested questions, safety card, in English and Hindi) | `client/src/content/demo.js` → `mentorText` |
| The guided tour's steps, captions (English and Hindi) and how long each step lasts | `client/src/content/tour.js` |
| A Coming-soon preview's words | that preview's own file in `client/src/previews/` (e.g. `Donate.jsx`) |
| A preview's title and one-liner on the hub | `client/src/previews/index.js` |
| The sample receipts in the impact-ledger preview | `client/src/previews/ImpactLedger.jsx` → `receipts` (keep ids like `RWD-2611-0108` and refs like `kid-a12`; the server rejects anything else) |

## The AI mentor's behaviour

| I want to change… | Open |
| --- | --- |
| How the mentor talks: its personality and rules | `server/src/mentor/prompt.ts` → `MENTOR_RULES` (one sentence per line) |
| How it answers in each language | `server/src/mentor/prompt.ts` → `LANGUAGE_RULES` |
| What it does for scams, self-harm and other risky topics | `server/src/mentor/prompt.ts` → `SENSITIVE_TOPIC_RULE` |
| Which words count as a risky topic | `server/src/mentor/safety.ts` |
| The backup answers (no AI key, no internet) and follow-up suggestions | `server/src/mentor/prepared.ts` |
| Reply length, creativity, timeout, question length, per-device limit, default model | `server/src/mentor/settings.ts` |
| The Gemini key, the model, or the hourly limit for everyone | `server/.env` (see `server/.env.example`) |

The server restarts by itself when you save a server file.

**After changing the mentor's rules**, run this to check it still handles tricky questions
safely (it uses the real AI and your key):

```bash
npm run eval:mentor
```

## Check your change

```bash
npm test
```

```bash
npm run test:e2e
```

If a browser test fails after you changed some words, it may simply be looking for the old
wording. The failure message shows the text it expected; search for it in the `e2e/` folder
and update it to your new words.

## Things to leave alone unless you mean it

- Section ids like `id: 'how'` in `content/tour.js`: they must match a section on the page.
- The two "safety against tricks" rules in `MENTOR_RULES`.
- The goal names `Headphones`, `Bicycle`, `Laptop`: the server only accepts these (see
  `server/src/mentor/schema.ts` and `client/src/lib/model.js`); change all three places together.
