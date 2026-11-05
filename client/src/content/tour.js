// ✏️ EDIT ME: the guided tour's steps and words (English and Hindi).
// Each step: which page (`path`) and section (`id`) to show, how many `seconds` to stay, and the
// caption in both languages. Safe to change: titles, texts and seconds (keep the whole tour
// between 60 and 120 seconds). Changing `path` or `id` must match a real page section.

export const tourSteps = [
  {
    path: '/',
    id: 'home',
    seconds: 10,
    en: {
      title: 'Hi, I’m Sprout!',
      text: 'sprout.io teaches kids money skills through NGOs, whatever they start with. Kids earn a little by doing something useful, then decide where every rupee goes.',
    },
    hi: {
      title: 'नमस्ते, मैं स्प्राउट हूँ!',
      text: 'sprout.io NGO के ज़रिए बच्चों को पैसों की समझ सिखाता है। बच्चे कुछ अच्छा काम करके थोड़ा कमाते हैं, फिर खुद तय करते हैं कि हर रुपया कहाँ जाएगा।',
    },
  },
  {
    path: '/',
    id: 'how',
    seconds: 10,
    en: {
      title: 'No bank account needed',
      text: 'Do something useful at your NGO, a grown-up checks it, and the reward is yours to plan. The real money stays safe with the NGO.',
    },
    hi: {
      title: 'बैंक खाते की ज़रूरत नहीं',
      text: 'NGO में कुछ अच्छा काम करो, कोई बड़ा उसे जाँचता है, और इनाम की योजना तुम बनाते हो। असली पैसा NGO के पास सुरक्षित रहता है।',
    },
  },
  {
    path: '/app',
    id: 'earn',
    seconds: 10,
    en: {
      title: 'Earn your first ₹200',
      text: 'This is the demo, with sample money. Finish the reading-hour activity and watch your reward land in the jars.',
    },
    hi: {
      title: 'अपने पहले ₹200 कमाओ',
      text: 'यह डेमो है, नमूने के पैसों के साथ। पढ़ाने वाली गतिविधि पूरी करो और देखो इनाम जार में कैसे आता है।',
    },
  },
  {
    path: '/app',
    id: 'jars',
    seconds: 10,
    en: {
      title: 'Four jars, your way',
      text: 'Save, Spend, Give and Invest. Move the slider and every rupee stays accounted for. Giving is always your choice.',
    },
    hi: {
      title: 'चार जार, तुम्हारी मर्ज़ी',
      text: 'बचत, खर्च, दान और निवेश। स्लाइडर हिलाओ, हर रुपये का हिसाब बना रहता है। दान करना हमेशा तुम्हारी मर्ज़ी है।',
    },
  },
  {
    path: '/app',
    id: 'grow',
    seconds: 10,
    en: {
      title: 'When can I get it?',
      text: 'Pick a goal, like a bicycle, and how much to save each month. sprout.io shows how long it could take.',
    },
    hi: {
      title: 'मैं इसे कब ले पाऊँगा?',
      text: 'कोई लक्ष्य चुनो, जैसे साइकिल, और हर महीने कितना बचाओगे। sprout.io बताता है कि कितना समय लगेगा।',
    },
  },
  {
    path: '/app',
    id: 'mentor',
    seconds: 12,
    en: {
      title: 'Ask Paisa Mentor, live',
      text: 'This part is real: a live AI that answers money questions in plain English or Hindi, and never asks for personal details.',
    },
    hi: {
      title: 'पैसा मेंटर से पूछो',
      text: 'यह हिस्सा असली है: एक लाइव AI, जो पैसों के सवालों का आसान जवाब अंग्रेज़ी या हिंदी में देता है, और कभी निजी जानकारी नहीं माँगता।',
    },
  },
  {
    path: '/soon/impact',
    id: 'preview',
    seconds: 12,
    en: {
      title: 'Every rupee leaves a receipt',
      text: 'A preview of what’s coming: donors can check any receipt themselves and see that records were never changed, without seeing any kid’s details.',
    },
    hi: {
      title: 'हर रुपये की रसीद',
      text: 'आने वाले फ़ीचर की झलक: दान देने वाले कोई भी रसीद खुद जाँच सकेंगे कि रिकॉर्ड कभी बदला नहीं गया, किसी बच्चे की जानकारी देखे बिना।',
    },
  },
  {
    path: '/soon',
    id: 'soon-hub',
    seconds: 10,
    en: {
      title: 'Real PayPal, and more coming',
      text: 'PayPal donations and payouts to guardians really work here, on the PayPal sandbox with test money. A mode for younger kids and more are coming. Thanks for growing with us!',
    },
    hi: {
      title: 'असली PayPal, और बहुत कुछ आ रहा है',
      text: 'PayPal से दान और अभिभावकों को भुगतान यहाँ सच में चलते हैं, PayPal सैंडबॉक्स पर टेस्ट पैसों से। छोटे बच्चों का मोड और बहुत कुछ जल्द आ रहा है। साथ बढ़ने के लिए शुक्रिया!',
    },
  },
];

// Shown when the tour finishes.
export const tourDone = {
  en: { title: 'That’s sprout.io!', text: 'Explore at your own pace, or play the tour again.' },
  hi: { title: 'यह था sprout.io!', text: 'अपनी रफ़्तार से देखो, या टूर फिर से चलाओ।' },
};

// The caption language switch in the tour panel.
export const tourLanguages = { en: 'English', hi: 'हिंदी' };
