# sprout.io: 3-minute demo script

For presenting to judges. Times are a guide; the bold lines are what to say, the rest is what to
click. Everything runs on one laptop with `npm run dev`.

---

## Before you go on stage (5 minutes)

1. `cd sprout` then `npm run dev`. Wait for `[web]`, `[api]` and `[chain]` to say they're ready.
2. Open http://127.0.0.1:5173 in Chrome. Zoom 100%, full screen (F11).
3. Open http://127.0.0.1:5173/api/health and check `"aiConfigured": true`.
4. Go to `/app#mentor`, ask one question, and check the status tag says **Live AI**.
   - If it says **Offline mode**, see "If things go wrong" below. The demo still works.
5. Go back to `/`, scroll to the top, and close any open tour.
6. Turn notifications off. Close other tabs.

Free Gemini keys have a daily limit. Don't use the mentor much on judging day before you present.

---

## The script

### 0:00 – 0:20 · The problem (home page)

**"Most money lessons assume kids already have pocket money and a bank account. Millions don't.
sprout.io teaches money skills through NGOs, whatever a kid starts with."**

Point at the headline, then the jars card on the right.

### 0:20 – 0:45 · How it works (scroll down once)

**"A kid does something useful at their NGO, like running a reading hour. A grown-up checks it,
and the reward is theirs to plan. The real money always stays with the NGO."**

Scroll slowly so the three steps animate in.

### 0:45 – 1:30 · The demo (click "Open the demo")

1. Click **Complete the activity**. Sprout cheers and the balance counts up to ₹400.
   **"Approval is simulated here. In the real app a mentor approves it."**
2. Scroll to the jars and drag the **save** slider. **"Four jars. Every rupee is always
   accounted for, and giving is a choice."**
3. In **When can I get it?**, pick **Bicycle** and **₹250**. **"Kids see how long a real goal
   takes."**

### 1:30 – 2:20 · The live AI mentor (the strongest moment)

1. Switch the mentor to **हिंदी**.
2. Tap the first suggestion, or type: *मैं अपना लक्ष्य कब पूरा कर पाऊँगी?*
   **"This is live AI. It knows the sample jars and goal, answers in Hindi, and never asks for
   personal details."**
3. Then type: *Someone is asking for my OTP to double my money*
   **"Risky topics get a calm answer and a nudge to talk to a trusted adult, with Childline's
   number."** Point at the peach card.

### 2:20 – 2:50 · Trust and what's next (header → "Coming soon")

1. Open **Public impact ledger**, click **Next**, then **Publish to the blockchain**. Point at the
   block explorer: **"That's a real transaction on a real Ethereum chain running on this laptop:
   block number, transaction code, the NGO's wallet, the fee. No real money."**
2. Click **Next**, then **Verify** (it matches the code stored in that block).
3. Change the amount to 2000 and click **Verify** again (it fails).
   **"Donors can check that records were never changed, without seeing any kid's details.
   Moving to a public network is a settings change."**

### 2:50 – 3:00 · Close

**"sprout.io: money skills for every kid, whatever they start with. Thank you."**

Optional: if there's time, click **Take the tour**. It plays a 1½-minute guided tour by itself, in
English or Hindi.

---

## If things go wrong

| Problem | What happens | What to do |
| --- | --- | --- |
| No Wi-Fi / Gemini down / daily limit used | Mentor shows **Offline mode** and answers from prepared replies, tagged "Prepared answer" | Keep going. Say: "Without internet it falls back to prepared answers, so it never breaks in a classroom." |
| "The local blockchain isn't running" | `[chain]` stopped | Restart `npm run dev` (the chain starts empty; publish again) |
| Server (`[api]`) crashed | Same offline answers | Restart with `npm run dev` if you have 20 seconds; otherwise carry on |
| "Let's take a short break" | Rate limit (20 questions in 5 min) | Skip to the impact ledger part |
| Animations feel slow on the projector | — | Click **Motion on** in the header to turn motion off |
| Page looks stuck | — | Refresh. All demo data is sample data and resets |

## Questions judges may ask

- **Is the money real?** It's PayPal **sandbox** test money: real PayPal API calls (Orders v2 for
  donations, Payouts v1 for guardians), nothing real charged. The kids' jars on `/app` are sample data.
- **What's real today?** PayPal sandbox donations and payouts, the AI mentor and the AI donor
  thank-you (Gemini), and PayPal receipts sealed on a local blockchain.
- **How do you keep kids safe?** No personal data asked or stored; messages aren't logged;
  risky topics are flagged; guardians consent first (preview); two adults approve payouts.
- **Why blockchain?** Only to prove records weren't edited. No kid data ever goes on chain.
- **What stops someone abusing the AI?** Rate limits, a shared hourly cap, website-only access,
  and 12 misuse tests (`npm run eval:mentor`) that all pass.
