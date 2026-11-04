// Words and sample data shown on the site, kept apart from layout so they're easy to edit.

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
    detail: 'Set money aside for later and learn how investing works. No real investing happens in Sprout.',
  },
];

export const answers = {
  'Why should I save?':
    'Saving buys your future self more choices. If your goal costs ₹1,000 and you keep ₹100 from each reward, you get there in 10 rewards. You still decide what to enjoy today.',
  'What is compound interest?':
    'Your money earns a little, then that little earns a little too. Like a seed that grows a plant that drops more seeds. The calculator shows a pretend example; real returns change and are never promised.',
  'Do I have to give?':
    'No. Giving is a choice, never a rule. Look after your own needs and goals first. Giving your time can matter as much as giving money.',
  'What is a budget?':
    'A plan for your money before you spend it. Your four jars are a tiny budget: you decide where each rupee goes, then check if the plan still fits your life.',
  'Is investing like gambling?':
    'Not really. Gambling is a bet on one quick result. Investing means owning a small piece of something for years, and spreading your money out lowers the risk. It can still lose value, so learn first and never invest money you need soon.',
  'How do I spot a money scam?':
    'Watch for hurry, secrets and promises that sound too good. Nobody real needs your password or OTP. If someone says “act now” or “guaranteed returns”, stop and ask a grown-up you trust.',
};

export const sampleKid = { name: 'Aanya', baseBalance: 200, reward: 200 };

// Words in the mentor chat, per reply language.
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
    privacy: 'Don’t share your real name, phone number, address or passwords.',
    offline: 'The mentor can’t be reached, so here’s a prepared answer.',
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
    privacy: 'अपना असली नाम, फ़ोन नंबर, पता या पासवर्ड शेयर मत करो।',
    offline: 'मेंटर से अभी जुड़ नहीं पाए, इसलिए यह पहले से तैयार जवाब है।',
  },
};

// Last resort when the server can't be reached at all: the closest English prepared answer.
export function offlineAnswer(question, language) {
  if (language === 'hi') {
    return 'अभी मैं जुड़ नहीं पा रहा। तब तक एक बात याद रखो: हर बार कमाने पर थोड़ा Save जार में डालो, और किसी को अपना OTP या पासवर्ड मत बताओ।';
  }
  const text = question.toLowerCase();
  const pick = [
    [/scam|fraud|otp|password/, 'How do I spot a money scam?'],
    [/invest|gambl|stock|crypto/, 'Is investing like gambling?'],
    [/compound|interest|grow/, 'What is compound interest?'],
    [/budget|plan/, 'What is a budget?'],
    [/give|donat|charity/, 'Do I have to give?'],
  ].find(([pattern]) => pattern.test(text));
  return answers[pick ? pick[1] : 'Why should I save?'];
}
