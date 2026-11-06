// Entry point: load settings, build the app, start listening. `npm run dev` runs this with tsx,
// which restarts for source edits; scripts/dev.mjs also restarts it after server/.env is saved.
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = buildApp(config, { logger: true, dataFile: config.DATA_FILE, learningDataFile: config.LEARNING_DATA_FILE });

try {
  await app.listen({ port: config.API_PORT, host: config.HOST });
  if (!config.GEMINI_API_KEY) {
    app.log.warn('GEMINI_API_KEY is not set: the mentor will use prepared answers (offline mode).');
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
