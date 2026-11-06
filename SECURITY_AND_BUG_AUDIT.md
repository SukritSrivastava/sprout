# Sprout security and functionality audit

Date: 2026-11-05. Reviewed revision: `18ac6ab244c94b6564ae400660f69d72b1b1f2e1` plus the working tree. Scope: React website, Fastify API, PayPal adapter/store, Gemini chat, Solidity ledger, configuration, dependencies, and existing automated tests.

This is a local, sandbox-only prototype. PayPal's sandbox hostname is hard-coded, so these findings do not establish exposure of real money. Severity describes impact on the application's integrity and the consequences of exposing it to untrusted users. No audit can guarantee that every defect has been found. No live PayPal payments, credential extraction, deployment, or destructive testing was performed.

## Priority follow-up (2026-11-05)

After the re-audit, the user selected the fixes needed for the local sandbox demo. This follow-up
keeps PIN approvals and JSON-file storage; it does not close every production-readiness gap.

Provider reference: [PayPal duplicate requests and idempotency](https://developer.paypal.com/api/payouts/customize)
documents a 30-day duplicate-batch window. The 29-day application cutoff leaves a safety margin.

- **Payout recovery:** duplicate-batch replies are resolved with a sandbox-only GET. The original
  sender operation, guardian, currency and amount must match. A failed/mismatched lookup keeps
  funds reserved. Automatic retries stop after 29 days from first send (legacy records use their
  creation time). Old uncertain payouts require manual PayPal dashboard review.
- **Browser recovery:** HTTP errors preserve the returned request and reserved balance. The page
  remembers only a request code in sessionStorage, and an adult's PIN restores its server-side
  approvals and receipt through `POST /api/paypal/payout-requests/:id/recover`. No PIN is saved.
- **PIN configuration:** startup rejects duplicate adult PINs, including values equal after trimming.
- **Failed saves:** financial reads and changes are blocked while a provider result is unsaved.
  Once disk access returns, the pending result is saved before proceeding. A failed reservation
  save sends nothing to PayPal; a failed save of a provider success does not trigger another send.
  This protects a running process, not unsaved data after a crash or power loss.

Regression coverage: `server/test/payment-recovery.test.ts`, `client/src/lib/api.test.js`,
and the payout reload/retry scenario in `e2e/paypal.spec.js`. Full unit/API/contract run:
**109 passed** (21 client, 82 server, 6 contract). Production build passed. Final desktop/phone
browser run: **173 passed, 9 skipped** (4.8 minutes, no retries). Details are in `VERIFICATION.md`.

Still deferred from the re-audit: pruning of approved requests at the 200-request cap, the
100-receipt UI/publish-count mismatch, reconciliation after a local chain reset, seven-digit
redaction, the nested development dependency advisory, and the previously documented production
privacy/authentication limitations. The older status table below is historical, not an assertion
that these remaining issues were closed.

## Fix status (2026-11-05, initial pass)

The user chose PINs in `server/.env` for adult approvals and a JSON file for saved records.
Regression tests: `server/test/audit.test.ts`, `paypal.test.ts`, `ledger.test.ts`,
`mentor-privacy.test.ts`, `client/src/lib/api.test.js`, `mentorApi.test.js`, `e2e/paypal.spec.js`,
`e2e/mentor.spec.js`.

| ID | Status | What changed |
| --- | --- | --- |
| 01 | Fixed (PIN level) | Request → two adults approve with their own PIN → an approver sends with their PIN again. Approvals are stored on the server against one request (amount, child, payee). The payee is `GUARDIAN_PAYPAL_EMAIL` from `server/.env`. 5 wrong PINs lock that adult 15 min. Old `POST /api/paypal/payouts` removed. Not full accounts. |
| 02 | Fixed | In-flight capture lock; one synchronous check-and-insert by order id and capture id; both kept in the saved file. |
| 03 | Fixed | Sender batch id saved before calling PayPal. Only a clear 4xx on the first try releases funds (`REJECTED`); anything else is `UNKNOWN`, keeps the reservation, blocks new payouts, and "Send" retries with the same ids. |
| 04 | Fixed (file level) | Orders, receipts, salt, counters, requests and approvals saved to `DATA_FILE` after every change (temp file + rename). `SENDING` at start-up becomes `UNKNOWN`. Restart test added. No backups or database. |
| 05 | Fixed | Sample route accepts only batch 1 with exactly the server's own sample receipts; clashing existing batches → 409. |
| 06 | Fixed | Only completed donations and `SUCCESS` payouts are sealed. |
| 07 | Fixed | Selection, batch number, write and marking run inside one queue; the chain's batch must match before marking. |
| 08 | Fixed | Counters that never go back, saved in the file; no deletions. |
| 09 | Fixed | GET limits on PayPal and ledger routes; payout status cached 15 s; reads never deploy the contract; event search starts at the deploy block; published batches cached. |
| 10 | Fixed | Validation first; only valid AI work counts against the shared cap. |
| 11 | Fixed | Website checks the same sensitive words offline, shows the card immediately, and uses a prepared trusted-adult reply when no topic answer fits. |
| 12 | Partly fixed | Emails/UPI ids and 7+ digit numbers are blanked out before Gemini; the chat says questions go to Gemini. Names and addresses are not detected; consent is still a preview. |
| 13 | Partly fixed | Any sensitive kid message flags the whole chat. Still a word list; no output filter on the AI's reply. |
| 14 | Fixed | Kid messages ≤ 600, earlier mentor replies ≤ 1,000 (website trims them); body limit 32 KB. |
| 15 | Fixed | Message ids and a round counter; late replies from a cleared chat are ignored. |
| 16 | Fixed | A reply must end with `done`; trailing data is read; cut-off answers are kept, marked and explained. |
| 17 | Fixed | `new URL` + exact loopback names; Hardhat key only on chain id 31337. |
| 18 | Fixed (mostly) | Public list hides PayPal ids; codes are 16 hex characters. No NGO-level access control on the list. |
| 19 | Fixed | Unpaid orders expire after 24 h, max 500; public list shows the newest 100; unused requests capped at 200. Receipts themselves are kept (financial records). |
| 20 | Accepted | No patched zod 3 exists; forcing zod 4 into Hardhat was tried and undone. Dev tool only. |
| 21 | Fixed | Errors shown in the result view; wording no longer says "sent"; status colours (green paid, yellow waiting, peach failed); explorer marks reverted transactions as failed. |
| 22 | Fixed | A 200 that isn't a JSON object is a failure. |
| 23 | Fixed | Any SDK load failure or a 20 s timeout clears the cached promise and removes the script. |
| 24 | Fixed | Receipt format v2 includes currency (`INR`/`USD`); a batch must use one currency. |

Still open from "Additional release work": deployment hardening (headers, TLS, proxy hops),
full accounts, a real database with backups, PayPal webhooks/reconciliation, and a live
sandbox re-check of the new payout flow.

## Results and evidence

- Production build: passed. Initial sandbox access errors were resolved by running with the required filesystem access.
- Existing unit/API/contract suites: 62 passed (11 client, 45 server, 6 Solidity).
- Focused audit reproductions: 5 passed. **These tests assert that defects currently exist; passing does not mean the application is secure.** Run `node --import tsx --test server/test/audit.test.ts`.
- Desktop/phone Chromium suite: **163 passed, 9 skipped**, in 4.5 minutes (`npm run test:e2e -- --workers=2`). Skipped cases were not verified by this run.
- Dependency scan: npm reports 3 high-severity package entries, all tracing to one nested Zod advisory in Hardhat's dependency tree. This is not three independent vulnerabilities.
- Logs: `audit-unit.log`, `audit-build.log`, `audit-e2e.log`, `audit-reproductions.log`, and `audit-dependencies.json`.

## Priority list

| ID | Priority | Finding |
| --- | --- | --- |
| 01 | High | Anyone reaching the API can authorize a guardian payout |
| 02 | High | Concurrent donation captures can credit the pool twice |
| 03 | High | Ambiguous payout failures release funds and allow duplicate sends |
| 04 | High | Restart destroys payment state and recovery information |
| 05 | High | Public sample publishing uses the trusted publisher and live namespace |
| 06 | High | Failed and pending payouts can become immutable paid-out totals |
| 07 | Medium | Concurrent live publishing can bind receipts to the wrong batch |
| 08 | Medium | Receipt IDs are reused after payout deletion |
| 09 | Medium | Read endpoints can trigger unbounded provider work |
| 10 | Medium | Invalid mentor requests consume the shared hourly quota |
| 11 | Medium | Child safety guidance disappears during client fallback |
| 12 | Medium | Sensitive chat input is sent to Gemini without redaction |
| 13 | Medium | Safety assessment ignores earlier conversation context |
| 14 | Medium | Chat history can exceed the server's per-message length |
| 15 | Medium | Clearing chat can race with the next conversation |
| 16 | Medium | Truncated chat streams are accepted as complete |
| 17 | Medium | RPC locality check accepts remote hostname prefixes |
| 18 | Medium | Public receipts expose payment identifiers and linkage |
| 19 | Medium | Orders and receipts grow without retention bounds |
| 20 | Medium | Nested development dependency has a high advisory |
| 21 | Low | Payment UI hides errors and gives misleading status feedback |
| 22 | Low | Generic API helper treats invalid successful bodies as valid data |
| 23 | Low | SDK loader can retain a rejected promise permanently |
| 24 | Low | Sample and payment ledger amounts lack a currency commitment |

## Findings and fixes

### 01 — Payout approvals are supplied by the caller

**Location:** `server/src/routes/paypal.ts:140–167`; `server/src/origin.ts:8–14`.

The API accepts `{email, amount, approvals:['admin','mentor']}` without authenticating either adult or checking the recipient against an approved guardian. Any caller can choose an email and spend the available sandbox pool. The origin check accepts requests without Origin; a script can also supply an allowed Origin. CORS is not authorization. This is acknowledged in the documentation, but remains a release blocker.

**Evidence:** audit test reaches the fake payout provider without credentials. **Fix:** authenticated adults, server-stored approvals bound to one immutable request (recipient, amount, child, NGO), distinct authorized identities, and a server-selected guardian. Require authorization again at execution.

### 02 — Concurrent capture requests double-credit a donation

**Location:** `server/src/routes/paypal.ts:114–133`; `server/src/paypal/store.ts` `addDonation`.

Both requests can observe no existing receipt, await the same provider capture, and independently add a donation. PayPal idempotency does not make the application's receipt insertion idempotent. The fake provider returns the same successful capture twice; the audit test turns one $50 donation into a $100 pool.

**Fix:** unique persistent constraints on order and capture IDs; atomically insert/credit once. Use an in-flight lock as an additional single-process safeguard. Test simultaneous requests and retries after process restart.

### 03 — Lost payout responses release reservations and retries send again

**Location:** `server/src/routes/paypal.ts:160–173`; `server/src/paypal/client.ts:124–146`.

Every exception deletes the payout, assuming nothing left PayPal. A timeout, malformed response, or connection loss can happen after acceptance. The next attempt uses a new random sender/request identifier, so it represents a new payment. The audit reproduction throws a simulated lost-response error and confirms the full pool becomes spendable and another provider send is possible. It does not establish that a real provider accepted the simulated request.

**Fix:** persist a stable business operation ID before sending; preserve an UNKNOWN state and reservation on ambiguous failure; reconcile with PayPal using the original ID before retrying. Only release on confirmed terminal failure.

### 04 — Payment state disappears on restart

**Location:** `server/src/app.ts:39`; `server/src/paypal/store.ts`.

Orders, capture deduplication, pool balance, payout status, receipt details, and publication mappings are memory-only. A restart between order approval and capture produces `unknown_order`; a restart after provider acceptance loses recovery data. The chain stores roots, not enough data to reconstruct individual receipts. This is an explicit prototype limitation with substantial payment consequences.

**Fix:** transactional durable storage, backups, an operation log/outbox, reconciliation, and restart tests at each payment transition. Store enough receipt data to verify historical batches.

### 05 — Untrusted callers can publish arbitrary receipts as the NGO

**Location:** `server/src/routes/ledger.ts:20–35,71–84`; `server/src/ledger/chain.ts:189–191`.

The sample publishing API accepts arbitrary valid-looking receipt fields and any batch ID up to 1,000,000, including live IDs starting at 101. It signs them with the same trusted publisher. Contract publisher-only access does not help when the public API acts as that publisher. Existing batches are returned without checking that the incoming root and totals agree. References are shape-checked, not verified as anonymous; text such as `alice-smith` fits the schema.

**Fix:** isolate sample data in a separate contract/namespace, disable this write route outside explicit demo mode, authorize publishers, reject conflicting existing batches, and publish verified server records only. Never accept arbitrary permanent personal text.

### 06 — Ledger can certify unsuccessful payouts as paid out

**Location:** `server/src/paypal/store.ts` `unpublished`; `server/src/routes/ledger.ts:94–105`; `server/src/ledger/merkle.ts` `batchTotals`.

Every payout except SENDING can be sealed, including FAILED, RETURNED, and PENDING. Totals count every payout amount. Status is excluded from the hash. A failed payout can restore the pool while the immutable ledger reports it as paid out. A pending payout sealed today cannot reflect a later failure. The audit test confirms FAILED receipts remain eligible.

**Fix:** define whether receipts represent attempts or settlements. Publish settled payouts only, or commit explicit lifecycle events and correction events. Include status/event meaning in the authenticated data and show it in the UI.

### 07 — Live batch selection is outside the write queue

**Location:** `server/src/routes/ledger.ts:94–105`; `server/src/ledger/chain.ts:169–191`.

Two requests can snapshot the same unpublished records and select the same unused ID before either writes. The chain serializes transactions, but the second call simply returns the first batch as already published. If new receipts arrived between snapshots, the second route can mark those additional receipts published even though its root was never stored. This is a source-derived race; the added tests do not simulate this complete interleaving.

**Fix:** reserve records and batch IDs atomically inside the same publication transaction/queue; compare the returned root/totals before marking records. Test two concurrent publishers with a donation between their snapshots.

### 08 — Receipt IDs can collide

**Location:** `server/src/paypal/store.ts` `newId`, `dropPayout`, `markPublished`.

IDs use the current count plus one. Create PAY-...-0001 and PAY-...-0002, delete the first, then create another: the new ID is also ...0002. Concurrent payout failures make this reachable. Duplicate IDs can cause deletion/publication to operate on the wrong records. Reproduced in the audit tests.

**Fix:** persistent monotonic sequences or unique immutable IDs; database uniqueness; never derive IDs from remaining record count.

### 09 — Read routes bypass rate limits and can write indirectly

**Location:** `server/src/routes/paypal.ts:177–188`; `server/src/routes/ledger.ts:60–68`; `server/src/ledger/chain.ts:82–100,134–142`.

Payout status GET calls PayPal each time, without a limiter. Ledger reads perform RPC work and event scans from block zero. Status/read requests can lazily deploy a contract, so a nominal read can consume publisher funds on a configured public chain. The README's claim that every route is rate-limited is inaccurate.

**Fix:** rate/concurrency limits and short caches, explicit authenticated deployment, event indexing from deployment block, bounded RPC work, and provider budgets.

### 10 — Malformed chat requests exhaust the shared AI quota

**Location:** `server/src/routes/mentor.ts`, quota checks before `chatRequestSchema.safeParse`.

Requests rejected as invalid still consume the global hourly quota. A reachable caller can exhaust it with invalid payloads; multiple source addresses bypass the per-address limit. No Gemini use is required. All legitimate users then receive 429.

**Fix:** validate first; charge the shared AI budget only for valid model work. Keep a separate cheap malformed-request abuse limit and authenticated per-user quotas where appropriate.

### 11 — Offline fallback omits the safety card

**Location:** `client/src/lib/useMentorChat.js` `offlineAnswer` and catch branch; `client/src/components/demo/ChatBubble.jsx`.

When the server cannot be reached, the hook supplies a generic money answer without assessing the input or setting `flagged`. The trusted-adult card depends on that flag. A sensitive disclosure during an outage can therefore get a generic savings response without the expected support guidance.

**Fix:** provide a client-side sensitive-topic fallback with reviewed prepared responses; display support immediately and independently of network/model completion. Add outage tests using sensitive inputs in supported languages.

### 12 — Children's personal information reaches the model before any protection

**Location:** `server/src/routes/mentor.ts` turn construction; `server/src/mentor/model.ts`.

All submitted message text, including earlier turns, is forwarded to Gemini. Instructions telling the model not to repeat personal details do not prevent the provider receiving those details. The consent/deletion screens are previews, not operational controls.

**Fix:** explain actual data flow before chat, implement the required guardian/organization consent flow before collecting real child data, minimize/redact sensitive input before transmission, define retention/deletion, and review provider settings. This is a technical privacy gap, not a legal compliance determination.

### 13 — Safety context is assessed only on the latest question

**Location:** `server/src/routes/mentor.ts` `isSensitive(question)`; `server/src/mentor/safety.ts`.

An earlier sensitive disclosure followed by a short continuation loses the extra safety flag/instruction. Regex-only detection also misses alternative wording and obfuscation. No deterministic output safety check runs before streaming model output to children. These are coverage gaps; successful harmful output from live Gemini was not demonstrated.

**Fix:** assess relevant conversation context, preserve an unresolved safety state, expand multilingual evaluation, and use reviewed guardrails appropriate to child-facing output.

### 14 — Mentor answers can poison subsequent request validation

**Location:** `server/src/mentor/schema.ts` message text limit; `client/src/lib/useMentorChat.js` history mapping.

The server applies the 600-character question limit to both user and mentor messages. AI output is limited by tokens, not 600 characters, and the client sends the entire answer back unchanged. Any answer over 600 characters makes the next question fail with 400 until that answer ages out or chat is cleared.

**Fix:** separate bounded user/assistant schemas and budgets, or keep canonical conversation state on the server. Add a model fixture returning more than 600 characters followed by another question.

### 15 — Clear/new-chat request race

**Location:** `client/src/lib/useMentorChat.js` `clear`, `updateLast`, `send` finally block.

Clear aborts a request and immediately permits a new send. Old callbacks operate on whichever message is now last; the old finally block can set `busy=false` while the new request is active. This can contaminate replies or permit overlapping sends. Source-derived timing issue requiring a delayed-stream browser regression test.

**Fix:** track a conversation/request generation; ignore callbacks/finalizers from stale generations and update replies by stable message IDs.

### 16 — Premature end-of-stream looks successful

**Location:** `client/src/lib/mentorApi.js` read loop.

EOF returns normally even if no `done` event arrived. Trailing buffered JSON without a newline is discarded. A broken connection that ends cleanly can leave an incomplete answer displayed as finished.

**Fix:** validate event order, require completion, handle final buffered data, release the reader, and surface interrupted answers. Add truncated-stream fixtures.

### 17 — Unsafe local-RPC hostname classification

**Location:** `server/src/ledger/chain.ts:62–68`.

The prefix regex classifies `https://localhost.attacker.example/rpc` as local and allows the public Hardhat key. Reproduced against the exact predicate. Configuration access is required, so this is not an unauthenticated SSRF claim.

**Fix:** parse with `new URL`, compare exact loopback hostnames, validate protocol and expected chain ID, and reject the public test key for all non-local networks.

### 18 — Public receipts reveal identifiers and relationships

**Location:** `server/src/routes/paypal.ts:88`; `server/src/paypal/store.ts` `LiveReceipt`, `code`.

Anyone reaching the API can list capture/batch IDs, dates, amounts, and stable donor/guardian codes. This is deliberate demo behavior, but exceeds the public integrity proof's minimum requirements and links repeated activity. Six hex characters provide only 24 bits of pseudonym space, making collisions plausible as user counts grow; a random server salt does not increase the truncated output space.

**Fix:** separate public proof records from authenticated operational receipts, minimize identifiers, use longer random pseudonyms, and enforce NGO-level access controls. These IDs alone were not demonstrated to grant access to PayPal accounts.

### 19 — In-memory data has no lifetime or size bound

**Location:** `server/src/paypal/store.ts` orders maps and receipts array.

Abandoned orders are never expired, receipts never paginated/pruned, and deduplication entries never retired. Reads copy all receipts; pool calculation repeatedly traverses them. Per-IP mutation limits slow growth but do not bound lifetime consumption.

**Fix:** durable indexed storage, order expiration, paginated reads, retention policy, and aggregate balance accounting. Bound concurrent external requests as well as request rate.

### 20 — Vulnerable nested Zod in development tools

**Location:** `package-lock.json`; evidence `audit-dependencies.json`.

The scan reports Hardhat → hardhat-zod-utils → vulnerable Zod. The application's direct server Zod requirement is newer; do not describe this as a demonstrated exploitable public API vulnerability. The advisory concerns excessive validation memory use. See [GitHub advisory GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

**Fix:** update the compatible Hardhat dependency tree or apply a verified compatible override, then rerun contract tests and audit. Do not blindly use `npm audit fix --force`: its suggested Hardhat version change is a major version change.

### 21 — Payment UI error/status problems

**Location:** `client/src/previews/Payout.jsx` `refresh` and payout-result branch; `client/src/previews/ChainExplorer.jsx` status row.

Payout refresh failures set `problem`, but that message is rendered only in the pre-payout form, so it disappears after a payout exists. The result also says money was sent even for failed states. The chain explorer uses a green success class/check icon for reverted transactions as well as successful ones.

**Fix:** render refresh errors in the result view, distinguish submitted/pending/settled/failed, and condition status styling on transaction outcome.

### 22 — Invalid success responses are accepted

**Location:** `client/src/lib/api.js`.

JSON parse failure becomes `{}` even for HTTP 200, and `ok:true` is returned. An HTML fallback from a misconfigured static host therefore looks successful and can crash consumers expecting amounts or receipt arrays.

**Fix:** reject invalid JSON/content types and validate the response shape for each endpoint; add an HTML-200 fixture.

### 23 — SDK initialization failure cannot recover

**Location:** `client/src/lib/paypalSdk.js` `script.onload`.

If the script loads without creating `window.paypal`, the cached promise rejects but is not reset. All later attempts reuse that rejected promise until reload. Only `onerror` clears it.

**Fix:** clear cached state for every initialization failure, remove failed script elements, and allow an explicit retry with a loading timeout.

### 24 — Ledger proofs do not commit to currency

**Location:** `server/src/ledger/merkle.ts` `receiptText`; `chain/contracts/ImpactLedger.sol` totals; `server/src/routes/ledger.ts` receipt schema.

Sample receipts represent rupees; live PayPal receipts represent dollars. Both use the same integer amount schema and contract, while the hash omits currency. The same authenticated value has no explicit unit. Local UI context partially mitigates confusion but exported/on-chain totals are ambiguous.

**Fix:** version the receipt format and include currency and minor-unit amounts in the commitment; isolate incompatible denominations or record currency per batch.

## Additional release work and verification limits

- Authentication, durable storage, working consent/deletion, and external reconciliation are intentionally absent. Coming-soon NGO/classroom/certificate features are demonstrations; they should remain clearly marked until implemented.
- No deployment was supplied. TLS, reverse proxy trust, production security headers/CSP/frame restrictions, host isolation, backups, monitoring, and operational secret access were not verified. The source does not configure application-wide browser security headers. Validate them on the actual host before release.
- `TRUST_PROXY=true` trusts the forwarded chain broadly; configure trusted proxy addresses/hops and block direct origin access when deploying, or forwarded-address spoofing can defeat IP limits.
- Browser PayPal tests mock the SDK/payment answers. Passing them is not evidence of PayPal's popup, provider-side idempotency, refunds, or outage recovery. Live Gemini misuse tests were not run; model safety is not certified.
- Secrets were not printed or used. A full historical secret scan was not performed. Project handoff notes mention a previously shared Gemini key; rotate any credential known to have been disclosed using the provider dashboard.
- The Solidity contract enforces publisher-only, nonempty-root, write-once batches and its six tests pass. It cannot establish that payments occurred; that trust rests on the API and payment records.

## Suggested repair order

1. Restrict payout/publishing access; keep this instance loopback-only while authentication is absent.
2. Add durable unique payment operations, atomic capture crediting, and ambiguous-outcome reconciliation.
3. Repair receipt IDs and ledger publication/status semantics; add concurrency and restart regression tests.
4. Repair child safety/privacy and chat lifecycle behavior.
5. Add resource budgets, minimize public data, resolve the nested advisory, and fix UI feedback.
6. Rerun unit/contract/browser tests plus real sandbox acceptance and failure-recovery checks before any public release.
