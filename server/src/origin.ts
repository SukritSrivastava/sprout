// "Only our own website" check, shared by the mentor and ledger routes.
// Browsers send an Origin header saying which website made the request. Ours gets answers (and
// the header that lets it read them); any other website gets 403. Requests without an Origin
// (scripts, curl) pass here; the rate limits deal with those.
import type { FastifyInstance } from 'fastify';

export function onlyOurWebsite(app: FastifyInstance, allowedOrigins: string[], paths: string[], extraHeaders: string[] = []) {
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin) return;
    if (!allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: 'forbidden_origin', message: 'This website may not use this service.' });
    }
    reply.header('access-control-allow-origin', origin).header('vary', 'origin');
  });
  // Browsers ask permission first ("preflight") before a cross-site POST with JSON.
  for (const path of paths) {
    app.options(path, async (_request, reply) =>
      reply
        .header('access-control-allow-methods', 'GET, POST')
        .header('access-control-allow-headers', ['content-type', ...extraHeaders].join(', '))
        .header('access-control-max-age', '600')
        .code(204)
        .send(),
    );
  }
}
