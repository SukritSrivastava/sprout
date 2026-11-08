// Entry point: load settings, build the app, start listening. `npm run dev` runs this with tsx,
// which restarts for source edits; scripts/platform/dev.mjs also restarts after server/.env is saved.
import { loadConfig } from './config.js';
import { buildApp } from './build-app.js';

const config = loadConfig();
const app = buildApp(config, { logger: true, dataFile: config.DATA_FILE, learningDataFile: config.LEARNING_DATA_FILE });

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  // Leave room inside Render's shutdown window; uncertain operations keep their saved IDs.
  const deadline = setTimeout(() => process.exit(1), 25_000).unref();
  try { await app.close(); clearTimeout(deadline); process.exit(0); }
  catch { app.log.error('API shutdown did not finish. Saved operations remain recoverable.'); process.exit(1); }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

try {
  await app.listen({ port: config.API_PORT, host: config.HOST });
  if (!config.GEMINI_API_KEY) {
    app.log.warn('GEMINI_API_KEY is not set: the mentor will use prepared answers (offline mode).');
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
