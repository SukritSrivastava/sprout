import pg from 'pg';

export type Query = <T extends object = Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }>;
export type Database = { query: Query; transaction: <T>(work: (query: Query) => Promise<T>) => Promise<T>; close: () => Promise<void> };
export type AwaitableStore<T> = { [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R | Promise<R> : T[K] };

export class StorageError extends Error {
  constructor() { super('Shared records are unavailable. Try the same request again when storage is available.'); }
}
export class StateConflict extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}

export function databasePoolOptions(connectionString: string, sslCa?: string): pg.PoolConfig {
  const url = new URL(connectionString);
  const hosted = !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // pg's URL SSL parameters replace an explicit ssl object. Remove them before supplying
  // the Supabase CA so verification cannot silently lose its trust configuration.
  if (hosted || sslCa) {
    for (const key of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) url.searchParams.delete(key);
  }
  return { connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000, statement_timeout: 10_000, query_timeout: 12_000,
    ...((hosted || sslCa) ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } } : {}) };
}

// A checked-out connection owns the entire transaction. Never hold it during provider calls.
export function createDatabase(connectionString: string, sslCa?: string): Database {
  const pool = new pg.Pool(databasePoolOptions(connectionString, sslCa));
  pool.on('error', () => { /* Failed idle connections are removed by pg; requests fail closed. */ });
  return {
    async query(sql, values) {
      try { return await pool.query(sql, values); } catch { throw new StorageError(); }
    },
    async transaction(work) {
      let client: pg.PoolClient;
      try { client = await pool.connect(); } catch { throw new StorageError(); }
      let discard = false;
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '5s'");
        const result = await work(async (sql, values) => client.query(sql, values));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
        if (error instanceof StateConflict) throw error;
        throw new StorageError();
      } finally { client.release(discard); }
    },
    close: () => pool.end(),
  };
}
