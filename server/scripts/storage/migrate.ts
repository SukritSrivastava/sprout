import { loadConfig } from '../../src/config.js';
import { createDatabase } from '../../src/shared/storage/database.js';
import { migrate, schemaVersion } from '../../src/shared/storage/schema.js';

let database: ReturnType<typeof createDatabase> | undefined;
try {
  const config = loadConfig();
  if (!config.DATABASE_URL) throw new Error('Set DATABASE_URL in the backend environment before migrating.');
  database = createDatabase(config.DATABASE_URL, config.DATABASE_SSL_CA);
  const changed = await migrate(database);
  console.log(changed ? `Database schema ${schemaVersion} installed. Existing records were preserved; only a fresh database receives synthetic sample activities and an empty pool.` : 'Database schema is already current. No records changed.');
} catch {
  // Driver errors can contain connection details. Never echo credentials or server responses.
  console.error('Database migration failed. Check backend DATABASE_URL, connectivity and schema compatibility. No automatic file import was attempted.');
  process.exitCode = 1;
} finally { await database?.close(); }
