import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { deactivateRoom, updateRoomStatus } from '../src/controllers/facilityController.js';
import { Room } from '../src/models/Room.js';
import { Equipment } from '../src/models/Equipment.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { AuditLog } from '../src/models/AuditLog.js';

test('whitespace around inactive cannot bypass the equipment guard', async () => {
  const room = { _id: '507f1f77bcf86cd799439011', code: 'P101', status: 'available', save: async () => {} };
  mock.method(Room, 'findById', async () => room);
  mock.method(Equipment, 'find', () => ({ select: async () => [{ _id: 'eq1', code: 'E1', status: 'in_use' }] }));
  mock.method(EquipmentMovement, 'find', () => ({ populate: async () => [] }));
  mock.method(AuditLog, 'logAction', async () => {});
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  try {
    await updateRoomStatus({ params: { id: room._id }, body: { status: ' inactive ' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'HAS_EQUIPMENT');
    assert.equal(room.status, 'available');
  } finally { mock.restoreAll(); }
});

test('deactivateRoom attaches pending transfer status and destination code on 409 blockers', async () => {
  const room = { _id: '507f1f77bcf86cd799439011', code: 'P101', status: 'available', save: async () => {} };
  mock.method(Room, 'findById', async () => room);
  mock.method(Equipment, 'find', () => ({ select: async () => [{ _id: 'eq1', code: 'E1', name: 'Máy chiếu', status: 'in_use' }] }));
  mock.method(EquipmentMovement, 'find', () => ({
    populate: async () => [{ _id: 'm1', equipment_id: 'eq1', status: 'awaiting_approval', to_room_id: { code: 'KHO-01' } }]
  }));
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  try {
    await deactivateRoom({ params: { id: room._id }, body: {} }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body.equipments[0].pendingMovement, {
      movementId: 'm1',
      status: 'awaiting_approval',
      toRoomCode: 'KHO-01'
    });
  } finally { mock.restoreAll(); }
});
