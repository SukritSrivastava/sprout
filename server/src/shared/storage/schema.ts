import { randomBytes } from 'node:crypto';
import type { Database } from './database.js';

export const schemaVersion = 4;
const schema = `
CREATE TABLE sprout_payment_meta (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  salt text NOT NULL,
  next_batch integer NOT NULL DEFAULT 101 CHECK (next_batch >= 101)
);
CREATE SEQUENCE sprout_donation_id;
CREATE SEQUENCE sprout_payout_id;
CREATE SEQUENCE sprout_request_id;
CREATE TABLE sprout_orders (
  id text PRIMARY KEY, cents integer NOT NULL CHECK (cents > 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sprout_receipts (
  id text PRIMARY KEY, type text NOT NULL CHECK (type IN ('donation', 'payout')),
  cents integer NOT NULL CHECK (cents > 0), currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  date text NOT NULL, ref text NOT NULL, provider_id text NOT NULL DEFAULT '',
  status text NOT NULL, batch_id integer, order_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'donation' AND status = 'COMPLETED' AND order_id IS NOT NULL AND provider_id <> '') OR (type = 'payout' AND order_id IS NULL))
);
CREATE UNIQUE INDEX sprout_provider_receipt ON sprout_receipts(type, provider_id) WHERE provider_id <> '';
CREATE INDEX sprout_pending_receipts ON sprout_receipts(created_at, id) WHERE batch_id IS NULL;
CREATE TABLE sprout_payout_requests (
  id text PRIMARY KEY, cents integer NOT NULL CHECK (cents > 0), email text NOT NULL, child text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
  sender_batch_id text UNIQUE, receipt_id text UNIQUE REFERENCES sprout_receipts(id),
  send_token text, send_until timestamptz,
  CHECK ((receipt_id IS NULL AND sender_batch_id IS NULL AND sent_at IS NULL) OR
         (receipt_id IS NOT NULL AND sender_batch_id IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE TABLE sprout_approvals (
  request_id text NOT NULL REFERENCES sprout_payout_requests(id),
  approver text NOT NULL CHECK (approver IN ('mentor','admin','guardian')),
  at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (request_id, approver)
);
CREATE TABLE sprout_learners (
  code text PRIMARY KEY CHECK (code IN ('A12','B07','C33')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','withdrawn','deleted')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  acknowledged_at timestamptz, changed_at timestamptz
);
CREATE TABLE sprout_activities (
  id text PRIMARY KEY, learner text NOT NULL REFERENCES sprout_learners(code), title text NOT NULL,
  credits integer NOT NULL CHECK (credits >= 0), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','returned')),
  reviewed_at timestamptz, reviewed_by text CHECK (reviewed_by IN ('mentor','admin'))
);
CREATE TABLE sprout_completions (
  learner text NOT NULL REFERENCES sprout_learners(code),
  lesson_id text NOT NULL CHECK (lesson_id IN ('needs','waiting','sharing')),
  completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (learner, lesson_id)
);
CREATE TABLE sprout_security_keys (key text PRIMARY KEY);
INSERT INTO sprout_security_keys VALUES ('sessions');
CREATE TABLE sprout_sessions (
  token_hash text PRIMARY KEY, role text NOT NULL CHECK (role IN ('mentor','admin')), expires_at timestamptz NOT NULL
);
CREATE INDEX sprout_session_expiry ON sprout_sessions(expires_at);
CREATE TABLE sprout_pin_attempts (
  role text PRIMARY KEY CHECK (role IN ('mentor','admin','guardian')),
  failures integer NOT NULL DEFAULT 0, locked_until timestamptz
);
INSERT INTO sprout_pin_attempts(role) VALUES ('mentor'), ('admin'), ('guardian');
CREATE TABLE sprout_limits (
  scope text NOT NULL, key_hash text NOT NULL, hits double precision[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL, PRIMARY KEY (scope, key_hash)
);
CREATE INDEX sprout_limit_expiry ON sprout_limits(expires_at);
INSERT INTO sprout_learners(code) VALUES ('A12'), ('B07'), ('C33');
INSERT INTO sprout_activities(id,learner,title,credits) VALUES
  ('ACT-001','A12','Reading hour at the learning centre',200),
  ('ACT-002','B07','Sorted the library shelves',150),
  ('ACT-003','C33','Taught counting change to a younger kid',200);
`;

const ledgerSchema = `
CREATE TABLE sprout_ledger_target (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), chain_id integer NOT NULL,
  contract text NOT NULL, publisher text NOT NULL, deploy_hash text NOT NULL,
  deploy_raw text, deploy_block bigint, deploy_block_hash text,
  next_batch integer NOT NULL DEFAULT 101 CHECK (next_batch>=101),
  CHECK ((deploy_block IS NULL) = (deploy_block_hash IS NULL))
);
CREATE TABLE sprout_ledger_jobs (
  id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('sample','live')),
  chain_id integer NOT NULL, contract text NOT NULL, batch_id integer NOT NULL,
  input jsonb NOT NULL, receipts jsonb NOT NULL,
  state text NOT NULL DEFAULT 'prepared' CHECK (state IN ('prepared','signed','submitted','confirmed','blocked')),
  raw_tx text, tx_hash text, result jsonb,
  lease_token text, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chain_id,contract,batch_id),
  CHECK ((raw_tx IS NULL) = (tx_hash IS NULL))
);
CREATE TABLE sprout_ledger_job_receipts (
  receipt_id text PRIMARY KEY REFERENCES sprout_receipts(id),
  job_id text NOT NULL REFERENCES sprout_ledger_jobs(id)
);
CREATE INDEX sprout_ledger_open_jobs ON sprout_ledger_jobs(created_at) WHERE state <> 'confirmed';
`;

export const protectedTables = [
  'sprout_migrations', 'sprout_payment_meta', 'sprout_orders', 'sprout_receipts',
  'sprout_payout_requests', 'sprout_approvals', 'sprout_learners', 'sprout_activities',
  'sprout_completions', 'sprout_security_keys', 'sprout_sessions', 'sprout_pin_attempts',
  'sprout_limits', 'sprout_ledger_target', 'sprout_ledger_jobs', 'sprout_ledger_job_receipts',
];

// Fastify owns authorization. Supabase browser roles must never read/write these tables,
// even when its Data API has automatic grants enabled. The migration/backend owner bypasses RLS.
const privateSchema = `
DO $sprout$
DECLARE object_name text; role_name text;
BEGIN
  FOREACH object_name IN ARRAY ARRAY[${protectedTables.map(table => `'${table}'`).join(',')}] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', object_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', object_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH object_name IN ARRAY ARRAY['sprout_donation_id', 'sprout_payout_id', 'sprout_request_id'] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE %I FROM %I', object_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $sprout$;
`;

// Explicit, transactional migration; app cold starts only check the installed version.
export async function migrate(database: Database) {
  return database.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(20261107)');
    await query('CREATE TABLE IF NOT EXISTS sprout_migrations (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now())');
    const { rows } = await query<{ version: number }>('SELECT version FROM sprout_migrations ORDER BY version');
    if (rows.some((r) => r.version > schemaVersion)) throw new Error('Database schema is newer than this API.');
    let changed = false;
    if (!rows.some((r) => r.version === 1)) {
      await query(schema);
      await query('INSERT INTO sprout_payment_meta(singleton,salt) VALUES (true,$1)', [randomBytes(16).toString('hex')]);
      await query('INSERT INTO sprout_migrations(version) VALUES (1)');
      changed = true;
    }
    if (!rows.some((r) => r.version === 2)) {
      await query(ledgerSchema);
      await query('INSERT INTO sprout_migrations(version) VALUES (2)');
      changed = true;
    }
    if (!rows.some((r) => r.version === 3)) {
      await query(privateSchema);
      await query('INSERT INTO sprout_migrations(version) VALUES (3)');
      changed = true;
    }
    if (!rows.some((r) => r.version === 4)) {
      await query("ALTER TABLE sprout_learners ADD COLUMN IF NOT EXISTS consent_policy text NOT NULL DEFAULT 'demo-permission-v1'");
      // A hosted-storage statement needs fresh permission. Keep progress and blocked markers;
      // advancing active revisions also rejects stale learning writes and streams.
      await query("UPDATE sprout_learners SET status='pending',revision=revision+1,acknowledged_at=NULL,changed_at=now() WHERE status='active'");
      await query('INSERT INTO sprout_migrations(version) VALUES (4)');
      changed = true;
    }
    return changed;
  });
}

export async function checkSchema(database: Database) {
  const { rows } = await database.query<{ version: number }>('SELECT version FROM sprout_migrations ORDER BY version DESC LIMIT 1');
  if (rows[0]?.version !== schemaVersion) throw new Error('Run npm run db:migrate -w server before starting the database API.');
}

export async function checkDatabaseAccess(database: Database) {
  await checkSchema(database);
  const { rows } = await database.query<{ name: string; protected: boolean; owner: boolean; exposed: boolean }>(`
    SELECT c.relname AS name, c.relrowsecurity AS protected,
      pg_has_role(current_user,c.relowner,'USAGE') AS owner,
      EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated')
        AND has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE')) AS exposed
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=current_schema() AND c.relname=ANY($1::text[]) AND c.relkind='r'`, [protectedTables]);
  if (rows.length !== protectedTables.length || rows.some(row => !row.protected || !row.owner || row.exposed))
    throw new Error('Shared database access checks failed. Check the current schema, table ownership, RLS and browser-role grants.');
  return { schemaVersion, tables: rows.length };
}
