# Sprout design system

Bold neo-brutalist, light only. Canonical values live at the
top of `client/src/shared/styles.css`; components only use those variables.

## Principles

- **Readable first.** Body 17–18px, nothing under 14px (a Playwright test enforces 0% of text
  under 14px on both pages). Headlines are big and tight; labels are sentence case.
- **Real UI, not drawings.** Visuals are product cards (jars, goal meter, chat, receipt) styled
  like the rest of the UI. Illustrations are the Sprout mascot and the user's reference-style
  cursor during automatic presentation.
- **Human, not template.** Asymmetric sections, zig-zag steps, a ledger-style coming-soon list.
  Plain kid-level words; no "empower", "seamless", sparkles or gradients.
- **Honest.** Every sample number says "Sample", simulated steps say so, the AI mentor says it
  can make mistakes.

## Tokens

| Role | Variable | Value |
| --- | --- | --- |
| Ink (text, borders, shadows) | `--ink` | `#111111` |
| Paper (page) | `--paper` | `#faf9f4` |
| Mint (header, hero, bands) | `--mint` | `#d9efdf` |
| Save jar, primary buttons | `--green` | `#a8cfb4` |
| Spend jar, highlights, selected | `--purple` | `#c1aff0` |
| Give jar | `--peach` | `#f3b4a2` |
| Invest jar, mentor band | `--yellow` | `#f9ca6b` |
| Secondary text | `--muted` | `#3f4a43` |
| Borders | `--border` / `--border-thin` | 3px / 2px solid ink |
| Shadows | `--shadow-sm` / `--shadow` / `--shadow-lg` | 3 / 6 / 8px hard ink offset |
| Radius | `--radius` / `--radius-sm` | 14px / 10px |

Font: **Bricolage Grotesque** (variable, self-hosted, optical sizing on). Hindi falls back to
Nirmala UI / Noto Sans Devanagari because Bricolage has no Devanagari glyphs.

The silent presentation adds two narrowly used reference colors in `client/src/features/presentation/styles.css`:
`--presentation-blue: #76aaff` for the folded cursor edge, attention mark and target outline;
`--presentation-paper: #eff7ec` for its pale green face. The cursor SVG consumes those variables
and the existing ink/muted colors. Site and payment UI tokens are unchanged.

## Components (class names)

`.btn` (+ `-green`, `-ink`, `-white`, `-lg`, `-sm`) press into their shadow on click ·
`.link-btn` thick underline · `.icon-btn` · `.tag` (+ colours) · `.chip` (`aria-pressed` =
selected) · `.card` · `.highlight` (purple boxed words) · `.band` (+ `-mint`, `-yellow`,
`-lavender`, `-ink`) full-width coloured sections · `.meter` progress bar · `.stamp`.

## Motion

Built with **Motion** (`motion/react`) and **Lenis** smooth scrolling. Shared pieces in
`client/src/shared/motion.jsx`: `Reveal` (fade + lift on first scroll into view), `Stagger` (children
one after another), `liftOnHover`, one easing curve `ease`.

- Page changes fade out/in (0.35s). Section links glide with Lenis (1.1s).
- Hero lines rise in sequence; cards lift and tilt slightly on hover; buttons press down.
- Numbers count up; jar meters fill; the growth line draws itself; the receipt timeline pops.
- Earning bursts ₹ symbols and Sprout cheers. The mentor "thinks" before answering.
- Sprout idles gently (blink, leaf sway). The tour button slides away while scrolling down.
- **Motion off** (OS setting or header toggle): Lenis stops, Motion reduces to instant changes,
  idle loops and bursts stop, page swaps are instant.

## Responsive

Two-column layouts collapse at 760px; jars go 4 → 2 columns at 1100px; header gets a menu button
on phones; the motion toggle hides below 1100px (the OS setting still applies).
