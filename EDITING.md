# Change copy and settings

Start with files marked `EDIT ME`. Change the text on the right of each property; keep identifiers, brackets, commas and interpolation placeholders intact. Save while `npm run dev` is running to see the result.

For an apostrophe inside a single-quoted string, escape it (`'it\'s'`) or use double quotes. Keep `${...}` in template strings and `{0}`, `{1}` in translation entries: the code replaces them with values.

## Where to edit

Paths below are relative to the project root.

| Change | File |
| --- | --- |
| Navigation, footer, not-found text | `client/src/content/site.js` |
| Home page | `client/src/content/home.js` |
| Practice app, jar descriptions, mentor fixed copy | `client/src/content/demo.js` |
| Shared Hindi translations | `client/src/content/hindi.js` and its `hindi-*.js` modules |
| Demo-access notice | `client/src/content/demo-access.js` |
| Guardian statements | `client/src/content/guardian.js` |
| NGO workspace words | `client/src/content/ngo.js` |
| Seedlings lessons and feedback | `client/src/content/seedlings.js` |
| Payout labels and recovery instructions | `client/src/content/payout.js` |
| Presentation captions, timing, targets and controls | `client/src/content/tour.js` |
| Preview titles/status on the hub | `client/src/features/catalog/registry.js` |
| Feature copy still inline | The owning component in `client/src/features/<feature>/`; see the [file map](docs/CODE_MAP.md) |
| Colors, borders, typography and shared layouts | `client/src/shared/styles.css`; see [design](DESIGN.md) |
| Mentor model, limits and temperature | `server/src/features/mentor/settings.ts`; environment overrides are in [setup](docs/SETUP.md) |
| AI mentor instructions and prepared answers | `server/src/features/mentor/prompt.ts`, `prepared.ts` |
| Donation amounts, maximum payout, reward value | `server/src/features/payments/settings.ts` |
| Donor note instructions | `server/src/features/payments/impactNote.ts` |

## English and Hindi

The shared selector persists the site preference in `sprout-language`. `useLanguage().content()` makes a localized copy of structured content; `t()` translates a text string or a string with numbered values. A React element passed to `t()` is returned unchanged, so wrapping JSX does not translate its children.

Translation keys are normalized English text. Update the matching key when English wording changes. Keep IDs, URLs, policy codes and saved-record values unchanged. Do not translate user-written chat or rewrite a provider's existing answer when switching languages.

## Changes that need matching code

- Lesson and choice IDs must match the answer keys in `server/src/features/seedlings/answers.ts`. Changing displayed wording alone does not change a correct answer.
- Guardian policy IDs must match `consentPolicy` in `server/src/features/learning/store.ts`. A substantive policy change needs a deliberate new version.
- Goal IDs/labels must agree between `client/src/features/practice/model.js` and `server/src/features/mentor/schema.ts`.
- Sample receipt data must match in `client/src/features/ledger/sampleReceipts.js` and `server/src/features/ledger/sample.ts`. Currency is part of the hash format.
- Sensitive-topic checks exist in `server/src/features/mentor/safety.ts` and `client/src/features/mentor/safety.js`; parity tests enforce alignment.
- Presentation targets must exist in the relevant section. Keep automated actions within the four registered temporary sample controls. Never automate payments, PINs, saved lessons, AI submissions or publication.

## Check an edit

1. Open the affected page in English and Hindi.
2. Check phone width, keyboard focus and reduced motion when layout or controls changed.
3. Run `npm test` and `npm run build`.
4. Run `npm run test:e2e -- --workers=2` for behavior changes.

Access mode and credentials belong in `server/.env`, never content files. Development reloads saved settings; production needs a restart. See [setup](docs/SETUP.md) for protected access and recovery.
