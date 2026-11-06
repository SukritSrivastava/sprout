// Validate local settings without printing credentials or changing any saved records.
import { loadConfig } from '../src/config.js';

try {
  const config = loadConfig();
  console.log('Server settings are valid.');
  console.log(`Guardian permission: ${config.PAYOUT_PIN_GUARDIAN ? 'configured' : 'set PAYOUT_PIN_GUARDIAN in server/.env'}.`);
  console.log(`NGO staff access: ${config.PAYOUT_PIN_ADMIN || config.PAYOUT_PIN_MENTOR ? 'configured' : 'set a mentor or admin PIN in server/.env'}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not check server settings.');
  process.exitCode = 1;
}
