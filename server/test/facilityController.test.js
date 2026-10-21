import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { updateRoomStatus } from '../src/controllers/facilityController.js';
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
