import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { approvePartsRequest } from '../src/controllers/sparePartController.js';
import { PartsRequest } from '../src/models/PartsRequest.js';
import { SparePart } from '../src/models/SparePart.js';
import { AuditLog } from '../src/models/AuditLog.js';

test('approval records the catalog price instead of trusting a client-supplied price', async () => {
  const request = { _id: 'r1', status: 'pending', items: [{ part_id: 'p1', qty: 2, unit_price: 1 }], save: async () => {} };
  mock.method(PartsRequest, 'findById', async () => request);
  mock.method(SparePart, 'findById', async () => ({ price: 75000, stock: 10, min_stock: 1, save: async () => {} }));
  mock.method(AuditLog, 'logAction', async () => {});
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  try {
    await approvePartsRequest({ params: { id: 'r1' }, user: { _id: 'u1', role: 'facility_manager' } }, res);
    assert.equal(res.body.success, true);
    assert.equal(res.body.partsRequest.items[0].unit_price, 75000);
  } finally { mock.restoreAll(); }
});
