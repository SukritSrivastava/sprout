// The website's copy of the sensitive-topic words in server/src/features/mentor/safety.ts.
// Used when the server can't be reached, so a kid who mentions a scam, bullying or self-harm still
// sees the "talk to a trusted adult" card straight away. ✏️ Change the server file, then copy the
// list here: a server test fails if the two lists differ.
export const patterns = [
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

export function isSensitive(text) {
  return patterns.some((pattern) => pattern.test(text));
}
