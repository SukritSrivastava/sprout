// POST /api/mentor/chat: the Paisa Mentor chatbot. Contract: docs/mentor-api.md.
//
// The reply streams back as "NDJSON": one small JSON object per line.
//   {"type":"start","source":"ai"|"prepared","flagged":false}
//   {"type":"delta","text":"Saving buys "}        ← repeated as Gemini writes
//   {"type":"done","suggestions":["…","…"]}
// If Gemini fails before saying anything, the route quietly answers from prepared.ts instead.
import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { chatRequestSchema, type ChatRequest } from '../mentor/schema.js';
import { isSensitive } from '../mentor/safety.js';
import { buildSystemPrompt } from '../mentor/prompt.js';
import { preparedAnswer, suggestionsFor } from '../mentor/prepared.js';
import type { MentorModel } from '../mentor/model.js';
import { createRateLimiter } from '../rate-limit.js';

type Options = {
  model: MentorModel | null;
  allowedOrigins: string[];
  hourlyLimit: number;
  rateLimit?: { limit: number; windowMs: number };
  timeoutMs?: number;
};

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

// Splits a prepared answer into word-sized pieces so it streams like the AI does.
function* words(text: string) {
  for (const piece of text.match(/\S+\s*/g) ?? []) yield piece;
}

export async function mentorRoutes(app: FastifyInstance, options: Options) {
  // Two limits: one per address, and one shared by everyone to protect the Gemini quota.
  const perAddress = createRateLimiter(options.rateLimit ?? { limit: 20, windowMs: 5 * 60_000 });
  const everyone = createRateLimiter({ limit: options.hourlyLimit, windowMs: 60 * 60_000 });
  const timeoutMs = options.timeoutMs ?? 15_000;

  // Browsers send an Origin header. Only our own website may use the mentor from a browser;
  // other websites are refused. Allowed origins also get the header that lets them read replies.
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/mentor/')) return;
    const origin = request.headers.origin;
    if (!origin) return; // not a browser (curl, scripts): the rate limits handle those
    if (!options.allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: 'forbidden_origin', message: 'This website may not use the mentor.' });
    }
    reply.header('access-control-allow-origin', origin).header('vary', 'origin');
  });
  // Browsers ask permission first ("preflight") before a cross-site POST with JSON.
  app.options('/api/mentor/chat', async (_request, reply) =>
    reply
      .header('access-control-allow-methods', 'POST')
      .header('access-control-allow-headers', 'content-type')
      .header('access-control-max-age', '600')
      .code(204)
      .send(),
  );

  app.post('/api/mentor/chat', async (request, reply) => {
    const tooBusy = (wait: number, message: string) => {
      reply.header('retry-after', String(wait));
      return reply.code(429).send({ error: 'rate_limited', message });
    };
    const wait = perAddress.check(request.ip);
    if (wait) return tooBusy(wait, `Let's take a short break. Try again in ${wait} seconds.`);
    const shared = everyone.check('everyone');
    if (shared) {
      request.log.warn('mentor hourly limit reached');
      return tooBusy(shared, 'Lots of people are asking right now. Try again in a little while.');
    }

    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: parsed.error.issues[0]?.message ?? 'Invalid request',
      });
    }

    const chat: ChatRequest = parsed.data;
    const question = chat.messages[chat.messages.length - 1].text;
    const flagged = isSensitive(question);
    const asked = chat.messages.filter((m) => m.role === 'user').map((m) => m.text);
    const started = Date.now();

    // Stop asking Gemini if the browser goes away or it takes too long.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    // Watch the response, not the request: Node closes the request as soon as its body is read.
    reply.raw.on('close', () => {
      if (!reply.raw.writableEnded) abort.abort();
    });

    async function* respond() {
      let source: 'ai' | 'prepared' = 'prepared';
      try {
        if (options.model) {
          const pieces = options.model.stream({
            system: buildSystemPrompt(chat, flagged),
            turns: chat.messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })),
            signal: abort.signal,
          })[Symbol.asyncIterator]();
          // Wait for Gemini's first words before committing to an AI answer.
          let first: IteratorResult<string> | null = null;
          try {
            first = await pieces.next();
          } catch (error) {
            request.log.warn({ err: (error as Error).message }, 'mentor model failed, using prepared answer');
          }
          if (first && !first.done) {
            source = 'ai';
            yield line({ type: 'start', source, flagged });
            yield line({ type: 'delta', text: first.value });
            try {
              for (let next = await pieces.next(); !next.done; next = await pieces.next()) {
                yield line({ type: 'delta', text: next.value });
              }
            } catch (error) {
              request.log.warn({ err: (error as Error).message }, 'mentor stream cut short');
              yield line({ type: 'delta', text: chat.language === 'hi' ? ' …(जवाब बीच में रुक गया)' : ' …(the answer was cut short)' });
            }
          }
        }
        if (source === 'prepared') {
          yield line({ type: 'start', source, flagged });
          for (const piece of words(preparedAnswer(question, chat.language))) {
            yield line({ type: 'delta', text: piece });
          }
        }
        yield line({ type: 'done', suggestions: suggestionsFor(chat.language, asked) });
      } finally {
        clearTimeout(timer);
        // Never log what the kid wrote: only timing, source and the safety flag.
        request.log.info({ ms: Date.now() - started, source, flagged }, 'mentor reply');
      }
    }

    reply
      .header('content-type', 'application/x-ndjson; charset=utf-8')
      .header('cache-control', 'no-cache')
      .header('x-accel-buffering', 'no');
    return reply.send(Readable.from(respond()));
  });
}
