import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { completeDisposalReceipt } from '../src/controllers/disposalController.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Category } from '../src/models/Category.js';
import { Disposal } from '../src/models/Disposal.js';
import { Equipment } from '../src/models/Equipment.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { Room } from '../src/models/Room.js';

const mockReceiptModels = (t, { budget = 12000000 } = {}) => {
  const proposal = {
    _id: 'disposal-1',
    status: 'procurement_planned',
    equipment_id: 'old-equipment',
    procurement: { budget, category_id: 'category-1', room_id: 'room-1', replacement_name: 'Máy chiếu mới' },
    save: async () => {}
  };
  const original = {
    _id: 'old-equipment',
    code: 'EQ-OLD',
    status: 'pending_disposal',
    save: async () => {}
  };
  const replacement = { _id: 'new-equipment', qr_code: 'QR-EQ-NEW' };
  const movements = [];
  const auditRecords = [];
  const originals = [
    [Disposal, 'findById', Disposal.findById],
    [Equipment, 'findById', Equipment.findById],
    [Equipment, 'findOne', Equipment.findOne],
    [Equipment, 'exists', Equipment.exists],
    [Equipment, 'create', Equipment.create],
    [EquipmentMovement, 'create', EquipmentMovement.create],
    [Category, 'findById', Category.findById],
    [Room, 'findById', Room.findById],
    [AuditLog, 'logAction', AuditLog.logAction]
  ];

  Disposal.findById = async () => proposal;
  Equipment.findById = async () => original;
  Equipment.findOne = async () => null;
  Equipment.exists = async () => false;
  Equipment.create = async (data) => Object.assign(replacement, data);
  EquipmentMovement.create = async (data) => movements.push(data);
  Category.findById = async () => ({ _id: 'category-1' });
  Room.findById = async () => ({ _id: 'room-1' });
  AuditLog.logAction = async (data) => auditRecords.push(data);
  t.after(() => originals.forEach(([model, method, value]) => { model[method] = value; }));

  return { proposal, original, replacement, movements, auditRecords };
};

const makeResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

describe('UC-7.11 replacement asset receipt', () => {
  test('creates the replacement asset and QR, movement, and completion records', async (t) => {
    const models = mockReceiptModels(t);
    const res = makeResponse();

    await completeDisposalReceipt({
      params: { id: 'disposal-1' },
      body: { code: 'EQ-NEW', serial_number: 'SN-1', brand: 'Epson', model: 'X1', price: 11000000 },
      user: { _id: 'technician-1', role: 'technician', full_name: 'KTV', code: 'KT001' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.replacement.qr_code, 'QR-EQ-NEW');
    assert.equal(models.proposal.status, 'completed');
    assert.equal(models.proposal.replacement_equipment_id, 'new-equipment');
    assert.equal(models.original.status, 'disposed');
    assert.equal(models.movements.length, 1);
    assert.equal(models.movements[0].to_room_id, 'room-1');
    assert.equal(models.auditRecords[0].action, 'DISPOSAL_RECEIPT');
  });

  test('rejects a zero price and a receipt above the planned budget', async (t) => {
    const models = mockReceiptModels(t);
    const zeroPriceResponse = makeResponse();
    const request = {
      params: { id: 'disposal-1' },
      body: { code: 'EQ-NEW', price: 0 },
      user: { _id: 'technician-1', role: 'technician', full_name: 'KTV', code: 'KT001' }
    };

    await completeDisposalReceipt(request, zeroPriceResponse);
    assert.equal(zeroPriceResponse.statusCode, 400);
    assert.equal(models.movements.length, 0);

    const overBudgetResponse = makeResponse();
    request.body.price = 12000001;
    await completeDisposalReceipt(request, overBudgetResponse);
    assert.equal(overBudgetResponse.statusCode, 422);
    assert.equal(models.movements.length, 0);
    assert.equal(models.proposal.status, 'procurement_planned');
  });
});
