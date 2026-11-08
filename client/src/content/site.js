// ✏️ EDIT ME: words that appear on every page (header, footer, tour button, "page not found").
// Safe to change: anything inside quotes. Keep the names on the left (like `howItWorks:`) as they are.

export const site = {
  apiUnavailable: 'Can’t reach the server right now. Please try again shortly.',
  // Top bar
  nav: {
    howItWorks: 'How it works',
    mentor: 'Mentor',
    comingSoon: 'Coming soon',
    features: [
      { id: 'seedlings', label: 'Seedlings', status: 'Saved learning garden' },
      { id: 'safety', label: 'Guardian permission', status: 'Sample demo' },
      { id: 'donate', label: 'Donate', status: 'PayPal sandbox' },
      { id: 'payout', label: 'Payouts', status: 'PayPal sandbox' },
      { id: 'impact', label: 'Impact ledger', status: 'Test blockchain' },
      { id: 'ngo', label: 'NGO workspace', status: 'Sample demo' },
    ],
    openDemo: 'Open the demo',
    home: 'Home',
    motionOn: 'Motion on',
    motionOff: 'Motion off',
  },

  // Bottom of every page
  footer: {
    tagline: 'Money skills for every kid, whatever they start with.',
    openDemo: 'Open the demo',
    comingSoon: 'Coming soon',
    tour: 'Tour with Sprout',
    // The year is added automatically in front of this.
    note: 'A demo for the PayPal AI hackathon. Amounts are sample money or PayPal sandbox test money; nothing real is ever charged.',
  },

  // The floating button with the mascot (bottom right)
  tourButton: {
    label: 'Present with Sprout',
    small: 'Manual or automatic · no audio',
  },

  // Shown for addresses that don't exist
  notFound: {
    title: 'This page didn’t sprout.',
    text: 'The link may be old or mistyped.',
    button: 'Back to the home page',
  },
};
