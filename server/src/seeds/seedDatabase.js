import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
  User, 
  Role, 
  RefreshToken, 
  LoginHistory,
  Room, 
  Building, 
  Floor, 
  Category, 
  Supplier, 
  RepairUnit, 
  SparePart,
  Equipment, 
  Transfer, 
  Disposal, 
  ImportSession,
  Repair, 
  RepairLog, 
  PartsRequest, 
  RepairPart,
  MaintenancePlan, 
  MaintenanceLog, 
  InventorySession, 
  InventoryLog,
  Notification, 
  NotificationTemplate, 
  AuditLog 
} from '../models/index.js';
import { USER_ROLES } from '../config/constants.js';

dotenv.config();

const seed = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log(`[Ruo Seeder] Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);

  console.log('[Ruo Seeder] Dropping old collections & stale indexes to ensure clean state...');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    try {
      await mongoose.connection.db.dropCollection(col.name);
    } catch (e) {}
  }

  console.log('[Ruo Seeder] 1. Seeding Roles (3 Actors)...');
  const [roleLecturer, roleStaff, roleAdmin] = await Role.create([
    {
      name: 'lecturer',
      title: 'Giảng viên',
      description: 'Báo cáo sự cố thiết bị phòng học, theo dõi tiến độ sửa chữa, đánh giá chất lượng sửa chữa, kiểm tra danh mục phòng',
      permissions: ['incident:create', 'incident:read_own', 'repair:rate', 'room:read', 'equipment:read']
    },
    {
      name: 'maintenance_staff',
      title: 'Chuyên viên CSVC & Kỹ thuật viên',
      description: 'Quản lý toàn diện tài sản thiết bị, điều chuyển, tiếp nhận xử lý sự cố, bảo trì định kỳ, kiểm kê kho QR, đề xuất thanh lý',
      permissions: ['equipment:*', 'room:*', 'transfer:*', 'repair:*', 'parts:*', 'maintenance:*', 'inventory:*', 'disposal:propose', 'disposal:approve_staff', 'dashboard:read']
    },
    {
      name: 'admin',
      title: 'Quản trị viên Hệ thống (Admin)',
      description: 'Quản lý người dùng, phân quyền vai trò, danh mục chuẩn, báo cáo thống kê KPI, giám sát chuỗi kiểm toán SHA-256, ký duyệt thanh lý cuối cùng',
      permissions: ['user:*', 'role:*', 'catalog:*', 'report:*', 'audit:*', 'system:*', 'disposal:authorize', 'equipment:read', 'equipment:create', 'equipment:import']
    }
  ]);

  console.log('[Ruo Seeder] 2. Seeding Canonical Users (Password: Ruo@2026)...');
  const commonPassword = 'Ruo@2026';

  const [admin, staff, lecturer] = await User.create([
    {
      code: 'ADM001',
      email: 'admin@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Quản Trị Viên Đại Học',
      role: 'admin',
      department: 'Ban Giám Hiệu & Phòng Quản Trị Hệ Thống',
      phone: '0901234567',
      avatar: 'AD'
    },
    {
      code: 'KT202601',
      email: 'staff@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'Trần Minh Tuấn',
      role: 'maintenance_staff',
      department: 'Phòng Quản Lý Cơ Sở Vật Chất & Kỹ Thuật',
      phone: '0912345678',
      avatar: 'TT'
    },
    {
      code: 'GV202602',
      email: 'lecturer@ruo.edu.vn',
      password_hash: commonPassword,
      full_name: 'TS. Nguyễn Văn Nam',
      role: 'lecturer',
      department: 'Khoa Công Nghệ Thông Tin',
      phone: '0987654321',
      avatar: 'NN'
    }
  ]);

  console.log('[Ruo Seeder] 3. Seeding Campus Master Data (Building, Floors, Rooms)...');
  const buildingA1 = await Building.create({
    code: 'A1',
    name: 'Tòa Nhà Học Vụ A1',
    campusZone: 'Khu Trung Tâm',
    totalFloors: 5,
    description: 'Tòa nhà giảng đường chính, trang bị phòng học thông minh'
  });

  const rooms = await Room.create([
    {
      code: 'A1-101',
      name: 'Giảng Đường Thông Minh A1-101',
      building: 'A1',
      floor: 1,
      room_type: 'lecture',
      capacity: 120,
      area: 110,
      department: 'Khoa Công Nghệ Thông Tin',
      status: 'available',
      cadCoordinates: { gridX: 20, gridY: 40, spanCols: 2, spanRows: 1 }
    },
    {
      code: 'A1-201',
      name: 'Phòng Hội Thảo Khoa Học A1-201',
      building: 'A1',
      floor: 2,
      room_type: 'lecture',
      capacity: 80,
      area: 85,
      department: 'Khoa Công Nghệ Thông Tin',
      status: 'available',
      cadCoordinates: { gridX: 20, gridY: 100, spanCols: 2, spanRows: 1 }
    },
    {
      code: 'A1-301',
      name: 'Phòng Thực Hành Mạng & An Ninh A1-301',
      building: 'A1',
      floor: 3,
      room_type: 'lab',
      capacity: 45,
      area: 75,
      department: 'Khoa Công Nghệ Thông Tin',
      status: 'available',
      cadCoordinates: { gridX: 20, gridY: 160, spanCols: 2, spanRows: 1 }
    },
    {
      code: 'A1-401',
      name: 'Phòng Học Lý Thuyết Đa Phương Tiện A1-401',
      building: 'A1',
      floor: 4,
      room_type: 'lecture',
      capacity: 60,
      area: 70,
      department: 'Khoa Công Nghệ Thông Tin',
      status: 'available',
      cadCoordinates: { gridX: 20, gridY: 220, spanCols: 2, spanRows: 1 }
    },
    {
      code: 'A1-501',
      name: 'Kho Lưu Trữ Thiết Bị A1-501',
      building: 'A1',
      floor: 5,
      room_type: 'storage',
      capacity: 20,
      area: 50,
      department: 'Phòng Quản Lý Cơ Sở Vật Chất',
      status: 'available',
      cadCoordinates: { gridX: 20, gridY: 280, spanCols: 2, spanRows: 1 }
    }
  ]);

  console.log('[Ruo Seeder] 4. Seeding Categories, Suppliers & Repair Units...');
  const [catProjector, catTV, catAC, catPC] = await Category.create([
    { code: 'CAT-PROJ', name: 'Máy chiếu Laser Giảng đường', description: 'Máy chiếu độ sáng cao 5000+ ANSI lumens' },
    { code: 'CAT-TV', name: 'Màn hình Smart TV 75"', description: 'Màn hình hiển thị 4K Ultra HD giảng dạy' },
    { code: 'CAT-AC', name: 'Điều hòa không khí Inverter', description: 'Hệ thống điều hòa trung tâm và treo tường' },
    { code: 'CAT-PC', name: 'Máy tính trạm Phòng Lab', description: 'Máy trạm đồ họa và lập trình sinh viên' }
  ]);

  const [supplierSony, supplierSamsung, supplierDaikin] = await Supplier.create([
    { code: 'SUP-SONY', name: 'Công Ty Sony Electronics Việt Nam', phone: '1800588885', email: 'support@sony.vn', address: 'Q.1, TP. Hồ Chí Minh', contact: 'Trần Văn Long' },
    { code: 'SUP-SS', name: 'Công Ty TNHH Điện Tử Samsung Vina', phone: '1800588889', email: 'b2b@samsung.com', address: 'Q.7, TP. Hồ Chí Minh', contact: 'Nguyễn Thị Bích' },
    { code: 'SUP-DAIKIN', name: 'Công Ty Cổ Phần Daikin Air Conditioning', phone: '18006777', email: 'service@daikin.com.vn', address: 'Q. Ba Đình, Hà Nội', contact: 'Lê Hoàng Nam' }
  ]);

  const [unitBaoTri, unitDienTu] = await RepairUnit.create([
    { code: 'RU-CSVC', name: 'Tổ Kỹ Thuật Nội Bộ Đại Học', specialty: 'Điện lạnh, cơ điện, mạng hạ tầng', phone: '02438691234', address: 'Tầng 1 Nhà C' },
    { code: 'RU-EXT', name: 'Trung Tâm Dịch Vụ Kỹ Thuật Quang Minh', specialty: 'Bo mạch máy chiếu Laser, Panel TV cao cấp', phone: '0908889999', address: 'Cầu Giấy, Hà Nội' }
  ]);

  console.log('[Ruo Seeder] 5. Seeding Spare Parts...');
  const [partLamp, partRam, partCable] = await SparePart.create([
    { code: 'SP-LAMP-SONY', name: 'Bóng Đèn Laser Sony 5000lm', stock: 15, min_stock: 4, price: 3200000, unit: 'Cái', supplier_id: supplierSony._id },
    { code: 'SP-RAM-16G', name: 'RAM DDR4 16GB Kingston Fury', stock: 40, min_stock: 10, price: 950000, unit: 'Thanh', supplier_id: supplierSamsung._id },
    { code: 'SP-HDMI-10M', name: 'Cáp HDMI 2.1 8K Dài 10m', stock: 25, min_stock: 5, price: 450000, unit: 'Sợi', supplier_id: supplierSony._id }
  ]);

  console.log('[Ruo Seeder] 6. Seeding Equipment with QR & Life-Cycle Economics...');
  const eq1 = await Equipment.create({
    code: 'EQ-PRJ-101',
    qr_code: 'RUO-EQ-PRJ-101',
    serial_number: 'SN-SONY-99821',
    name: 'Máy Chiếu Laser Sony VPL-FHZ75',
    brand: 'Sony',
    model: 'VPL-FHZ75',
    category_id: catProjector._id,
    room_id: rooms[0]._id,
    supplier_id: supplierSony._id,
    price: 45000000,
    purchase_date: new Date('2024-01-15'),
    warranty_expiry: new Date('2027-01-15'),
    warranty_status: 'active',
    depreciation_rate: 20,
    status: 'active',
    remaining_value: 36000000
  });

  const eq2 = await Equipment.create({
    code: 'EQ-TV-201',
    qr_code: 'RUO-EQ-TV-201',
    serial_number: 'SN-SS-77218',
    name: 'Smart TV Samsung 75" QLED 4K',
    brand: 'Samsung',
    model: 'QA75Q70C',
    category_id: catTV._id,
    room_id: rooms[1]._id,
    supplier_id: supplierSamsung._id,
    price: 32000000,
    purchase_date: new Date('2023-09-01'),
    warranty_expiry: new Date('2025-09-01'),
    warranty_status: 'expired',
    depreciation_rate: 20,
    status: 'active',
    remaining_value: 19200000
  });

  const eq3Damaged = await Equipment.create({
    code: 'EQ-PRJ-OLD',
    qr_code: 'RUO-EQ-PRJ-OLD',
    serial_number: 'SN-OPT-33120',
    name: 'Máy Chiếu Cũ Optoma X341 (Hỏng Chip DMD)',
    brand: 'Optoma',
    model: 'X341',
    category_id: catProjector._id,
    room_id: rooms[4]._id,
    supplier_id: supplierSony._id,
    price: 18000000,
    purchase_date: new Date('2019-03-10'),
    warranty_expiry: new Date('2021-03-10'),
    warranty_status: 'expired',
    depreciation_rate: 20,
    status: 'repairing',
    remaining_value: 3600000,
    estimated_repair_cost: 2500000 // R = 69.4% >= 60% -> candidate for disposal!
  });

  console.log('[Ruo Seeder] 7. Seeding Transfers, Repairs & Maintenance Plans...');
  // Transfer
  const transfer = await Transfer.create({
    equipment_id: eq2._id,
    from_room_id: rooms[0]._id,
    to_room_id: rooms[1]._id,
    requested_by: staff._id,
    approved_by: admin._id,
    completed_by: staff._id,
    reason: 'Phục vụ hội nghị khoa học công nghệ tại phòng A1-201',
    status: 'completed',
    approved_at: new Date(),
    completed_at: new Date()
  });

  // Repair
  const repair = await Repair.create({
    ticket_code: 'REP-2026-001',
    equipment_id: eq1._id,
    reported_by: lecturer._id,
    incident_description: 'Máy chiếu phòng A1-101 báo nhấp nháy đèn cam, hình ảnh bị tối nửa màn hình',
    damage_level: 'major',
    deadline: new Date(Date.now() + 24 * 3600 * 1000),
    assigned_to: staff._id,
    repair_unit_id: unitBaoTri._id,
    status: 'resolved',
    total_cost: 450000
  });

  await RepairLog.create({
    repair_id: repair._id,
    action: 'reported',
    performed_by: lecturer._id,
    description: 'Giảng viên phát hiện sự cố trước giờ dạy và tạo báo cáo hệ thống'
  });

  await RepairLog.create({
    repair_id: repair._id,
    action: 'resolved',
    performed_by: staff._id,
    description: 'Kỹ thuật viên đã thay cáp tín hiệu HDMI và vệ sinh bộ lọc gió Laser'
  });

  // Maintenance Plan
  const plan = await MaintenancePlan.create({
    name: 'Bảo Dưỡng Định Kỳ Máy Chiếu Toàn Trường Quý 4/2026',
    target_type: 'category',
    frequency: 'quarterly',
    checklist: [
      { item: 'Kiểm tra độ sáng ANSI Lumens và thời gian chạy bóng', required: true },
      { item: 'Vệ sinh lưới lọc bụi và quạt tản nhiệt', required: true },
      { item: 'Kiểm tra độ suy hao của cáp HDMI/VGA âm tường', required: true }
    ],
    next_due: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    created_by: staff._id,
    status: 'active'
  });

  // Disposal Proposal for eq3Damaged (R = 69.4% >= 60%)
  const disposal = await Disposal.create({
    equipment_id: eq3Damaged._id,
    proposed_by: staff._id,
    staff_approved_by: staff._id,
    current_step: 3,
    reason: 'Thiết bị hỏng chip DMD và khối nguồn quang học. Chi phí sửa chữa vượt 69.4% giá trị còn lại (R >= 60%).',
    recovery_value: 800000,
    procurement_plan: 'Mua bổ sung 01 máy chiếu Sony Laser mới trong dự toán quý tới',
    status: 'admin_reviewing'
  });

  console.log('[Ruo Seeder] 8. Seeding SHA-256 Audit Log Block Ledger...');
  await AuditLog.logAction({
    user_id: admin._id,
    user_display: admin.full_name,
    action: 'SYSTEM_BOOTSTRAP',
    target_table: 'system',
    entity_id: 'RUO-UFMS-INIT',
    new_value: { version: '3.0.0', modules: 6, actors: 3, collections: 24 }
  });

  await AuditLog.logAction({
    user_id: staff._id,
    user_display: staff.full_name,
    action: 'DISPOSAL_PROPOSE',
    target_table: 'disposals',
    entity_id: disposal._id.toString(),
    new_value: { equipment_code: eq3Damaged.code, r_ratio: 69.4, threshold: 60 }
  });

  console.log('[Ruo Seeder] Verifying SHA-256 Audit Ledger Chain Integrity...');
  const auditResult = await AuditLog.verifyIntegrity();
  console.log(`[Ruo Seeder] Audit Chain Status: ${auditResult.message}`);

  console.log('[Ruo Seeder] ========================================');
  console.log('[Ruo Seeder] SEED DATABASE COMPLETED SUCCESSFULLY!');
  console.log('[Ruo Seeder] 3 Canonical Actors:');
  console.log('[Ruo Seeder] - Admin: admin@ruo.edu.vn / Ruo@2026');
  console.log('[Ruo Seeder] - Maintenance Staff: staff@ruo.edu.vn / Ruo@2026');
  console.log('[Ruo Seeder] - Lecturer: lecturer@ruo.edu.vn / Ruo@2026');
  console.log('[Ruo Seeder] ========================================');

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('[Ruo Seeder Error]:', err);
  process.exit(1);
});
