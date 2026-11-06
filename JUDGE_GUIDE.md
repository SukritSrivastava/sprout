# Sprout: NGO demo for judges

## Before the walkthrough

The demo host supplies a mentor or NGO admin PIN privately. This document contains no working
PINs. Staff PINs are also used for sandbox payout approvals, so keep the configured values out
of screenshots, recordings and the public repository.

If you are running your own copy:

1. Open `server/.env`.
2. Set `PAYOUT_PIN_ADMIN` to a demo PIN of your choice, using 6–64 characters.
3. Run `npm run dev` from the `sprout` folder.

One admin PIN opens the NGO workspace. To review learning activities, also set a different
`PAYOUT_PIN_GUARDIAN`, restart the API, open `/soon/safety` and record demo permission for the
sample learner being reviewed. A12 also owns the Seedlings and AI demo. PayPal keys and guardian
email are not needed for these learning features. Configured adult PINs must be different.

## A two-minute walkthrough

1. Open <http://127.0.0.1:5173/soon/ngo>.
2. Choose the staff role provided by the host, such as **NGO admin**.
3. Enter the matching PIN. **Show PIN** lets you check what you typed.
4. Press **Open workspace**.
5. Open **Review queue**.
6. Approve one waiting sample activity.
7. Check that learning credits increase while the PayPal sandbox pool stays the same.
8. Open **Overview** to inspect the sample learner's jars.
9. Open **Report**.
10. Press **Download CSV report**.
11. Press **Lock workspace** when finished.

Each activity gets one saved decision. Already-reviewed activities cannot be approved again.
Records survive a server restart; use another waiting activity when repeating the walkthrough.
The three coded learners are sample identities, and learning credits are not money. Only the
separate PayPal flows use sandbox USD. Access expires after 15 minutes.

## If access is unavailable

1. Ask the host to confirm the staff PIN was saved under the matching role in `server/.env`.
2. Save the file; `npm run dev` reloads settings automatically. Restart an older dev command or a production API manually.
3. Press **Check access again**, or refresh the page.

The API loads `server/.env` at startup. The development runner also detects saves/replacements of
this hidden file and restarts the API. Production still requires a manual restart. Run
`npm run check:config -w server` to validate local settings without exposing PINs; an error names
the settings that conflict. Admin, mentor and guardian PINs must be different.
Five wrong PINs lock that role for 15 minutes; wait for the lockout to expire instead of retrying.
The form never displays the server's stored PIN, and the public config endpoint exposes only
available roles. No staff PIN or token is saved in browser storage.
