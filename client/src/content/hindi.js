// ✏️ EDIT ME: English copy on the left, simple Hindi on the right. Keep {0}, {1} placeholders.
// PayPal's own checkout window and user/AI-written messages retain their original language.
import { homeHindi } from './hindi-home.js';
import { demoHindi } from './hindi-demo.js';
import { learningHindi } from './hindi-learning.js';
import { paymentHindi } from './hindi-payments.js';
import { previewHindi } from './hindi-previews.js';
import { errorHindi } from './hindi-errors.js';
export const hindi = {
  'Review sample activities, save learning rewards and download reports.':
    'नमूना गतिविधियाँ जाँचें, सीखने के इनाम सहेजें और रिपोर्ट डाउनलोड करें।',
  'Explore sample guardian permission, withdrawal and learning-data deletion.':
    'नमूना अभिभावक अनुमति, अनुमति वापस लेना और सीखने का डेटा हटाना आज़माएँ।',
  'One shared tablet, learner profiles and offline lessons preview.':
    'एक साझा टैबलेट, बच्चों की प्रोफ़ाइल और ऑफलाइन सबक का पूर्वावलोकन।',
  ...homeHindi,
  ...demoHindi,
  ...learningHindi,
  ...paymentHindi,
  ...previewHindi,
  ...errorHindi,
  'Checking demo access…': 'डेमो की पहुँच जाँच रहे हैं…',
  'Set GUARDIAN_PAYPAL_EMAIL in server/.env for sandbox payouts. No PIN is needed for the demo.':
    'सैंडबॉक्स भुगतान के लिए server/.env में GUARDIAN_PAYPAL_EMAIL सेट करें। डेमो में PIN नहीं चाहिए।',
  'Step {0} of {1}': '{1} में से कदम {0}',
  approved: 'मंज़ूर',
  'activity rewards for kids, at {0} each': 'बच्चों के लिए गतिविधि इनाम, हर इनाम {0} का',
  'Type {0} to confirm deletion': 'मिटाने की पुष्टि के लिए {0} लिखें',
  'Sample permission withdrawn. Learning stays open for this demo.':
    'नमूना अनुमति वापस ली गई। डेमो में सीखना खुला रहेगा।',
  'The mentor can’t be reached, so here’s a prepared answer.':
    'मेंटर से अभी जुड़ नहीं पाए, इसलिए यह पहले से तैयार जवाब है।',
  'The answer was cut off. Ask again to get the rest.':
    'जवाब बीच में कट गया। बाकी जवाब के लिए फिर से पूछो।',
  COMPLETED: 'पूरा',
  SUCCESS: 'सफल',
  PENDING: 'इंतज़ार में',
  PROCESSING: 'प्रक्रिया में',
  UNCLAIMED: 'स्वीकार करना बाकी',
  ONHOLD: 'रुका हुआ',
  UNKNOWN: 'पुष्टि बाकी',
  REJECTED: 'अस्वीकृत',
  FAILED: 'विफल',
  RETURNED: 'वापस आया',
  BLOCKED: 'रोका गया',
  to: 'में',
  'Working · shared site language': 'चालू · पूरी वेबसाइट की साझा भाषा',
  'Choose English or Hindi for the whole website. Your choice follows you across pages and stays after a reload.':
    'पूरी वेबसाइट के लिए हिंदी या अंग्रेज़ी चुनें। आपकी पसंद हर पेज पर और दोबारा खोलने पर बनी रहती है।',
  'Lessons, navigation, forms, errors, mentor reply language and presentation captions use the same setting.':
    'सबक, मेन्यू, फ़ॉर्म, त्रुटियाँ, मेंटर के जवाब और प्रस्तुति के कैप्शन इसी भाषा में रहते हैं।',
  'PayPal’s own checkout window follows PayPal’s language settings. Existing chat messages and AI donor notes stay in the language in which they were written.':
    'PayPal की अपनी भुगतान विंडो उसकी भाषा सेटिंग मानती है। पुरानी बातचीत और AI धन्यवाद संदेश जिस भाषा में लिखे गए थे, उसी में रहते हैं।',
  'How it works': 'कैसे काम करता है',
  Mentor: 'मेंटर',
  'Coming soon': 'जल्द आ रहा है',
  Seedlings: 'नन्हे पौधे',
  'Saved learning garden': 'सीखने का सहेजा बगीचा',
  'Guardian permission': 'अभिभावक की अनुमति',
  'Working local demo': 'काम करने वाला स्थानीय डेमो',
  Donate: 'दान करें',
  Payouts: 'भुगतान',
  'PayPal sandbox': 'PayPal सैंडबॉक्स',
  'Impact ledger': 'असर का बहीखाता',
  'Test blockchain': 'परीक्षण ब्लॉकचेन',
  'NGO workspace': 'NGO कार्यस्थल',
  'Open the demo': 'डेमो खोलें',
  Home: 'मुख्य पेज',
  'Motion on': 'एनिमेशन चालू',
  'Motion off': 'एनिमेशन बंद',
  'Skip to content': 'मुख्य सामग्री पर जाएँ',
  'Main navigation': 'मुख्य नेविगेशन',
  'Open navigation': 'मेन्यू खोलें',
  'Close navigation': 'मेन्यू बंद करें',
  'Turn animations on or off': 'एनिमेशन चालू या बंद करें',
  'sprout.io home': 'sprout.io मुख्य पेज',
  'Start the guided tour': 'गाइड के साथ सैर शुरू करें',
};
