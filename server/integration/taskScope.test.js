import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import facilityRoutes from '../src/routes/facilityRoutes.js';
import dashboardRoutes from '../src/routes/dashboardRoutes.js';
import reportRoutes from '../src/routes/reportRoutes.js';
import movementRoutes from '../src/routes/movementRoutes.js';
import { User } from '../src/models/User.js';
import { Room } from '../src/models/Room.js';
import { Equipment } from '../src/models/Equipment.js';
import { Category } from '../src/models/Category.js';
import '../src/models/Supplier.js';
import { Repair } from '../src/models/Repair.js';
import { RepairLog } from '../src/models/RepairLog.js';
import { SparePart } from '../src/models/SparePart.js';
import { PartsRequest } from '../src/models/PartsRequest.js';
import { EquipmentMovement } from '../src/models/EquipmentMovement.js';
import { AuditLog } from '../src/models/AuditLog.js';

// Only the randomly named database created by this test is dropped. Never seed application data.
const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27028';
const database = `ruo_task_test_${randomUUID().replaceAll('-', '')}`;
let server, base, room, emptyRoom, equipment, category, users;
const tokens = {};
const request = async (path, role = 'admin', method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, { method, headers: {
    ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}), 'Content-Type': 'application/json'
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 5000 });
  process.env.JWT_SECRET = randomUUID();
  users = await User.insertMany(['admin', 'facility_manager', 'technician', 'lecturer'].map(role => ({
    code: `TEST-${role}`, full_name: role, email: `${role}@test.example`, password_hash: 'unused-in-test', role, status: 'active'
  })));
  for (const user of users) tokens[user.role] = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);
  [room, emptyRoom] = await Room.create([
    { code: 'P101', name: 'Phòng kiểm thử', floor: 1, capacity: 50 },
    { code: 'P102', name: 'Phòng trống', floor: 1, capacity: 20 }
  ]);
  category = await Category.create({ code: 'TEST', name: 'Thiết bị kiểm thử' });
  const statuses = [...Array(150).fill('in_use'), ...Array(25).fill('in_stock'), ...Array(20).fill('broken'),
    ...Array(5).fill('repairing'), ...Array(50).fill('disposed'), ...Array(10).fill('lost')];
  equipment = await Equipment.insertMany(statuses.map((status, index) => ({ code: `E${index}`, name: `Thiết bị ${index}`,
    qr_code: `QR${index}`, serial_number: `SERIAL${index}`, category_id: category._id, room_id: room._id,
    status, price: 100, purchase_date: new Date('2026-01-01'), repair_count: 99 })));
  const admin = users.find(user => user.role === 'admin');
  const repairs = await Repair.insertMany(Array.from({ length: 26 }, (_, index) => ({
    equipment_id: equipment[index < 2 ? 0 : index]._id, reported_by: admin._id, incident_description: 'Sự cố kiểm thử',
    status: index === 25 ? 'closed' : 'reported', reported_at: new Date('2026-02-01'),
    deadline: index < 3 || index === 25 ? new Date('2026-01-01') : null, total_cost: 999999
  })));
  await RepairLog.insertMany([
    { timestamp: new Date('2025-12-31T16:59:59Z'), cost: 999 },
    { timestamp: new Date('2025-12-31T17:00:00Z'), cost: 100 },
    { timestamp: new Date('2026-03-31T16:59:59Z'), cost: 50 },
    { timestamp: new Date('2026-03-31T17:00:00Z'), cost: 70 },
    { timestamp: new Date('2026-12-31T17:00:00Z'), cost: 888 }
  ].map(row => ({ ...row, repair_id: repairs[0]._id, performed_by: admin._id, action: 'in_progress', description: 'Chi phí' })));
  const part = await SparePart.create({ code: 'PART', name: 'Linh kiện', stock: 4, price: 30 });
  await PartsRequest.create([
    { repair_id: repairs[0]._id, requested_by: admin._id, status: 'approved', approved_at: new Date('2026-01-01'), items: [{ part_id: part._id, qty: 2, quantity: 2, unit_price: 30 }] },
    { repair_id: repairs[0]._id, requested_by: admin._id, status: 'pending', items: [{ part_id: part._id, qty: 99, unit_price: 30 }] }
  ]);
  const app = express();
  app.use(express.json());
  app.use('/api/facilities', facilityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/movements', movementRoutes);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('four authenticated roles can read CAD; analytics and legacy reports require management roles', async () => {
  assert.equal((await request('/api/dashboard/kpi', null)).status, 401);
  for (const role of ['admin', 'facility_manager', 'technician', 'lecturer']) {
    assert.equal((await request('/api/facilities/cad-canvas?floorNumber=1', role)).status, 200);
    for (const path of ['/api/dashboard/kpi', '/api/dashboard/repair-cost', '/api/dashboard/health-score', '/api/reports/dashboard', '/api/reports/by-room', '/api/reports/by-status', '/api/reports/repair-costs', '/api/reports/equipment-health']) {
      const result = await request(path, role);
      assert.equal(result.status, ['admin', 'facility_manager'].includes(role) ? 200 : 403, `${role} ${path}: ${JSON.stringify(result.body)}`);
    }
    if (role !== 'admin') assert.equal((await request('/api/facilities/rooms', role, 'POST', { code: 'P103' })).status, 403);
  }
});

test('KPI counts all 260 assets, values inventory, and excludes closed/null-deadline repairs from overdue', async () => {
  const { status, body } = await request('/api/dashboard/kpi');
  assert.equal(status, 200);
  assert.equal(body.metrics.totalEquipment, 260);
  assert.equal(body.metrics.operatingRate, 75);
  assert.equal(body.metrics.openRepairs, 25);
  assert.equal(body.metrics.overdueRepairs, 3);
  assert.equal(body.metrics.warehouseValue, 2620);
});

test('cost aggregation honors Vietnam year/quarter boundaries and never re-adds repair totals', async () => {
  const monthly = await request('/api/dashboard/repair-cost?year=2026');
  assert.equal(monthly.status, 200);
  assert.equal(monthly.body.series.length, 12);
  assert.deepEqual(monthly.body.totals, { repairCost: 220, partsCost: 60, totalCost: 280 });
  assert.equal(monthly.body.series[0].totalCost, 160);
  const quarterly = await request('/api/dashboard/repair-cost?year=2026&period=quarter');
  assert.deepEqual(quarterly.body.series.map(row => row.totalCost), [210, 70, 0, 0]);
  for (const query of ['year=oops', 'period=week', 'year[$gt]=2020']) assert.equal((await request(`/api/dashboard/repair-cost?${query}`)).status, 400);
});

test('health score counts incident records rather than stale repair_count; paginates all active assets', async () => {
  const { status, body } = await request('/api/dashboard/health-score?limit=10');
  assert.equal(status, 200);
  assert.equal(body.total, 200);
  assert.equal(body.equipment.length, 10);
  assert.equal(body.totalPages, 20);
  const first = body.equipment.find(row => row.code === 'E0');
  assert.equal(first.failureCount, 2);
  assert.ok(Math.abs(first.mtbfDays - first.ageDays / 2) < 0.02);
  assert.equal((await request('/api/dashboard/health-score?page=-1')).status, 400);
});

test('CAD, room detail and reports agree on equipment and include serial/QR/history', async () => {
  const cad = await request('/api/facilities/cad-canvas?floorNumber=1');
  assert.equal(cad.body.rooms.find(item => item.code === 'P101').equipmentCount, 200);
  assert.equal(cad.body.rooms.find(item => item.code === 'P101').brokenCount, 25);
  const detail = await request('/api/facilities/rooms/A1-101');
  assert.equal(detail.status, 200);
  assert.equal(detail.body.equipments[0].serial_number, 'SERIAL0');
  assert.equal(detail.body.equipments[0].qr_code, 'QR0');
  assert.equal(detail.body.maintenanceHistory.length, 20);
  assert.equal(detail.body.summary.openRepairs, 25);
  const report = await request('/api/reports/by-room');
  assert.equal(report.body.rooms.find(item => item.code === 'P101').count, 200);
  assert.equal(report.body.rooms.find(item => item.code === 'P102').count, 0);
});

test('room lifecycle validates input, rejects duplicates, audits edits, blocks occupied deactivation', async () => {
  const payload = { code: 'P103', name: 'Phòng mới', capacity: 30, room_type: 'lecture', floor: 1 };
  assert.equal((await request('/api/facilities/rooms', 'admin', 'POST', { ...payload, floor: 2 })).status, 400);
  const created = await request('/api/facilities/rooms', 'admin', 'POST', payload);
  assert.equal(created.status, 201);
  assert.equal((await request('/api/facilities/rooms', 'admin', 'POST', payload)).status, 409);
  const id = created.body.room._id;
  const update = await request(`/api/facilities/rooms/${id}`, 'admin', 'PUT', { name: 'Tên mới', capacity: 40, description: 'Phòng thực hành' });
  assert.equal(update.status, 200);
  const audit = await AuditLog.findOne({ entity_id: id, action: 'ROOM_UPDATED' });
  assert.equal(audit.old_value.capacity, 30);
  assert.equal(audit.new_value.capacity, 40);
  assert.equal((await request(`/api/facilities/rooms/${room._id}/deactivate`, 'admin', 'PUT', {})).status, 409);
  assert.equal((await request(`/api/facilities/rooms/${room._id}/status`, 'admin', 'PUT', { status: ' inactive ' })).status, 409);
  assert.equal((await request(`/api/facilities/rooms/${id}/deactivate`, 'admin', 'PUT', {})).status, 200);
  assert.equal((await request(`/api/facilities/rooms/${id}/status`, 'admin', 'PUT', { status: 'available' })).status, 200);
  const list = await request('/api/facilities/rooms?floor=1&room_type=lecture&status=available&q=T%C3%AAn&page=1&limit=1');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.rooms[0]._id, id);
});

test('inactive rooms cannot receive new or previously approved transfers', async () => {
  await Room.updateOne({ _id: emptyRoom._id }, { status: 'inactive' });
  const created = await request('/api/movements', 'facility_manager', 'POST', {
    equipment_id: equipment[0]._id, to_room_id: emptyRoom._id, reason: 'Chuyển sang phòng khác', type: 'transfer'
  });
  assert.equal(created.status, 409);
  const manager = users.find(user => user.role === 'facility_manager');
  const movement = await EquipmentMovement.create({ equipment_id: equipment[1]._id, from_room_id: room._id,
    to_room_id: emptyRoom._id, ordered_by: manager._id, status: 'approved', type: 'transfer', reason: 'Đã duyệt trước khi đóng phòng' });
  assert.equal((await request(`/api/movements/${movement._id}/complete`, 'technician', 'PUT', {})).status, 409);
  assert.equal((await Equipment.findById(equipment[1]._id)).room_id.toString(), room._id.toString());
});
