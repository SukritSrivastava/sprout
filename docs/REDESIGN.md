# Redesign brief (v2, built 2026-11-05)

Agreed with the user on 2026-11-05 through two grilling rounds. Built and committed; see `DESIGN.md` for the resulting design system.
v1 (premium fintech + Nunito + light/dark) was rejected: **Sprout stays neo-brutalist.**

## The problem

- **Text too small / hard to read**: 70% of visible text is under 14px.
- **Drawings look cheap**: the CSS-drawn headphones, books, jars, flower and pencil.
- Must **not look AI-made**: no generic template layout (centered hero + three identical feature
  cards + logo strip), no bland safe wording ("empower", "seamless", "unlock your potential").

## Direction: bold neo-brutalist, with a mascot

Thick black borders, hard offset shadows, flat colour blocks, chunky buttons that press into
their shadow. Confident and obviously human-made. Today's pastel palette, pushed bolder.

## Decisions

| Area | Decision |
| --- | --- |
| Style | **Bold neo-brutalist**: 3px black borders, 5–7px hard black offset shadows, flat fills, 8–14px radius, buttons press into their shadow on click |
| Colours | **Today's pastels, bolder borders**: ink `#111111`, paper `#FAF9F4`, mint `#D9EFDF`, Save green `#A8CFB4`, Spend lavender `#C1AFF0`, Give peach `#F3B4A2`, Invest yellow `#F9CA6B`. Each jar keeps its colour |
| Theme | **Light only** (strongest for neo-brutalism and projectors) |
| Font | **Bricolage Grotesque** (variable, self-hosted via Fontsource) for headings and body, using its optical-size axis so body text stays readable |
| Readability | Body 17–18px, nothing under 14px, line length 60–75 characters, labels in sentence case (short uppercase tags allowed only at 13px+) |
| Visuals | **Neo-brutalist UI cards**: real-looking app cards (jars, goal progress, mentor chat, receipt) replace every CSS drawing |
| Mascot | **New sprout mascot** in the same style (thick outline, flat colours) replaces Clicky. Appears in the hero, demo, mentor and tour; a few expressions (happy, thinking, cheering) |
| Layout | Asymmetric, editorial sections; no template grids. The four jars stay the one deliberate four-card row |
| Copy | Plain, specific, kid-level wording. No filler marketing words. Keep the honest "Sample" / "AI, can make mistakes" labels |
| Motion | **Subtle**: buttons press into shadows, count-ups, jar fills, a small celebration when earning, gentle reveal on scroll. Remove floating/bobbing/spinning/ticker/custom cursor/click ripples |
| Structure | **Split**: landing at `/`, interactive demo at `/app` (React Router) |
| Icons | **Lucide** (`lucide-react`), drawn at 2.5px stroke to match the borders. The mentor's sparkle icon is replaced (avoid AI clichés) |
| Tour | **Kept**: same tested engine, restyled, mascot as guide, steps updated for `/` and `/app` |

## New dependencies (approved)

`react-router-dom`, `lucide-react`, `@fontsource-variable/bricolage-grotesque`. Removes
`@fontsource/space-grotesk` and `@fontsource/dm-sans` once unused.

## Page outline

**Landing `/`**
1. Header (mint band, black bottom border): logo, How it works, Mentor, Coming soon, "Open the demo".
2. Hero, asymmetric: big headline with a highlighted second line, short plain promise, primary
   button + tour link; right side a sample jars card with the mascot peeking over it.
3. How it works: three steps laid out as a zig-zag strip of cards of different sizes, not a
   uniform grid.
4. Meet Paisa Mentor (yellow band): sample chat in English and Hindi.
5. Built on trust (dark band): adults hold the money, every rupee traceable, honestly marked as
   planned.
6. Coming soon: PayPal donations, NGO dashboard, impact ledger, Seedlings mode, as stamped
   "Coming soon" tickets.
7. Closing call to action + footer.

**Demo `/app`**
Mascot greeting → earn activity → four jars with split slider → goal picker and growth chart →
mentor. Every number labelled "Sample".

## Kept from today

All working behaviour and tests: earn/reset, jar maths, goal picker, growth chart, prepared mentor
answers (until Phase 1's AI), trust timeline, tour engine, reduced motion, keyboard and focus
handling. Playwright tests updated for the new routes; all must pass.

## How it will be checked

- Measure: under 10% of visible text below 14px at 1366×768.
- Before/after screenshots at desktop and phone, shown to the user.
- `npm run test:all` green, plus new tests for routing and the mascot tour.
