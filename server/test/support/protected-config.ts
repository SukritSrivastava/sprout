// Existing security suites explicitly exercise the PIN-protected version of the app.
import { loadConfig as readConfig } from '../../src/config.js';
export const loadConfig = (env: NodeJS.ProcessEnv = {}) => readConfig({ ...env, DEMO_OPEN_ACCESS: 'false' });
