# Editing sprout.io by hand

You don't need to understand the code to change what the site says or how the AI mentor
behaves. Everything you'd normally want to change lives in a few files marked **✏️ EDIT ME**
at the top.

Hosting now targets Vercel website/API, Neon and Base Sepolia; migration is pending. The
deployment audit lists local-only setup/storage/network wording that must change with that
implementation. Keep current labels truthful until the hosted behavior exists. See
[`DEPLOYMENT_AUDIT.md`](DEPLOYMENT_AUDIT.md) and [`docs/ADR-001-HOSTING.md`](docs/ADR-001-HOSTING.md).
Future hosted credentials belong only in backend host settings, never in content or `VITE_*`.

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
| Seedlings lesson words, buttons, feedback and Hindi | `client/src/content/seedlings.js` (keep choice ids in sync with `server/src/learning/seedlings.ts`) |
| Guardian permission statements and data explanation | `client/src/content/guardian.js`; keep the policy id in sync with `server/src/learning/store.ts` |
| Anything on the home page (headline, three steps, sample chat, trust, coming soon, closing) | `client/src/content/home.js` |
| Anything on the demo page (`/app`), the jar names, the sample kid's name and money | `client/src/content/demo.js` |
| The mentor chat's fixed words (greeting, suggested questions, safety card, in English and Hindi) | `client/src/content/demo.js` → `mentorText` |
| The guided tour's steps, captions (English and Hindi) and how long each step lasts | `client/src/content/tour.js` |
| Manual/automatic presentation labels and help | `client/src/content/tour.js` → `tourUi` |
| Where the automatic cursor points | `client/src/content/tour.js` → each step's `cues`; `at` is seconds into that step, and `target` identifies a control inside its section |
| A Coming-soon preview's words | that preview's own file in `client/src/previews/` (e.g. `Donate.jsx`) |
| A preview's title and one-liner on the hub | `client/src/previews/index.js` |
| PayPal donation amounts, what one reward is worth, the largest payout, the NGO's name | `server/src/paypal/settings.ts` |
| The AI thank-you note's rules | `server/src/paypal/impactNote.ts` → `NOTE_RULES` |
| Words on the PayPal pages | `client/src/previews/Donate.jsx`, `Payout.jsx` |
| The sample receipts in the impact-ledger preview | `client/src/lib/sampleReceipts.js` **and** `server/src/ledger/sample.ts`: change both the same way (the server only publishes exactly its own list, and a test checks they match) |
| The adults' payout PINs and the guardian's PayPal email | `server/.env` → `PAYOUT_PIN_MENTOR`, `PAYOUT_PIN_ADMIN`, `PAYOUT_PIN_GUARDIAN`, `GUARDIAN_PAYPAL_EMAIL` (then restart `npm run dev`) |
| The sensitive-topic words (trusted-adult card) | `server/src/mentor/safety.ts`, then copy the list into `client/src/lib/safety.js` (a test checks they match) |

## The AI mentor's behaviour

Presentation actions are intentionally limited to temporary sample controls: `sample-earn`,
`sample-save`, `sample-goal` and `sample-monthly`. Keep that allow-list in
`client/src/lib/presentation.js`; payment, PIN, AI-submit and saved-learning actions do not belong
in the presentation. The reference cursor is drawn in `components/PresentationCursor.jsx`;
its two colors and presentation styles are in `client/src/presentation.css`. No audio is used.
Autoplay minimises automatically. Pause, Stop and expand/minimise labels are in `tourUi`;
the small bar's layout is in `presentation.css` under `.tour-compact`.

| I want to change… | Open |
| --- | --- |
| How the mentor talks: its personality and rules | `server/src/mentor/prompt.ts` → `MENTOR_RULES` (one sentence per line) |
| How it answers in each language | `server/src/mentor/prompt.ts` → `LANGUAGE_RULES` |
| What it does for scams, self-harm and other risky topics | `server/src/mentor/prompt.ts` → `SENSITIVE_TOPIC_RULE` |
| Which words count as a risky topic | `server/src/mentor/safety.ts` |
| The backup answers (no AI key, no internet) and follow-up suggestions | `server/src/mentor/prepared.ts` |
| Reply length, creativity, timeout, question length, per-device limit, default model | `server/src/mentor/settings.ts` |
| The Gemini key, the PayPal sandbox keys, the model, or the hourly limit for everyone | `server/.env` (see `server/.env.example`) |

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

- NGO workspace words: `client/src/content/ngo.js`. Its styles extend existing tokens in
  `client/src/ngo.css`, loaded after the main stylesheet. Sample activities/reward values live
  in `server/src/learning/store.ts`; existing saved decisions do not change when the seed list is
  edited. Learning credits must stay distinct from PayPal USD; do not relabel them as real money.
  `JUDGE_GUIDE.md` covers the judge walkthrough. Keep actual staff PINs out of it. After changing
  a PIN in `server/.env`, save it and use **Check access again** on the setup screen. The current
  dev runner reloads settings automatically; production/older dev commands need a restart.
  `npm run check:config -w server` checks the local settings without printing credentials.

- Payout recovery words are in `client/src/content/payout.js`. Keep the request code field and
  adult PIN check: only a code is saved in sessionStorage, never a PIN. Each adult must use a
  different PIN in `server/.env`; changing wording does not change the 29-day retry safety limit.

- Section ids like `id: 'how'` in `content/tour.js`: they must match a section on the page.
- The two "safety against tricks" rules in `MENTOR_RULES`.
- The goal names `Headphones`, `Bicycle`, `Laptop`: the server only accepts these (see
  `server/src/mentor/schema.ts` and `client/src/lib/model.js`); change all three places together.
