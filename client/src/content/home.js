// ✏️ EDIT ME: all the words on the home page ("/"), top to bottom.
// Safe to change: anything inside quotes. Keep the names on the left as they are.
// Lists in [square brackets] can get more or fewer items.

export const home = {
  // Section 1: the big headline
  hero: {
    tag: 'For kids 8 to 17 · run with NGOs',
    // Each line of the headline rises in one after another; the last one gets the purple box.
    headline: ['Money skills', 'for every kid.'],
    highlight: 'Whatever they start with.',
    intro:
      'Do a small activity, earn a little, split it into four jars, and ask a mentor the money questions you were scared to ask.',
    openDemo: 'Open the demo',
    tour: 'Take the 1½-minute tour',
    // The sample card on the right
    card: {
      title: 'Aanya’s jars',
      sample: 'Sample',
      earned: 'earned',
      goal: 'Bicycle goal',
      of: 'of',
    },
    mascotLabel: 'Sprout, the mascot, waving hello',
  },

  // Section 2: three steps
  how: {
    tag: 'How it works',
    title: ['Three steps.', 'No bank account needed.'],
    steps: [
      {
        title: 'Do something useful.',
        text: 'Run a reading hour at your NGO centre, sort the library, teach a younger kid to count change.',
        cardTag: 'Community · 30 min',
        cardTitle: 'Reading hour at the learning centre',
      },
      {
        title: 'A grown-up checks it.',
        text: 'A mentor at the NGO looks at what you did and approves it. Then the reward lands in your sprout.io jars.',
        checklist: ['Activity submitted', 'Checked by your mentor', 'added'],
      },
      {
        title: 'You decide where it goes.',
        text: 'Save, Spend, Give, Invest. You set the split. Nobody does it for you, and nobody judges it.',
      },
    ],
  },

  // Section 3: Paisa Mentor (a fixed sample chat; the live AI is in the demo)
  mentor: {
    tag: 'Paisa Mentor',
    title: ['A mentor.', 'Not a lecture.'],
    text: 'Ask anything about money, in English or Hindi. Paisa Mentor answers like an older cousin who’s good with money, not like a textbook.',
    button: 'Try it in the demo',
    chatName: 'Paisa Mentor',
    chatSubtitle: 'Sample chat',
    // `lang: 'hi'` marks Hindi lines so screen readers pronounce them right.
    sampleChat: [
      { from: 'user', lang: 'hi', text: 'मैं साइकिल कब खरीद पाऊँगी?' },
      { from: 'mentor', lang: 'hi', text: '₹100 हर महीने बचाकर लगभग 4 साल 3 महीने में। ₹250 बचाओ तो 2 साल से कम।' },
      { from: 'user', lang: 'en', text: 'Can I still buy snacks sometimes?' },
      {
        from: 'mentor',
        lang: 'en',
        text: 'Yes! That’s what your Spend jar is for. Saving works best when it doesn’t feel like a punishment.',
      },
    ],
    note: 'Sample replies. The live AI mentor is in the demo.',
  },

  // Section 4: the black band about trust
  trust: {
    tag: 'Built on trust',
    title: ['Kids learn.', 'Adults hold the money.'],
    text: 'Payouts through PayPal and public receipts are planned. In today’s demo they are simulated, and it says so.',
    points: [
      { title: 'The NGO keeps the money.', text: 'Kids see their balance in sprout.io. The real funds stay with the NGO.' },
      { title: 'Two adults approve every payout.', text: 'A mentor and an NGO admin both say yes before anything is paid.' },
      { title: 'Every rupee leaves a receipt.', text: 'Donors and parents can check where the money went.' },
    ],
  },

  // Section 5: coming soon (titles and one-liners come from src/previews/index.js)
  comingSoon: {
    tag: 'Coming soon',
    title: 'What we’re building next.',
    text: 'These are planned, not live. Each one has a clickable preview with sample data, so you can see how it will work.',
    // Which previews to show here, in order (ids from src/previews/index.js).
    show: ['donate', 'ngo', 'impact', 'seedlings', 'hindi'],
    rowStamp: 'Try the preview',
    seeAll: 'See all', // followed by "9 previews"
  },

  // Last section
  closing: {
    title: 'Start with',
    highlight: '₹0.',
    text: 'sprout.io is for kids who have never had pocket money. That’s the whole point.',
    button: 'Open the demo',
  },
};
