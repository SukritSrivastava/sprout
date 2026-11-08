# Shared UI behavior

[Design](DESIGN.md) owns visual rules, [the API contract](docs/mentor-api.md) owns server behavior, and [the roadmap](docs/ROADMAP.md) owns future features. These rules describe how the current screens behave.

## Access and learning

The server's `demoOpenAccess` response controls the yellow demo notice and conditional PIN forms. Open mode permits exploration without credentials or active permission. Protected mode gates `/app` and Seedlings on A12 permission and requires staff/guardian PINs where appropriate.

Learning uses coded samples A12/B07/C33. Permission revisions reset temporary chat and learning state; cross-tab changes, foreground checks and a 15-second visible-tab poll refresh it. Uncertain mutations require saved-status refresh. PINs clear and hide after submission and never enter browser storage.

Seedlings has one shared A12 garden. Correct server-checked answers earn one seed per lesson after saving. Failed/uncertain saves retain answers; requests time out and ignore replies after exit. Native radios and focused feedback support keyboard use. Read-aloud stops on navigation or lesson/language changes.

NGO review decisions save once. Learning credits and sandbox USD stay separate. CSV reports contain aggregate metrics. Protected staff sessions expire after 15 minutes and remain in page memory.

## Navigation and language

Working flows have direct links and honest status labels. Existing `/soon/*` URLs remain valid. The phone menu is a disclosure: links close it; Escape closes it and restores trigger focus. Long menus scroll. Anchor scrolling measures the sticky header's current height.

The English/Hindi preference follows pages, lessons, mentor reply settings and presentation captions, and survives reload. Labels, errors and accessibility text use that preference. Existing user/AI/provider-written text retains its original language.

## Presentation

Every entry first opens the manual/automatic chooser without navigation. Close receives focus; Escape restores trigger focus when possible. Manual mode never runs timed actions.

Automatic mode follows the editable 12-step, 108-second script. It waits for the correct route/section, pauses in hidden tabs and requires deliberate Resume. Switching to manual preserves position and removes the cursor/gaze. Closing cancels playback and cues.

The compact bar keeps Pause/Resume, Stop and expand controls available. Expanding/minimizing preserves time and pause state. Missing sections expose retry/next controls. Reduced motion jumps the cursor between targets; it does not remove access to a step.

Only the four registered temporary `/app` sample actions may run: earn, change the savings split, select a goal and choose a monthly contribution. No API mutations, generic DOM clicks, PIN entry, payments, saved lessons or audio are automated. Tests: `e2e/presentation/tour.spec.js`.
