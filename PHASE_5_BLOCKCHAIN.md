# Phase 5: The public impact ledger (blockchain)

*For judges and reviewers: what it is, why sprout.io needs it, how it works, and what is real
today.*

---

## The problem it solves

sprout.io moves donated money to kids through NGOs. Three groups need to trust that flow:

- **Donors** want proof their money reached kids as rewards, and wasn't quietly changed or lost.
- **NGOs** want an easy way to show that proof without hiring an auditor.
- **Families** want kids' details kept private.

A normal database can't give donors that proof on its own: whoever runs the database could edit
a record later, and nobody outside would notice. Asking donors to "just trust us" is exactly
what many small NGOs struggle with.

## The idea in one sentence

**Every donation, reward and payout gets a receipt; once a day the receipts are sealed into one
code that is published on a public blockchain, so anyone can later prove a receipt wasn't
changed, without ever seeing who the kid is.**

## How it works

```
 Donation ₹500   Reward ₹200   Reward ₹150   Payout ₹600 …       ← receipts in sprout.io
      │              │             │             │
      ▼              ▼             ▼             ▼
  fingerprint    fingerprint   fingerprint   fingerprint         ← SHA-256 of each receipt
      └──────┬───────┘             └──────┬──────┘
         pair code                    pair code                  ← fingerprints combined in pairs
             └──────────────┬─────────────┘
                       batch root                                ← one code for the whole batch
                            │
                            ▼
         Published on a public blockchain with the batch totals
         (donated ₹3,000 · rewarded ₹550 · paid out ₹600)
```

1. **Receipts.** Every money movement in sprout.io becomes a receipt: an id, the type, the
   amount, the date, and a **coded reference** instead of the kid's name (for example `kid-a12`).
   The code is salted and kept on sprout.io's server, so nobody can work out who it is.
2. **Fingerprints.** Each receipt gets a SHA-256 fingerprint: a long code that changes
   completely if even one digit of the receipt changes.
3. **One code per batch.** Fingerprints are combined in pairs, then pairs of pairs, until one
   code is left: the **batch root** (a "Merkle tree"). Changing any receipt changes the root.
4. **Publish.** The root and the batch totals are written to a public blockchain. Once there,
   nobody (not sprout.io, not the NGO) can change them.
5. **Anyone can check.** A donor gets their receipt and a short "proof" (the few codes needed to
   rebuild the root). Their browser rebuilds the root and compares it with the one on the
   blockchain. Match: the record is untouched. No match: it was changed.

## What it proves, and what it doesn't

| Proves | Doesn't prove |
| --- | --- |
| A receipt hasn't been edited since it was published | That an activity really happened (a mentor still checks that) |
| Batch totals match the receipts in the batch | Anything about who a kid is: no personal data goes on chain |
| The record was published at a certain time | That money wasn't misused *before* it was recorded |

People still approve things: two adults approve every payout. **The blockchain records; it
doesn't decide.**

## Why a blockchain, and not just a website

Because the check has to work **even if sprout.io itself can't be trusted**. A code published on
a public blockchain is stored by thousands of independent computers. sprout.io can't quietly
edit it later, and anyone can read it for free, forever. That's the one job the blockchain does
here. We don't use tokens, coins, NFTs or crypto payments: kids and donors never need a wallet.

## Privacy by design

- No names, photos, phone numbers, schools or addresses on chain. Ever.
- Only batch roots and totals are public. Individual receipts stay in sprout.io and are shared
  only with the people they belong to.
- A family can ask to delete a kid's data; the public batch codes reveal nothing about them.
- Certificates of learning are kept *off* chain on purpose, so they can be removed.

## What is real today (working on a local test blockchain)

Phase 5 runs end to end on **a real Ethereum blockchain that lives only on the demo laptop**
(Hardhat). Nothing uses real money or a real wallet.

| Part | Status |
| --- | --- |
| Receipt fingerprints, batch root, proofs, "Verify a receipt" | **Real.** SHA-256 and Merkle maths in the browser (`client/src/lib/ledger.js`) and on the server (`server/src/ledger/merkle.ts`); a test proves both give the same code. |
| Smart contract `ImpactLedger` | **Real.** Solidity, compiled and tested with Hardhat (`chain/contracts/`). Only the publisher can publish; a published batch can never be changed. 6 contract tests. |
| Publishing a batch | **Real, on the local chain.** "Publish to the blockchain" in `/soon/impact` sends a real transaction. The server computes the batch code from the receipts itself and stores it with the totals. |
| Block explorer | **Real data.** Shows the transaction's block, code, time, sender, contract, gas and fee, read from the chain. |
| Verify against the chain | **Real.** Step 3 checks a receipt against the code read back from the contract; editing an amount fails. If the chain's code ever differs from the receipts, the page says so. |
| The wallet | **Pretend, by design.** Hardhat's built-in test account #0, loaded with fake ETH. Its key is public and only allowed on a local chain; the server refuses to use it anywhere else. |
| Real receipts from real donations and rewards | **Planned.** Needs the real backend (PayPal donations and payouts, database). |

### How the pieces fit

```
Browser (/soon/impact)                      Server (Fastify)                     Local chain (Hardhat, :8545)
"Publish" ── POST /api/ledger/publish ──▶  checks receipts (codes only)
                                            computes batch code + totals  ──▶  ImpactLedger.publishBatch(...)
                                                                                   new block, event BatchPublished
Explorer  ◀── transaction details ──────── reads receipt + block           ◀──
"Verify"  ── GET /api/ledger/batches/1 ──▶  ImpactLedger.batches(1)        ──▶  stored code + totals
          compares the receipt's proof with the stored code, in the browser
```

### Run it

`npm run dev` starts three things: the website, the server and the local blockchain. Open
`/soon/impact`, press **Next**, then **Publish to the blockchain**. Restarting `npm run dev` starts
a fresh, empty chain (the contract is deployed again automatically).

| Command | What it does |
| --- | --- |
| `npm run dev:chain` | Just the local blockchain (prints its 20 test accounts) |
| `npm run build -w chain` | Recompile the contract and export it to `chain/build/ImpactLedger.json` (committed; the server deploys from it) |
| `npm run test -w chain` | The contract's own tests, written in Solidity |
| `GET /api/ledger/status` | Chain id, current block, contract address and the publisher wallet |

### Going from the laptop to a public chain later

Set two lines in `server/.env`: `CHAIN_RPC_URL` (for example Base Sepolia's address) and
`PUBLISHER_PRIVATE_KEY` (a dedicated wallet's key, entered by hand). No code changes. The server
refuses the public test key on any non-local chain.

## Is it needed for the hackathon?

For the demo, the local chain shows the whole flow working: a real contract, a real
transaction and a real check, with no wallet or money involved. Moving to a public network is a
settings change for when the hackathon rewards it; the full ledger of real receipts belongs after
the hackathon, together with the real PayPal backend.
