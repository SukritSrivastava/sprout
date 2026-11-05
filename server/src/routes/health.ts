// GET /api/health: a quick "is the server alive?" check.
// It also tells the website whether the AI mentor and PayPal sandbox have keys, without ever revealing the key,
// so the chat can show "Offline mode" with prepared answers when it doesn't.
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

export type HealthResponse = {
  ok: true;
  service: 'sprout-server';
  mentor: { aiConfigured: boolean };
  paypal: { sandboxConfigured: boolean };
};

export async function healthRoutes(app: FastifyInstance, options: { config: Config }) {
  app.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    service: 'sprout-server',
    mentor: { aiConfigured: Boolean(options.config.GEMINI_API_KEY) },
    paypal: { sandboxConfigured: Boolean(options.config.PAYPAL_CLIENT_ID && options.config.PAYPAL_CLIENT_SECRET) },
  }));
}
