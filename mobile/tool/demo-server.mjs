// Isolated fixtures for the PRM presentation. Uses the REAL Ruo routes and models.
// Never seeds, clears or selects the application's database.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const express = require('express');
const mongoose = require('mongoose');
import authRoutes from '../../server/src/routes/authRoutes.js';
import facilityRoutes from '../../server/src/routes/facilityRoutes.js';
import dashboardRoutes from '../../server/src/routes/dashboardRoutes.js';
import reportRoutes from '../../server/src/routes/reportRoutes.js';
import inventoryRoutes from '../../server/src/routes/inventoryRoutes.js';
import { errorHandler } from '../../server/src/middlewares/errorMiddleware.js';
import { User } from '../../server/src/models/User.js';
import { Room } from '../../server/src/models/Room.js';
import { Equipment } from '../../server/src/models/Equipment.js';
import { Category } from '../../server/src/models/Category.js';
import { Supplier } from '../../server/src/models/Supplier.js';
import { Repair } from '../../server/src/models/Repair.js';
import { RepairLog } from '../../server/src/models/RepairLog.js';
import { EquipmentMovement } from '../../server/src/models/EquipmentMovement.js';
import { InventorySession } from '../../server/src/models/InventorySession.js';
import { InventoryLog } from '../../server/src/models/InventoryLog.js';

const database = `ruo_mobile_demo_${randomUUID().replaceAll('-', '')}`;
const port = Number(process.env.RUO_DEMO_PORT || 5001);
const password = process.env.RUO_DEMO_PASSWORD;
if (!password || password.length < 12) throw new Error('Set RUO_DEMO_PASSWORD (at least 12 characters) before starting.');
process.env.JWT_SECRET = randomUUID() + randomUUID();
process.env.NODE_ENV = 'test';
let server;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => close().then(() => process.exit(0)));

try {
  await mongoose.connect(process.env.RUO_DEMO_MONGO || 'mongodb://127.0.0.1:27017', {
    dbName: database, serverSelectionTimeoutMS: 5000,
  });
  const users = {};
  for (const role of ['admin', 'facility_manager', 'technician', 'lecturer']) {
    users[role] = await User.create({ code: `DEMO-${role}`, email: `${role}@ruo.example`,
      full_name: role === 'admin' ? 'Tùng · Quản trị viên' : `Demo ${role}`,
      password_hash: password, role, status: 'active', force_change_pw: false });
  }
  const rooms = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (let number = 1; number <= 8; number++) {
      // P108 intentionally reserved for the create-room demo.
      if (floor === 1 && number === 8) continue;
      rooms.push(await Room.create({ code: `P${floor}0${number}`, name: `${number % 2 ? 'Phòng học' : 'Phòng thực hành'} ${floor}0${number}`,
        building: 'A1', floor, capacity: number % 2 ? 60 : 35, room_type: number % 2 ? 'lecture' : 'lab',
        description: 'Phục vụ giảng dạy và học tập', cadCoordinates: { gridX: (number - 1) % 2, gridY: Math.floor((number - 1) / 2) } }));
    }
  }
  const category = await Category.create({ code: 'PRM-PC', name: 'Máy tính và trình chiếu' });
  const supplier = await Supplier.create({ code: 'PRM-NCC', name: 'Nhà cung cấp demo', phone: '0900000000', email: 'support@ruo.example' });
  const now = new Date();
  const equipments = [];
  for (let i = 0; i < 28; i++) {
    const status = ['in_use', 'in_use', 'broken', 'repairing', 'in_stock', 'in_use', 'pending_disposal'][i % 7];
    equipments.push(await Equipment.create({ code: `PRM-${String(i + 1).padStart(3, '0')}`, qr_code: `RUO-PRM-${i + 1}`,
      serial_number: `SN-PRM-${i + 1}`, name: i % 2 ? 'Máy chiếu giảng đường' : 'Máy tính thực hành',
      category_id: category._id, supplier_id: supplier._id, room_id: status === 'in_stock' ? null : rooms[i % rooms.length]._id,
      price: 12000000 + i * 100000, status,
      purchase_date: new Date(now.getFullYear() - 2, 0, 15), warranty_expiry: new Date(now.getTime() + (i + 1) * 86400000) }));
  }
  for (const [i, equipment] of equipments.filter(e => ['broken', 'repairing'].includes(e.status)).entries()) {
    const repair = await Repair.create({ ticket_code: `PRM-SC-${i + 1}`, equipment_id: equipment._id,
      room_id: equipment.room_id, reported_by: users.lecturer._id, assigned_to: users.technician._id,
      incident_description: 'Thiết bị không khởi động, cần kiểm tra nguồn', damage_level: i % 2 ? 'major' : 'minor',
      status: equipment.status === 'repairing' ? 'in_progress' : 'reported',
      reported_at: new Date(now.getTime() - 7 * 86400000), deadline: new Date(now.getTime() - (i + 1) * 3600000) });
    await RepairLog.create({ repair_id: repair._id, performed_by: users.technician._id,
      action: 'in_progress', description: 'Kiểm tra và sửa nguồn', cost: 250000 + i * 50000,
      timestamp: new Date(now.getFullYear(), i % 12, 15) });
  }
  await EquipmentMovement.create({ equipment_id: equipments[0]._id, type: 'allocation',
    to_room_id: rooms[0]._id, ordered_by: users.admin._id, status: 'completed', reason: 'Trang bị phòng học', completed_at: now });
  const inventory = await InventorySession.create({ name: 'Kiểm kê PRM mẫu', scope_type: 'all', created_by: users.admin._id,
    status: 'completed', date: now, completed_at: now });
  await InventoryLog.create({ session_id: inventory._id, equipment_id: equipments[0]._id,
    scanned_room_id: rooms[0]._id, scanned_by: users.technician._id, status: 'matched' });
  const app = express();
  app.use(require('cors')());
  app.use(express.json());
  app.get('/api/health', (_, res) => res.json({ success: true, demo: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/facilities', facilityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/inventory-sessions', inventoryRoutes);
  app.use(errorHandler);
  server = app.listen(port, '127.0.0.1');
  await once(server, 'listening');
  console.log(`Demo ready: http://127.0.0.1:${port}/api (Android emulator: http://10.0.2.2:${port}/api)`);
  console.log(`Temporary database: ${database}. Ctrl+C closes the demo and removes ONLY this database.`);
  console.log('Accounts: admin@ruo.example, facility_manager@ruo.example, lecturer@ruo.example, technician@ruo.example');
  console.log('Password: the value you supplied in RUO_DEMO_PASSWORD. P108 is available for room creation.');
} catch (error) {
  console.error(error.message);
  await close();
  process.exitCode = 1;
}
