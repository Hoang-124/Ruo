import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
  User, 
  Role, 
  Room, 
  Building, 
  Floor, 
  Category, 
  Supplier, 
  RepairUnit, 
  SparePart,
  Equipment, 
  EquipmentMovement, 
  Disposal, 
  Repair, 
  RepairLog, 
  AuditLog 
} from '../models/index.js';
import { 
  USER_ROLES, 
  EQUIPMENT_STATUSES, 
  ROOM_TYPES,
  ROOM_STATUSES,
  MOVEMENT_TYPES,
  MOVEMENT_STATUSES,
  REPAIR_STATUSES,
  REPAIR_SOURCES,
  REPAIR_OUTCOMES,
  DISPOSAL_STATUSES 
} from '../config/constants.js';

dotenv.config();

const seed = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log(`[Ruo Seeder] Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);

  console.log('[Ruo Seeder] Dropping old collections & stale indexes for clean state...');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    try {
      await mongoose.connection.db.dropCollection(col.name);
    } catch (e) {}
  }

  console.log('[Ruo Seeder] 1. Seeding 4 Canonical Roles...');
  const [roleLecturer, roleTech, roleFM, roleAdmin] = await Role.create([
    {
      name: USER_ROLES.LECTURER,
      permissions: ['incident:create', 'incident:read_own', 'repair:rate', 'room:read', 'equipment:read']
    },
    {
      name: USER_ROLES.TECHNICIAN,
      permissions: ['repair:read_assigned', 'repair:accept', 'repair:log', 'repair:report_outcome', 'parts:request', 'movement:confirm', 'inventory:scan', 'equipment:read']
    },
    {
      name: USER_ROLES.FACILITY_MANAGER,
      permissions: [
        'equipment:create', 'equipment:update', 'equipment:import', 'equipment:qr',
        'warranty:read', 'warranty:update', 'repair:read', 'repair:assign', 'repair:close',
        'parts:approve', 'spare_part:update', 'movement:order', 'placement:decide',
        'inventory:create', 'inventory:reconcile', 'disposal:propose', 'dashboard:read'
      ]
    },
    {
      name: USER_ROLES.ADMIN,
      permissions: [
        'user:create', 'user:update', 'user:lock', 'user:reset_password', 'role:update',
        'category:*', 'supplier:*', 'repair_unit:*', 'room:*',
        'disposal:approve', 'dashboard:read', 'report:export',
        'audit:read', 'audit:verify', 'audit:export'
      ]
    }
  ]);

  console.log('[Ruo Seeder] 2. Seeding 4 Canonical Users (Password: Ruo@2026)...');
  const commonPassword = 'Ruo@2026';

  const [admin, fm, tech, lecturer] = await User.create([
    {
      code: 'AD001',
      email: 'admin@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Quản Trị Viên Hệ Thống',
      role: USER_ROLES.ADMIN,
      department: 'Phòng Quản Trị Hệ Thống',
      phone: '0901234567',
      avatar: 'AD'
    },
    {
      code: 'QL001',
      email: 'manager@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Quản Lý CSVC Lê Hoàng Hải',
      role: USER_ROLES.FACILITY_MANAGER,
      department: 'Phòng Quản Lý Cơ Sở Vật Chất',
      phone: '0912345678',
      avatar: 'LH'
    },
    {
      code: 'KT001',
      email: 'technician@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Kỹ Thuật Viên Trần Minh Tuấn',
      role: USER_ROLES.TECHNICIAN,
      department: 'Tổ Kỹ Thuật Bảo Trì',
      phone: '0987654321',
      avatar: 'TT'
    },
    {
      code: 'GV001',
      email: 'lecturer@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Giảng Viên Nguyễn Văn An',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Công Nghệ Thông Tin',
      phone: '0971234567',
      avatar: 'NA'
    },
    {
      code: 'GV002',
      email: 'hoang.tb220412@university.edu.vn',
      password_hash: commonPassword,
      full_name: 'Giảng Viên Hoàng Test',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Công Nghệ Thông Tin',
      phone: '0988889999',
      avatar: 'HT'
    }
  ]);

  console.log('[Ruo Seeder] 3. Seeding Master Data...');
  const buildingA1 = await Building.create({
    code: 'A1',
    name: 'Tòa Nhà Học Vụ A1',
    campusZone: 'Khu Trung Tâm',
    totalFloors: 5,
    description: 'Tòa nhà giảng đường chính'
  });

  const [catProjector, catAC, catPC] = await Category.create([
    { code: 'CAT-PRJ', name: 'Máy chiếu tương tác', description: 'Máy chiếu độ phân giải cao' },
    { code: 'CAT-AC', name: 'Điều hòa công suất lớn', description: 'Điều hòa âm trần Inverter' },
    { code: 'CAT-PC', name: 'Máy tính trạm Lab', description: 'Máy tính phục vụ thực hành' }
  ]);

  const [supplierA, supplierB] = await Supplier.create([
    { code: 'SUP-01', name: 'Công ty Cổ phần Công nghệ FPT', phone: '02473007300', email: 'contact@fpt.com.vn', address: 'Cầu Giấy, Hà Nội' },
    { code: 'SUP-02', name: 'Tập đoàn Điện máy Daikin VN', phone: '18006777', email: 'service@daikin.com.vn', address: 'Ba Đình, Hà Nội' }
  ]);

  const [repairUnitExt] = await RepairUnit.create([
    { code: 'RU-01', name: 'Trung Tâm Bảo Hành Điện Máy Số 1', specialty: 'Máy chiếu và quang học', phone: '0243888999', address: 'Hai Bà Trưng, Hà Nội' }
  ]);

  console.log('[Ruo Seeder] 4. Seeding Rooms & Spare Warehouse...');
  const [warehouseRoom, room101, room201] = await Room.create([
    {
      code: 'KHO-01',
      name: 'Kho Thiết Bị Dự Phòng Trung Tâm',
      building: 'A1',
      floor: 1,
      room_type: ROOM_TYPES.WAREHOUSE,
      capacity: 0,
      area: 80,
      status: ROOM_STATUSES.AVAILABLE
    },
    {
      code: 'A1-101',
      name: 'Phòng Học Thông Minh A1-101',
      building: 'A1',
      floor: 1,
      room_type: ROOM_TYPES.LECTURE,
      capacity: 60,
      area: 75,
      required_equipment: [
        { category_id: catProjector._id, quantity: 1 },
        { category_id: catAC._id, quantity: 2 }
      ],
      status: ROOM_STATUSES.AVAILABLE
    },
    {
      code: 'A1-201',
      name: 'Phòng Thực Hành Mạng A1-201',
      building: 'A1',
      floor: 2,
      room_type: ROOM_TYPES.LAB,
      capacity: 40,
      area: 90,
      required_equipment: [
        { category_id: catPC._id, quantity: 30 },
        { category_id: catProjector._id, quantity: 1 }
      ],
      status: ROOM_STATUSES.AVAILABLE
    }
  ]);

  console.log('[Ruo Seeder] 5. Seeding Spare Parts (with 1 item below min_stock)...');
  await SparePart.create([
    { code: 'PART-LAMP', name: 'Bóng đèn máy chiếu Epson 250W', stock: 1, min_stock: 3, price: 1500000, unit: 'Cái', supplier_id: supplierA._id },
    { code: 'PART-GAS', name: 'Bình gas lạnh R32 (10kg)', stock: 5, min_stock: 2, price: 850000, unit: 'Bình', supplier_id: supplierB._id },
    { code: 'PART-RAM', name: 'Thanh RAM Kingston DDR4 16GB', stock: 12, min_stock: 5, price: 900000, unit: 'Thanh', supplier_id: supplierA._id }
  ]);

  console.log('[Ruo Seeder] 6. Seeding Equipments in Room & Spare in Warehouse...');
  // Active in room
  const eqProjectorRoom = await Equipment.create({
    code: 'EQ-PRJ-101',
    qr_code: 'QR-EQ-PRJ-101-VERIFIED',
    name: 'Máy Chiếu Siêu Gần Panasonic PT-TW370',
    serial_number: 'SN-PANA-988211',
    brand: 'Panasonic',
    model: 'PT-TW370',
    category_id: catProjector._id,
    room_id: room101._id,
    supplier_id: supplierA._id,
    price: 24500000,
    remaining_value: 19600000,
    status: EQUIPMENT_STATUSES.IN_USE
  });

  // Spare replacement in warehouse
  const eqProjectorSpare = await Equipment.create({
    code: 'EQ-PRJ-KHO-01',
    qr_code: 'QR-EQ-PRJ-KHO-01',
    name: 'Máy Chiếu Dự Phòng Panasonic PT-TW370',
    serial_number: 'SN-PANA-SPARE-01',
    brand: 'Panasonic',
    model: 'PT-TW370',
    category_id: catProjector._id,
    room_id: warehouseRoom._id,
    supplier_id: supplierA._id,
    price: 24500000,
    remaining_value: 24500000,
    status: EQUIPMENT_STATUSES.IN_STOCK
  });

  // Broken equipment needing repair
  const eqACBroken = await Equipment.create({
    code: 'EQ-AC-101-B',
    qr_code: 'QR-EQ-AC-101-B',
    name: 'Điều Hòa Daikin Inverter 2.5HP',
    serial_number: 'SN-DAIK-77112',
    brand: 'Daikin',
    model: 'FTKC60UVMV',
    category_id: catAC._id,
    room_id: room101._id,
    supplier_id: supplierB._id,
    price: 18900000,
    remaining_value: 12000000,
    estimated_repair_cost: 3500000,
    status: EQUIPMENT_STATUSES.BROKEN
  });

  console.log('[Ruo Seeder] 7. Seeding Initial Repair Ticket...');
  const repairIncident = await Repair.create({
    equipment_id: eqACBroken._id,
    source: REPAIR_SOURCES.LECTURER_REPORT,
    reported_by: lecturer._id,
    incident_description: 'Điều hòa kêu to và không mát sau 15 phút vận hành',
    damage_level: 'major',
    status: REPAIR_STATUSES.ASSIGNED,
    assigned_by: fm._id,
    assigned_to: tech._id,
    deadline: new Date(Date.now() + 24 * 3600 * 1000)
  });

  await RepairLog.create({
    repair_id: repairIncident._id,
    action: 'reported',
    performed_by: lecturer._id,
    description: 'Giảng viên báo cáo sự cố qua cổng người dùng'
  });

  await RepairLog.create({
    repair_id: repairIncident._id,
    action: 'assigned',
    performed_by: fm._id,
    description: 'Quản lý CSVC giao việc cho Kỹ thuật viên Trần Minh Tuấn'
  });

  console.log('[Ruo Seeder] 8. Seeding Cryptographic SHA-256 Audit Log...');
  await AuditLog.logAction({
    user_id: admin._id,
    user_display: `${admin.full_name} (${admin.code})`,
    action: 'SYSTEM_INIT',
    target_table: 'system',
    entity_id: admin._id.toString(),
    ip_address: '127.0.0.1',
    new_value: { system: 'Ruo UEMS', version: '4.0.0', actors: 5, collections: 20 }
  });

  console.log('\n====================================================');
  console.log('🎉 RUO SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Accounts:');
  console.log(' - Admin:             admin@ruo.edu.vn      / Ruo@2026');
  console.log(' - Facility Manager:  manager@ruo.edu.vn    / Ruo@2026');
  console.log(' - Technician:        technician@ruo.edu.vn / Ruo@2026');
  console.log(' - Lecturer:          lecturer@ruo.edu.vn   / Ruo@2026');
  console.log('====================================================\n');

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('[Ruo Seeder] Fatal Error:', err);
  process.exit(1);
});
