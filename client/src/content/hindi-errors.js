// ✏️ EDIT ME: Hindi for known server and connection errors. English API contracts stay unchanged.
export const errorHindi = {
  'Can’t reach the server right now. Please try again shortly.':'अभी सर्वर से जुड़ नहीं पाए। थोड़ी देर बाद फिर कोशिश करें।',
  'PayPal sandbox donations are unavailable in this demo. Please try again later.':'इस डेमो में PayPal सैंडबॉक्स दान अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें।',
  'PayPal sandbox payouts are unavailable in this demo. Please ask the demo operator for help.':'इस डेमो में PayPal सैंडबॉक्स भुगतान अभी उपलब्ध नहीं हैं। डेमो संचालक से मदद लें।',
  'PayPal sandbox authentication is unavailable. Ask the demo operator to check the sandbox settings.':'PayPal सैंडबॉक्स प्रमाणीकरण उपलब्ध नहीं है। डेमो संचालक से सैंडबॉक्स सेटिंग जाँचने को कहें।',
  'Guardian access is not configured for this demo. Ask the demo operator for help.':'इस डेमो में अभिभावक पहुँच सेट नहीं है। डेमो संचालक से मदद लें।',
  'That receipt page is unavailable. Refresh the receipt history.':'यह रसीद पृष्ठ उपलब्ध नहीं है। रसीदों की सूची फिर लोड करें।',
  'Use a receipt page size from 1 to 100 and a valid previous receipt code.':'एक बार में 1 से 100 रसीदें और पिछली रसीद का सही कोड चुनें।',
  'Use a valid chain ID and contract address for this proof.':'इस प्रमाण के लिए सही चेन ID और अनुबंध पता दें।',
  'The ledger publisher has not completed its one-time setup.':'लेजर प्रकाशक का शुरुआती सेटअप पूरा नहीं हुआ है।',
  'An NGO admin must unlock ledger publishing. Public viewing remains available.':'लेजर प्रकाशन NGO एडमिन को खोलना होगा। सभी लोग रसीदें देख सकते हैं।',
  'The configured test ledger is unavailable. Saved publication jobs remain recoverable.':'तय टेस्ट लेजर अभी उपलब्ध नहीं है। सहेजे प्रकाशन बाद में फिर जारी किए जा सकते हैं।',
  'This publication is being processed. Check its status shortly.':'इस प्रकाशन पर काम चल रहा है। थोड़ी देर में स्थिति फिर जाँचें।',
  'Resume the unfinished publication before starting another batch.':'नया बैच शुरू करने से पहले अधूरा प्रकाशन जारी करें।',
  'This publication is owned by another recovery. Refresh its status.':'दूसरा अनुरोध इस प्रकाशन को जारी कर रहा है। स्थिति रीफ़्रेश करें।',
  'This publication needs staff review. Its saved receipts and transaction were preserved.':'इस प्रकाशन को स्टाफ की समीक्षा चाहिए। सहेजी रसीदें और लेनदेन सुरक्षित हैं।',
  'This proof belongs to a different chain or contract.':'यह प्रमाण दूसरी चेन या अनुबंध का है।',
  'No publication job with that code.':'इस कोड का कोई सहेजा प्रकाशन नहीं मिला।',
  'No saved publication job in this environment.':'इस वातावरण में कोई सहेजा प्रकाशन नहीं है।',
  'The ledger publisher is unavailable.':'लेजर प्रकाशक अभी उपलब्ध नहीं है।',
  'No new settled PayPal receipts to publish yet.':'अभी प्रकाशन के लिए कोई नई पुष्ट PayPal रसीद नहीं है।',
  'Only the exact server sample batch can be published here.':'यहाँ केवल सर्वर का तय नमूना बैच प्रकाशित हो सकता है।',
  'The server selects its own settled receipts.':'सर्वर अपनी पुष्ट रसीदें चुनता है।',
  'This ledger supports whole currency units only. Review the saved receipts.':'यह लेजर केवल पूरी मुद्रा इकाइयाँ स्वीकार करता है। सहेजी रसीदों की समीक्षा करें।',
  'Shared records are unavailable. Try the same request again when storage is available.':
    'साझा रिकॉर्ड अभी उपलब्ध नहीं हैं। स्टोरेज उपलब्ध होने पर यही अनुरोध फिर आज़माएँ।',
  'Ledger publishing is not available in this environment yet.':
    'इस परिवेश में लेजर प्रकाशित करने की सुविधा अभी उपलब्ध नहीं है।',
  'An earlier payout has an unknown outcome. Recover that request first.':
    'पिछले भुगतान का नतीजा अभी पता नहीं है। पहले उसी अनुरोध की स्थिति जाँचें।',
  'The reward pool is too small. Make a sandbox donation first.':
    'इनाम पूल में पर्याप्त राशि नहीं है। पहले सैंडबॉक्स दान करें।',
  'This payout has already started. Recover the saved request.':
    'यह भुगतान पहले शुरू हो चुका है। सहेजे गए अनुरोध की स्थिति जाँचें।',
  'A newer recovery owns this payout. Refresh the request.':
    'इस भुगतान की नई स्थिति जाँच चल रही है। अनुरोध फिर से खोलें।',
  'This payout is too old to resend safely. Check the PayPal sandbox dashboard. Funds remain reserved.':
    'यह भुगतान सुरक्षित रूप से दोबारा भेजने के लिए बहुत पुराना है। PayPal सैंडबॉक्स डैशबोर्ड जाँचें। राशि आरक्षित रहेगी।',
  'Use a positive amount in whole cents.': 'पूरे सेंट में शून्य से अधिक राशि दें।',
  'The provider capture does not match the saved donation.':
    'भुगतान प्रदाता की पुष्टि सहेजे गए दान से मेल नहीं खाती।',
  'The capture amount does not match the saved order.':
    'पुष्टि की गई राशि सहेजे गए ऑर्डर से मेल नहीं खाती।',
  'The learning progress could not be saved. Nothing was awarded. Please try again once storage is available.':
    'सीखने की प्रगति नहीं सहेज पाए। कोई इनाम नहीं दिया गया। स्टोरेज उपलब्ध होने पर फिर कोशिश करें।',
  'Payment records could not be saved. Restore disk access and retry this request; do not create another payment.':
    'भुगतान रिकॉर्ड नहीं सहेज पाए। डिस्क की पहुँच ठीक करके यही अनुरोध फिर आज़माएँ; नया भुगतान न बनाएँ।',
  'The donor hasn’t approved this payment in PayPal yet.':
    'दाता ने अभी PayPal में भुगतान मंज़ूर नहीं किया है।',
  'The NGO’s PayPal sandbox account doesn’t have enough test money for this payout.':
    'NGO के PayPal सैंडबॉक्स खाते में इस भुगतान के लिए पर्याप्त परीक्षण पैसे नहीं हैं।',
  'This PayPal sandbox app isn’t allowed to send Payouts. Turn on Payouts for the app in the PayPal developer dashboard.':
    'इस सैंडबॉक्स ऐप में Payouts की अनुमति नहीं है। PayPal डेवलपर डैशबोर्ड में ऐप के लिए Payouts चालू करें।',
  'Payouts aren’t switched on for this PayPal sandbox app. In developer.paypal.com → Apps & Credentials → your app → Features, tick Payouts and save.':
    'इस PayPal सैंडबॉक्स ऐप में Payouts बंद है। developer.paypal.com पर Apps & Credentials → अपना ऐप → Features में Payouts चुनकर सहेजें।',
  'PayPal rejected the sandbox keys. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.':
    'PayPal ने सैंडबॉक्स कुंजियाँ स्वीकार नहीं कीं। server/.env में PAYPAL_CLIENT_ID और PAYPAL_CLIENT_SECRET जाँचें।',
  'A guardian must record demo permission before learning or AI chat.':
    'सीखने या AI बातचीत से पहले अभिभावक को डेमो अनुमति दर्ज करनी होगी।',
  'Permission changed. Check guardian permission again before continuing.':
    'अनुमति बदल गई। जारी रखने से पहले अभिभावक की अनुमति फिर जाँचें।',
  'The server returned an invalid response. Please try again.':
    'सर्वर से सही जवाब नहीं मिला। फिर कोशिश करें।',
  'Something went wrong.': 'कुछ गड़बड़ हुई। फिर कोशिश करें।',
  'Can’t reach the server. Is `npm run dev` running?':
    'सर्वर से जुड़ नहीं पाए। जाँचें कि `npm run dev` चल रहा है।',
  'Can’t reach the mentor right now.': 'अभी मेंटर से जुड़ नहीं पाए।',
  'The mentor is unavailable.': 'मेंटर अभी उपलब्ध नहीं है।',
  'The mentor sent a broken answer.': 'मेंटर का जवाब ठीक से नहीं मिला।',
  'The connection to the mentor dropped.': 'मेंटर का कनेक्शन टूट गया।',
  'The answer was cut short.': 'जवाब बीच में कट गया।',
  'PayPal’s button took too long to load. Please try again.':
    'PayPal बटन खुलने में बहुत देर हुई। फिर कोशिश करें।',
  'PayPal’s button didn’t start. Please try again.': 'PayPal बटन शुरू नहीं हुआ। फिर कोशिश करें।',
  'PayPal’s button couldn’t load. Check your internet connection.':
    'PayPal बटन नहीं खुला। इंटरनेट कनेक्शन जाँचें।',
  'We couldn’t check guardian permission. Check the connection and try again.':
    'अभिभावक की अनुमति नहीं जाँच पाए। कनेक्शन जाँचकर फिर कोशिश करें।',
  'Wait a little before checking permission again.': 'अनुमति फिर जाँचने से पहले थोड़ा रुकें।',
  'Choose a known sample learner.': 'सूची से नमूना विद्यार्थी चुनें।',
  'Wait before trying permission again.': 'अनुमति की फिर कोशिश से पहले रुकें।',
  'Choose a sample learner and a permission action.': 'नमूना विद्यार्थी और अनुमति का काम चुनें।',
  'Set up the guardian PIN on this computer, then restart the API.':
    'इस कंप्यूटर पर अभिभावक PIN सेट करें, फिर API दोबारा चलाएँ।',
  'Too many incorrect guardian PINs. Try again later.':
    'कई बार गलत अभिभावक PIN दिया गया। बाद में कोशिश करें।',
  'That guardian PIN is not correct.': 'अभिभावक का PIN सही नहीं है।',
  'Read and accept the current demo permission statements first.':
    'पहले मौजूदा डेमो अनुमति के कथन पढ़कर स्वीकार करें।',
  'Type the sample learner code to confirm deletion.':
    'मिटाने की पुष्टि के लिए नमूना विद्यार्थी का कोड लिखें।',
  'Permission changed in another tab. Refresh before making this decision.':
    'दूसरे टैब में अनुमति बदली है। फैसला करने से पहले फिर देखें।',
  'The local blockchain isn’t running. Start everything with `npm run dev`.':
    'स्थानीय ब्लॉकचेन नहीं चल रही। `npm run dev` से शुरू करें।',
  'Too many ledger checks. Try again shortly.':
    'बहीखाता कई बार जाँचा गया। थोड़ी देर में कोशिश करें।',
  'Bad batch number': 'बैच नंबर सही नहीं है',
  'Invalid request': 'अनुरोध सही नहीं है',
  'Only the sample batch can be published here.': 'यहाँ केवल नमूना बैच दर्ज कर सकते हैं।',
  'That batch number already holds different receipts. Restart `npm run dev` for a fresh local chain.':
    'इस बैच नंबर में दूसरी रसीदें हैं। नई स्थानीय चेन के लिए `npm run dev` फिर चलाएँ।',
  'No new PayPal receipts to publish yet.': 'दर्ज करने के लिए नई PayPal रसीदें नहीं हैं।',
  'The blockchain returned a different batch. No receipts were marked published.':
    'ब्लॉकचेन से अलग बैच मिला। किसी रसीद को दर्ज नहीं माना गया।',
  'Lots of people are asking right now. Try again in a little while.':
    'अभी बहुत लोग सवाल पूछ रहे हैं। थोड़ी देर में कोशिश करें।',
  'Too many workspace requests. Try again shortly.':
    'कार्यस्थल पर बहुत अनुरोध आए हैं। थोड़ी देर में कोशिश करें।',
  'Unlock the workspace with your PIN to continue.': 'जारी रखने के लिए PIN से कार्यस्थल खोलें।',
  'Wait a little before trying another PIN.': 'दूसरा PIN आज़माने से पहले थोड़ा रुकें।',
  'Choose a staff role and enter your PIN.': 'स्टाफ की भूमिका चुनें और PIN भरें।',
  'Staff access has not been set up on this computer.':
    'इस कंप्यूटर पर स्टाफ की पहुँच सेट नहीं है।',
  'Too many wrong PINs for this adult. Try again later.':
    'इस बड़े का PIN कई बार गलत दिया गया। बाद में कोशिश करें।',
  'That PIN is not right for this staff role.': 'इस स्टाफ भूमिका के लिए PIN सही नहीं है।',
  'Too many open workspaces. Try again later.': 'बहुत से कार्यस्थल खुले हैं। बाद में कोशिश करें।',
  'Choose approve or send back for this activity.':
    'इस गतिविधि के लिए मंज़ूरी या वापस भेजना चुनें।',
  'This sample learner needs guardian permission before a learning review.':
    'इस विद्यार्थी की समीक्षा से पहले अभिभावक की अनुमति चाहिए।',
  'That activity was not found.': 'वह गतिविधि नहीं मिली।',
  'This activity already has a different saved decision. Refresh the queue.':
    'इस गतिविधि का अलग फैसला पहले से सहेजा है। कतार फिर देखें।',
  'Too many lesson requests. Wait a little and try again.':
    'सबक के बहुत अनुरोध आए हैं। रुककर फिर कोशिश करें।',
  'Choose an answer for each picture in a known lesson.':
    'सूची के सबक में हर तस्वीर का जवाब चुनें।',
  'Answer every picture before planting a seed.': 'बीज लगाने से पहले हर तस्वीर का जवाब दें।',
  'Try the highlighted pictures again.': 'दिखाई गई तस्वीरों पर फिर कोशिश करें।',
  'PayPal sandbox keys aren’t set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to server/.env (see README).':
    'PayPal सैंडबॉक्स कुंजियाँ सेट नहीं हैं। README के अनुसार server/.env में PAYPAL_CLIENT_ID और PAYPAL_CLIENT_SECRET जोड़ें।',
  'Payouts are switched off. Add PAYOUT_PIN_MENTOR, PAYOUT_PIN_ADMIN, PAYOUT_PIN_GUARDIAN and GUARDIAN_PAYPAL_EMAIL to server/.env (see README).':
    'भुगतान बंद हैं। README के अनुसार server/.env में तीनों बड़ों के PIN और तय अभिभावक ईमेल सेट करें।',
  'Too many unfinished donations right now. Try again later.':
    'अभी बहुत दान अधूरे हैं। बाद में कोशिश करें।',
  'That isn’t a PayPal order id.': 'यह PayPal ऑर्डर पहचान सही नहीं है।',
  'This server didn’t create that PayPal order.': 'यह PayPal ऑर्डर इस सर्वर ने नहीं बनाया।',
  'This payment is already being confirmed. Wait a moment and check again.':
    'इस भुगतान की पुष्टि पहले से चल रही है। रुककर फिर जाँचें।',
  'Choose an adult and type their PIN.': 'किसी बड़े को चुनें और उनका PIN दें।',
  'No payout request with that id.': 'इस पहचान का भुगतान अनुरोध नहीं मिला।',
  'This request has already been paid out.': 'इस अनुरोध का भुगतान हो चुका है।',
  'Only an adult who approved this request can send it.':
    'इस अनुरोध को मंज़ूरी देने वाला बड़ा ही इसे भेज सकता है।',
  'Two different adults must approve a payout.': 'भुगतान को दो अलग बड़ों की मंज़ूरी चाहिए।',
  'This payout is already being sent.': 'यह भुगतान पहले से भेजा जा रहा है।',
  'This payout is too old to resend safely. Check it in the PayPal sandbox dashboard. Funds remain reserved.':
    'यह भुगतान दोबारा भेजने के लिए बहुत पुराना है। PayPal सैंडबॉक्स डैशबोर्ड में जाँचें। पैसे आरक्षित हैं।',
  'PayPal didn’t confirm this payout, so the money stays reserved. Press Send again to check with PayPal; it won’t pay twice.':
    'PayPal ने भुगतान की पुष्टि नहीं की, इसलिए पैसे आरक्षित हैं। फिर भेजकर स्थिति जाँचें; दोहरा भुगतान नहीं होगा।',
  'No payout with that id on this server.': 'इस सर्वर पर इस पहचान का भुगतान नहीं है।',
  'That PIN is not right for this adult.': 'इस बड़े का PIN सही नहीं है।',
  'Learning records could not be saved. Try again shortly.':
    'सीखने के रिकॉर्ड नहीं सहेज पाए। थोड़ी देर में कोशिश करें।',
  'Guardian permission is required before learning.': 'सीखने से पहले अभिभावक की अनुमति चाहिए।',
  'Learning permission changed. Refresh and try again.':
    'सीखने की अनुमति बदल गई। फिर देखकर कोशिश करें।',
  'Try again in {0} seconds.': '{0} सेकंड बाद फिर कोशिश करें।',
  "Let's take a short break. Try again in {0} seconds.":
    'थोड़ा रुकें। {0} सेकंड बाद फिर कोशिश करें।',
  'Too many wrong PINs for this adult. Try again in {0} minutes.':
    'इस बड़े का PIN कई बार गलत दिया गया। {0} मिनट बाद कोशिश करें।',
  'PayPal couldn’t do that ({0}). Try again.':
    'PayPal अनुरोध पूरा नहीं कर पाया ({0})। फिर कोशिश करें।',
  'The reward pool only has ${0}. Make a sandbox donation first.':
    'इनाम पूल में केवल ${0} हैं। पहले सैंडबॉक्स दान करें।',
};
