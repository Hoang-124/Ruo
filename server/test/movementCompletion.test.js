import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { confirmMovement } from '../src/controllers/movementController.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { Equipment } from '../src/models/Equipment.js';
import { Room } from '../src/models/Room.js';
import { AuditLog } from '../src/models/AuditLog.js';

const request = {
  params: { id: '67a000000000000000000001' },
  body: { notes: 'Đã kiểm tra vị trí mới.' },
  user: { _id: 'tech', role: 'technician', full_name: 'Kỹ thuật viên', code: 'TECH-01' }
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; }
});

function setup(t, { equipmentStatus = 'in_use', equipmentRoom = 'from', movementStatus = 'approved' } = {}) {
  const writes = [];
  const movement = {
    _id: request.params.id,
    status: movementStatus,
    type: 'transfer',
    equipment_id: 'eq',
    from_room_id: 'from',
    to_room_id: 'to',
    assigned_to: null,
    populate: async () => {}
  };
  const equipment = { _id: 'eq', status: equipmentStatus, room_id: equipmentRoom };
  let finalizationFailures = 0;

  t.mock.method(EquipmentMovement, 'findById', async (id) =>
    id === 'eq' ? equipment : movement);
  t.mock.method(EquipmentMovement, 'updateOne', async (filter, update) => {
    if (update.$set.status === 'completing') {
      if (movement.status !== filter.status) return { matchedCount: 0 };
      Object.assign(movement, update.$set);
      writes.push('claim');
      return { matchedCount: 1 };
    }
    if (update.$set.status === 'completed') {
      if (finalizationFailures > 0) {
        finalizationFailures--;
        return { matchedCount: 0 };
      }
      if (movement.status !== 'completing') return { matchedCount: 0 };
      Object.assign(movement, update.$set);
      writes.push('finalize');
      return { matchedCount: 1 };
    }
    if (movement.status !== filter.status) return { matchedCount: 0 };
    Object.assign(movement, update.$set);
    writes.push('release');
    return { matchedCount: 1 };
  });
  t.mock.method(Equipment, 'findById', async () => equipment);
  t.mock.method(Equipment, 'updateOne', async (filter, update) => {
    if (String(equipment.room_id || '') !== String(filter.room_id || '') ||
        filter.status.$nin.includes(equipment.status)) {
      return { matchedCount: 0 };
    }
    Object.assign(equipment, update.$set);
    writes.push('equipment');
    return { matchedCount: 1 };
  });
  t.mock.method(Room, 'findById', async () => ({ status: 'available' }));
  t.mock.method(AuditLog, 'logAction', async () => {});

  return {
    writes,
    movement,
    equipment,
    failNextFinalization() { finalizationFailures++; }
  };
}

for (const status of ['disposed', 'lost', 'pending_disposal']) {
  test(`completion cannot resurrect ${status} equipment`, async (t) => {
    const { writes } = setup(t, { equipmentStatus: status });
    const res = response();
    await confirmMovement(request, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(writes, []);
  });
}

test('stale source location rejects completion before either write', async (t) => {
  const { writes } = setup(t, { equipmentRoom: 'different' });
  const res = response();
  await confirmMovement(request, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(writes, []);
});

test('standalone completion updates equipment then movement without a Mongo session', async (t) => {
  const { writes, movement, equipment } = setup(t);
  t.mock.method(mongoose, 'startSession', async () => {
    throw new Error('Movement completion must not start a Mongo transaction.');
  });
  const res = response();
  await confirmMovement(request, res);
  assert.equal(res.body.success, true);
  assert.deepEqual(writes, ['claim', 'equipment', 'finalize']);
  assert.equal(equipment.room_id, 'to');
  assert.equal(movement.status, 'completed');
  assert.equal(movement.completion_notes, request.body.notes);
});

test('a failed final write leaves a retryable movement and retry finishes it', async (t) => {
  const { writes, movement, equipment, failNextFinalization } = setup(t);
  failNextFinalization();
  const first = response();
  await confirmMovement(request, first);
  assert.equal(first.statusCode, 503);
  assert.equal(movement.status, 'completing');
  assert.equal(equipment.room_id, 'to');

  const retry = response();
  await confirmMovement(request, retry);
  assert.equal(retry.body.success, true);
  assert.equal(movement.status, 'completed');
  assert.deepEqual(writes, ['claim', 'equipment', 'finalize']);
});

test('a request can resume a movement interrupted before moving the equipment', async (t) => {
  const { writes, movement, equipment } = setup(t, { movementStatus: 'completing' });
  const res = response();
  await confirmMovement(request, res);
  assert.equal(res.body.success, true);
  assert.equal(equipment.room_id, 'to');
  assert.equal(movement.status, 'completed');
  assert.deepEqual(writes, ['equipment', 'finalize']);
});

test('replaying a completed movement is rejected without changing either record', async (t) => {
  const { writes } = setup(t, { movementStatus: 'completed', equipmentRoom: 'to' });
  const res = response();
  await confirmMovement(request, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(writes, []);
});
