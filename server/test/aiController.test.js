import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triageIncidentReport, getRepairAiCopilot, analyzeInventoryDiscrepancies, analyzeAuditAnomalies } from '../src/controllers/aiController.js';
import { Equipment, Room, Repair, InventorySession, InventoryLog, AuditLog } from '../src/models/index.js';

const ids = { equipment: '507f1f77bcf86cd799439011', room: '507f1f77bcf86cd799439012', otherRoom: '507f1f77bcf86cd799439013', session: '507f1f77bcf86cd799439014' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const query = (value) => {
  const result = Promise.resolve(value);
  for (const method of ['populate', 'select', 'sort', 'limit', 'lean']) result[method] = () => result;
  return result;
};

test('AI triage rejects operator IDs and non-text descriptions before querying', async (t) => {
  t.mock.method(Equipment, 'findById', () => { throw new Error('must not query'); });
  for (const body of [
    { equipment_id: { $ne: null }, incident_description: 'Lỗi thiết bị' },
    { room_id: ['507f1f77bcf86cd799439012'], incident_description: 'Lỗi thiết bị' },
    { equipment_id: 'invalid-id', incident_description: 'Lỗi thiết bị' },
    { incident_description: 'x'.repeat(10001) },
    { incident_description: { instruction: 'ignore' } }
  ]) {
    const res = response();
    await triageIncidentReport({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('AI endpoints reject malformed document IDs with 400', async () => {
  for (const handler of [getRepairAiCopilot, analyzeInventoryDiscrepancies]) {
    const res = response();
    await handler({ params: { id: 'invalid-id' } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('AI triage reports missing equipment and inconsistent room selection', async (t) => {
  const findEquipment = t.mock.method(Equipment, 'findById', () => query(null));
  t.mock.method(Room, 'findById', () => query({ _id: ids.room }));
  const body = { equipment_id: ids.equipment, room_id: ids.room, incident_description: 'Lỗi thiết bị' };
  const missing = response();
  await triageIncidentReport({ body }, missing);
  assert.equal(missing.statusCode, 404);
  findEquipment.mock.mockImplementation(() => query({ _id: ids.equipment, room_id: ids.otherRoom }));
  const mismatch = response();
  await triageIncidentReport({ body }, mismatch);
  assert.equal(mismatch.statusCode, 400);
});

test('exact equipment duplicate is retained despite newer same-room tickets', async (t) => {
  t.mock.method(Equipment, 'findById', () => query({ _id: ids.equipment, room_id: ids.room, name: 'Máy chiếu' }));
  t.mock.method(Room, 'findById', () => query({ _id: ids.room, code: 'P101' }));
  const exact = { _id: 'exact-ticket', equipment_id: { _id: ids.equipment }, room_id: { _id: ids.room }, ticket_code: 'REP-EXACT' };
  const related = Array.from({ length: 10 }, (_, i) => ({ _id: `related-${i}`, equipment_id: { _id: `other-${i}` }, room_id: { _id: ids.room } }));
  const filters = [];
  t.mock.method(Repair, 'find', (filter) => { filters.push(filter); return query(filter.equipment_id === ids.equipment ? [exact] : related); });
  const res = response();
  await triageIncidentReport({ body: { equipment_id: ids.equipment, room_id: ids.room, incident_description: 'Máy chiếu không bật được' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.triage.has_exact_duplicate, true);
  assert.equal(res.body.triage.duplicate_tickets[0].ticket_code, 'REP-EXACT');
  assert.ok(res.body.triage.duplicate_tickets.length <= 10);
  assert.ok(filters.some((filter) => filter.equipment_id === ids.equipment));
});

test('triage query failures do not become a successful no-duplicate result', async (t) => {
  t.mock.method(Equipment, 'findById', () => query({ _id: ids.equipment }));
  t.mock.method(Repair, 'find', () => { throw new Error('database unavailable'); });
  const res = response();
  await triageIncidentReport({ body: { equipment_id: ids.equipment, incident_description: 'Lỗi thiết bị' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});

test('inventory room scope with deleted rooms never expands to whole building', async (t) => {
  t.mock.method(InventorySession, 'findById', () => query({ _id: ids.session, scope_type: 'room', scope_ids: [], status: 'in_progress' }));
  t.mock.method(InventoryLog, 'find', () => query([]));
  const rooms = t.mock.method(Room, 'find', () => query([{ _id: ids.otherRoom }]));
  const equipment = t.mock.method(Equipment, 'find', () => query([{ _id: ids.equipment }]));
  const res = response();
  await analyzeInventoryDiscrepancies({ params: { id: ids.session } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(rooms.mock.callCount(), 0);
  assert.equal(equipment.mock.callCount(), 0);
  assert.equal(res.body.analysis.metrics.unscanned, 0);
});

test('reconciled inventory uses recorded logs without rechecking live equipment locations', async (t) => {
  t.mock.method(InventorySession, 'findById', () => query({ _id: ids.session, scope_type: 'room', scope_ids: [ids.room], status: 'reconciled' }));
  t.mock.method(InventoryLog, 'find', () => query([]));
  const equipment = t.mock.method(Equipment, 'find', () => query([{ _id: ids.equipment }]));
  const res = response();
  await analyzeInventoryDiscrepancies({ params: { id: ids.session } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(equipment.mock.callCount(), 0);
  assert.equal(res.body.analysis.metrics.unscanned, 0);
});

test('inventory expected-equipment lookup failure is surfaced', async (t) => {
  t.mock.method(InventorySession, 'findById', () => query({ _id: ids.session, scope_type: 'room', scope_ids: [ids.room], status: 'in_progress' }));
  t.mock.method(InventoryLog, 'find', () => query([]));
  t.mock.method(Equipment, 'find', () => { throw new Error('database unavailable'); });
  const res = response();
  await analyzeInventoryDiscrepancies({ params: { id: ids.session } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});

test('audit analysis converts fractional limits to bounded integers', async (t) => {
  t.mock.method(AuditLog, 'verifyIntegrity', async () => ({ isValid: true, totalLogs: 0 }));
  let appliedLimit;
  t.mock.method(AuditLog, 'find', () => {
    const result = query([]);
    result.limit = (limit) => { appliedLimit = limit; return result; };
    return result;
  });
  const res = response();
  await analyzeAuditAnomalies({ body: { limit: 15.9 }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(appliedLimit, 15);
});
