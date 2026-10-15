import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateRoomPayload,
  getFloorFromRoomCode,
  isValidRoomCode,
  toInteger
} from '../src/services/roomValidation.js';

const validPayload = () => ({
  code: 'p101',
  name: 'Phòng học lý thuyết 101',
  building: 'A1',
  floor: 1,
  capacity: 60,
  room_type: 'lecture'
});

describe('room code rules (UC-2.1)', () => {
  test('accepts every code from P101 to P508', () => {
    for (let floor = 1; floor <= 5; floor += 1) {
      for (let index = 1; index <= 8; index += 1) {
        assert.equal(isValidRoomCode(`P${floor}0${index}`), true, `P${floor}0${index}`);
      }
    }
  });

  test('rejects codes outside P101-P508', () => {
    for (const code of ['P001', 'P109', 'P601', 'P100', 'P1001', 'A1-101', 'KHO-01', '101', '', null]) {
      assert.equal(isValidRoomCode(code), false, String(code));
    }
  });

  test('derives the floor from the code', () => {
    assert.equal(getFloorFromRoomCode('P307'), 3);
    assert.equal(getFloorFromRoomCode(' p508 '), 5);
    assert.equal(getFloorFromRoomCode('X101'), null);
  });
});

describe('validateCreateRoomPayload (UC-2.1)', () => {
  test('accepts a valid payload and normalizes the code', () => {
    const { valid, value, errors } = validateCreateRoomPayload(validPayload());
    assert.equal(valid, true);
    assert.deepEqual(errors, {});
    assert.equal(value.code, 'P101');
    assert.equal(value.building, 'A1');
    assert.equal(value.floor, 1);
    assert.equal(value.capacity, 60);
  });

  test('derives building and floor when omitted', () => {
    const { valid, value } = validateCreateRoomPayload({ code: 'P405', name: 'Lab 405', capacity: '40', room_type: 'lab' });
    assert.equal(valid, true);
    assert.equal(value.building, 'A1');
    assert.equal(value.floor, 4);
    assert.equal(value.capacity, 40);
  });

  test('accepts legacy aliases (building_code, floor_number, type)', () => {
    const { valid, value } = validateCreateRoomPayload({
      code: 'P203', name: 'Phòng 203', building_code: 'a1', floor_number: 2, type: 'office', capacity: 20
    });
    assert.equal(valid, true);
    assert.equal(value.room_type, 'office');
    assert.equal(value.floor, 2);
  });

  test('requires code, name, capacity and room type', () => {
    const { valid, errors } = validateCreateRoomPayload({});
    assert.equal(valid, false);
    for (const field of ['code', 'name', 'capacity', 'room_type', 'floor']) {
      assert.ok(errors[field], `missing error for ${field}`);
    }
  });

  test('rejects a code outside the allowed range', () => {
    const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), code: 'P601' });
    assert.equal(valid, false);
    assert.match(errors.code, /P101 - P508/);
  });

  test('rejects any building other than A1', () => {
    const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), building: 'B2' });
    assert.equal(valid, false);
    assert.ok(errors.building);
  });

  test('rejects floors outside 1-5', () => {
    for (const floor of [0, 6, -1, 2.5, 'abc']) {
      const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), floor });
      assert.equal(valid, false, String(floor));
      assert.ok(errors.floor, String(floor));
    }
  });

  test('rejects a floor that does not match the code', () => {
    const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), code: 'P301', floor: 2 });
    assert.equal(valid, false);
    assert.match(errors.floor, /tầng 3/);
  });

  test('rejects invalid capacities', () => {
    for (const capacity of [0, -5, 501, 12.5, 'many', null, '']) {
      const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), capacity });
      assert.equal(valid, false, String(capacity));
      assert.ok(errors.capacity, String(capacity));
    }
  });

  test('rejects unknown room types', () => {
    const { valid, errors } = validateCreateRoomPayload({ ...validPayload(), room_type: 'swimming_pool' });
    assert.equal(valid, false);
    assert.ok(errors.room_type);
  });

  test('rejects blank or overlong names', () => {
    assert.equal(validateCreateRoomPayload({ ...validPayload(), name: '   ' }).valid, false);
    assert.equal(validateCreateRoomPayload({ ...validPayload(), name: 'x'.repeat(121) }).valid, false);
  });

  test('validates optional fields when present', () => {
    assert.equal(validateCreateRoomPayload({ ...validPayload(), area: -3 }).valid, false);
    assert.equal(validateCreateRoomPayload({ ...validPayload(), description: 'd'.repeat(501) }).valid, false);
    assert.equal(validateCreateRoomPayload({ ...validPayload(), required_equipment: 'oops' }).valid, false);
    assert.equal(
      validateCreateRoomPayload({ ...validPayload(), required_equipment: [{ category_id: 'bad', quantity: 1 }] }).valid,
      false
    );
    const ok = validateCreateRoomPayload({
      ...validPayload(),
      area: 85,
      description: 'Phòng học lý thuyết',
      required_equipment: [{ category_id: '64b7f0f0f0f0f0f0f0f0f0f0', quantity: 2 }]
    });
    assert.equal(ok.valid, true);
    assert.equal(ok.value.area, 85);
    assert.equal(ok.value.required_equipment[0].quantity, 2);
  });
});

describe('toInteger', () => {
  test('parses integers and digit strings only', () => {
    assert.equal(toInteger(5), 5);
    assert.equal(toInteger(' 7 '), 7);
    assert.ok(Number.isNaN(toInteger(5.5)));
    assert.ok(Number.isNaN(toInteger('5.5')));
    assert.ok(Number.isNaN(toInteger('abc')));
    assert.ok(Number.isNaN(toInteger(undefined)));
  });
});
