import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { confirmMovement } from '../src/controllers/movementController.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { Equipment } from '../src/models/Equipment.js';
import { Room } from '../src/models/Room.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { runTransaction } from '../src/services/transaction.js';

const req = { params: { id: '67a000000000000000000001' }, body: {}, user: { _id: 'tech', role: 'technician' } };
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; } });
function setup(t, status = 'in_use', room = 'from') {
  const writes = [];
  const session = { withTransaction: async (fn) => fn(), endSession: async () => {} };
  t.mock.method(mongoose, 'startSession', async () => session);
  const movement = { _id: req.params.id, status: 'approved', type: 'transfer', equipment_id: 'eq', from_room_id: 'from', to_room_id: 'to',
    save: async (options) => { assert.equal(options.session, session); writes.push('movement'); }, populate: async () => {} };
  const equipment = { status, room_id: room, save: async (options) => { assert.equal(options.session, session); writes.push('equipment'); } };
  t.mock.method(EquipmentMovement, 'findById', async () => movement);
  t.mock.method(Equipment, 'findById', async () => equipment);
  t.mock.method(Room, 'findById', async () => ({ status: 'available' }));
  t.mock.method(AuditLog, 'logAction', async () => {});
  return { writes, movement, equipment };
}
for (const status of ['disposed', 'lost', 'pending_disposal']) {
  test(`completion cannot resurrect ${status} equipment`, async (t) => {
    const { writes } = setup(t, status); const res = response();
    await confirmMovement(req, res);
    assert.equal(res.statusCode, 409); assert.deepEqual(writes, []);
  });
}
test('stale source location rejects completion before either write', async (t) => {
  const { writes } = setup(t, 'in_use', 'different'); const res = response();
  await confirmMovement(req, res);
  assert.equal(res.statusCode, 409); assert.deepEqual(writes, []);
});
test('valid completion writes both documents in the same transaction and blocks replay', async (t) => {
  const { writes, movement, equipment } = setup(t); const res = response();
  await confirmMovement(req, res);
  assert.equal(res.body.success, true); assert.deepEqual(writes, ['movement', 'equipment']);
  assert.equal(equipment.room_id, 'to'); assert.equal(movement.status, 'completed');
  const retry = response(); await confirmMovement(req, retry);
  assert.equal(retry.statusCode, 409); assert.equal(writes.length, 2);
});
test('transaction failure always closes session and standalone database fails closed', async (t) => {
  let ended = 0;
  t.mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async () => { throw Object.assign(new Error('unsupported'), { code: 20 }); },
    endSession: async () => { ended++; }
  }));
  await assert.rejects(runTransaction(() => assert.fail('must not write')), { statusCode: 503 });
  assert.equal(ended, 1);
});
