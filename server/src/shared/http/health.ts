// GET /api/health: a quick "is the server alive?" check.
// It also tells the website whether the AI mentor and PayPal sandbox have keys, without ever revealing the key,
// so the chat can show "Offline mode" with prepared answers when it doesn't.
import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';
import type { Database } from '../storage/database.js';
import { checkSchema } from '../storage/schema.js';

export type HealthResponse = {
  ok: true;
  service: 'sprout-server';
  mentor: { aiConfigured: boolean };
  paypal: { sandboxConfigured: boolean };
};

export async function healthRoutes(app: FastifyInstance, options: { config: Config; database?: Database }) {
  app.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    service: 'sprout-server',
    mentor: { aiConfigured: Boolean(options.config.GEMINI_API_KEY) },
    paypal: { sandboxConfigured: Boolean(options.config.PAYPAL_CLIENT_ID && options.config.PAYPAL_CLIENT_SECRET) },
  }));
  let checking: Promise<void> | null = null;
  let readyUntil = 0;
  app.get('/api/ready', async (_request, reply) => {
    if (!options.database) return { ok: true, storage: 'local' };
    if (Date.now() < readyUntil) return { ok: true, storage: 'postgres' };
    // Share checks and briefly cache success so public probes cannot exhaust the DB pool.
    checking ??= checkSchema(options.database).then(() => { readyUntil = Date.now() + 2000; })
      .finally(() => { checking = null; });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([checking, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('readiness timeout')), 3000);
      })]);
      return { ok: true, storage: 'postgres' };
    } catch {
      return reply.code(503).send({ ok: false, error: 'not_ready', message: 'Shared records are unavailable. Please try again shortly.' });
    } finally { clearTimeout(timer); }
  });
}
