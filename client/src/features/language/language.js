// Translation helpers shared by React and tests. Identifiers, amounts and saved records stay intact.
import { hindi } from '../../content/hindi.js';
import { errorHindi } from '../../content/hindi-errors.js';

export const LANGUAGE_KEY = 'sprout-language';
export const normalizeCopy = (text) => text.replace(/\s+/g, ' ').trim();
export const validLanguage = (value) => value === 'hi' || value === 'en';

// Only the server's known variable error sentences need matching after a response arrives.
const variableErrors = Object.entries(errorHindi)
  .filter(([key]) => key.includes('{0}'))
  .map(([key, copy]) => ({
    pattern: new RegExp(
      `^${key
        .split('{0}')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('(.+?)')}$`,
    ),
    copy,
  }));

export function readLanguage(storage) {
  try {
    const saved = storage.getItem(LANGUAGE_KEY);
    if (validLanguage(saved)) return saved;
    // Preserve the preference of people who used the earlier bilingual lessons.
    return storage.getItem('sprout-seedlings-language') === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function translate(source, language, values = []) {
  if (typeof source !== 'string') return source;
  const key = normalizeCopy(source);
  let translated = language === 'hi' && Object.hasOwn(hindi, key) ? hindi[key] : undefined;
  if (language === 'hi' && translated === undefined) {
    for (const { pattern, copy } of variableErrors) {
      const match = normalizeCopy(source).match(pattern);
      if (match) {
        translated = copy.replace('{0}', match[1]);
        break;
      }
    }
  }
  const copy =
    translated === undefined
      ? source
      : `${source.match(/^\s*/)[0]}${translated}${source.match(/\s*$/)[0]}`;
  return copy.replace(/\{(\d+)\}/g, (token, index) =>
    values[index] === undefined ? token : String(values[index]),
  );
}

const cache = { en: new WeakMap(), hi: new WeakMap() };
export function localizeContent(value, language) {
  if (typeof value === 'string') return translate(value, language);
  if (!value || typeof value !== 'object') return value;
  if (cache[language].has(value)) return cache[language].get(value);
  const result = Array.isArray(value) ? [] : {};
  cache[language].set(value, result);
  for (const [key, item] of Object.entries(value)) {
    if (['id', 'color', 'show', 'policy', 'lang', 'from'].includes(key)) {
      result[key] = item;
      continue;
    }
    // Copy functions use their existing numbered arguments as translation placeholders.
    result[key] =
      typeof item === 'function'
        ? (...args) => translate(item(...args.map((_, index) => `{${index}}`)), language, args)
        : localizeContent(item, language);
  }
  return result;
}
