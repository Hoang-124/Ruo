import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoomListQuery } from '../src/services/roomValidation.js';

describe('parseRoomListQuery (UC-2.2)', () => {
  test('empty query returns everything without pagination', () => {
    const result = parseRoomListQuery({});
    assert.equal(result.valid, true);
    assert.deepEqual(result.filter, {});
    assert.equal(result.paginated, false);
    assert.equal(result.limit, null);
  });

  test('builds exact-match filters for floor, type and status', () => {
    const { valid, filter } = parseRoomListQuery({ floor: '3', room_type: 'lab', status: 'available' });
    assert.equal(valid, true);
    assert.deepEqual(filter, { floor: 3, room_type: 'lab', status: 'available' });
  });

  test('rejects out-of-range floors and unknown enum values', () => {
    for (const floor of ['0', '6', 'x', '2.5']) {
      const result = parseRoomListQuery({ floor });
      assert.equal(result.valid, false, floor);
      assert.ok(result.errors.floor, floor);
    }
    assert.ok(parseRoomListQuery({ room_type: 'pool' }).errors.room_type);
    assert.ok(parseRoomListQuery({ status: 'broken' }).errors.status);
  });

  test('search matches room code or name case-insensitively', () => {
    const { filter } = parseRoomListQuery({ q: '  p10  ' });
    assert.equal(filter.$or.length, 2);
    assert.ok(filter.$or[0].code.test('P101'));
    assert.ok(filter.$or[0].code.test('p105'));
    assert.ok(filter.$or[1].name.test('Phòng P102'));
    assert.equal(filter.$or[0].code.test('P201'), false);
  });

  test('search input is escaped so regex metacharacters are literal', () => {
    const { filter, valid } = parseRoomListQuery({ search: 'a.*(' });
    assert.equal(valid, true);
    assert.ok(filter.$or[1].name.test('xa.*(y'));
    assert.equal(filter.$or[1].name.test('abc'), false);
  });

  test('ignores blank filters sent by empty form controls', () => {
    const { valid, filter } = parseRoomListQuery({ floor: '', room_type: '', status: '', q: '' });
    assert.equal(valid, true);
    assert.deepEqual(filter, {});
  });

  test('pagination defaults, caps and validation', () => {
    assert.deepEqual(
      (({ page, limit, paginated }) => ({ page, limit, paginated }))(parseRoomListQuery({ page: '2' })),
      { page: 2, limit: 20, paginated: true }
    );
    assert.equal(parseRoomListQuery({ limit: '500' }).limit, 100);
    assert.ok(parseRoomListQuery({ page: '0' }).errors.page);
    assert.ok(parseRoomListQuery({ limit: 'abc' }).errors.limit);
  });
});
