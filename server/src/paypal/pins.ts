// Checks an adult's payout PIN (PAYOUT_PIN_MENTOR / _ADMIN / _GUARDIAN in server/.env).
//
// - PINs are compared in constant time, so timing can't reveal how much of a guess was right.
// - After 5 wrong PINs for one adult, that adult is locked for 15 minutes. The count is shared by
//   everyone (not per address), so guessing from many computers doesn't help.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Config } from '../config.js';
import type { Approver } from './store.js';

const MAX_WRONG = 5;
const LOCK_MS = 15 * 60_000;

const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest();

export function createPinChecker(config: Config, now = () => Date.now()) {
  const pins: Record<Approver, string | undefined> = {
    mentor: config.PAYOUT_PIN_MENTOR,
    admin: config.PAYOUT_PIN_ADMIN,
    guardian: config.PAYOUT_PIN_GUARDIAN,
  };
  const wrong = new Map<Approver, { count: number; lockedUntil: number }>();

  return {
    // Payouts work only when all three PINs are set (any two adults can then approve).
    configured: Object.values(pins).every(Boolean),

    // 'ok', 'wrong', or 'locked' (with the seconds to wait).
    check(approver: Approver, pin: string): { result: 'ok' | 'wrong' } | { result: 'locked'; wait: number } {
      const record = wrong.get(approver) ?? { count: 0, lockedUntil: 0 };
      if (record.lockedUntil > now()) return { result: 'locked', wait: Math.ceil((record.lockedUntil - now()) / 1000) };
      const expected = pins[approver];
      const matches = Boolean(expected) && timingSafeEqual(digest(pin), digest(expected!));
      if (matches) {
        wrong.delete(approver);
        return { result: 'ok' };
      }
      record.count += 1;
      if (record.count >= MAX_WRONG) {
        record.count = 0;
        record.lockedUntil = now() + LOCK_MS;
      }
      wrong.set(approver, record);
      return { result: 'wrong' };
    },
  };
}

export type PinChecker = ReturnType<typeof createPinChecker>;
