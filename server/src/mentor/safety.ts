// ✏️ EDIT ME: words that mark a message as a sensitive topic (scams, debt, theft, bullying,
// self-harm), in English, Hinglish and Hindi. A flagged chat shows a "Talk to a trusted adult"
// card, and the AI gets the extra careful instruction from prompt.ts (SENSITIVE_TOPIC_RULE).
// To add words: add them inside a line's (...) separated by |, or add a new /.../ line.
// A backslash-b at the start means "start of a word"; `i` at the end means "ignore capitals".
// This is a safety net on top of the AI's own rules, not a guarantee.
const patterns: RegExp[] = [
  // English
  /\bscam|fraud|otp\b|password|pin number|lottery|prize money|double (my|your) money|guaranteed return/i,
  /\bloan|debt|borrow|owe\b|lend me|interest on (a )?loan/i,
  /\bstole|steal|took my (money|savings)|snatch/i,
  /\bbull(y|ied|ying)|threat|blackmail|hit me|beat(s|ing)? me|hurts? me|abuse/i,
  /\bkill myself|suicide|self[- ]?harm|hurt myself|want to die|end my life/i,
  // Hinglish (Hindi typed in English letters), as many kids write on phones
  /\b(dhokha|dhoka|thagi|thag|paise double|paisa double|double kar)/i,
  /\b(udhaar|udhar|karza|karz|karja|qarz)\b/i,
  /\b(chori|chura (liya|liye|li)|chheen)/i,
  /\b(maarte|marte hai|maarta|maarti|peet(te|ta|ti)|dhamki|dhamka|pareshan karte|tang karte)/i,
  /\b(mar jaun|marna chahta|marna chahti|khud ko (hurt|chot)|suicide kar)/i,
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
