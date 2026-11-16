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
  REPAIR_SOURCES,
  TECHNICIAN_SPECIALTY_PROFILES
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
        department: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL.department,
        specialty_code: 'TECH_GENERAL',
        specialty_label: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL.label,
        allowed_categories: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL.allowed_categories,
        allowed_damage_levels: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL.allowed_damage_levels,
        specialized_tasks: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL.specialized_tasks,
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

  // Ensure all specialized Technician profiles exist (even when --preserve-auth is used)
  const commonPassword = 'Ruo@2026';
  const specializedTechSeeds = [
    {
      code: 'KT002',
      email: 'guard@ruo.edu.vn',
      full_name: 'Trực Ban Bảo Vệ Nguyễn Văn Bình',
      profile: TECHNICIAN_SPECIALTY_PROFILES.GUARD_OPS,
      phone: '0981112233',
      avatar: 'NB'
    },
    {
      code: 'KT003',
      email: 'hvac.tech@ruo.edu.vn',
      full_name: 'KTV Điện Lạnh Phạm Quang Huy',
      profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_HVAC_POWER,
      phone: '0982223344',
      avatar: 'QH'
    },
    {
      code: 'KT004',
      email: 'it.tech@ruo.edu.vn',
      full_name: 'KTV CNTT & Nghe Nhìn Vũ Hoàng Nam',
      profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_IT_AV,
      phone: '0983334455',
      avatar: 'HN'
    },
    {
      code: 'KT005',
      email: 'furn.tech@ruo.edu.vn',
      full_name: 'KTV Mộc & Cơ Khí Đỗ Văn Sơn',
      profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_FURN_MECH,
      phone: '0984445566',
      avatar: 'VS'
    }
  ];

  for (const st of specializedTechSeeds) {
    const existingTech = await User.findOne({ code: st.code });
    if (!existingTech) {
      await User.create({
        code: st.code,
        email: st.email,
        password_hash: commonPassword,
        full_name: st.full_name,
        role: USER_ROLES.TECHNICIAN,
        department: st.profile.department,
        specialty_code: st.profile.code,
        specialty_label: st.profile.label,
        allowed_categories: st.profile.allowed_categories,
        allowed_damage_levels: st.profile.allowed_damage_levels,
        specialized_tasks: st.profile.specialized_tasks,
        phone: st.phone,
        avatar: st.avatar
      });
    } else if (!existingTech.specialty_code || existingTech.specialty_code === 'TECH_GENERAL') {
      existingTech.specialty_code = st.profile.code;
      existingTech.specialty_label = st.profile.label;
      existingTech.department = st.profile.department;
      existingTech.allowed_categories = st.profile.allowed_categories;
      existingTech.allowed_damage_levels = st.profile.allowed_damage_levels;
      existingTech.specialized_tasks = st.profile.specialized_tasks;
      await existingTech.save();
    }
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
  const eqPrjBroken = createdEquipments.find((eq) => eq.code === 'EQ-101-PRJ-01' || eq.code === 'EQ-209-TVSMART-01');
  const eqDeskBroken = createdEquipments.find((eq) => eq.code === 'EQ-101-DESKSTU-01');
  const eqExtBroken = createdEquipments.find((eq) => eq.code === 'EQ-101-EXT-01');
  const room101 = roomsByCode.get('A1-101');

  const techGuard = await User.findOne({ code: 'KT002' });
  const techHvac = await User.findOne({ code: 'KT003' });
  const techIt = await User.findOne({ code: 'KT004' });
  const techFurn = await User.findOne({ code: 'KT005' });

  if (lecturer && fm) {
    console.log('[Ruo Seeder] 7. Seeding Initial Demo Repair Tickets per Specialty KTV...');
    
    // 1. KT003 • Điện lạnh: Điều hòa âm trần Cassette
    if (eqACBroken && techHvac) {
      const repHvac = await Repair.create({
        equipment_id: eqACBroken._id,
        room_id: room101?._id || null,
        source: REPAIR_SOURCES.LECTURER_REPORT,
        reported_by: lecturer._id,
        incident_description: 'Điều hòa âm trần Cassette kêu to và giảm lạnh sau 20 phút vận hành tiết đầu',
        damage_level: 'major',
        status: REPAIR_STATUSES.ASSIGNED,
        assigned_by: fm._id,
        assigned_to: techHvac._id,
        ai_recommended_to: techHvac._id,
        ai_dispatch_reason: 'Khớp chuyên ngành Điện lạnh & Cơ điện: KTV Điện Lạnh Phạm Quang Huy (KT003)',
        deadline: new Date(Date.now() + 24 * 3600 * 1000)
      });
      await RepairLog.create({
        repair_id: repHvac._id,
        action: 'assigned',
        performed_by: fm._id,
        description: 'Quản lý CSVC giao việc sửa chữa điều hòa cho KTV Điện Lạnh Phạm Quang Huy (KT003)'
      });
    }

    // 2. KT004 • CNTT/AV: Máy chiếu hoặc Smart Tivi
    if (eqPrjBroken && techIt) {
      const repIt = await Repair.create({
        equipment_id: eqPrjBroken._id,
        room_id: eqPrjBroken.room_id || room101?._id || null,
        source: REPAIR_SOURCES.LECTURER_REPORT,
        reported_by: lecturer._id,
        incident_description: 'Máy chiếu / Tivi không lên nguồn khi bật công tắc giảng dạy',
        damage_level: 'minor',
        status: REPAIR_STATUSES.IN_PROGRESS,
        assigned_by: fm._id,
        assigned_to: techIt._id,
        ai_recommended_to: techIt._id,
        ai_dispatch_reason: 'Khớp chuyên ngành CNTT & Nghe nhìn: KTV CNTT & Nghe Nhìn Vũ Hoàng Nam (KT004)',
        deadline: new Date(Date.now() + 24 * 3600 * 1000)
      });
      await RepairLog.create({
        repair_id: repIt._id,
        action: 'assigned',
        performed_by: fm._id,
        description: 'Quản lý CSVC giao việc kiểm tra thiết bị AV cho KTV Vũ Hoàng Nam (KT004)'
      });
    }

    // 3. KT005 • Cơ khí: Bàn ghế sinh viên
    if (eqDeskBroken && techFurn) {
      const repFurn = await Repair.create({
        equipment_id: eqDeskBroken._id,
        room_id: room101?._id || null,
        source: REPAIR_SOURCES.LECTURER_REPORT,
        reported_by: lecturer._id,
        incident_description: 'Bàn ghế sinh viên bị lỏng bu-lông chân sắt, cập kênh và bung nẹp gỗ Melamine',
        damage_level: 'minor',
        status: REPAIR_STATUSES.IN_PROGRESS,
        assigned_by: fm._id,
        assigned_to: techFurn._id,
        ai_recommended_to: techFurn._id,
        ai_dispatch_reason: 'Khớp chuyên ngành Mộc & Cơ khí: KTV Mộc & Cơ Khí Đỗ Văn Sơn (KT005)',
        deadline: new Date(Date.now() + 48 * 3600 * 1000)
      });
      await RepairLog.create({
        repair_id: repFurn._id,
        action: 'assigned',
        performed_by: fm._id,
        description: 'Quản lý CSVC giao việc sửa chữa cơ khí bàn ghế cho KTV Đỗ Văn Sơn (KT005)'
      });
    }

    // 4. KT002 • Bảo vệ: Bình chữa cháy PCCC
    if (eqExtBroken && techGuard) {
      const repGuard = await Repair.create({
        equipment_id: eqExtBroken._id,
        room_id: room101?._id || null,
        source: REPAIR_SOURCES.SYSTEM_AUTO,
        reported_by: fm._id,
        incident_description: 'Kiểm tra chốt an toàn và áp suất bình chữa cháy PCCC theo ca trực ban',
        damage_level: 'minor',
        status: REPAIR_STATUSES.ASSIGNED,
        assigned_by: fm._id,
        assigned_to: techGuard._id,
        ai_recommended_to: techGuard._id,
        ai_dispatch_reason: 'Khớp phân quyền trực ban vận hành: Trực Ban Bảo Vệ Nguyễn Văn Bình (KT002)',
        deadline: new Date(Date.now() + 12 * 3600 * 1000)
      });
      await RepairLog.create({
        repair_id: repGuard._id,
        action: 'assigned',
        performed_by: fm._id,
        description: 'Quản lý CSVC giao việc kiểm tra vận hành PCCC cho Trực Ban Bảo Vệ Nguyễn Văn Bình (KT002)'
      });
    }
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
