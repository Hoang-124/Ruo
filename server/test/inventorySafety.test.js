import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { scanEquipmentInRoom, exportInventoryReport, reconcileSession } from '../src/controllers/inventoryController.js';
import { InventorySession, InventoryLog, Equipment, Room, Repair } from '../src/models/index.js';

const ids = { session: '67a000000000000000000001', room: '67a000000000000000000002', equipment: '67a000000000000000000003', outside: '67a000000000000000000004' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const query = (value) => ({ populate() { return this; }, sort() { return this; }, select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const req = (body = {}) => ({ params: { id: ids.session }, body: { equipment_id: ids.equipment, scanned_room_id: ids.room, ...body }, user: { _id: ids.outside, code: 'KT01' } });
const openSession = () => ({ _id: ids.session, status: 'in_progress', scope_type: 'room', scope_ids: [ids.room], save: async () => {} });

for (const [label, session, expected] of [
  ['missing', null, 404], ['draft', { status: 'draft' }, 400],
  ['reconciled', { status: 'reconciled' }, 400], ['completed', { status: 'completed' }, 400]
]) {
  test(`inventory rejects ${label} sessions before looking up or changing equipment`, async () => {
    mock.method(InventorySession, 'findById', async () => session);
    const equipment = mock.method(Equipment, 'findById', async () => { throw Error('must not access equipment'); });
    const log = mock.method(InventoryLog, 'findOneAndUpdate', async () => { throw Error('must not mutate'); });
    try {
      const res = response();
      await scanEquipmentInRoom(req({ is_damaged: true }), res);
      assert.equal(res.statusCode, expected);
      assert.equal(equipment.mock.callCount(), 0);
      assert.equal(log.mock.callCount(), 0);
    } finally { mock.restoreAll(); }
  });
}

test('invalid session id returns 400 before database access', async () => {
  const lookup = mock.method(InventorySession, 'findById', async () => { throw Error('must not query'); });
  try {
    const res = response();
    await scanEquipmentInRoom({ ...req(), params: { id: 'invalid' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(lookup.mock.callCount(), 0);
  } finally { mock.restoreAll(); }
});

test('session database failure does not become a successful orphan scan', async () => {
  mock.method(InventorySession, 'findById', async () => { throw Error('database unavailable'); });
  const mutation = mock.method(InventoryLog, 'findOneAndUpdate', async () => {});
  try {
    const res = response();
    await scanEquipmentInRoom(req(), res);
    assert.equal(res.statusCode, 500);
    assert.equal(mutation.mock.callCount(), 0);
  } finally { mock.restoreAll(); }
});

for (const [label, room] of [['outside session', { _id: ids.outside }], ['nonexistent', null]]) {
  test(`rejects ${label} scanned room before damaged equipment mutations`, async () => {
    mock.method(InventorySession, 'findById', async () => openSession());
    const save = mock.fn(async () => {});
    mock.method(Equipment, 'findById', async () => ({ _id: ids.equipment, room_id: ids.room, status: 'in_use', save }));
    mock.method(Room, 'findById', async () => room);
    const repair = mock.method(Repair, 'create', async () => {});
    const log = mock.method(InventoryLog, 'findOneAndUpdate', async () => {});
    try {
      const res = response();
      await scanEquipmentInRoom(req({ is_damaged: true }), res);
      assert.equal(res.statusCode, 400);
      assert.equal(save.mock.callCount(), 0);
      assert.equal(repair.mock.callCount(), 0);
      assert.equal(log.mock.callCount(), 0);
    } finally { mock.restoreAll(); }
  });
}

test('asset registered outside scope can be recorded as misplaced when physically found inside scope', async () => {
  const session = openSession();
  mock.method(InventorySession, 'findById', async () => session);
  mock.method(Equipment, 'findById', async () => ({ _id: ids.equipment, room_id: ids.outside, status: 'in_use' }));
  mock.method(Room, 'findById', async () => ({ _id: ids.room }));
  mock.method(InventoryLog, 'findOneAndUpdate', async (_, update) => update);
  mock.method(InventoryLog, 'find', () => query([{ status: 'wrong_location' }]));
  try {
    const res = response();
    await scanEquipmentInRoom(req(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.log.status, 'wrong_location');
    assert.equal(session.summary.wrong_location, 1);
  } finally { mock.restoreAll(); }
});

test('force flag cannot reopen a reconciled inventory for mutation', async () => {
  mock.method(InventorySession, 'findById', async () => ({ status: 'reconciled' }));
  const logs = mock.method(InventoryLog, 'bulkWrite', async () => {});
  try {
    const res = response();
    await reconcileSession(req({ force: true }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(logs.mock.callCount(), 0);
  } finally { mock.restoreAll(); }
});

test('export checksum covers all detail fields and makes no signature claim', async () => {
  const session = { ...openSession(), name: 'Inventory', date: '2026-11-01', created_by: { full_name: 'Manager' } };
  const log = { _id: 'log1', equipment_id: { _id: ids.equipment, code: 'EQ01', name: 'Projector', price: 100, room_id: { code: 'P101', name: 'Lab' } }, scanned_room_id: { code: 'P101', name: 'Lab' }, scanned_by: { full_name: 'Technician' }, status: 'matched', note: 'original' };
  mock.method(InventorySession, 'findById', () => query(session));
  mock.method(InventoryLog, 'find', () => query([log]));
  mock.method(Equipment, 'find', () => query([]));
  try {
    const res = response();
    await exportInventoryReport(req(), res);
    assert.equal(res.statusCode, 200);
    const { integrity, ...payload } = JSON.parse(JSON.stringify(res.body.report));
    const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
    assert.equal(integrity.hash, hash(payload));
    assert.equal(integrity.digitally_signed, false);
    assert.equal(integrity.verification_status, 'CHECKSUM_ONLY');
    assert.equal('digital_signature' in payload, false);
    for (const field of ['note', 'price', 'name', 'expected_room']) {
      const changed = structuredClone(payload);
      changed.categories.matched_items[0][field] = 'changed';
      assert.notEqual(hash(changed), integrity.hash, field);
    }
  } finally { mock.restoreAll(); }
});

test('report database failure is surfaced instead of claiming zero unscanned assets', async () => {
  mock.method(InventorySession, 'findById', () => query(openSession()));
  mock.method(InventoryLog, 'find', () => query([]));
  mock.method(Equipment, 'find', () => { throw Error('query failed'); });
  try {
    const res = response();
    await exportInventoryReport(req(), res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  } finally { mock.restoreAll(); }
});
