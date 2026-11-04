// PARKED (not used by the site yet): the user chose to skip the voiceover for now. Clips made
// so far are in qa/voice-parked/. To bring it back, wire audio playback into Tour.jsx.
//
// Makes the tour's narration: one MP3 per tour step per language, spoken by a Gemini voice.
//
// Run from the project root:
//   npm run make:voice                       makes any missing clips, both languages
//   npm run make:voice -- --lang=hi          only Hindi
//   npm run make:voice -- --force            remakes clips even if they exist
//
// The free Gemini key allows about 10 voice clips per model per day. When that runs out the
// script stops politely; run it again the next day and it carries on where it left off.
//
// Needs GEMINI_API_KEY in server/.env. Output:
//   client/public/voice/<en|hi>/<step id>.mp3   the audio the tour plays
//   client/src/lib/tour-voice.json              which model/voice made them and how long each is
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { Mp3Encoder } from '@breezystack/lamejs';
import { tourSteps } from '../../client/src/lib/tour.js';
import { loadConfig } from '../src/config.js';

const MODEL = 'gemini-3.1-flash-tts-preview'; // picked by ear: natural pace, warm tone
const VOICE = 'Achird'; // picked by ear from four voices
const BITRATE = 64; // kbps: clear speech, small files

// How each language should sound. The voice reads only the words after the colon.
const style = {
  en: 'Read this warmly and gently, like a kind older sister guiding a child, with a soft Indian English accent, at a friendly, natural conversational pace:',
  hi: 'Read this warmly and gently in natural, simple Hindi, like a kind older sister (didi) guiding a child, at a friendly, natural conversational pace:',
};

const root = new URL('../../client/', import.meta.url);
const voiceDir = (lang: string) => new URL(`public/voice/${lang}/`, root);
const manifestFile = new URL('src/lib/tour-voice.json', root);
const force = process.argv.includes('--force');
const onlyLang = process.argv.find((arg) => arg.startsWith('--lang='))?.split('=')[1];
const languages = (['en', 'hi'] as const).filter((lang) => !onlyLang || lang === onlyLang);

class DailyLimitReached extends Error {}

const config = loadConfig();
if (!config.GEMINI_API_KEY) {
  console.error('No GEMINI_API_KEY in server/.env, so no voice can be made.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

// Gemini returns 16-bit mono PCM, sometimes wrapped in a WAV header. Returns samples + rate.
function readPcm(bytes: Buffer): { samples: Int16Array; rate: number } {
  let rate = 24000;
  let data = bytes;
  if (bytes.subarray(0, 4).toString() === 'RIFF') {
    rate = bytes.readUInt32LE(24);
    const at = bytes.indexOf('data', 12);
    data = bytes.subarray(at + 8, at + 8 + bytes.readUInt32LE(at + 4));
  }
  const samples = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.length / 2));
  return { samples: Int16Array.from(samples), rate };
}

// MP3 encoders work in frames of 1152 samples.
function toMp3(samples: Int16Array, rate: number): Buffer {
  const encoder = new Mp3Encoder(1, rate, BITRATE);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (out.length) chunks.push(out);
  }
  chunks.push(encoder.flush());
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The free tier also allows only ~3 voice requests per minute, so leave a gap between clips.
const GAP_MS = 21_000;
let lastRequest = 0;

async function speak(text: string, lang: 'en' | 'hi') {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const wait = lastRequest + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ parts: [{ text: `${style[lang]} ${text}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error('no audio in the reply');
      return readPcm(Buffer.from(part.inlineData.data, 'base64'));
    } catch (error) {
      const message = (error as Error).message;
      // Retrying won't help once the day's allowance is used up.
      if (message.includes('PerDay')) throw new DailyLimitReached(message);
      // Per-minute limit: Google says how long to wait ("retryDelay":"35s").
      const retryDelay = Number(message.match(/retryDelay"?:\s*"(\d+)s/)?.[1] ?? 0);
      const pause = retryDelay ? (retryDelay + 2) * 1000 : 3000 * attempt;
      console.warn(`  attempt ${attempt} failed (${message.slice(0, 60)}…), waiting ${Math.round(pause / 1000)}s`);
      await sleep(pause);
    }
  }
  throw new Error(`Could not make ${lang} audio after 5 tries`);
}

const manifest = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, 'utf8'))
  : { durations: {} };
manifest.durations ??= {};
// Clips made by a different model or voice don't count as done: they'd sound different.
const sameMaker = manifest.model === MODEL && manifest.voice === VOICE;
if (!sameMaker) manifest.durations = {};
manifest.model = MODEL;
manifest.voice = VOICE;

let made = 0;
try {
  for (const lang of languages) {
    mkdirSync(voiceDir(lang), { recursive: true });
    for (const step of tourSteps) {
      const file = new URL(`${step.id}.mp3`, voiceDir(lang));
      const known = manifest.durations[step.id]?.[lang];
      if (!force && existsSync(file) && known) {
        console.log(`skip  ${lang}/${step.id}.mp3 (${known}s)`);
        continue;
      }
      const { title, text } = step[lang];
      const { samples, rate } = await speak(`${title} ${text}`, lang);
      const mp3 = toMp3(samples, rate);
      writeFileSync(file, mp3);
      const seconds = Math.round((samples.length / rate) * 10) / 10;
      manifest.durations[step.id] = { ...manifest.durations[step.id], [lang]: seconds };
      writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`); // save as we go
      made++;
      console.log(`made  ${lang}/${step.id}.mp3  ${seconds}s  ${Math.round(mp3.length / 1024)}KB`);
    }
  }
  console.log(`\nDone: ${made} clip(s) made.`);
} catch (error) {
  if (!(error instanceof DailyLimitReached)) throw error;
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nToday's free voice allowance for ${MODEL} is used up after ${made} new clip(s).`);
  console.log('Run `npm run make:voice` again tomorrow; it continues where it left off.');
  console.log('Until then the tour shows captions for any step that has no audio yet.');
}
