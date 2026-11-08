import { createHash } from 'node:crypto';
import type { Database } from '../storage/database.js';
import type { StaffRole } from '../../features/learning/store.js';
import type { PinState } from './pins.js';
import type { LimitFactory } from '../http/rate-limit.js';

export type Sessions = {
  create: (token: string, role: StaffRole, expiresAt: number) => boolean | Promise<boolean>;
  find: (token: string) => { role: StaffRole; expiresAt: number } | undefined | Promise<{ role: StaffRole; expiresAt: number } | undefined>;
  delete: (token: string) => void | Promise<void>;
};
export function createMemorySessions(): Sessions {
  const sessions = new Map<string,{ role: StaffRole; expiresAt: number }>();
  return {
    create(token, role, expiresAt) {
      for (const [key,s] of sessions) if (s.expiresAt <= Date.now()) sessions.delete(key);
      if (sessions.size >= 100) return false;
      sessions.set(token,{ role, expiresAt }); return true;
    },
    find: (token) => sessions.get(token),
    delete(token) { sessions.delete(token); },
  };
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function createPostgresSecurity(db: Database) {
  const limiter: LimitFactory = ({ limit, windowMs }, scope) => ({
    async check(key) {
      return db.transaction(async (query) => {
        const keyHash = hash(key);
        // A bounded cleanup avoids retaining old IP hashes or spending unbounded work per call.
        await query(`DELETE FROM sprout_limits WHERE (scope,key_hash) IN
          (SELECT scope,key_hash FROM sprout_limits WHERE expires_at<now() LIMIT 100)`);
        await query(`INSERT INTO sprout_limits(scope,key_hash,expires_at) VALUES ($1,$2,now()) ON CONFLICT DO NOTHING`,[scope,keyHash]);
        const { rows: [r] } = await query<{ hits: number[]; clock: number }>(`SELECT hits,extract(epoch FROM clock_timestamp())::double precision*1000 clock
          FROM sprout_limits WHERE scope=$1 AND key_hash=$2 FOR UPDATE`,[scope,keyHash]);
        const recent = r.hits.filter((time) => r.clock-time < windowMs);
        const wait = recent.length >= limit ? Math.max(1,Math.ceil((windowMs-(r.clock-recent[0]))/1000)) : 0;
        if (!wait) recent.push(r.clock);
        await query('UPDATE sprout_limits SET hits=$3::double precision[],expires_at=to_timestamp($4/1000.0) WHERE scope=$1 AND key_hash=$2',
          [scope,keyHash,recent,r.clock+windowMs]);
        return wait;
      });
    },
  });
  const pins: PinState = {
    async check(role, matches) {
      return db.transaction(async (query) => {
        const { rows: [r] } = await query<{ failures: number; wait: number }>(`SELECT failures,
          GREATEST(0,ceil(extract(epoch FROM (locked_until-clock_timestamp()))))::integer wait
          FROM sprout_pin_attempts WHERE role=$1 FOR UPDATE`,[role]);
        if (r.wait > 0) return { result: 'locked' as const, wait: r.wait };
        if (matches) {
          await query('UPDATE sprout_pin_attempts SET failures=0,locked_until=NULL WHERE role=$1',[role]);
          return { result: 'ok' as const };
        }
        const failures = r.failures+1;
        await query(`UPDATE sprout_pin_attempts SET failures=$2,
          locked_until=CASE WHEN $3 THEN clock_timestamp()+interval '15 minutes' ELSE NULL END WHERE role=$1`,[role,failures>=5?0:failures,failures>=5]);
        return { result: 'wrong' as const };
      });
    },
  };
  const sessions: Sessions = {
    async create(token,role,expiresAt) {
      return db.transaction(async (query) => {
        await query("SELECT key FROM sprout_security_keys WHERE key='sessions' FOR UPDATE");
        await query('DELETE FROM sprout_sessions WHERE expires_at<=now()');
        const { rows: [r] } = await query<{ count: number }>('SELECT count(*)::integer count FROM sprout_sessions');
        if (r.count>=100) return false;
        await query('INSERT INTO sprout_sessions(token_hash,role,expires_at) VALUES ($1,$2,to_timestamp($3/1000.0))',[hash(token),role,expiresAt]);
        return true;
      });
    },
    async find(token) {
      const { rows: [r] } = await db.query<{ role: StaffRole; expires_at: Date }>('SELECT role,expires_at FROM sprout_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)]);
      return r ? { role: r.role, expiresAt: r.expires_at.getTime() } : undefined;
    },
    async delete(token) { await db.query('DELETE FROM sprout_sessions WHERE token_hash=$1',[hash(token)]); },
  };
  return { limiter, pins, sessions };
}
