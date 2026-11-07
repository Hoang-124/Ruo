import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Equipment } from '../src/models/Equipment.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { Disposal } from '../src/models/Disposal.js';
import { Room } from '../src/models/Room.js';
import { Category } from '../src/models/Category.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { completeDisposalReceipt } from '../src/controllers/disposalController.js';
import { runTransaction } from '../src/services/transaction.js';
import { SparePart } from '../src/models/SparePart.js';
import { PartsRequest } from '../src/models/PartsRequest.js';
import { approvePartsRequest } from '../src/controllers/sparePartController.js';
import { confirmMovement } from '../src/controllers/movementController.js';

const database = `ruo_transaction_test_${randomUUID().replaceAll('-', '')}`;
const id = () => new mongoose.Types.ObjectId();
const actor = { _id: id(), role: 'technician', full_name: 'Test', code: 'TEST' };
let category, room;
before(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27028', {
    dbName: database, serverSelectionTimeoutMS: 3000
  });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.ok(hello.setName || hello.msg === 'isdbgrid', 'Transaction tests require a replica set');
  await Promise.all([Equipment, EquipmentMovement, Disposal, Room, Category, AuditLog, SparePart, PartsRequest].map(model => model.init()));
  category = await Category.create({ code: 'TEST', name: 'Test' });
  room = await Room.create({ code: 'P101', name: 'Test', floor: 1, capacity: 10 });
});
after(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; } });
async function fixture() {
  const code = randomUUID();
  const original = await Equipment.create({ code, qr_code: code, name: 'Old', price: 100,
    category_id: category._id, room_id: room._id, status: 'pending_disposal' });
  const proposal = await Disposal.create({ equipment_id: original._id, proposed_by: actor._id,
    reason: 'Test', status: 'procurement_planned', procurement: { budget: 100, replacement_name: 'New',
      category_id: category._id, room_id: room._id } });
  return { original, proposal };
}
test('concurrent receipts create exactly one replacement and one completed handover', async () => {
  const { original, proposal } = await fixture();
  const responses = [response(), response()];
  await Promise.all(responses.map((res, index) => completeDisposalReceipt({ user: actor,
    params: { id: String(proposal._id) }, body: { code: `NEW-${proposal._id}-${index}`, price: 90 } }, res)));
  assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
  const stored = await Disposal.findById(proposal._id);
  assert.equal(stored.status, 'completed');
  assert.equal(await Equipment.countDocuments({ code: new RegExp(`^NEW-${proposal._id}`.toUpperCase()) }), 1);
  assert.equal(await EquipmentMovement.countDocuments({ equipment_id: stored.replacement_equipment_id }), 1);
  assert.equal((await Equipment.findById(original._id)).status, 'disposed');
});
test('receipt failure after replacement insertion leaves no orphan asset or movement', async (t) => {
  const { original, proposal } = await fixture();
  const code = `FAIL-${proposal._id}`;
  t.mock.method(EquipmentMovement, 'create', async () => { throw new Error('Injected movement failure'); });
  const res = response();
  await completeDisposalReceipt({ user: actor, params: { id: String(proposal._id) }, body: { code, price: 90 } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(await Equipment.countDocuments({ code }), 0);
  assert.equal((await Disposal.findById(proposal._id)).status, 'procurement_planned');
  assert.equal((await Equipment.findById(original._id)).status, 'pending_disposal');
});
test('transaction rolls back an earlier persisted update when a later step fails', async () => {
  const { original } = await fixture();
  await assert.rejects(runTransaction(async session => {
    await Equipment.updateOne({ _id: original._id }, { status: 'disposed' }, { session });
    throw new Error('Injected failure');
  }), /Injected failure/);
  assert.equal((await Equipment.findById(original._id)).status, 'pending_disposal');
});

test('two concurrent approvals cannot issue more than available stock', async () => {
  const part = await SparePart.create({ code: randomUUID(), name: 'Test', stock: 5, price: 10 });
  const requests = await PartsRequest.create([0, 1].map(() => ({ repair_id: id(), requested_by: actor._id,
    items: [{ part_id: part._id, qty: 4, quantity: 4 }], status: 'pending' })));
  const responses = [response(), response()];
  await Promise.all(requests.map((request, i) => approvePartsRequest({ params: { id: String(request._id) },
    user: { ...actor, role: 'facility_manager' } }, responses[i])));
  assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
  assert.equal((await SparePart.findById(part._id)).stock, 1);
  assert.equal(await PartsRequest.countDocuments({ _id: { $in: requests.map(r => r._id) }, status: 'approved' }), 1);
});

test('movement failure rolls back the already saved completed order', async (t) => {
  const { original } = await fixture();
  original.status = 'in_use'; await original.save();
  const destination = await Room.create({ code: 'P102', name: 'Target', floor: 1, capacity: 10 });
  const movement = await EquipmentMovement.create({ equipment_id: original._id, type: 'transfer',
    from_room_id: room._id, to_room_id: destination._id, ordered_by: actor._id, status: 'approved' });
  t.mock.method(Equipment.prototype, 'save', async () => { throw new Error('Injected equipment failure'); });
  const res = response();
  await confirmMovement({ params: { id: String(movement._id) }, body: {}, user: actor }, res);
  assert.equal(res.statusCode, 500);
  assert.equal((await EquipmentMovement.findById(movement._id)).status, 'approved');
  assert.equal(String((await Equipment.findById(original._id)).room_id), String(room._id));
});
