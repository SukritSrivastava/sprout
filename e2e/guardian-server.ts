// Isolated API for browser integration tests. It uses disposable records and no live providers.
import { buildApp } from '../server/src/app.js';
import { loadConfig } from '../server/src/config.js';
import { join } from 'node:path';
import { createLearningStore } from '../server/src/learning/store.js';
async function main() {
const live = process.argv[3] === 'live';
const config = live ? loadConfig() : loadConfig({ PAYOUT_PIN_GUARDIAN: 'guardian-browser-test', PAYOUT_PIN_ADMIN: 'admin-browser-test' });
const learning = live ? createLearningStore() : undefined;
if (learning) learning.changeConsent('A12', 'acknowledge'); // Synthetic adult-run AI test only.
const app = buildApp(config, {
  model: live ? undefined : null, learning, chain: null, paypal: null, learningDataFile: join(process.argv[2], 'learning.json'), dataFile: join(process.argv[2], 'payments.json'),
});
const address = await app.listen({ port: 0, host: '127.0.0.1' });
process.send?.(address);
process.on('disconnect', () => { void app.close().then(() => process.exit(0)); });
}
void main();
