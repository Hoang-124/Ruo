import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  Role,
  Room,
  Building,
  Category,
  Supplier,
  RepairUnit,
  SparePart,
  Equipment,
  Repair,
  RepairLog,
  AuditLog
} from '../models/index.js';
import { FLOOR_PLAN_ROOMS } from './floorPlanRooms.js';
import {
  CATALOG_CATEGORIES,
  CATALOG_SUPPLIERS,
  CATALOG_SPARE_PARTS,
  buildBuildingCatalogDataset
} from './facilityCatalogData.js';
import { DEFAULT_CANONICAL_ROLES } from '../controllers/roleController.js';
import {
  USER_ROLES,
  ROOM_TYPES,
  ROOM_STATUSES,
  REPAIR_STATUSES,
  REPAIR_SOURCES
} from '../config/constants.js';

dotenv.config();

const PRESERVED_AUTH_COLLECTIONS = new Set([
  'users',
  'roles',
  'refreshtokens',
  'passwordresets',
  'auditlogs'
]);

const seed = async () => {
  const preserveAuth = process.argv.includes('--preserve-auth');
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log(`[Ruo Seeder] Connecting to MongoDB: ${mongoURI} (preserveAuth=${preserveAuth})`);
  await mongoose.connect(mongoURI);

  console.log('[Ruo Seeder] Cleaning collections for deterministic catalog state...');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    if (preserveAuth && PRESERVED_AUTH_COLLECTIONS.has(col.name)) continue;
    try {
      await mongoose.connection.db.dropCollection(col.name);
    } catch {}
  }

  let admin;
  let fm;
  let tech;
  let lecturer;

  if (preserveAuth) {
    console.log('[Ruo Seeder] 1–2. Reusing existing Roles & Users to preserve active browser sessions...');
    admin = await User.findOne({ role: USER_ROLES.ADMIN });
    fm = await User.findOne({ role: USER_ROLES.FACILITY_MANAGER });
    tech = await User.findOne({ role: USER_ROLES.TECHNICIAN });
    lecturer = await User.findOne({ role: USER_ROLES.LECTURER });
  }

  if (!admin || !fm || !tech || !lecturer) {
    console.log('[Ruo Seeder] 1. Seeding 4 Canonical Roles...');
    await Role.deleteMany({});
    await Role.create([
      {
        name: USER_ROLES.LECTURER,
        permissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.LECTURER].permissions
      },
      {
        name: USER_ROLES.TECHNICIAN,
        permissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.TECHNICIAN].permissions
      },
      {
        name: USER_ROLES.FACILITY_MANAGER,
        permissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.FACILITY_MANAGER].permissions
      },
      {
        name: USER_ROLES.ADMIN,
        permissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.ADMIN].permissions
      }
    ]);

    console.log('[Ruo Seeder] 2. Seeding Canonical Users (Password: Ruo@2026)...');
    await User.deleteMany({});
    const commonPassword = 'Ruo@2026';

    [admin, fm, tech, lecturer] = await User.create([
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
  }

  console.log('[Ruo Seeder] 3. Seeding Building A1, 11 Canonical Categories & 5 Suppliers...');
  await Building.create({
    code: 'A1',
    name: 'Tòa Nhà Học Vụ A1',
    campusZone: 'Khu Trung Tâm',
    totalFloors: 5,
    description: 'Tòa nhà giảng đường & trung tâm nghiên cứu đa năng 5 tầng'
  });

  const categoryDocs = await Category.insertMany(CATALOG_CATEGORIES);
  const categoriesByCode = new Map(categoryDocs.map((c) => [c.code.toUpperCase(), c]));

  const supplierDocs = await Supplier.insertMany(CATALOG_SUPPLIERS);
  const suppliersByCode = new Map(supplierDocs.map((s) => [s.code.toUpperCase(), s]));

  await RepairUnit.create([
    {
      code: 'RU-01',
      name: 'Trung Tâm Bảo Hành Điện Máy & Quang Học Số 1',
      specialty: 'Máy chiếu, điều hòa Cassette và thiết bị điện nhẹ',
      phone: '0243888999',
      address: 'Hai Bà Trưng, Hà Nội'
    }
  ]);

  console.log('[Ruo Seeder] 4. Seeding All 91 Rooms Across Building A1 (Floors 1–5 + KHO-01)...');
  const coreRooms = [
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
      status: ROOM_STATUSES.AVAILABLE
    },
    {
      code: 'A1-201',
      name: 'PH 201 (Lab Thực Hành Mạng)',
      building: 'A1',
      floor: 2,
      room_type: ROOM_TYPES.LAB,
      capacity: 50,
      area: 65,
      status: ROOM_STATUSES.AVAILABLE
    }
  ];

  const allRoomPayloads = [
    ...coreRooms,
    ...FLOOR_PLAN_ROOMS.map((r) => ({
      ...r,
      building: 'A1',
      status: ROOM_STATUSES.AVAILABLE
    }))
  ];

  const insertedRooms = await Room.insertMany(allRoomPayloads);
  const roomsByCode = new Map(insertedRooms.map((r) => [r.code.toUpperCase(), r]));

  console.log('[Ruo Seeder] 5. Seeding 10 Curated Spare Parts (spare_parts)...');
  await SparePart.insertMany(
    CATALOG_SPARE_PARTS.map((part) => ({
      code: part.code,
      name: part.name,
      unit: part.unit,
      stock: part.stock,
      min_stock: part.min_stock,
      price: part.price,
      supplier_id: suppliersByCode.get(part.supplierCode)?._id || null
    }))
  );

  console.log('[Ruo Seeder] 6. Building & Populating Curated Equipments + Quotas Across All 91 Rooms...');
  const { equipmentDocs, roomUpdates } = buildBuildingCatalogDataset({
    categoriesByCode,
    roomsByCode,
    suppliersByCode
  });

  if (roomUpdates.length > 0) {
    await Room.bulkWrite(
      roomUpdates.map((upd) => ({
        updateOne: {
          filter: { _id: upd.roomId },
          update: {
            $set: {
              department: upd.department,
              description: upd.description,
              required_equipment: upd.required_equipment
            }
          }
        }
      }))
    );
  }

  const createdEquipments = await Equipment.insertMany(equipmentDocs);
  const eqACBroken = createdEquipments.find((eq) => eq.code === 'EQ-AC-101-B');
  const room101 = roomsByCode.get('A1-101');

  if (eqACBroken && lecturer && fm && tech) {
    console.log('[Ruo Seeder] 7. Seeding Initial Demo Repair Ticket on A1-101...');
    const repairIncident = await Repair.create({
      equipment_id: eqACBroken._id,
      room_id: room101?._id || null,
      source: REPAIR_SOURCES.LECTURER_REPORT,
      reported_by: lecturer._id,
      incident_description: 'Điều hòa âm trần Cassette kêu to và giảm lạnh sau 20 phút vận hành tiết đầu',
      damage_level: 'major',
      status: REPAIR_STATUSES.ASSIGNED,
      assigned_by: fm._id,
      assigned_to: tech._id,
      deadline: new Date(Date.now() + 24 * 3600 * 1000)
    });

    await RepairLog.create([
      {
        repair_id: repairIncident._id,
        action: 'reported',
        performed_by: lecturer._id,
        description: 'Giảng viên báo cáo sự cố điều hòa âm trần tại phòng A1-101'
      },
      {
        repair_id: repairIncident._id,
        action: 'assigned',
        performed_by: fm._id,
        description: 'Quản lý CSVC giao việc kiểm tra thực địa cho Kỹ thuật viên Trần Minh Tuấn'
      }
    ]);
  }

  console.log('[Ruo Seeder] 8. Recording Cryptographic SHA-256 Audit Log...');
  await AuditLog.logAction({
    user_id: admin._id,
    user_display: `${admin.full_name} (${admin.code})`,
    action: preserveAuth ? 'CATALOG_SYNC' : 'SYSTEM_INIT',
    target_table: 'system',
    entity_id: admin._id.toString(),
    ip_address: '127.0.0.1',
    new_value: {
      system: 'Ruo UEMS',
      catalog_version: '2026-10-27-curated',
      categories: categoryDocs.length,
      rooms: insertedRooms.length,
      spare_parts: CATALOG_SPARE_PARTS.length,
      equipments: createdEquipments.length
    }
  });

  console.log('\n====================================================');
  console.log('🎉 RUO CURATED CATALOG SEEDING COMPLETED SUCCESSFULLY!');
  console.log(` - Categories:   ${categoryDocs.length} canonical groups`);
  console.log(` - Rooms:        ${insertedRooms.length} rooms across Floors 1–5 + KHO-01`);
  console.log(` - Spare Parts:  ${CATALOG_SPARE_PARTS.length} curated items`);
  console.log(` - Equipments:   ${createdEquipments.length} registered QR assets`);
  console.log('====================================================\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Ruo Seeder] Fatal Error:', err);
  process.exit(1);
});
