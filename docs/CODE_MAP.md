# Source file map

Every maintained application source file, feature stylesheet, test, operator script and runtime
configuration is listed below. Paths are relative to the project root. The organization is
described in [the codebase guide](LEARN.md) and [ADR-004](ADR-004-FEATURE-ORGANIZATION.md).
Update this index when files are added, removed or moved.

Dependencies, generated build/cache/report files, QA snapshots, secrets and saved records are
excluded. The committed contract export is included because the API reads it at runtime;
regenerate it with the chain build rather than editing it manually. The root package lock
tracks dependency resolution and stays at the workspace root.

## Finding an older path

Dated audits and verification entries retain their original paths and line references. Use this
translation to find current code; old line numbers are historical evidence.

| Earlier location | Current owner/location |
| --- | --- |
| `client/src/App.jsx`, `components/Layout.jsx`, `pages/NotFound.jsx` | `client/src/app/` |
| `components/landing/`, `pages/Landing.jsx` | `client/src/features/home/` |
| `components/demo/`, `pages/Demo.jsx`, `lib/model.js` | `features/practice/`; `Mentor.jsx` and `ChatBubble.jsx` belong to `features/mentor/` |
| `client/src/previews/` | The corresponding `client/src/features/<feature>/`; shared `Walkthrough.jsx` is in `shared/components/` |
| `previews/index.js`, `pages/Soon.jsx` | `features/catalog/registry.js`, `Soon.jsx` |
| `previews/More.jsx` | `features/language/Hindi.jsx`, `features/classroom/Classroom.jsx`, `features/certificates/Certificates.jsx` |
| Client `lib/*Api.js`, feature hooks and models | The owning feature folder; transport callers are named `api.js`; ledger maths is `features/ledger/merkle.js` |
| Client `lib/api.js`, UI/motion/scroll utilities, `components/Mascot.jsx` | `client/src/shared/` |
| `server/src/routes/<feature>.ts` | `server/src/features/<feature>/routes.ts`; PayPal uses `payments`; health is in `shared/http/` |
| Server `paypal/`, `mentor/`, `learning/`, `ledger/` | `server/src/features/`; `paypal` becomes `payments`; lesson answers move to `features/seedlings/answers.ts` |
| Server `storage/payments.ts`, `learning.ts`, `ledger.ts` | The matching feature's `postgres.ts` |
| Server `storage/database.ts`, `schema.ts`, `security.ts`, `paypal/pins.ts` | `shared/storage/` and `shared/security/` |
| Flat scripts, API tests and browser tests | Feature directories under `server/scripts/`, `server/test/` and `e2e/`; common test helpers are in `support/` |

The named npm commands and public page/API addresses are unchanged.


## Application shell

Application composition, navigation, unknown routes and shell-level browser checks.

| Area | Files |
| --- | --- |
| Browser composition | [`client/src/app/App.jsx`](../client/src/app/App.jsx), [`client/src/app/Layout.jsx`](../client/src/app/Layout.jsx), [`client/src/app/NotFound.jsx`](../client/src/app/NotFound.jsx), [`client/src/main.jsx`](../client/src/main.jsx) |
| Editable copy | [`client/src/content/site.js`](../client/src/content/site.js) |
| Browser tests | [`e2e/shell/api.spec.js`](../e2e/shell/api.spec.js), [`e2e/shell/demo-access.spec.js`](../e2e/shell/demo-access.spec.js), [`e2e/shell/page.spec.js`](../e2e/shell/page.spec.js), [`e2e/shell/phone.spec.js`](../e2e/shell/phone.spec.js), [`e2e/shell/soon.spec.js`](../e2e/shell/soon.spec.js) |

## Home

Landing page sections. All English landing copy stays in the content module.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/home.js`](../client/src/content/home.js) |
| Browser code | [`client/src/features/home/Closing.jsx`](../client/src/features/home/Closing.jsx), [`client/src/features/home/ComingSoon.jsx`](../client/src/features/home/ComingSoon.jsx), [`client/src/features/home/Hero.jsx`](../client/src/features/home/Hero.jsx), [`client/src/features/home/HowItWorks.jsx`](../client/src/features/home/HowItWorks.jsx), [`client/src/features/home/Landing.jsx`](../client/src/features/home/Landing.jsx), [`client/src/features/home/MeetMentor.jsx`](../client/src/features/home/MeetMentor.jsx), [`client/src/features/home/Trust.jsx`](../client/src/features/home/Trust.jsx) |

## Practice

Temporary sample rupee balances, jars, goals and withdrawal illustration.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/demo.js`](../client/src/content/demo.js) |
| Browser code | [`client/src/features/practice/Demo.jsx`](../client/src/features/practice/Demo.jsx), [`client/src/features/practice/Earn.jsx`](../client/src/features/practice/Earn.jsx), [`client/src/features/practice/Growth.jsx`](../client/src/features/practice/Growth.jsx), [`client/src/features/practice/Jars.jsx`](../client/src/features/practice/Jars.jsx), [`client/src/features/practice/model.js`](../client/src/features/practice/model.js), [`client/src/features/practice/model.test.js`](../client/src/features/practice/model.test.js), [`client/src/features/practice/Withdraw.jsx`](../client/src/features/practice/Withdraw.jsx) |
| Browser tests | [`e2e/practice/demo.spec.js`](../e2e/practice/demo.spec.js) |

## Mentor

Chat UI, streaming requests, sensitive-topic rules, privacy and model/prepared responses.

| Area | Files |
| --- | --- |
| Browser code | [`client/src/features/mentor/api.js`](../client/src/features/mentor/api.js), [`client/src/features/mentor/api.test.js`](../client/src/features/mentor/api.test.js), [`client/src/features/mentor/ChatBubble.jsx`](../client/src/features/mentor/ChatBubble.jsx), [`client/src/features/mentor/Mentor.jsx`](../client/src/features/mentor/Mentor.jsx), [`client/src/features/mentor/safety.js`](../client/src/features/mentor/safety.js), [`client/src/features/mentor/useMentorChat.js`](../client/src/features/mentor/useMentorChat.js) |
| Browser tests | [`e2e/mentor/mentor.spec.js`](../e2e/mentor/mentor.spec.js) |
| Operator scripts | [`server/scripts/mentor/eval.ts`](../server/scripts/mentor/eval.ts) |
| API code | [`server/src/features/mentor/model.ts`](../server/src/features/mentor/model.ts), [`server/src/features/mentor/prepared.ts`](../server/src/features/mentor/prepared.ts), [`server/src/features/mentor/privacy.ts`](../server/src/features/mentor/privacy.ts), [`server/src/features/mentor/prompt.ts`](../server/src/features/mentor/prompt.ts), [`server/src/features/mentor/routes.ts`](../server/src/features/mentor/routes.ts), [`server/src/features/mentor/safety.ts`](../server/src/features/mentor/safety.ts), [`server/src/features/mentor/schema.ts`](../server/src/features/mentor/schema.ts), [`server/src/features/mentor/settings.ts`](../server/src/features/mentor/settings.ts) |
| API tests | [`server/test/mentor/mentor-privacy.test.ts`](../server/test/mentor/mentor-privacy.test.ts), [`server/test/mentor/mentor.test.ts`](../server/test/mentor/mentor.test.ts) |

## Payments

PayPal sandbox donations, recipient payouts, stable retries and payment persistence.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/payout.js`](../client/src/content/payout.js) |
| Browser code | [`client/src/features/payments/api.js`](../client/src/features/payments/api.js), [`client/src/features/payments/Donate.jsx`](../client/src/features/payments/Donate.jsx), [`client/src/features/payments/Payout.jsx`](../client/src/features/payments/Payout.jsx), [`client/src/features/payments/PayPalButton.jsx`](../client/src/features/payments/PayPalButton.jsx), [`client/src/features/payments/sdk.js`](../client/src/features/payments/sdk.js) |
| Browser tests | [`e2e/payments/paypal.spec.js`](../e2e/payments/paypal.spec.js) |
| Operator scripts | [`server/scripts/payments/check-paypal.ts`](../server/scripts/payments/check-paypal.ts) |
| API code | [`server/src/features/payments/client.ts`](../server/src/features/payments/client.ts), [`server/src/features/payments/impactNote.ts`](../server/src/features/payments/impactNote.ts), [`server/src/features/payments/postgres.ts`](../server/src/features/payments/postgres.ts), [`server/src/features/payments/routes.ts`](../server/src/features/payments/routes.ts), [`server/src/features/payments/settings.ts`](../server/src/features/payments/settings.ts), [`server/src/features/payments/store.ts`](../server/src/features/payments/store.ts) |
| API tests | [`server/test/payments/payment-recovery.test.ts`](../server/test/payments/payment-recovery.test.ts), [`server/test/payments/paypal.test.ts`](../server/test/payments/paypal.test.ts) |

## Ledger

Public receipt proofs, local/fixed chain adapters, durable jobs and explicit operator setup.

| Area | Files |
| --- | --- |
| Contract, contract tests and export | [`chain/build/ImpactLedger.json`](../chain/build/ImpactLedger.json), [`chain/contracts/ImpactLedger.sol`](../chain/contracts/ImpactLedger.sol), [`chain/contracts/ImpactLedger.t.sol`](../chain/contracts/ImpactLedger.t.sol), [`chain/scripts/export-contract.js`](../chain/scripts/export-contract.js) |
| Editable copy | [`client/src/content/ledger-publication.js`](../client/src/content/ledger-publication.js) |
| Browser code | [`client/src/features/ledger/api.js`](../client/src/features/ledger/api.js), [`client/src/features/ledger/ChainExplorer.jsx`](../client/src/features/ledger/ChainExplorer.jsx), [`client/src/features/ledger/ImpactLedger.jsx`](../client/src/features/ledger/ImpactLedger.jsx), [`client/src/features/ledger/LedgerControls.jsx`](../client/src/features/ledger/LedgerControls.jsx), [`client/src/features/ledger/LivePayPalReceipts.jsx`](../client/src/features/ledger/LivePayPalReceipts.jsx), [`client/src/features/ledger/merkle.js`](../client/src/features/ledger/merkle.js), [`client/src/features/ledger/merkle.test.js`](../client/src/features/ledger/merkle.test.js), [`client/src/features/ledger/sampleReceipts.js`](../client/src/features/ledger/sampleReceipts.js), [`client/src/features/ledger/useLedgerAccess.js`](../client/src/features/ledger/useLedgerAccess.js) |
| Browser tests | [`e2e/ledger/ledger-publication.spec.js`](../e2e/ledger/ledger-publication.spec.js) |
| Operator scripts | [`server/scripts/ledger/setup.ts`](../server/scripts/ledger/setup.ts) |
| API code | [`server/src/features/ledger/chain.ts`](../server/src/features/ledger/chain.ts), [`server/src/features/ledger/fixed-chain.ts`](../server/src/features/ledger/fixed-chain.ts), [`server/src/features/ledger/merkle.ts`](../server/src/features/ledger/merkle.ts), [`server/src/features/ledger/postgres.ts`](../server/src/features/ledger/postgres.ts), [`server/src/features/ledger/publication.ts`](../server/src/features/ledger/publication.ts), [`server/src/features/ledger/publisher.ts`](../server/src/features/ledger/publisher.ts), [`server/src/features/ledger/routes.ts`](../server/src/features/ledger/routes.ts), [`server/src/features/ledger/sample.ts`](../server/src/features/ledger/sample.ts) |
| API tests | [`server/test/ledger/ledger.test.ts`](../server/test/ledger/ledger.test.ts), [`server/test/ledger/publication.test.ts`](../server/test/ledger/publication.test.ts) |

## NGO

Staff sessions in the workspace, reviews, derived learning jars and aggregate reports.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/ngo.js`](../client/src/content/ngo.js) |
| Browser code | [`client/src/features/ngo/api.js`](../client/src/features/ngo/api.js), [`client/src/features/ngo/NgoDashboard.jsx`](../client/src/features/ngo/NgoDashboard.jsx), [`client/src/features/ngo/styles.css`](../client/src/features/ngo/styles.css), [`client/src/features/ngo/useNgoWorkspace.js`](../client/src/features/ngo/useNgoWorkspace.js), [`client/src/features/ngo/Views.jsx`](../client/src/features/ngo/Views.jsx) |
| Browser tests | [`e2e/ngo/fixtures.js`](../e2e/ngo/fixtures.js), [`e2e/ngo/ngo.spec.js`](../e2e/ngo/ngo.spec.js) |
| API code | [`server/src/features/ngo/routes.ts`](../server/src/features/ngo/routes.ts) |
| API tests | [`server/test/ngo/ngo.test.ts`](../server/test/ngo/ngo.test.ts) |

## Seedlings

Picture lessons, server answer keys, saved seeds and garden lifecycle.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/seedlings.js`](../client/src/content/seedlings.js) |
| Browser code | [`client/src/features/seedlings/Seedlings.jsx`](../client/src/features/seedlings/Seedlings.jsx), [`client/src/features/seedlings/styles.css`](../client/src/features/seedlings/styles.css), [`client/src/features/seedlings/useSeedlings.js`](../client/src/features/seedlings/useSeedlings.js) |
| Browser tests | [`e2e/seedlings/seedlings.spec.js`](../e2e/seedlings/seedlings.spec.js) |
| API code | [`server/src/features/seedlings/answers.ts`](../server/src/features/seedlings/answers.ts), [`server/src/features/seedlings/routes.ts`](../server/src/features/seedlings/routes.ts) |
| API tests | [`server/test/seedlings/seedlings.test.ts`](../server/test/seedlings/seedlings.test.ts) |

## Guardian

Permission controls, revision-driven learning access and the open-demo notice.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/demo-access.js`](../client/src/content/demo-access.js), [`client/src/content/guardian.js`](../client/src/content/guardian.js) |
| Browser code | [`client/src/features/guardian/DemoAccessNotice.jsx`](../client/src/features/guardian/DemoAccessNotice.jsx), [`client/src/features/guardian/permission.jsx`](../client/src/features/guardian/permission.jsx), [`client/src/features/guardian/Safety.jsx`](../client/src/features/guardian/Safety.jsx), [`client/src/features/guardian/styles.css`](../client/src/features/guardian/styles.css) |
| Browser tests | [`e2e/guardian/guardian.spec.js`](../e2e/guardian/guardian.spec.js) |
| API code | [`server/src/features/guardian/routes.ts`](../server/src/features/guardian/routes.ts) |
| API tests | [`server/test/guardian/guardian.test.ts`](../server/test/guardian/guardian.test.ts) |

## Learning

Shared learning records and access checks used by several features.

| Area | Files |
| --- | --- |
| API code | [`server/src/features/learning/access.ts`](../server/src/features/learning/access.ts), [`server/src/features/learning/postgres.ts`](../server/src/features/learning/postgres.ts), [`server/src/features/learning/store.ts`](../server/src/features/learning/store.ts) |

## Language

Site language preference, translation helpers, the Hindi demonstration and translation dictionaries.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/hindi-demo.js`](../client/src/content/hindi-demo.js), [`client/src/content/hindi-errors.js`](../client/src/content/hindi-errors.js), [`client/src/content/hindi-home.js`](../client/src/content/hindi-home.js), [`client/src/content/hindi-learning.js`](../client/src/content/hindi-learning.js), [`client/src/content/hindi-payments.js`](../client/src/content/hindi-payments.js), [`client/src/content/hindi-previews.js`](../client/src/content/hindi-previews.js), [`client/src/content/hindi.js`](../client/src/content/hindi.js) |
| Browser code | [`client/src/features/language/Hindi.jsx`](../client/src/features/language/Hindi.jsx), [`client/src/features/language/language.js`](../client/src/features/language/language.js), [`client/src/features/language/language.jsx`](../client/src/features/language/language.jsx), [`client/src/features/language/language.test.js`](../client/src/features/language/language.test.js) |
| Browser tests | [`e2e/language/hindi.spec.js`](../e2e/language/hindi.spec.js) |

## Presentation

Silent walkthrough timing, cursor and registered temporary sample controls. Voice tooling is optional and parked.

| Area | Files |
| --- | --- |
| Editable copy | [`client/src/content/tour.js`](../client/src/content/tour.js) |
| Browser code | [`client/src/features/presentation/presentation.js`](../client/src/features/presentation/presentation.js), [`client/src/features/presentation/presentation.jsx`](../client/src/features/presentation/presentation.jsx), [`client/src/features/presentation/PresentationCursor.jsx`](../client/src/features/presentation/PresentationCursor.jsx), [`client/src/features/presentation/styles.css`](../client/src/features/presentation/styles.css), [`client/src/features/presentation/tour.js`](../client/src/features/presentation/tour.js), [`client/src/features/presentation/Tour.jsx`](../client/src/features/presentation/Tour.jsx), [`client/src/features/presentation/tour.test.js`](../client/src/features/presentation/tour.test.js), [`client/src/features/presentation/usePresentationPointer.js`](../client/src/features/presentation/usePresentationPointer.js) |
| Browser tests | [`e2e/presentation/tour.spec.js`](../e2e/presentation/tour.spec.js) |
| Operator scripts | [`server/scripts/presentation/make-voice.ts`](../server/scripts/presentation/make-voice.ts) |

## Catalog

The feature registry and the hub/detail route wrapper.

| Area | Files |
| --- | --- |
| Browser code | [`client/src/features/catalog/registry.js`](../client/src/features/catalog/registry.js), [`client/src/features/catalog/Soon.jsx`](../client/src/features/catalog/Soon.jsx) |

## Classroom

Shared-device and offline preview with temporary sample state.

| Area | Files |
| --- | --- |
| Browser code | [`client/src/features/classroom/Classroom.jsx`](../client/src/features/classroom/Classroom.jsx) |

## Certificates

Sample certificate checker; no persisted or issued certificates.

| Area | Files |
| --- | --- |
| Browser code | [`client/src/features/certificates/Certificates.jsx`](../client/src/features/certificates/Certificates.jsx) |

## Platform and shared code

Generic transport, UI, HTTP, security, database schema, boot/configuration and disposable test harnesses. Current hosting follows [ADR-005](ADR-005-RENDER-VERCEL-SUPABASE.md).

| Area | Files |
| --- | --- |
| Workspace/build/test configuration | [`chain/hardhat.config.js`](../chain/hardhat.config.js), [`chain/package.json`](../chain/package.json), [`client/index.html`](../client/index.html), [`client/package.json`](../client/package.json), [`client/vite.config.js`](../client/vite.config.js), [`package.json`](../package.json), [`playwright.config.js`](../playwright.config.js), [`server/package.json`](../server/package.json), [`server/tsconfig.json`](../server/tsconfig.json) |
| Shared browser code | [`client/src/shared/api.js`](../client/src/shared/api.js), [`client/src/shared/api.test.js`](../client/src/shared/api.test.js), [`client/src/shared/components/Mascot.jsx`](../client/src/shared/components/Mascot.jsx), [`client/src/shared/components/Walkthrough.jsx`](../client/src/shared/components/Walkthrough.jsx), [`client/src/shared/hooks.js`](../client/src/shared/hooks.js), [`client/src/shared/icons.js`](../client/src/shared/icons.js), [`client/src/shared/motion.jsx`](../client/src/shared/motion.jsx), [`client/src/shared/scroll.js`](../client/src/shared/scroll.js), [`client/src/shared/styles.css`](../client/src/shared/styles.css) |
| Hosted browser checks | [`e2e/platform/preview.spec.js`](../e2e/platform/preview.spec.js), [`playwright.preview.config.js`](../playwright.preview.config.js) |
| Hosting configuration | [`client/hosting.mjs`](../client/hosting.mjs), [`client/vercel.mjs`](../client/vercel.mjs), [`render.yaml`](../render.yaml) |
| Deployment output check | [`scripts/platform/check-deployment.mjs`](../scripts/platform/check-deployment.mjs) |
| Browser test support | [`e2e/support/fixtures.js`](../e2e/support/fixtures.js), [`e2e/support/guardian-server.ts`](../e2e/support/guardian-server.ts), [`e2e/support/isolated-api.js`](../e2e/support/isolated-api.js) |
| Operator scripts | [`server/scripts/platform/audit-deployment.ts`](../server/scripts/platform/audit-deployment.ts), [`server/scripts/platform/check-config.ts`](../server/scripts/platform/check-config.ts), [`server/scripts/platform/dev.mjs`](../server/scripts/platform/dev.mjs), [`server/scripts/storage/migrate.ts`](../server/scripts/storage/migrate.ts), [`server/scripts/storage/check.ts`](../server/scripts/storage/check.ts) |
| Hosting HTTP policy and tests | [`server/src/shared/http/hosting.ts`](../server/src/shared/http/hosting.ts), [`server/test/platform/hosting.test.ts`](../server/test/platform/hosting.test.ts) |
| Shared API code and entrypoints | [`server/src/build-app.ts`](../server/src/build-app.ts), [`server/src/config.ts`](../server/src/config.ts), [`server/src/index.ts`](../server/src/index.ts), [`server/src/shared/http/health.ts`](../server/src/shared/http/health.ts), [`server/src/shared/http/origin.ts`](../server/src/shared/http/origin.ts), [`server/src/shared/http/rate-limit.ts`](../server/src/shared/http/rate-limit.ts), [`server/src/shared/security/pins.ts`](../server/src/shared/security/pins.ts), [`server/src/shared/security/postgres.ts`](../server/src/shared/security/postgres.ts), [`server/src/shared/storage/database.ts`](../server/src/shared/storage/database.ts), [`server/src/shared/storage/schema.ts`](../server/src/shared/storage/schema.ts) |
| API tests | [`server/test/platform/audit.test.ts`](../server/test/platform/audit.test.ts), [`server/test/platform/config.test.ts`](../server/test/platform/config.test.ts), [`server/test/platform/demo-access.test.ts`](../server/test/platform/demo-access.test.ts), [`server/test/platform/dev-config.test.ts`](../server/test/platform/dev-config.test.ts), [`server/test/platform/health.test.ts`](../server/test/platform/health.test.ts), [`server/test/storage/storage.test.ts`](../server/test/storage/storage.test.ts) |
| API test support | [`server/test/support/consented-app.ts`](../server/test/support/consented-app.ts), [`server/test/support/protected-config.ts`](../server/test/support/protected-config.ts) |

Inventory: 196 files.
