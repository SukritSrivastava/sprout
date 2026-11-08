import { isIP } from 'node:net';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.js';

// Render terminates public traffic before its private ingress. Never trust a public peer,
// and never walk past that ingress into earlier, client-supplied forwarded values.
export function trustRenderProxy(address: string, hop: number) {
  if (hop !== 0) return false;
  const ip = address.replace(/^::ffff:/i, '');
  if (isIP(ip) === 4) {
    const [first, second] = ip.split('.').map(Number);
    return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168);
  }
  return isIP(ip) === 6 && (ip === '::1' || /^(fc|fd)/i.test(ip));
}

export function hostingPolicy(app: FastifyInstance, config: Pick<Config, 'TRUST_PROXY'>) {
  if (config.TRUST_PROXY === 'render') {
    app.addHook('onRequest', async (request) => {
      const forwarded = request.headers['x-forwarded-for'];
      const address = typeof forwarded === 'string' ? forwarded.split(',').at(-1)?.trim() : undefined;
      if (address && isIP(address)) request.raw.headers['x-forwarded-for'] = address;
      else delete request.raw.headers['x-forwarded-for'];
    });
  }
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('cache-control', 'no-store');
    reply.header('cdn-cache-control', 'no-store');
    reply.header('vercel-cdn-cache-control', 'no-store');
    return payload;
  });
}
