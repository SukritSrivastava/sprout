// ✏️ EDIT ME: the guided tour's steps and words (English and Hindi).
// Each step: which page (`path`) and section (`id`) to show, how many `seconds` to stay, and the
// caption in both languages. Safe to change: titles, texts and seconds (keep the whole tour
// between 60 and 120 seconds). Cues point within that section; only named sample actions can run.

export const tourSteps = [
  {
    path: '/',
    id: 'home',
    seconds: 8,
    cues: [{ at: 0, target: 'h1' }, { at: 3, target: '.hero-card' }],
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
    seconds: 8,
    cues: [{ at: 0, target: '.step-1 .ticket' }, { at: 3, target: '.checklist' }, { at: 5, target: '.split-bars' }],
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
    cues: [{ at: 0, target: '.activity' }, { at: 3, target: '[data-present="earn"]', action: 'sample-earn' }],
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
    cues: [{ at: 0, target: '.jar-grid' }, { at: 4, target: '#save-split', action: 'sample-save' }],
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
    cues: [{ at: 0, target: '[data-present="goal-headphones"]', action: 'sample-goal' },
      { at: 4, target: '[data-present="monthly-500"]', action: 'sample-monthly' }],
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
    cues: [{ at: 0, target: '.question-list' }, { at: 5, target: '#mentor-input' }],
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
    path: '/soon/donate', id: 'preview', seconds: 8,
    cues: [{ at: 0, target: '.preview-banner' }, { at: 3, target: '.chips' }],
    en: { title: 'Donors fund the reward pool', text: 'Donations use official PayPal Checkout on the sandbox, with test money. The presenter shows the flow; checkout stays in your hands.' },
    hi: { title: 'दान से इनाम का कोष बनता है', text: 'दान के लिए आधिकारिक PayPal चेकआउट और सैंडबॉक्स के टेस्ट पैसे हैं। यह प्रस्तुति तरीका दिखाती है; भुगतान का नियंत्रण आपके पास रहता है।' },
  },
  {
    path: '/soon/payout', id: 'preview', seconds: 8,
    cues: [{ at: 0, target: '.request-card' }, { at: 3, target: '.walk-nav' }],
    en: { title: 'Adults approve guardian payouts', text: 'Two different adults approve before a PayPal sandbox payout can go to a guardian. This presentation never enters PINs or sends a payment.' },
    hi: { title: 'बड़े अभिभावक को भुगतान मंज़ूर करते हैं', text: 'अभिभावक को PayPal सैंडबॉक्स भुगतान से पहले दो अलग बड़े मंज़ूरी देते हैं। प्रस्तुति कोई पिन नहीं भरती और भुगतान नहीं भेजती।' },
  },
  {
    path: '/soon/impact',
    id: 'preview',
    seconds: 10,
    cues: [{ at: 0, target: '.ledger-table' }, { at: 5, target: '.preview-banner' }],
    en: {
      title: 'Every rupee leaves a receipt',
      text: 'Receipts can be sealed on a working local test blockchain. Donors can check that published records were not changed, without seeing a kid’s personal details.',
    },
    hi: {
      title: 'हर रुपये की रसीद',
      text: 'रसीदें काम करने वाले स्थानीय टेस्ट ब्लॉकचेन पर दर्ज होती हैं। दान देने वाले बच्चे की निजी जानकारी देखे बिना जाँच सकते हैं कि प्रकाशित रिकॉर्ड बदला तो नहीं।',
    },
  },
  {
    path: '/soon/ngo', id: 'preview', seconds: 8,
    cues: [{ at: 0, target: '.ngo-promises' }, { at: 4, target: '.ngo-login' }],
    en: { title: 'A workspace for the grown-ups', text: 'NGO staff review sample activities, save learning credits and download reports. Access needs a staff PIN; the presentation leaves it locked.' },
    hi: { title: 'बड़ों के लिए कार्यक्षेत्र', text: 'NGO के कर्मचारी नमूना गतिविधियाँ जाँचते हैं, सीखने के क्रेडिट सहेजते हैं और रिपोर्ट लेते हैं। प्रवेश के लिए स्टाफ पिन चाहिए; प्रस्तुति इसे बंद रखती है।' },
  },
  {
    path: '/soon/seedlings', id: 'preview', seconds: 10,
    cues: [{ at: 0, target: '.seedlings-garden' }, { at: 5, target: '.seedlings-lessons' }],
    en: { title: 'Little lessons, a growing garden', text: 'Younger kids learn needs and wants, waiting and sharing. Completed lessons earn one seed each in a saved sample garden. Seeds are learning rewards, not money.' },
    hi: { title: 'छोटे सबक, बढ़ता बगीचा', text: 'छोटे बच्चे ज़रूरत, चाहत, इंतज़ार और बाँटना सीखते हैं। हर पूरा सबक नमूना बगीचे में एक बीज देता है। बीज सीखने के इनाम हैं, पैसे नहीं।' },
  },
  {
    path: '/soon',
    id: 'soon-hub',
    seconds: 6,
    cues: [{ at: 0, target: '.soon-list' }],
    en: {
      title: 'Real PayPal, and more coming',
      text: 'PayPal sandbox payments, local receipt verification, NGO reviews and Seedlings lessons work today. Full-site Hindi, classroom mode and more are still previews. Thanks for growing with us!',
    },
    hi: {
      title: 'असली PayPal, और बहुत कुछ आ रहा है',
      text: 'PayPal सैंडबॉक्स भुगतान, स्थानीय रसीद जाँच, NGO समीक्षा और छोटे बच्चों के सबक आज काम करते हैं। पूरी साइट की हिंदी और कक्षा मोड अभी झलकियाँ हैं। साथ बढ़ने के लिए शुक्रिया!',
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

// Presentation controls. No audio is generated or played by either mode.
export const tourUi = {
  en: {
    choose: 'Present sprout.io', intro: 'Choose how you want to tell the story.', silent: 'Silent demo · ready for your voice-over',
    manual: 'Present manually', manualHelp: 'You choose when to move on. Explore and click at your own pace.',
    auto: 'Present automatically', autoHelp: 'Sprout guides the cursor and plays the sample controls for you.',
    manualShort: 'Manual', autoShort: 'Automatic', pace: 'Your pace', pause: 'Pause', resume: 'Resume',
    modeLabel: 'Presentation mode', modes: 'Change mode', replay: 'Replay', done: 'Done',
    stop: 'Stop', stopLabel: 'Stop presentation', expand: 'Expand presentation controls', minimise: 'Minimise presentation controls',
    waiting: 'Opening this section…', missing: 'This section couldn’t open. Try again or use the next arrow.', retry: 'Try again',
    step: (index, total) => `Step ${index} of ${total}`,
  },
  hi: {
    choose: 'sprout.io की प्रस्तुति', intro: 'कहानी सुनाने का तरीका चुनें।', silent: 'बिना आवाज़ का डेमो · अपनी आवाज़ में समझाएँ',
    manual: 'खुद प्रस्तुत करें', manualHelp: 'आगे कब बढ़ना है, आप चुनें। अपनी रफ़्तार से देखें और क्लिक करें।',
    auto: 'अपने आप प्रस्तुत करें', autoHelp: 'स्प्राउट कर्सर चलाकर नमूना नियंत्रण दिखाएगा।',
    manualShort: 'खुद', autoShort: 'अपने आप', pace: 'आपकी रफ़्तार', pause: 'रोकें', resume: 'फिर चलाएँ',
    modeLabel: 'प्रस्तुति का तरीका', modes: 'तरीका बदलें', replay: 'फिर देखें', done: 'पूरा हुआ',
    stop: 'रोक दें', stopLabel: 'प्रस्तुति बंद करें', expand: 'प्रस्तुति के नियंत्रण दिखाएँ', minimise: 'प्रस्तुति के नियंत्रण छोटे करें',
    waiting: 'यह हिस्सा खुल रहा है…', missing: 'यह हिस्सा नहीं खुला। फिर कोशिश करें या अगले तीर का उपयोग करें।', retry: 'फिर कोशिश करें',
    step: (index, total) => `${total} में से चरण ${index}`,
  },
};
