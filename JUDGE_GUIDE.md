# Present Sprout

Run `npm run dev` and open [the local site](http://127.0.0.1:5173) in Chrome or Edge. See [setup](docs/SETUP.md) for sandbox credentials and provider troubleshooting.

The default demo is open: no PIN is needed. The yellow notice explains that protection is disabled. With `DEMO_OPEN_ACCESS=false`, follow the protected setup guide, record A12 permission and unlock the NGO workspace with a staff PIN. Never put actual PINs in this guide.

## A short walkthrough

1. Open `/app`. Complete the sample activity and change the four-jar split. Explain that these rupee balances are practice data.
2. Choose a savings goal and monthly contribution. The projection is illustrative, not a promised return.
3. Ask Paisa Mentor a money question. Switch to Hindi and show that controls and new reply settings follow the shared language. Check whether the response is labelled AI or prepared.
4. Open `/soon/ngo`, approve one sample activity and download the CSV. Learning credits rise; the separate sandbox dollar pool does not.
5. Open `/soon/seedlings`, complete a picture lesson and reload. A correct lesson earns one saved seed; repeating it earns no extra seed.
6. Open `/soon/safety` to demonstrate sample acknowledgement, withdrawal and deletion. In open mode these controls do not lock learning; protected mode enforces permission.
7. If PayPal is configured, donate sandbox USD at `/soon/donate`. Approve in PayPal's own window with a sandbox Personal account.
8. At `/soon/payout`, obtain two different role approvals and send to the fixed guardian sandbox recipient. Refresh the provider status.
9. At `/soon/impact`, publish settled PayPal receipts. Compare the proof with the chain; changing a sample amount breaks verification.

Approvals and lesson completions persist. Repeat the demo with an unreviewed activity or practise an existing lesson. Keep payment records intact; an uncertain payout needs recovery, not a fresh request.

## Guided presentation

Select **Present with Sprout** and choose manual or automatic. Manual mode leaves the pace to you. Automatic mode follows the 12-step, 108-second script and starts with a compact control bar. Expand it for captions; Pause/Resume and Stop stay available. Escape closes it.

Both modes are silent. Automatic actions affect temporary practice controls only. PayPal approvals, PINs, saved learning and ledger writes remain manual. Hidden tabs pause playback; resuming is deliberate. Reduced motion removes gliding without removing the walkthrough.

## Explain the limits

- PayPal uses real sandbox API calls with test USD. Nobody is charged real money.
- The AI is Gemini when configured; prepared answers are labelled. Chat is held in memory, and redaction reduces personal data sent to the model without guaranteeing complete anonymization.
- The local blockchain proves that receipt contents match a published root. It cannot establish whether an activity happened or money was spent well. See [ledger](docs/ledger.md).
- PINs are local shared secrets, not verified identities. The default open demo bypasses them deliberately.
- The website/API still run locally. Vercel, Neon and Base Sepolia are selected but not implemented; classroom/offline and certificates remain previews.

Check [verification](VERIFICATION.md) before making claims about tests or live providers.
