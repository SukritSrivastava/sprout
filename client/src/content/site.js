// ✏️ EDIT ME: words that appear on every page (header, footer, tour button, "page not found").
// Safe to change: anything inside quotes. Keep the names on the left (like `howItWorks:`) as they are.

export const site = {
  // Top bar
  nav: {
    howItWorks: 'How it works',
    mentor: 'Mentor',
    comingSoon: 'Coming soon',
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
    label: 'Take the tour',
    small: 'About 1½ minutes with Sprout',
  },

  // Shown for addresses that don't exist
  notFound: {
    title: 'This page didn’t sprout.',
    text: 'The link may be old or mistyped.',
    button: 'Back to the home page',
  },
};
