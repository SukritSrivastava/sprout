// Blanks out personal details before a kid's message leaves our server for Google's Gemini.
// The AI's rules already tell it never to ask for or repeat these, but rules don't stop Google
// from receiving them; removing them here does. It catches common shapes, not everything:
//   emails and UPI ids (name@bank)       → [email]
//   phone, card, Aadhaar, account numbers → [number]   (7 or more digits, spaces/dashes allowed)
// Money amounts like "₹5000" or "250 rupees" have fewer digits and are kept.

export function redactPersonal(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)*/g, '[email]')
    .replace(/(?:\+?\d[\s-]?){7,}\d/g, '[number]');
}
