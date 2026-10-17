import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDeactivation,
  getBlockingEquipment,
  validateDeactivationPayload
} from '../src/services/roomStatus.js';

const room = (status = 'available') => ({ code: 'P101', status });
const eq = (code, status) => ({ _id: code, code, name: `TB ${code}`, status });

describe('evaluateDeactivation (UC-2.5)', () => {
  test('allows an empty room to be deactivated', () => {
    const result = evaluateDeactivation(room(), []);
    assert.equal(result.allowed, true);
    assert.deepEqual(result.blockers, []);
  });

  test('blocks deactivation while equipment is still in the room', () => {
    const result = evaluateDeactivation(room(), [eq('E1', 'in_use'), eq('E2', 'broken')]);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'HAS_EQUIPMENT');
    assert.deepEqual(result.blockers.map((item) => item.code), ['E1', 'E2']);
    assert.match(result.message, /2 thiết bị/);
  });

  test('also blocks equipment that is repairing, in stock or pending disposal', () => {
    for (const status of ['repairing', 'in_stock', 'pending_disposal']) {
      assert.equal(evaluateDeactivation(room(), [eq('E1', status)]).allowed, false, status);
    }
  });

  test('ignores disposed and lost equipment', () => {
    const items = [eq('E1', 'disposed'), eq('E2', 'lost')];
    assert.deepEqual(getBlockingEquipment(items), []);
    assert.equal(evaluateDeactivation(room(), items).allowed, true);
  });

  test('rejects a room that is already inactive', () => {
    const result = evaluateDeactivation(room('inactive'), []);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'ALREADY_INACTIVE');
  });

  test('allows deactivating a room that is under maintenance', () => {
    assert.equal(evaluateDeactivation(room('maintenance'), []).allowed, true);
  });
});

describe('validateDeactivationPayload (UC-2.5)', () => {
  test('treats the reason as optional', () => {
    assert.deepEqual(validateDeactivationPayload({}), { valid: true, errors: {}, reason: '' });
    assert.equal(validateDeactivationPayload(undefined).valid, true);
  });

  test('trims the reason', () => {
    assert.equal(validateDeactivationPayload({ reason: '  Sửa chữa lớn  ' }).reason, 'Sửa chữa lớn');
  });

  test('rejects a non-string or overlong reason', () => {
    assert.ok(validateDeactivationPayload({ reason: 42 }).errors.reason);
    assert.ok(validateDeactivationPayload({ reason: 'x'.repeat(501) }).errors.reason);
    assert.equal(validateDeactivationPayload({ reason: 'x'.repeat(500) }).valid, true);
  });
});
