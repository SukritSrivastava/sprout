// The AI part of a donation: after PayPal confirms the payment, Gemini writes the donor a short
// thank-you that explains what their money funds. It only sees facts the server checked
// (the amount PayPal captured and how many activity rewards that pays for), never who the
// donor is. Without a Gemini key, or if Gemini fails, a plain prepared note is used instead.
import type { MentorModel } from '../mentor/model.js';
import { paypalSettings } from './settings.js';

export type ImpactNote = { text: string; source: 'ai' | 'prepared' };

const NOTE_RULES = [
  'You write a thank-you note to someone who just donated to a children’s money-skills program.',
  'Write 2 or 3 warm, plain sentences, at most 60 words. No greeting line, no sign-off, no emojis.',
  'Use only the facts given. Do not invent kids, names, stories, places or numbers.',
  'Say what the money funds: activity rewards that kids earn by finishing money lessons, paid into savings jars that mentors check.',
  'Do not promise tax benefits or anything about the donor’s money beyond these facts.',
].join('\n');

export function preparedNote(dollars: number): ImpactNote {
  const rewards = Math.floor(dollars / paypalSettings.rewardDollars);
  return {
    source: 'prepared',
    text:
      `Thank you! Your $${dollars} pays for ${rewards} activity reward${rewards === 1 ? '' : 's'}: ` +
      `each one goes to a kid who finished a money lesson, straight into their savings jars, ` +
      `after a mentor checks it.`,
  };
}

export async function writeImpactNote(model: MentorModel | null, dollars: number): Promise<ImpactNote> {
  if (!model) return preparedNote(dollars);
  const rewards = Math.floor(dollars / paypalSettings.rewardDollars);
  const facts =
    `Donation: $${dollars} (PayPal sandbox, confirmed). NGO: ${paypalSettings.ngoName}. ` +
    `One activity reward is $${paypalSettings.rewardDollars}, so this funds ${rewards} activity rewards.`;
  try {
    let text = '';
    for await (const piece of model.stream({
      system: NOTE_RULES,
      turns: [{ role: 'user', text: facts }],
      signal: AbortSignal.timeout(10_000),
    })) {
      text += piece;
    }
    text = text.trim();
    return text ? { text: text.slice(0, 600), source: 'ai' } : preparedNote(dollars);
  } catch {
    return preparedNote(dollars);
  }
}
