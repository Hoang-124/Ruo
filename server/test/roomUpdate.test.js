import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateUpdateRoomPayload } from '../src/services/roomValidation.js';

const existing = () => ({
  code: 'P101',
  name: 'Phòng 101',
  building: 'A1',
  floor: 1,
  room_type: 'lecture',
  capacity: 60,
  description: ''
});

describe('validateUpdateRoomPayload (UC-2.4)', () => {
  test('returns only the fields that really changed, with their previous values', () => {
    const result = validateUpdateRoomPayload({ name: '  Phòng học 101  ', capacity: '80', room_type: 'lecture' }, existing());
    assert.equal(result.valid, true);
    assert.deepEqual(result.changes, { name: 'Phòng học 101', capacity: 80 });
    assert.deepEqual(result.previous, { name: 'Phòng 101', capacity: 60 });
  });

  test('flags a no-op update (nothing changed) without an error', () => {
    const result = validateUpdateRoomPayload({ name: 'Phòng 101', capacity: 60 }, existing());
    assert.equal(result.valid, true);
    assert.deepEqual(result.changes, {});
  });

  test('requires at least one editable field', () => {
    const result = validateUpdateRoomPayload({}, existing());
    assert.equal(result.valid, false);
    assert.ok(result.errors.body);
    assert.equal(validateUpdateRoomPayload({ unrelated: 1 }, existing()).valid, false);
  });

  test('updates and clears the room function (description)', () => {
    const set = validateUpdateRoomPayload({ description: ' Phòng học lý thuyết ' }, existing());
    assert.deepEqual(set.changes, { description: 'Phòng học lý thuyết' });
    assert.deepEqual(set.previous, { description: '' });

    const cleared = validateUpdateRoomPayload({ description: '' }, { ...existing(), description: 'Cũ' });
    assert.deepEqual(cleared.changes, { description: '' });
    assert.deepEqual(cleared.previous, { description: 'Cũ' });
  });

  test('treats a missing stored description as empty', () => {
    const room = existing();
    delete room.description;
    assert.deepEqual(validateUpdateRoomPayload({ description: '' }, room).changes, {});
  });

  test('rejects changing code, building or floor but tolerates echoing the same values', () => {
    const same = validateUpdateRoomPayload({ code: 'p101', building: 'a1', floor: '1', name: 'X' }, existing());
    assert.equal(same.valid, true);

    const bad = validateUpdateRoomPayload({ code: 'P202', building: 'B2', floor: 2, name: 'X' }, existing());
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.code);
    assert.ok(bad.errors.building);
    assert.ok(bad.errors.floor);
  });

  test('applies the same field rules as creation', () => {
    for (const payload of [
      { name: '   ' },
      { name: 'x'.repeat(121) },
      { capacity: 0 },
      { capacity: 501 },
      { capacity: 'abc' },
      { room_type: 'pool' },
      { description: 'd'.repeat(501) }
    ]) {
      const result = validateUpdateRoomPayload(payload, existing());
      assert.equal(result.valid, false, JSON.stringify(payload).slice(0, 40));
      assert.deepEqual(result.changes, {});
    }
  });

  test('accepts the legacy "type" alias for room_type', () => {
    const result = validateUpdateRoomPayload({ type: 'lab' }, existing());
    assert.deepEqual(result.changes, { room_type: 'lab' });
  });
});
