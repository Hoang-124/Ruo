import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_STATUS_TRANSITIONS,
  evaluateStatusChange,
  getAllowedRoomStatuses
} from '../src/services/roomStatus.js';

const room = (status = 'available') => ({ code: 'P101', status });
const eq = (code, status) => ({ _id: code, code, name: `TB ${code}`, status });

describe('ROOM_STATUS_TRANSITIONS (UC-2.6)', () => {
  test('every status can reach the two other statuses', () => {
    assert.deepEqual(getAllowedRoomStatuses('available').sort(), ['inactive', 'maintenance']);
    assert.deepEqual(getAllowedRoomStatuses('maintenance').sort(), ['available', 'inactive']);
    assert.deepEqual(getAllowedRoomStatuses('inactive').sort(), ['available', 'maintenance']);
    assert.deepEqual(getAllowedRoomStatuses('bogus'), []);
    assert.equal(Object.keys(ROOM_STATUS_TRANSITIONS).length, 3);
  });
});

describe('evaluateStatusChange (UC-2.6)', () => {
  test('allows moving between available and maintenance even with equipment', () => {
    const items = [eq('E1', 'in_use')];
    const toMaintenance = evaluateStatusChange({ status: 'maintenance' }, room('available'), items);
    assert.equal(toMaintenance.ok, true);
    assert.equal(toMaintenance.target, 'maintenance');
    assert.equal(evaluateStatusChange({ status: 'available' }, room('maintenance'), items).ok, true);
  });

  test('allows reopening an inactive room', () => {
    assert.equal(evaluateStatusChange({ status: 'available' }, room('inactive'), []).ok, true);
    assert.equal(evaluateStatusChange({ status: 'maintenance' }, room('inactive'), []).ok, true);
  });

  test('moving to inactive requires an empty room', () => {
    const blocked = evaluateStatusChange({ status: 'inactive' }, room('maintenance'), [eq('E1', 'broken')]);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.httpStatus, 409);
    assert.equal(blocked.code, 'HAS_EQUIPMENT');
    assert.deepEqual(blocked.blockers.map((item) => item.code), ['E1']);

    assert.equal(evaluateStatusChange({ status: 'inactive' }, room('available'), []).ok, true);
    assert.equal(evaluateStatusChange({ status: 'inactive' }, room('available'), [eq('E1', 'disposed')]).ok, true);
  });

  test('requires a known status', () => {
    for (const body of [{}, { status: '' }, { status: '  ' }, { status: 5 }]) {
      const result = evaluateStatusChange(body, room(), []);
      assert.equal(result.ok, false);
      assert.equal(result.httpStatus, 400);
      assert.ok(result.errors.status);
    }
    const unknown = evaluateStatusChange({ status: 'closed' }, room(), []);
    assert.equal(unknown.httpStatus, 400);
    assert.ok(unknown.errors.status);
  });

  test('rejects a no-op change with 409', () => {
    const result = evaluateStatusChange({ status: 'available' }, room('available'), []);
    assert.equal(result.ok, false);
    assert.equal(result.httpStatus, 409);
    assert.equal(result.code, 'NO_CHANGE');
  });

  test('validates and trims the optional reason', () => {
    const ok = evaluateStatusChange({ status: 'maintenance', reason: '  Thay điều hòa ' }, room(), []);
    assert.equal(ok.reason, 'Thay điều hòa');
    const bad = evaluateStatusChange({ status: 'maintenance', reason: 'x'.repeat(501) }, room(), []);
    assert.equal(bad.httpStatus, 400);
    assert.ok(bad.errors.reason);
  });
});
