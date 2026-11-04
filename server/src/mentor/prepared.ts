// Built-in answers used when the AI can't be reached (no key, no internet, quota, error).
// The closest topic wins; if nothing matches, a friendly "I'm offline" reply is used.
import type { Language } from './schema.js';

type Topic = { match: RegExp; en: string; hi: string };

const topics: Topic[] = [
  {
    match: /scam|fraud|otp|password|lottery|धोखा|ठगी|ओटीपी/i,
    en: 'Watch for hurry, secrets and promises that sound too good. Nobody real needs your password or OTP. If someone says “act now” or “guaranteed returns”, stop and ask a grown-up you trust.',
    hi: 'जल्दबाज़ी, राज़ रखने को कहना और बहुत अच्छे वादे, इन पर ध्यान दो। कोई भी असली इंसान तुम्हारा पासवर्ड या OTP नहीं माँगता। अगर कोई कहे “अभी करो” या “पक्का मुनाफ़ा”, तो रुको और किसी भरोसेमंद बड़े से पूछो।',
  },
  {
    match: /invest|gambl|stock|share|crypto|निवेश|जुआ|शेयर/i,
    en: 'Investing means owning a small piece of something for years; gambling is a bet on one quick result. Investing can still lose value, so learn first and never invest money you need soon.',
    hi: 'निवेश का मतलब है किसी चीज़ का छोटा हिस्सा सालों तक रखना; जुआ एक जल्दी के नतीजे पर दाँव है। निवेश में भी पैसा घट सकता है, इसलिए पहले सीखो और जो पैसा जल्दी चाहिए उसे निवेश मत करो।',
  },
  {
    match: /compound|interest|grow|ब्याज|चक्रवृद्धि/i,
    en: 'Your money earns a little, then that little earns a little too, like a seed that grows a plant that drops more seeds. Real returns change and are never promised.',
    hi: 'तुम्हारा पैसा थोड़ा कमाता है, फिर वह थोड़ा भी कमाने लगता है, जैसे बीज से पौधा और पौधे से और बीज। असली मुनाफ़ा बदलता रहता है और कभी पक्का नहीं होता।',
  },
  {
    match: /budget|plan|बजट|योजना/i,
    en: 'A budget is a plan for your money before you spend it. Your four jars are a tiny budget: you decide where each rupee goes, then check if the plan still fits your life.',
    hi: 'बजट खर्च करने से पहले पैसे की योजना है। तुम्हारे चार जार एक छोटा बजट हैं: तुम तय करते हो हर रुपया कहाँ जाएगा, फिर देखते हो कि योजना अब भी ठीक है या नहीं।',
  },
  {
    match: /give|donat|charity|दान|देना/i,
    en: 'Giving is a choice, never a rule. Look after your own needs and goals first. Giving your time can matter as much as giving money.',
    hi: 'देना तुम्हारी मर्ज़ी है, कोई नियम नहीं। पहले अपनी ज़रूरतों और लक्ष्यों का ध्यान रखो। अपना समय देना भी पैसे देने जितना कीमती हो सकता है।',
  },
  {
    match: /save|saving|goal|buy|afford|बचत|बचा|लक्ष्य|खरीद/i,
    en: 'Saving buys your future self more choices. Put a small, fixed amount in your Save jar each time you earn, and your goal gets closer every week. You still decide what to enjoy today.',
    hi: 'बचत भविष्य के तुम्हारे लिए ज़्यादा विकल्प खरीदती है। हर बार कमाने पर थोड़ी तय रकम Save जार में डालो, तो लक्ष्य हर हफ़्ते पास आएगा। आज क्या मज़े करने हैं, यह भी तुम ही तय करते हो।',
  },
];

const offline = {
  en: 'I can’t reach my thinking cap right now, so here’s a tip instead: try the suggested questions below, or ask a mentor at your NGO. I’ll be back soon.',
  hi: 'अभी मैं ठीक से सोच नहीं पा रहा, इसलिए एक सुझाव: नीचे दिए सवाल आज़माओ या अपने NGO के मेंटर से पूछो। मैं जल्दी लौटूँगा।',
};

export function preparedAnswer(question: string, language: Language): string {
  const topic = topics.find((item) => item.match.test(question));
  return topic ? topic[language] : offline[language];
}

// Follow-up ideas shown under each reply.
const followUps: Record<Language, string[]> = {
  en: [
    'How can I save faster for my goal?',
    'Is it okay to spend some now?',
    'What is compound interest?',
    'How do I spot a money scam?',
    'What is a budget?',
  ],
  hi: [
    'मैं अपने लक्ष्य के लिए जल्दी कैसे बचाऊँ?',
    'क्या अभी थोड़ा खर्च करना ठीक है?',
    'चक्रवृद्धि ब्याज क्या है?',
    'पैसों का धोखा कैसे पहचानूँ?',
    'बजट क्या होता है?',
  ],
};

export function suggestionsFor(language: Language, alreadyAsked: string[]): string[] {
  const asked = new Set(alreadyAsked.map((text) => text.trim().toLowerCase()));
  return followUps[language].filter((text) => !asked.has(text.toLowerCase())).slice(0, 3);
}
