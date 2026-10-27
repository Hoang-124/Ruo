import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentByStatus } from '../src/controllers/dashboardController.js';
import { Equipment } from '../src/models/Equipment.js';

test('UC-8.5 returns every status, zero fills missing statuses and includes disposed/lost', async (t) => {
  t.mock.method(Equipment, 'aggregate', async () => [
    { _id: 'in_use', count: 3, value: 300 }, { _id: 'disposed', count: 2, value: 200 }, { _id: 'lost', count: 1, value: 100 }
  ]);
  let body;
  await getEquipmentByStatus({}, { json: data => { body = data; } });
  assert.equal(body.groups.length, 7);
  assert.deepEqual(body.groups.find(row => row.status === 'repairing'), { status: 'repairing', count: 0, value: 0 });
  assert.equal(body.groups.reduce((sum, row) => sum + row.count, 0), 6);
});
