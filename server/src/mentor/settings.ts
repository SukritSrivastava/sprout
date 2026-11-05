// ✏️ EDIT ME: the mentor's numbers in one place. Safe to change the values on the right.
// (The model can also be set without touching code: GEMINI_MODEL in server/.env wins over this.
// The shared hourly limit for everyone is MENTOR_HOURLY_LIMIT in server/.env.)

export const mentorSettings = {
  // Which Gemini model answers, if server/.env doesn't say.
  defaultModel: 'gemini-3.5-flash-lite',

  // 0 = always the same, safe wording; 1 = more varied and playful.
  temperature: 0.5,

  // Longest reply, in "tokens" (about ¾ of a word each). 400 ≈ 300 words, plenty for 110.
  maxReplyTokens: 400,

  // Give up on the AI after this many seconds and use a backup answer instead.
  timeoutSeconds: 15,

  // Longest question a kid can type, in characters (the website uses the same number).
  maxQuestionLength: 600,

  // How many earlier messages are sent with each question, so the mentor remembers the chat.
  maxMessages: 12,

  // Questions allowed from one device in a short time, so nobody can flood it.
  perDevice: { questions: 20, minutes: 5 },
};
