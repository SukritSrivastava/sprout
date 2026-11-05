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

## What is real today

| Part | Status |
| --- | --- |
| Receipt fingerprints, batch root, proofs, "Verify a receipt" | **Real.** The preview at `/soon/impact` runs the actual SHA-256 and Merkle maths in your browser on six sample receipts. Edit an amount and verification fails. |
| Publishing the root to a blockchain | **Planned.** The preview is labelled "Testnet preview · not actually published". |
| Real receipts from real donations and rewards | **Planned.** Needs the real backend (PayPal donations and payouts, database). |

Code: `client/src/lib/ledger.js` (the maths, with unit tests in `ledger.test.js`) and
`client/src/previews/ImpactLedger.jsx` (the walkthrough).

## Making it live

### Step 1: publish once, before a demo (about half a day of work)

The preview's sample batch root is published **once** to **Base Sepolia**, a free public test
network. The impact page then gets a "View on the blockchain" link to the real transaction on
basescan.org, and "Verify" also checks against the code read from the chain. Nothing touches the
chain during a live demo, so it can't fail on stage.

What the project owner sets up (about 15 minutes):

1. Install a wallet browser extension (MetaMask or Rabby) and create a **new, test-only wallet**.
   Never put real money in it.
2. Add the **Base Sepolia** network in the wallet.
3. Get free test ETH from a Base Sepolia faucet (a tiny amount covers hundreds of batches).
4. Put that test wallet's private key in `server/.env` as `PUBLISHER_PRIVATE_KEY=` (by hand,
   never in chat or in code).

What gets built:

- `contracts/ImpactLedger.sol`: a tiny contract that only stores
  `publishBatch(root, batchId, donated, rewarded, paidOut, receiptCount)`, callable only by the
  NGO's publisher address. No payments, no tokens, no personal data. Tested with Foundry.
- `npm run ledger:deploy` and `npm run ledger:publish`: one command each.
- The impact page: a "View on the blockchain" link and a read-only check against the chain (no
  wallet needed to read). If the network is unreachable, the local check still works.

### Step 2: the full ledger (after the real backend exists)

- Every real donation (PayPal Checkout), reward (mentor approval) and payout (PayPal Payouts)
  writes a receipt into sprout.io's own append-only ledger.
- A daily job seals the day's receipts into a batch and publishes its root and totals.
- Donors get a link to check their own receipt; NGOs get a public impact page.
- Moves from the test network to a low-cost public network once the NGO is ready.

## Is it needed for the hackathon?

Not to show the idea: the preview already proves the maths works and explains it honestly.
Step 1 is worth doing only if the judging rewards a real on-chain transaction. Step 2 belongs
after the hackathon, together with the real PayPal backend.
