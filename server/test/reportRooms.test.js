import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentByRoom } from '../src/controllers/dashboardController.js';
import { Room } from '../src/models/Room.js';
import { Equipment } from '../src/models/Equipment.js';

test('UC-8.4 preserves empty rooms and totals assets with null or deleted room references', async (t) => {
  t.mock.method(Room, 'find', () => ({ select() { return this; }, sort() { return this; },
    lean: async () => [{ _id: 'r1', code: 'P101' }, { _id: 'r2', code: 'P201' }] }));
  t.mock.method(Equipment, 'aggregate', async pipeline => {
    assert.deepEqual(pipeline[0].$match.status.$nin, ['disposed', 'lost']);
    return [{ _id: 'r1', count: 2, value: 2000, brokenCount: 1 },
      { _id: null, count: 1, value: 500 }, { _id: 'deleted', count: 3, value: 700 }];
  });
  let body;
  await getEquipmentByRoom({}, { json: data => { body = data; } });
  assert.equal(body.rooms[1].count, 0);
  assert.equal(body.rooms[0].brokenCount, 1);
  assert.deepEqual(body.unassigned, { count: 4, value: 1200 });
});
