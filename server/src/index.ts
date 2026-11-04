// Entry point: load settings, build the app, start listening. `npm run dev` runs this with tsx,
// which restarts the server whenever a file in src/ changes.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = buildApp(config, { logger: true });

try {
  await app.listen({ port: config.API_PORT, host: config.HOST });
  if (!config.GEMINI_API_KEY) {
    app.log.warn('GEMINI_API_KEY is not set: the mentor will use prepared answers (offline mode).');
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
