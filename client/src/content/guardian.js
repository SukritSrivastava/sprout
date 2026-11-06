// ✏️ EDIT ME: guardian permission words. The policy id must match the server's policy.
export const guardian = {
  title: 'Guardian consent & safety', policy: 'demo-permission-v1',
  intro: 'A grown-up decides when a sample learner can learn and ask Paisa Mentor for help.',
  note: 'Working local demo · A PIN records a demo acknowledgement. It does not verify a real guardian’s identity or provide production legal consent.',
  statements: [
    'I am the responsible guardian for this sample learning session.',
    'I allow this sample learner to use picture lessons, learning activities and Paisa Mentor. AI can make mistakes; a trusted adult should help.',
    'I understand learning progress is saved on this computer. AI questions and recent chat history may go to Google Gemini after emails and long numbers are blanked out. Chats are not saved on the server or shown to NGO staff.',
  ],
  states: { pending: 'Permission needed', active: 'Permission recorded', withdrawn: 'Permission withdrawn', deleted: 'Learning data deleted' },
  data: 'Saved learning data includes the fixed sample code, activity decisions, learning-credit jars, lesson completions and permission dates. No child name, address or bank details are collected by this feature.',
  deletion: 'Deletion removes this sample learner’s saved activities and learning progress immediately. Open learning screens clear their temporary answers and chat when permission changes. A minimal blocked marker keeps old requests from restoring deleted progress. PayPal records and blockchain receipts are kept separately.',
  future: 'Offline queues and issued learning certificates are not implemented yet. The classroom and certificate screens are labelled previews and do not save learner records.',
};
