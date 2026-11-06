# Remaining features: proposed implementation

This plan covers the six remaining features confirmed from PHASES.md. The approach was approved
on 2026-11-05 with an explicit limit: implement and test one feature at a time. It keeps React, Vite, Fastify, the existing adult PINs and JSON
records. No new packages, hosting, payment currency conversion or real-money behavior are proposed.

## Sequential delivery

1. NGO dashboard: completed and verified; full regression/visual results are recorded in VERIFICATION.md.
2. Seedlings: completed and verified (2026-11-06); 126 unit/API/contract tests and 195 browser checks passed, 9 skipped; production build passed. Three server-checked picture lessons, one-time seeds, saved shared sample garden and English/Hindi read-aloud.
3. Hindi: next; queued, not started (shared language preference across the main site).
4. Classroom/offline: queued, not started.
5. Consent/deletion: implemented on 2026-11-06 at the user's explicit request to run the parent phase. Delivered before Hindi/classroom without implementing either; guardian PIN, saved acknowledgements, API-enforced access, withdrawal, revision checks and selected-learner deletion. See VERIFICATION.md for results.
6. Certificates: queued, not started.

Finish and review each feature before starting the next. No parallel feature implementation.

## Product and design

Keep the existing pastel palette, thick ink outlines, hard shadows, Bricolage Grotesque, Sprout
mascot, pressable controls and reduced-motion support. Reuse the current cards, fields, chips,
buttons and responsive grids. Preserve current URLs, donation/payout flows, tour anchors and demo.

The current preview URLs become useful learning/workspace screens. Keep previews or explanations
where functionality still needs outside services. Mark sample learner identities, learning balances
and certificates clearly. Do not describe local PINs or demo consent as verified adult identities.

## Features

| Feature | Working behavior | Acceptance check |
| --- | --- | --- |
| NGO dashboard | Adult PIN unlocks an activity review queue; approve/return submissions once; show learning totals and real sandbox payment totals separately; download a CSV report without child names | Unauthorized actions fail; repeat approval cannot double-award; exported totals match saved records |
| Seedlings | Short picture lessons, needs/wants sorting, waiting and sharing activities; completion earns seeds once; saved garden; English/Hindi read-aloud when the device supports it | Progress survives reload; repeat lesson gives no duplicate seed; speech stops on exit |
| Hindi | Shared English/Hindi language preference for the main website and new learning flows, including controls, validation, empty/error states and accessibility labels | Preference persists; navigation and learning flows work in both languages and at phone widths |
| Classroom/offline | Sample learner profiles with progress kept separate; PIN-gated online profile entry; locally cached lessons; completion queue syncs idempotently after reconnect | Learner progress does not mix; offline completion survives reload; repeated sync cannot duplicate rewards |
| Consent and deletion | Guardian PIN records a dated demo permission acknowledgement before learning/AI entry; withdrawal disables that learner; deletion removes learning data, local queued events and certificates | Learning is blocked before acknowledgement; withdrawal/deletion are authorized; payment records are unaffected |
| Certificates | Issue a demo certificate after a completed learning track; printable/downloadable view; verification code resolves against saved server records; deletion revokes it | Incomplete tracks cannot issue; invalid/revoked codes fail; public verification reveals no learner name |

## Backend and storage

- Add a separate learning-records JSON file so learner deletion cannot remove payment records.
- Use a small learning store with the same atomic-file-save and failed-save blocking pattern as
  the payment store. Validate request bodies and protect adult mutations with existing PIN checks.
- Use coded sample learner profiles and separate learning credits/seeds from the USD PayPal pool.
  Approving a lesson does not initiate a payment or convert rupees to dollars.
- The server decides lesson completion/reward rules; completion and approval identifiers prevent
  duplicates. Offline results are learning submissions, not trusted payment instructions.
- Public certificate lookup returns track/completion/revocation information, not names or PINs.

## Offline boundaries

Cache the app shell and lesson assets only. Never cache PayPal responses, PIN submissions, AI chat
or private adult dashboard data. Offline use continues an already-selected sample learning session;
it does not authenticate a new adult or authorize payouts. Reconnection submits queued lesson
events, and the server validates them before changing saved progress.

## Delivery and checks

Build the connected learning foundation and each feature together, with meaningful API and
browser regression tests. Check desktop and phone layouts, keyboard access, language switching,
reduced motion, empty/error/loading states, reloads and offline/reconnect behavior. Run the full
unit/API/contract suites, desktop/phone browser suite and production build. Update the existing
project documentation and feature labels to match what actually works.

Full accounts, a database migration, public-chain deployment, production legal consent verification
and live-money integration are separate major decisions and are outside this proposal.
