// ✏️ EDIT ME: words and sample data on the demo page ("/app"), plus the mentor chat's words.
// Safe to change: anything inside quotes, and the sample numbers. Keep the names on the left.
// Some entries are small functions like (amount) => `...${amount}...`: change the words around
// the ${...} parts, but leave the ${...} parts themselves, they insert numbers.

// The pretend kid the demo is about. Amounts are in rupees.
export const sampleKid = { name: 'Aanya', baseBalance: 200, reward: 200 };

// The four jars, in order. `color` must be one of the CSS colour names in styles.css.
export const jars = [
  {
    name: 'Save',
    color: 'var(--green)',
    note: 'For your next big thing.',
    detail: 'A course, a bicycle, your own laptop. Money you put aside for something that matters to you.',
  },
  {
    name: 'Spend',
    color: 'var(--purple)',
    note: 'For a little right now.',
    detail: 'Enjoy some of what you earned. A good plan leaves room for today too.',
  },
  {
    name: 'Give',
    color: 'var(--peach)',
    note: 'For something you believe in.',
    detail: 'Support a cause you care about, if you want to. Giving is always your choice.',
  },
  {
    name: 'Invest',
    color: 'var(--yellow)',
    note: 'For the future you.',
    detail: 'Set money aside for later and learn how investing works. No real investing happens in sprout.io.',
  },
];

export const demo = {
  // The mint band at the top
  hello: {
    title: (name) => `Hi ${name}. This is your sprout.io.`,
    text: 'Everything here is sample money. Tap things, move sliders, break nothing.',
    balance: 'Total balance',
    sample: 'Sample',
  },

  earn: {
    tag: 'Step 1 · Earn',
    title: 'Do something useful. Earn a little.',
    text: 'In the real app, a mentor at your NGO checks the activity first. Here, tap the button and we’ll pretend they said yes.',
    activityTag: 'Community · 30 min',
    activityTitle: 'Run a reading hour at the learning centre',
    activityText: 'Read a story with younger kids and help them sound out new words.',
    button: 'Complete the activity',
    buttonDone: 'Reward added',
    done: (total) => `Approved (pretend). Your jars now hold ${total}.`,
    seeJars: 'See your jars',
    reset: 'Reset',
    notDone: 'Sample activity. Approval is simulated in this demo.',
  },

  jars: {
    tag: 'Step 2 · Plan',
    title: 'Four jars. Your split.',
    text: 'There’s no perfect split, just one that fits you. Tap a jar to see what it’s for.',
    selected: (name) => `${name}, your way.`,
    slider: 'How much do you save?',
    hint: (balance) => `Sample balance ${balance}. The rest splits 60% Spend, 20% Give, 20% Invest.`,
  },

  grow: {
    tag: 'Step 3 · Grow',
    title: 'When can I get it?',
    text: 'Pick something you want and how much you could put aside each month. Small amounts add up faster than you’d think.',
    goalLabel: 'Saving for',
    monthlyLabel: 'Each month',
    reachable: 'Your', // "Your ₹6,000 bicycle in 4 years 3 months"
    tooFar: (cost, goal) => `A ${cost} ${goal} needs a bigger monthly amount or more time.`,
    after: (years) => `after ${years} years`,
    today: 'Today',
    later: (years) => `${years} years from now`,
    slider: 'Give it time',
    sliderValue: (years) => `${years} years`,
    note: (paidIn, years) =>
      `You put in ${paidIn} over ${years} years. Assumes 8% a year, added monthly. A pretend example, not a promise. No real investing happens here.`,
  },

  mentor: {
    tag: 'Ask anything',
    title: 'Paisa Mentor.',
    text: 'A real AI mentor that answers money questions in plain words, in English or Hindi. It knows your sample jars and goal, and it will never ask for personal details.',
    name: 'Paisa Mentor',
    note: 'AI · can make mistakes.',
    status: { checking: 'Connecting…', live: 'Live AI', offline: 'Offline mode' },
  },

  withdraw: {
    tag: 'Step 4 · Use it',
    title: 'Every step leaves a trail.',
    text: 'Ask for money for your goal. A grown-up approves it, the NGO pays it to your guardian, and you get a receipt. In this demo nothing is really paid.',
    cardTitle: 'Accountability trail',
    cardTag: 'Demo',
    what: 'Sample withdrawal for school shoes',
    amount: '₹100.00',
    stages: ['Withdrawal requested', 'Approved by a mentor', 'Payout simulated', 'Receipt ready'],
    buttons: ['Simulate mentor approval', 'Simulate payout', 'Show receipt', 'Start again'],
    finished: 'Preview only · no real transaction',
  },
};

// The mentor chat's words, per reply language (English `en`, Hindi `hi`).
// The AI writes its own replies; these are the fixed bits around it.
export const mentorText = {
  en: {
    greeting: `Hi ${sampleKid.name}! I’m Paisa Mentor. Ask me anything about money: saving, spending, giving, scams, anything. I can see your sample jars and goal.`,
    placeholder: 'Ask a money question…',
    send: 'Send',
    suggestions: [
      'When can I reach my goal?',
      'Is it okay to spend some now?',
      'What is compound interest?',
      'How do I spot a money scam?',
    ],
    adultTitle: 'This sounds important.',
    adultText:
      'Please talk to a parent, guardian, teacher or your NGO mentor today. If you ever feel unsafe, call Childline on 1098, free, any time.',
    privacy: 'Don’t share your real name, phone number, address or passwords. Your questions go to Google’s Gemini AI; emails and long numbers are blanked out first.',
    offline: 'The mentor can’t be reached, so here’s a prepared answer.',
    cutShort: 'The answer was cut off. Ask again to get the rest.',
  },
  hi: {
    greeting: `नमस्ते ${sampleKid.name}! मैं पैसा मेंटर हूँ। पैसों के बारे में कुछ भी पूछो: बचत, खर्च, दान, धोखाधड़ी, कुछ भी। मैं तुम्हारे सैंपल जार और लक्ष्य देख सकता हूँ।`,
    placeholder: 'पैसों के बारे में सवाल पूछो…',
    send: 'भेजो',
    suggestions: [
      'मैं अपना लक्ष्य कब पूरा कर पाऊँगी?',
      'क्या अभी थोड़ा खर्च करना ठीक है?',
      'चक्रवृद्धि ब्याज क्या है?',
      'पैसों का धोखा कैसे पहचानूँ?',
    ],
    adultTitle: 'यह बात ज़रूरी लगती है।',
    adultText:
      'आज ही अपने माता-पिता, अभिभावक, टीचर या NGO मेंटर से बात करो। अगर कभी असुरक्षित लगे, तो Childline 1098 पर मुफ़्त कॉल करो, कभी भी।',
    privacy: 'अपना असली नाम, फ़ोन नंबर, पता या पासवर्ड शेयर मत करो। तुम्हारे सवाल Google के Gemini AI को जाते हैं; ईमेल और लंबे नंबर पहले छिपा दिए जाते हैं।',
    offline: 'मेंटर से अभी जुड़ नहीं पाए, इसलिए यह पहले से तैयार जवाब है।',
    cutShort: 'जवाब बीच में कट गया। बाकी जवाब के लिए फिर से पूछो।',
  },
};

// Backup answers the website uses if it can't reach our server at all.
// (When the server is up but the AI isn't, the server's own backup answers are used:
// server/src/features/mentor/prepared.ts.) The first matching `words` wins; otherwise `default`.
export const offlineAnswers = {
  // Used instead of the answers below when the question sounds like a scam, debt, theft,
  // bullying or self-harm. The trusted-adult card is shown with it.
  sensitive: {
    en: 'Thank you for telling me. This sounds important, so please talk to a grown-up you trust today: a parent, guardian, teacher or your NGO mentor. Never share passwords or OTPs, and if you ever feel unsafe, call Childline on 1098.',
    hi: 'मुझे बताने के लिए धन्यवाद। यह बात ज़रूरी लगती है, इसलिए आज ही किसी भरोसेमंद बड़े से बात करो: माता-पिता, अभिभावक, टीचर या NGO मेंटर। पासवर्ड या OTP कभी शेयर मत करो, और अगर कभी असुरक्षित लगे तो Childline 1098 पर कॉल करो।',
  },
  en: [
    {
      words: /scam|fraud|otp|password/,
      answer:
        'Watch for hurry, secrets and promises that sound too good. Nobody real needs your password or OTP. If someone says “act now” or “guaranteed returns”, stop and ask a grown-up you trust.',
    },
    {
      words: /invest|gambl|stock|crypto/,
      answer:
        'Not really. Gambling is a bet on one quick result. Investing means owning a small piece of something for years, and spreading your money out lowers the risk. It can still lose value, so learn first and never invest money you need soon.',
    },
    {
      words: /compound|interest|grow/,
      answer:
        'Your money earns a little, then that little earns a little too. Like a seed that grows a plant that drops more seeds. The calculator shows a pretend example; real returns change and are never promised.',
    },
    {
      words: /budget|plan/,
      answer:
        'A plan for your money before you spend it. Your four jars are a tiny budget: you decide where each rupee goes, then check if the plan still fits your life.',
    },
    {
      words: /give|donat|charity/,
      answer:
        'No. Giving is a choice, never a rule. Look after your own needs and goals first. Giving your time can matter as much as giving money.',
    },
  ],
  enDefault:
    'Saving buys your future self more choices. If your goal costs ₹1,000 and you keep ₹100 from each reward, you get there in 10 rewards. You still decide what to enjoy today.',
  hiDefault:
    'अभी मैं जुड़ नहीं पा रहा। तब तक एक बात याद रखो: हर बार कमाने पर थोड़ा Save जार में डालो, और किसी को अपना OTP या पासवर्ड मत बताओ।',
};
