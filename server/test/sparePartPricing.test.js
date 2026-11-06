import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { approvePartsRequest } from '../src/controllers/sparePartController.js';
import { PartsRequest } from '../src/models/PartsRequest.js';
import { SparePart } from '../src/models/SparePart.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { normalizePartsRequestItems } from '../src/services/partsRequestItems.js';

const requestId = '67a000000000000000000001';
const partId = '67a000000000000000000002';
const secondPartId = '67a000000000000000000003';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });
const req = { params: { id: requestId }, user: { _id: '67a000000000000000000004', role: 'facility_manager' } };

function setup(t, { stock = 10, items = [{ part_id: partId, qty: 2, unit_price: 1 }], failRequest = false } = {}) {
  let state = { request: { _id: requestId, status: 'pending', items }, stock };
  let writes = 0;
  let ended = false;
  const session = {
    async withTransaction(work) {
      const previous = structuredClone(state);
      try { return await work(); } catch (error) { state = previous; throw error; }
    },
    async endSession() { ended = true; }
  };
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(PartsRequest, 'findById', async (id, projection, options) => {
    assert.equal(options.session, session);
    return structuredClone(state.request);
  });
  t.mock.method(SparePart, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.session, session);
    assert.equal(update.$inc.stock, -filter.stock.$gte);
    if (filter._id !== partId || state.stock < filter.stock.$gte) return null;
    writes++;
    state.stock += update.$inc.stock;
    return { price: 75000, stock: state.stock, min_stock: 1, name: 'Linh kiện', code: 'SP1' };
  });
  t.mock.method(PartsRequest, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.session, session);
    if (failRequest) throw new Error('injected request save failure');
    if (state.request.status !== filter.status) return null;
    Object.assign(state.request, update.$set);
    return structuredClone(state.request);
  });
  t.mock.method(AuditLog, 'logAction', async () => {});
  return { get state() { return state; }, get writes() { return writes; }, get ended() { return ended; } };
}

test('approval stores catalog price, merges repeated entries and cannot deduct twice on retry', async (t) => {
  const models = setup(t, { items: [{ part_id: partId, qty: 2, unit_price: 1 }, { part_id: partId, quantity: 3 }] });
  const res = response();
  await approvePartsRequest(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.partsRequest.items.length, 1);
  assert.equal(res.body.partsRequest.items[0].unit_price, 75000);
  assert.equal(res.body.partsRequest.items[0].qty, 5);
  assert.equal(models.state.stock, 5);
  assert.equal(models.writes, 1);
  const retry = response();
  await approvePartsRequest(req, retry);
  assert.equal(retry.statusCode, 409);
  assert.equal(models.state.stock, 5);
  assert.equal(models.ended, true);
});

test('duplicate rows exceeding total stock reject without clamping stock or approving', async (t) => {
  const models = setup(t, { stock: 5, items: [{ part_id: partId, qty: 4 }, { part_id: partId, qty: 4 }] });
  const res = response();
  await approvePartsRequest(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(models.state.stock, 5);
  assert.equal(models.state.request.status, 'pending');
});

test('later line shortage rolls back earlier deductions', async (t) => {
  const models = setup(t, { items: [{ part_id: partId, qty: 2 }, { part_id: secondPartId, qty: 1 }] });
  const res = response();
  await approvePartsRequest(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(models.writes, 1);
  assert.equal(models.state.stock, 10);
  assert.equal(models.state.request.status, 'pending');
});

test('failure saving approval rolls back stock deductions', async (t) => {
  const models = setup(t, { failRequest: true });
  const res = response();
  await approvePartsRequest(req, res);
  assert.equal(res.statusCode, 500);
  assert.equal(models.state.stock, 10);
  assert.equal(models.state.request.status, 'pending');
});

test('invalid quantities, conflicting legacy aliases and unsafe totals are rejected', () => {
  for (const qty of [0, -1, 0.5, Infinity, NaN, true, '', undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => normalizePartsRequestItems([{ part_id: partId, qty }]), { statusCode: 400 });
  }
  assert.throws(() => normalizePartsRequestItems([{ part_id: partId, qty: 1, quantity: 2 }]), { statusCode: 400 });
  assert.throws(() => normalizePartsRequestItems([{ part_id: partId, qty: Number.MAX_SAFE_INTEGER }, { part_id: partId, qty: 1 }]), { statusCode: 400 });
  assert.throws(() => normalizePartsRequestItems([{ part_id: 'missing', qty: 1 }]), { statusCode: 400 });
  assert.throws(() => normalizePartsRequestItems([]), { statusCode: 400 });
});
