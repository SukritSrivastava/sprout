# Shared UI behavior

Visual identity and runtime token ownership are in `DESIGN.md` and `client/src/styles.css`.
Product scope comes from `FEATURE_IMPLEMENTATION_PLAN.md`; endpoint details are in
`docs/mentor-api.md`. This is a local hackathon demo, with coded sample learning data.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Native fields, fieldsets and application submit handlers | Feature endpoint schemas | Radio lessons; existing staff PIN forms | `e2e/seedlings.spec.js`; `e2e/ngo.spec.js` |
| Select/Listbox | Existing native HTML selects | Platform keyboard and popup behavior | Platform-owned popup geometry | Existing payout, ledger and NGO browser suites |
| Scrollbar | Browser scrollbars and document scrolling | Global stylesheet | Mobile navigation owns bounded overflow | Phone navigation and overflow checks |
| Toast | Inline feedback with status/alert live regions | Feature hooks and saved server responses | Persistent errors; polite save acknowledgement | Seedlings failure/retry and NGO suites |
| CRUD | `lib/api.js`, route schemas and learning store | `docs/mentor-api.md` | Persist before confirming; retry idempotently | `server/test/seedlings.test.ts` |

## Navigation

Guardian permission is a working direct navigation item at `/soon/safety`. Three fixed sample
learners have independent permission states. The form requires the current statements and PIN
for acknowledgement, a fresh PIN for withdrawal, and a PIN plus exact learner code for deletion.
PINs clear/hide on every request and never go to browser storage. Failed/uncertain mutations
require a status refresh; stale revisions cannot overwrite another guardian decision.
The permission gate blocks both `/app` and Seedlings, including offline/unreachable status.
It resets temporary learning/chat on permission revision changes and cross-tab/foreground checks,
with a visible-tab recheck every 15 seconds. Server enforcement is immediate for new requests.

The top navigation links to working flows directly, including features that use sandbox money
or a test blockchain. Each has an honest status label. Existing `/soon/*` URLs remain valid.
Mentor opens the working chat at `/app#mentor`. The mobile navigation is a non-modal disclosure;
links close it, Escape closes it and returns focus to its trigger, and long menus scroll.
Anchor scrolling measures the current sticky header height, including its desktop second row.

## Seedlings

Guardian permission is now required for the shared A12 learning session. The next section describes
the lessons after that permission has been saved; a pending/withdrawn/deleted session shows a gate.

The garden is one shared sample on the local server, not a private child account. No names,
PINs, free-text AI or PayPal operations are part of this flow. Each of the three fixed lessons
can earn one seed after the server checks all answers. Seeds are separate from staff learning
credits and PayPal dollars. Existing learning JSON files upgrade without losing activity reviews.

Progress updates only after the server confirms the file save. Failed or uncertain saves preserve
answers; retries cannot earn duplicate seeds. Loading and failure have a retry path. Requests time
out, cancel on exit and ignore late replies. Practice retains the existing seed count.

Native radio groups support keyboard input. Missing/incorrect answers identify the question and
move focus there; success moves focus to saved feedback. English/Hindi lesson text, validation,
accessible labels and read-aloud follow the lesson language. Only that preference is stored in
the browser; full-site Hindi is the next feature. Speech stops on lesson/language changes and
navigation. Devices without speech synthesis retain every lesson. Reduced-motion settings apply.

## Silent presentation

Record A12 demo permission manually before presenting the app or Seedlings. The presentation never
records guardian acknowledgement and waits at a blocked learning section until permission exists.

Source: the user's 2026-11-06 request for manual/automatic demo modes, the supplied cursor
reference and mascot eye tracking. This change is restricted to the presentation feature.

Every tour entry point first opens a non-modal mode chooser without navigating or starting a
clock. Close receives focus; Escape closes and restores the trigger's focus when it still exists.
The website remains interactive. Manual mode never advances or runs sample actions on a timer.
Arrows change steps; keyboard left/right works outside native interactive controls.

Automatic mode follows the editable 12-step, 108-second script. It waits for the correct route's
section, including pages that share id `preview`. Missing sections show retry/next controls;
the clock waits while a section is unavailable. Hidden tabs pause playback and require Resume.
Pause freezes cursor movement and sample actions. Switching to Manual preserves the current
step and time and removes the synthetic cursor/gaze. Closing cancels animation frames and cues.

Autoplay defaults to a compact bottom bar, including when switching from Manual or replaying.
Only the small mascot, step count, Pause/Resume, Stop and an expand control remain visible;
the timer also appears at desktop width. Full captions/settings are available on demand.
Expanding/minimising preserves playback and pause state and focuses a visible control. Cursor
framing adapts to the panel size without repeating sample actions. Completed autoplay stays
compact with Replay/Stop. An unavailable section reveals the full retry controls.

The cursor is a pointer-events-free SVG overlay based on the supplied image. Gaze uses the
actual animated cursor position for every mascot, with bounded eye movement; ordinary mascot
moods return outside autoplay. Reduced motion jumps to targets instead of gliding.

Only four explicitly registered /app sample actions may execute, once per cue: earning the
sample reward, changing the savings split, choosing headphones and selecting ₹500 monthly.
No generic DOM clicks, payment/PIN inputs, AI submissions, saved lessons or blockchain publishes
are automated. Playback uses no audio APIs. Captions and presentation controls support en/hi.
Runtime owners: `Tour.jsx`, `PresentationCursor.jsx`, `lib/presentation.jsx`,
`lib/usePresentationPointer.js`, `Mascot.jsx`; browser evidence: `e2e/tour.spec.js`.
