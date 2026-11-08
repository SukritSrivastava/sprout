// POST /api/mentor/chat: the Paisa Mentor chatbot. Contract: docs/mentor-api.md.
//
// The reply streams back as "NDJSON": one small JSON object per line.
//   {"type":"start","source":"ai"|"prepared","flagged":false}
//   {"type":"delta","text":"Saving buys "}        ← repeated as Gemini writes
//   {"type":"done","suggestions":["…","…"]}
// If Gemini fails before saying anything, the route quietly answers from prepared.ts instead.
import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { chatRequestSchema, type ChatRequest } from './schema.js';
import { isSensitive } from './safety.js';
import { redactPersonal } from './privacy.js';
import { buildSystemPrompt } from './prompt.js';
import { preparedAnswer, suggestionsFor } from './prepared.js';
import type { MentorModel } from './model.js';
import { memoryLimits, type LimitFactory } from '../../shared/http/rate-limit.js';
import { onlyOurWebsite } from '../../shared/http/origin.js';
import { mentorSettings } from './settings.js';
import type { LearningStore } from '../learning/store.js';
import { allowLearning } from '../learning/access.js';

type Options = {
  learning: LearningStore;
  demoOpenAccess: boolean;
  model: MentorModel | null;
  allowedOrigins: string[];
  hourlyLimit: number;
  rateLimit?: { limit: number; windowMs: number };
  timeoutMs?: number;
  limiter?: LimitFactory;
  aiBudget?: { check: (key: string) => number | Promise<number> };
};

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

// Splits a prepared answer into word-sized pieces so it streams like the AI does.
function* words(text: string) {
  for (const piece of text.match(/\S+\s*/g) ?? []) yield piece;
}

export async function mentorRoutes(app: FastifyInstance, options: Options) {
  // Two limits: one per address, and one shared by everyone to protect the Gemini quota.
  const limits = options.limiter ?? memoryLimits;
  const perAddress = limits(
    options.rateLimit ?? {
      limit: mentorSettings.perDevice.questions,
      windowMs: mentorSettings.perDevice.minutes * 60_000,
    }, 'mentor-device',
  );
  const everyone = options.aiBudget ?? limits({ limit: options.hourlyLimit, windowMs: 60 * 60_000 }, 'ai-budget');
  const timeoutMs = options.timeoutMs ?? mentorSettings.timeoutSeconds * 1000;

  // Only our own website may use the mentor from a browser (see origin.ts).
  onlyOurWebsite(app, options.allowedOrigins, ['/api/mentor/chat'], ['x-learning-revision']);

  app.post('/api/mentor/chat', async (request, reply) => {
    const tooBusy = (wait: number, message: string) => {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message });
    };
    const wait = await perAddress.check(request.ip);
    if (wait) return tooBusy(wait, `Let's take a short break. Try again in ${wait} seconds.`);
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: parsed.error.issues[0]?.message ?? 'Invalid request',
      });
    }
    if (!await allowLearning(options.learning, request, reply, options.demoOpenAccess)) return reply;

    // Malformed requests and prepared replies do not spend the shared AI budget.
    const shared = options.model ? await everyone.check('everyone') : 0;
    if (shared) {
      request.log.warn('mentor hourly limit reached');
      return tooBusy(shared, 'Lots of people are asking right now. Try again in a little while.');
    }

    const chat: ChatRequest = parsed.data;
    const question = chat.messages[chat.messages.length - 1].text;
    // Any sensitive question in the chat keeps it flagged, so a short follow-up ("what now?")
    // still gets the careful instruction and the trusted-adult card.
    const flagged = chat.messages.some((m) => m.role === 'user' && isSensitive(m.text));
    const asked = chat.messages.filter((m) => m.role === 'user').map((m) => m.text);
    const started = Date.now();

    // Stop asking Gemini if the browser goes away or it takes too long.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    const revision = Number(request.headers['x-learning-revision']);
    const permitted = async () => {
      try {
        const current = await options.learning.consent();
        return (options.demoOpenAccess || current.status === 'active') && current.revision === revision;
      } catch { return false; } // A pending permission save also blocks streamed replies.
    };
    let checking = false;
    const permissionTimer = setInterval(async () => {
      if (checking) return;
      checking = true;
      try { if (!await permitted()) abort.abort(); } finally { checking = false; }
    }, 250);
    // Watch the response, not the request: Node closes the request as soon as its body is read.
    reply.raw.on('close', () => {
      if (!reply.raw.writableEnded) abort.abort();
    });

    async function* respond() {
      let source: 'ai' | 'prepared' = 'prepared';
      try {
        if (!await permitted()) return;
        if (options.model) {
          const pieces = options.model.stream({
            system: buildSystemPrompt(chat, flagged),
            // Personal details are blanked out before anything leaves for Google (privacy.ts).
            turns: chat.messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: redactPersonal(m.text) })),
            signal: abort.signal,
          })[Symbol.asyncIterator]();
          // Wait for Gemini's first words before committing to an AI answer.
          let first: IteratorResult<string> | null = null;
          try {
            first = await pieces.next();
          } catch (error) {
            request.log.warn('mentor model failed, using prepared answer');
          }
          if (!await permitted()) return;
          if (first && !first.done) {
            source = 'ai';
            yield line({ type: 'start', source, flagged });
            yield line({ type: 'delta', text: first.value });
            try {
              for (let next = await pieces.next(); !next.done; next = await pieces.next()) {
                if (!await permitted()) return;
                yield line({ type: 'delta', text: next.value });
              }
            } catch (error) {
              if (!await permitted()) return;
              request.log.warn('mentor stream cut short');
              yield line({ type: 'delta', text: chat.language === 'hi' ? ' …(जवाब बीच में रुक गया)' : ' …(the answer was cut short)' });
            }
          }
        }
        if (source === 'prepared') {
          if (!await permitted()) return;
          yield line({ type: 'start', source, flagged });
          for (const piece of words(preparedAnswer(question, chat.language))) {
            yield line({ type: 'delta', text: piece });
          }
        }
        yield line({ type: 'done', suggestions: suggestionsFor(chat.language, asked) });
      } finally {
        clearTimeout(timer);
        clearInterval(permissionTimer);
        // Never log what the kid wrote: only timing, source and the safety flag.
        request.log.info({ ms: Date.now() - started, source, flagged }, 'mentor reply');
      }
    }

    reply
      .header('content-type', 'application/x-ndjson; charset=utf-8')
      .header('cache-control', 'no-store')
      .header('x-accel-buffering', 'no');
    return reply.send(Readable.from(respond()));
  });
}
