// Older feature tests start with explicit sample permission. Production still starts blocked.
// Guardian tests use the real buildApp directly and test every blocked/revoked state.
import { buildApp as realApp } from '../src/app.js';
import { createLearningStore, learnerCodes } from '../src/learning/store.js';

export function buildApp(config: Parameters<typeof realApp>[0], options: Parameters<typeof realApp>[1] = {}) {
  const learning = createLearningStore(options.learningDataFile);
  for (const learner of learnerCodes) learning.changeConsent(learner, 'acknowledge');
  const app = realApp(config, { ...options, learning });
  app.addHook('onRequest', async (request) => {
    request.headers['x-learning-revision'] ??= String(learning.consent().revision);
  });
  return app;
}
