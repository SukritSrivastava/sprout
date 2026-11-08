// Language behavior: corrupted/blocked storage, stable identifiers, interpolation and truthful errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeContent, readLanguage, translate } from './language.js';
import { site } from '../../content/site.js';
import { home } from '../../content/home.js';
import { demo } from '../../content/demo.js';
import { guardian } from '../../content/guardian.js';
import { describeMonths } from '../practice/model.js';

test('language defaults safely, migrates lesson preference and respects the shared choice', () => {
  const storage = (values) => ({ getItem: (key) => values[key] ?? null });
  assert.equal(readLanguage(storage({})), 'en');
  assert.equal(readLanguage(storage({ 'sprout-language': 'broken' })), 'en');
  assert.equal(readLanguage(storage({ 'sprout-seedlings-language': 'hi' })), 'hi');
  assert.equal(readLanguage(storage({ 'sprout-language': 'en', 'sprout-seedlings-language': 'hi' })), 'en');
  assert.equal(readLanguage({ getItem() { throw new Error('blocked'); } }), 'en');
});

test('Hindi content preserves routes, policies, source objects and interpolation values', () => {
  const translated = localizeContent(site, 'hi');
  assert.deepEqual(translated.nav.features.map((item) => item.id), site.nav.features.map((item) => item.id));
  assert.equal(localizeContent(guardian, 'hi').policy, guardian.policy);
  assert.deepEqual(localizeContent(home, 'hi').comingSoon.show, home.comingSoon.show);
  assert.match(localizeContent(demo, 'hi').earn.done('₹1,00,000'), /₹1,00,000/);
  assert.match(localizeContent(demo, 'hi').grow.note('₹6,000', 5), /5 साल में ₹6,000/);
  assert.equal(site.nav.features[3].id, 'payout');
});

test('variable server errors and step labels retain their numbers in Hindi', () => {
  assert.equal(translate('Try again in 27 seconds.', 'hi'), '27 सेकंड बाद फिर कोशिश करें।');
  assert.equal(translate('Step {0} of {1}', 'hi', [2, 4]), '4 में से कदम 2');
  assert.equal(translate('DON-2611-0012', 'hi'), 'DON-2611-0012');
  assert.equal(translate('Unknown text', 'en'), 'Unknown text');
  assert.equal(translate('constructor', 'hi'), 'constructor');
  assert.equal(translate('toString', 'hi'), 'toString');
  assert.equal(describeMonths(27, 'hi'), '2 साल 3 महीने');
  assert.equal(describeMonths(null, 'hi'), '20 साल से ज़्यादा');
});
