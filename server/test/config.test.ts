// Configuration errors must identify the right roles without exposing any PIN value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('duplicate PIN errors name the actual conflicting settings, even without a mentor', () => {
  for (const [first, second] of [
    ['PAYOUT_PIN_ADMIN', 'PAYOUT_PIN_GUARDIAN'],
    ['PAYOUT_PIN_MENTOR', 'PAYOUT_PIN_GUARDIAN'],
    ['PAYOUT_PIN_MENTOR', 'PAYOUT_PIN_ADMIN'],
  ]) {
    assert.throws(() => loadConfig({ [first]: 'duplicate-test-pin', [second]: 'duplicate-test-pin' }), (error: Error) => {
      assert.match(error.message, new RegExp(`${second}: must differ from ${first}`));
      assert.doesNotMatch(error.message, /duplicate-test-pin/);
      return true;
    });
  }
});

test('guardian-only and distinct staff/guardian settings remain valid without PayPal', () => {
  assert.equal(loadConfig({ PAYOUT_PIN_GUARDIAN: 'guardian-test-pin' }).PAYOUT_PIN_GUARDIAN, 'guardian-test-pin');
  assert.doesNotThrow(() => loadConfig({ PAYOUT_PIN_ADMIN: 'admin-test-pin', PAYOUT_PIN_GUARDIAN: 'guardian-test-pin' }));
});
