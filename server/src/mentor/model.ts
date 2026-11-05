// Talks to Gemini. Everything else in the server only sees the small `MentorModel` interface,
// so tests can swap in a fake model and never call Google.
import { GoogleGenAI } from '@google/genai';
import type { Config } from '../config.js';
import { mentorSettings } from './settings.js';

export type ModelTurn = { role: 'user' | 'model'; text: string };

export interface MentorModel {
  // Yields the reply a piece at a time as Gemini writes it.
  stream(input: { system: string; turns: ModelTurn[]; signal: AbortSignal }): AsyncIterable<string>;
}

export function createGeminiModel(config: Config): MentorModel | null {
  if (!config.GEMINI_API_KEY) return null; // no key → the route uses prepared answers
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const model = config.GEMINI_MODEL || mentorSettings.defaultModel;

  return {
    async *stream({ system, turns, signal }) {
      const response = await ai.models.generateContentStream({
        model,
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        config: {
          systemInstruction: system,
          temperature: mentorSettings.temperature,
          maxOutputTokens: mentorSettings.maxReplyTokens,
          abortSignal: signal,
        },
      });
      for await (const chunk of response) {
        if (chunk.text) yield chunk.text;
      }
    },
  };
}
