// ✏️ EDIT ME: the numbers behind the PayPal donation and payout pages.
// Change the values, keep the names on the left. The server restarts by itself when you save.

export const paypalSettings = {
  // The sample NGO that receives donations (shown to donors and to the AI).
  ngoName: 'Asha Learning Trust (sample NGO)',
  // Donation buttons on /soon/donate, in US dollars (the PayPal sandbox uses USD).
  donationAmounts: [5, 10, 25, 50],
  // What one completed activity earns a kid, in dollars. Used to say "your $10 funds 5 rewards".
  rewardDollars: 2,
  // Largest single payout to a guardian, in dollars.
  maxPayoutDollars: 50,
  // The adults who can approve a payout; any two different ones are needed. Each one's PIN is
  // PAYOUT_PIN_MENTOR / PAYOUT_PIN_ADMIN / PAYOUT_PIN_GUARDIAN in server/.env.
  approvers: ['mentor', 'admin', 'guardian'],
  // The (sample) kid whose payout requests the payout page makes.
  childName: 'Aanya (sample)',
};
