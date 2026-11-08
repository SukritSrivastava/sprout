// Read-only operator check; never imports files, changes schema or prints connection details.
import { loadConfig } from '../../src/config.js';
import { createDatabase } from '../../src/shared/storage/database.js';
import { checkDatabaseAccess } from '../../src/shared/storage/schema.js';

let database: ReturnType<typeof createDatabase> | undefined;
try {
  const config = loadConfig();
  if (!config.DATABASE_URL) throw new Error('Shared storage is not configured.');
  database = createDatabase(config.DATABASE_URL, config.DATABASE_SSL_CA);
  const result = await database.transaction(async query => {
    await query('SET TRANSACTION READ ONLY');
    return checkDatabaseAccess({ query, transaction: database!.transaction, close: async () => {} });
  });
  console.log(`Database checks passed: schema ${result.schemaVersion}; ${result.tables} protected tables; backend ownership and browser-role restrictions verified.`);
} catch {
  console.error('Database checks failed. Check private DATABASE_URL/DATABASE_SSL_CA, connectivity, the current schema, table ownership, RLS and browser-role grants. No records were changed.');
  process.exitCode = 1;
} finally { await database?.close(); }
