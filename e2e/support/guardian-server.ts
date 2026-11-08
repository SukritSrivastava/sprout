// Isolated API for browser integration tests. It uses disposable records and no live providers.
import { buildApp } from '../../server/src/build-app.js';
import { loadConfig } from '../../server/src/config.js';
import { join } from 'node:path';
import { createLearningStore } from '../../server/src/features/learning/store.js';
async function main() {
const live = process.argv[3] === 'live';
const demo = process.argv[3] === 'demo';
const config = live ? loadConfig({ ...process.env, DEMO_OPEN_ACCESS: 'false' }) : demo
  ? loadConfig({ GUARDIAN_PAYPAL_EMAIL: 'judge@example.com' })
  : loadConfig({ DEMO_OPEN_ACCESS: 'false', PAYOUT_PIN_GUARDIAN: 'guardian-browser-test', PAYOUT_PIN_ADMIN: 'admin-browser-test' });
const learning = live ? createLearningStore() : undefined;
if (learning) learning.changeConsent('A12', 'acknowledge'); // Synthetic adult-run AI test only.
const app = buildApp(config, {
  model: live ? undefined : null, learning, chain: null, paypal: demo ? {
    clientId: 'judge-fixture', async createOrder() { return { id: 'DEMOORDER123' }; },
    async captureOrder() { return { orderId: 'DEMOORDER123', captureId: 'DEMOCAPTURE123', dollars: 25, currency: 'USD', status: 'COMPLETED', payerId: 'sample' }; },
    async sendPayout() { return { batchId: 'DEMOBATCH123', status: 'SUCCESS' }; },
    async getPayout(batchId) { return { batchId, status: 'SUCCESS' }; },
  } : null, learningDataFile: join(process.argv[2], 'learning.json'), dataFile: join(process.argv[2], 'payments.json'),
});
const address = await app.listen({ port: 0, host: '127.0.0.1' });
process.send?.(address);
process.on('disconnect', () => { void app.close().then(() => process.exit(0)); });
}
void main();
