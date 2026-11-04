// Spots messages about risky topics (scams, debt, family trouble, bullying, self-harm).
// A flagged chat shows a "Talk to a trusted adult" card and the prompt tells the AI to be extra careful.
// This is a simple word list, not a guarantee: it adds a safety net on top of the AI's own rules.
const patterns: RegExp[] = [
  // English
  /\bscam|fraud|otp\b|password|pin number|lottery|prize money|double (my|your) money|guaranteed return/i,
  /\bloan|debt|borrow|owe\b|lend me|interest on (a )?loan/i,
  /\bstole|steal|took my (money|savings)|snatch/i,
  /\bbull(y|ied|ying)|threat|blackmail|hit me|beat(s|ing)? me|hurts? me|abuse/i,
  /\bkill myself|suicide|self[- ]?harm|hurt myself|want to die|end my life/i,
  // Hindi
  /धोखा|ठगी|फ्रॉड|ओटीपी|पासवर्ड|लॉटरी/,
  /कर्ज|क़र्ज़|उधार/,
  /चोरी|चुरा/,
  /मारते|मारता|मारती|धमकी|परेशान करते/,
  /आत्महत्या|मरना चाहता|मरना चाहती|खुद को चोट/,
];

export function isSensitive(text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}
