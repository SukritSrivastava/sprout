// ✏️ EDIT ME: Seedlings lesson words, including Hindi. Choice ids match the server's lesson rules.
export const seedlings = {
  en: {
    back: 'All features', tag: 'Ages 8–11 · learning with pictures', title: 'Little lessons. A growing garden.',
    intro: 'Learn what we need, practise waiting, and find a little room to share. Every finished lesson plants one seed.',
    note: 'Sample demo · One shared sample garden saved on the demo server. Seeds are learning rewards, with no cash value. No names or accounts are collected.',
    language: 'Lesson language', garden: 'Our sample garden', seedCount: (n) => `${n} of 3 seeds planted`,
    gardenHint: 'One lesson, one seed. Practise again any time; your saved seeds stay the same.',
    empty: 'Your first seed starts with one little lesson.', growing: 'Look what you’re growing!',
    allDone: 'All three seeds planted! You can still practise every lesson.', lessons: 'Choose a lesson',
    complete: 'Seed planted', ready: 'Ready to try', loading: 'Opening your saved garden…', refresh: 'Refresh garden',
    retry: 'Try again', save: 'Check answers & plant a seed', saving: 'Checking & saving…', practise: 'Check my practice',
    missing: 'Choose an answer for every picture first.', incorrect: 'Try the highlighted pictures again. You can change any answer.',
    wrong: 'Try this picture again.', saved: 'One seed planted! Your garden is saved.', repeated: 'Great practice! This lesson’s seed is already in your garden.',
    unavailable: 'We couldn’t load your saved garden. Check the connection and try again.',
    saveFailed: 'We couldn’t confirm the save. Keep your answers and try again; a lesson can only earn one seed.',
    slow: 'Too many requests. Wait a little, then try again.',
    read: 'Read this lesson to me', stop: 'Stop reading', speechUnavailable: 'Read-aloud isn’t available on this device. You can still use every lesson.',
    speechFailed: 'Read-aloud couldn’t start. Try again, or read the pictures together.', lessonCount: (n) => `Lesson ${n} of 3`,
    lessonList: [
      { id: 'needs', title: 'Need or want?', intro: 'Needs help us stay well and learn. Wants can be fun, after our needs are covered.',
        questions: [['food', 'Food'], ['book', 'School book'], ['bus', 'Bus ticket to school'], ['shirt', 'Clothes to wear'], ['game', 'A new video game'], ['candy', 'Sweets']]
          .map(([icon, label]) => ({ icon, label, prompt: 'Is this a need or a want?', choices: [['need', 'Need'], ['want', 'Want']] })) },
      { id: 'waiting', title: 'A little patience', intro: 'You don’t need to buy everything today. Small steps can help you reach something you want.',
        questions: [
          { icon: 'bike', label: 'A bicycle to save for', prompt: 'Your needs are covered. What could help you get a bicycle later?', choices: [['save', 'Save a little at a time'], ['spend', 'Spend all my savings today']] },
          { icon: 'clock', label: 'Time to think', prompt: 'You see a toy you want. What can you do before deciding?', choices: [['rush', 'Buy it straight away'], ['wait', 'Wait and think about it']] },
        ] },
      { id: 'sharing', title: 'A little kindness', intro: 'Sharing is a choice. Start with what you can spare, and ask a trusted grown-up for help.',
        questions: [
          { icon: 'adult', label: 'A trusted grown-up', prompt: 'Someone asks you for money online. What should you do first?', choices: [['send', 'Send it right away'], ['ask', 'Ask a trusted grown-up']] },
          { icon: 'books', label: 'Books to share', prompt: 'You have a spare book and want to help. What could you do?', choices: [['share', 'Offer it to a reading group'], ['keep', 'Take someone else’s book']] },
        ] },
    ],
  },
  hi: {
    back: 'सभी सुविधाएँ', tag: 'उम्र 8–11 · तस्वीरों से सीखें', title: 'छोटे सबक। बढ़ता बगीचा।',
    intro: 'ज़रूरतें पहचानें, इंतज़ार करना सीखें और बाँटने की खुशी पाएँ। हर पूरा सबक एक बीज लगाता है।',
    note: 'नमूना डेमो · डेमो सर्वर पर सहेजा गया एक साझा नमूना बगीचा। बीज सीखने के इनाम हैं, पैसे नहीं। कोई नाम या खाता नहीं लिया जाता।',
    language: 'सबक की भाषा', garden: 'हमारा नमूना बगीचा', seedCount: (n) => `3 में से ${n} बीज लगाए`,
    gardenHint: 'एक सबक, एक बीज। दोबारा अभ्यास करें; वही बीज फिर नहीं मिलेगा।', empty: 'एक छोटा सबक पूरा करें और पहला बीज लगाएँ।', growing: 'देखो, तुम्हारा बगीचा बढ़ रहा है!',
    allDone: 'तीनों बीज लग गए! हर सबक का अभ्यास फिर कर सकते हैं।', lessons: 'सबक चुनें', complete: 'बीज लग गया', ready: 'शुरू करें',
    loading: 'सहेजा हुआ बगीचा खुल रहा है…', refresh: 'बगीचा फिर देखें', retry: 'फिर कोशिश करें', save: 'जवाब जाँचें और बीज लगाएँ', saving: 'जाँचकर सहेज रहे हैं…', practise: 'मेरा अभ्यास जाँचें',
    missing: 'पहले हर तस्वीर का जवाब चुनें।', incorrect: 'दिखाई गई तस्वीरों पर फिर सोचें। जवाब बदल सकते हैं।', wrong: 'इस तस्वीर पर फिर सोचें।',
    saved: 'एक बीज लग गया! बगीचा सहेज लिया गया है।', repeated: 'अच्छा अभ्यास! इस सबक का बीज पहले से बगीचे में है।',
    unavailable: 'सहेजा हुआ बगीचा नहीं खुला। कनेक्शन जाँचें और फिर कोशिश करें।', saveFailed: 'सहेजने की पुष्टि नहीं हुई। जवाब रहने दें और फिर कोशिश करें; हर सबक का एक ही बीज मिलेगा।', slow: 'बहुत सारे अनुरोध आए हैं। थोड़ा रुककर फिर कोशिश करें।',
    read: 'यह सबक सुनाएँ', stop: 'पढ़ना रोकें', speechUnavailable: 'इस डिवाइस पर सुनाने की सुविधा नहीं है। सभी सबक फिर भी कर सकते हैं।', speechFailed: 'सुनाना शुरू नहीं हुआ। फिर कोशिश करें या तस्वीरों को साथ में पढ़ें।', lessonCount: (n) => `3 में से सबक ${n}`,
    lessonList: [
      { id: 'needs', title: 'ज़रूरत या चाहत?', intro: 'ज़रूरतें हमें स्वस्थ रहने और सीखने में मदद करती हैं। ज़रूरतों के बाद चाहतों के लिए भी जगह है।',
        questions: [['food', 'भोजन'], ['book', 'स्कूल की किताब'], ['bus', 'स्कूल जाने का बस टिकट'], ['shirt', 'पहनने के कपड़े'], ['game', 'नया वीडियो गेम'], ['candy', 'मिठाई']]
          .map(([icon, label]) => ({ icon, label, prompt: 'यह ज़रूरत है या चाहत?', choices: [['need', 'ज़रूरत'], ['want', 'चाहत']] })) },
      { id: 'waiting', title: 'थोड़ा सा इंतज़ार', intro: 'हर चीज़ आज ही खरीदना ज़रूरी नहीं। छोटे कदम तुम्हें अपनी चाहत तक पहुँचा सकते हैं।',
        questions: [
          { icon: 'bike', label: 'साइकिल के लिए बचत', prompt: 'ज़रूरतें पूरी हैं। बाद में साइकिल लेने के लिए क्या कर सकते हो?', choices: [['save', 'थोड़ा-थोड़ा बचाएँ'], ['spend', 'सारी बचत आज खर्च करें']] },
          { icon: 'clock', label: 'सोचने का समय', prompt: 'एक खिलौना पसंद आया। फैसला करने से पहले क्या कर सकते हो?', choices: [['rush', 'तुरंत खरीद लें'], ['wait', 'रुककर सोचें']] },
        ] },
      { id: 'sharing', title: 'थोड़ी सी भलाई', intro: 'बाँटना तुम्हारी पसंद है। जो दे सकते हो, उससे शुरू करो और किसी भरोसेमंद बड़े की मदद लो।',
        questions: [
          { icon: 'adult', label: 'भरोसेमंद बड़ा', prompt: 'कोई ऑनलाइन पैसे माँगे तो पहले क्या करना चाहिए?', choices: [['send', 'तुरंत भेज दें'], ['ask', 'भरोसेमंद बड़े से पूछें']] },
          { icon: 'books', label: 'बाँटने के लिए किताबें', prompt: 'एक अतिरिक्त किताब है और मदद करना चाहते हो। क्या कर सकते हो?', choices: [['share', 'पढ़ने वाले समूह को दें'], ['keep', 'किसी और की किताब ले लें']] },
        ] },
    ],
  },
};
