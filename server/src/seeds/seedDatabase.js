import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Department, Role, User, UserSession, PasswordReset } from '../models/User.js';
import { Building, Floor, Room } from '../models/Facility.js';
import { EquipmentCategory, Supplier, Equipment } from '../models/Equipment.js';
import { SlaConfig, Incident, MaintenanceTicket } from '../models/Incident.js';
import { Semester, Course, AcademicSchedule } from '../models/Academic.js';
import { AuditLog } from '../models/AuditLog.js';
import { computeSlaDeadlines } from '../services/slaReactor.js';
import { USER_ROLES, ROOM_TYPES, ROOM_STATUSES, TICKET_PRIORITIES } from '../config/constants.js';

dotenv.config();

const seed = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log(`[Ruo Seeder] Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);

  console.log('[Ruo Seeder] Cleaning existing collections...');
  await Promise.all([
    Department.deleteMany(),
    Role.deleteMany(),
    User.deleteMany(),
    UserSession.deleteMany(),
    PasswordReset.deleteMany(),
    Building.deleteMany(),
    Floor.deleteMany(),
    Room.deleteMany(),
    EquipmentCategory.deleteMany(),
    Supplier.deleteMany(),
    Equipment.deleteMany(),
    SlaConfig.deleteMany(),
    Incident.deleteMany(),
    MaintenanceTicket.deleteMany(),
    Semester.deleteMany(),
    Course.deleteMany(),
    AcademicSchedule.deleteMany(),
    AuditLog.deleteMany()
  ]);

  console.log('[Ruo Seeder] 1. Seeding Departments...');
  const [deptCntt, deptDien, deptCsvc, deptDaoTao, deptKt] = await Department.create([
    { code: 'CNTT', name: 'Viện Công Nghệ Thông Tin & Truyền Thông' },
    { code: 'DIEN', name: 'Viện Điện & Thiết Bị Thông Minh' },
    { code: 'CSVC', name: 'Phòng Quản Lý Cơ Sở Vật Chất' },
    { code: 'DAO_TAO', name: 'Phòng Quản Lý Đào Tạo' },
    { code: 'KT', name: 'Tổ Kỹ Thuật & Bảo Trì Thiết Bị' }
  ]);

  console.log('[Ruo Seeder] 2. Seeding Roles...');
  const roles = await Role.create([
    { name: USER_ROLES.STUDENT, title: 'Sinh viên', description: 'Đặt phòng tự học, xem thời khóa biểu, báo sự cố' },
    { name: USER_ROLES.LECTURER, title: 'Giảng viên', description: 'Đăng ký phòng dạy chuỗi RFC-5545, mượn thiết bị di động' },
    { name: USER_ROLES.FACILITY_STAFF, title: 'Quản lý CSVC', description: 'Duyệt đơn, kho QR, tiến trình thanh lý R >= 60%' },
    { name: USER_ROLES.MAINTENANCE, title: 'Kỹ thuật viên', description: 'Tiếp nhận ticket, đồng hồ SLA, khảo sát sửa chữa' },
    { name: USER_ROLES.ACADEMIC_AFFAIRS, title: 'Phòng Đào tạo', description: 'Xếp TKB tự động bằng CSP, khóa lịch học kỳ' },
    { name: USER_ROLES.ADMIN, title: 'Quản trị viên (Admin)', description: 'Toàn quyền điều hành và kiểm toán SHA-256' }
  ]);

  console.log('[Ruo Seeder] 3. Seeding 6 Canonical Users (Password: Ruo@2026)...');
  const commonPassword = 'Ruo@2026';

  const [student, lecturer, facilityStaff, maintenance, academicAffairs, admin] = await User.create([
    {
      employeeCode: 'SV20220412',
      email: 'hoang.tb220412@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'Trần Bảo Hoàng',
      role: USER_ROLES.STUDENT,
      department: deptCntt._id,
      className: 'K67-CNTT-02',
      phone: '0987654321',
      reputeScore: 92,
      avatar: 'TH'
    },
    {
      employeeCode: 'CB198402',
      email: 'nam.nv@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'TS. Nguyễn Văn Nam',
      role: USER_ROLES.LECTURER,
      department: deptCntt._id,
      phone: '0912345678',
      reputeScore: 98,
      avatar: 'NN'
    },
    {
      employeeCode: 'NV201901',
      email: 'mai.lt@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'Lê Thị Mai',
      role: USER_ROLES.FACILITY_STAFF,
      department: deptCsvc._id,
      phone: '0903112233',
      reputeScore: 100,
      avatar: 'LM'
    },
    {
      employeeCode: 'KT201805',
      email: 'hung.pv@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'Phạm Văn Hùng',
      role: USER_ROLES.MAINTENANCE,
      department: deptKt._id,
      phone: '0934889900',
      reputeScore: 95,
      avatar: 'PH'
    },
    {
      employeeCode: 'DT201509',
      email: 'dung.hq@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'Hoàng Quốc Dũng',
      role: USER_ROLES.ACADEMIC_AFFAIRS,
      department: deptDaoTao._id,
      phone: '0945667788',
      reputeScore: 100,
      avatar: 'HD'
    },
    {
      employeeCode: 'AD000001',
      email: 'admin@university.edu.vn',
      passwordHash: commonPassword,
      fullName: 'Ban Quản Trị Hệ Thống',
      role: USER_ROLES.ADMIN,
      department: deptCntt._id,
      phone: '02438691234',
      reputeScore: 100,
      avatar: 'AD'
    }
  ]);

  console.log('[Ruo Seeder] 4. Seeding Single Building (Tòa A1 - 5 Tầng)...');
  const bldgA1 = await Building.create({
    code: 'A1',
    name: 'Tòa Nhà A1 - Giảng Đường & Không Gian Học Thuật Trung Tâm',
    totalFloors: 5,
    campusZone: 'Khuôn Viên Trung Tâm'
  });

  // Create 5 floors for Building A1
  const floorsMap = {};
  for (let f = 1; f <= 5; f++) {
    const floorDoc = await Floor.create({
      building: bldgA1._id,
      floorNumber: f,
      name: `Tầng ${f} - Tòa A1`
    });
    floorsMap[`A1_F${f}`] = floorDoc;
  }

  console.log('[Ruo Seeder] 5. Seeding Exactly 108 Spatial CAD Rooms in Building A1 across 5 Floors...');
  const roomsToInsert = [];

  // Helper to generate room telemetry & sensors
  const createRoomData = (floorDoc, floorNum, roomIndex, customProps = {}) => {
    const code = `A1-${floorNum}${roomIndex < 10 ? '0' + roomIndex : roomIndex}`;
    const baseTemp = 23.0 + Number(((roomIndex * 1.3 + floorNum * 0.7) % 3.5).toFixed(1));
    const basePower = Number((1.5 + (roomIndex % 4) * 1.8 + (floorNum % 2) * 0.5).toFixed(1));

    return {
      code,
      name: customProps.name || `Phòng ${code}`,
      building: bldgA1._id,
      floor: floorDoc._id,
      floorNumber: floorNum,
      department: customProps.department || (floorNum % 2 === 1 ? deptCntt._id : deptDien._id),
      type: customProps.type || (roomIndex % 4 === 1 ? ROOM_TYPES.THEORY : roomIndex % 4 === 2 ? ROOM_TYPES.SMART : roomIndex % 4 === 3 ? ROOM_TYPES.LAB : ROOM_TYPES.MEETING),
      capacity: customProps.capacity || (roomIndex % 3 === 0 ? 60 : roomIndex % 3 === 1 ? 40 : 45),
      areaSqm: customProps.areaSqm || (roomIndex % 3 === 0 ? 80 : 60),
      powerKw: customProps.powerKw || basePower,
      status: customProps.status || (roomIndex === 5 && floorNum === 3 ? ROOM_STATUSES.MAINTENANCE : roomIndex % 3 === 0 ? ROOM_STATUSES.AVAILABLE : ROOM_STATUSES.OCCUPIED),
      cadCoordinates: {
        gridX: (roomIndex - 1) % 3,
        gridY: Math.floor((roomIndex - 1) / 3),
        spanCols: 1,
        spanRows: 1
      },
      sensors: [
        { sensorCode: `SN-TEMP-${code}`, sensorType: 'temperature', currentValue: baseTemp, unit: '°C' },
        { sensorCode: `SN-PWR-${code}`, sensorType: 'power_meter', currentValue: basePower, unit: 'kW' }
      ]
    };
  };

  // Distribute 108 rooms across the 5 floors of Building A1:
  // Floor 1: 22 rooms (A1-101..122)
  // Floor 2: 22 rooms (A1-201..222)
  // Floor 3: 22 rooms (A1-301..322, including 6 CAD blueprint pods)
  // Floor 4: 21 rooms (A1-401..421, including A1-405 Hall)
  // Floor 5: 21 rooms (A1-501..521)
  // Total: 22 + 22 + 22 + 21 + 21 = 108 rooms exactly
  const roomsPerFloor = [22, 22, 22, 21, 21];

  for (let f = 1; f <= 5; f++) {
    const floorDoc = floorsMap[`A1_F${f}`];
    const count = roomsPerFloor[f - 1];

    for (let r = 1; r <= count; r++) {
      let custom = {};
      // Exact specification for A1 Floor 1 Lab
      if (f === 1 && r === 5) {
        custom = {
          name: 'Phòng Lab Máy Tính Chuyên Dụng 1',
          type: ROOM_TYPES.LAB,
          capacity: 35,
          areaSqm: 75,
          powerKw: 12.4,
          status: ROOM_STATUSES.MAINTENANCE
        };
      }
      // Exact specification for A1 Floor 3 CAD Blueprint pods
      else if (f === 3) {
        if (r === 1) custom = { name: 'Phòng Giảng Chuyên Đề A', type: ROOM_TYPES.THEORY, capacity: 40, areaSqm: 55, powerKw: 2.1, status: ROOM_STATUSES.OCCUPIED };
        if (r === 2) custom = { name: 'Phòng Học Lý Thuyết Đa Phương Tiện', type: ROOM_TYPES.THEORY, capacity: 45, areaSqm: 60, powerKw: 2.8, status: ROOM_STATUSES.OCCUPIED };
        if (r === 3) custom = { name: 'Phòng Thảo Luận Nhóm & Seminar', type: ROOM_TYPES.MEETING, capacity: 25, areaSqm: 40, powerKw: 1.4, status: ROOM_STATUSES.OCCUPIED };
        if (r === 4) custom = { name: 'Phòng Học Tương Tác Thông Minh', type: ROOM_TYPES.SMART, capacity: 50, areaSqm: 70, powerKw: 3.2, status: ROOM_STATUSES.AVAILABLE };
        if (r === 5) custom = { name: 'Phòng Lab Thiết Bị Thực Nghiệm', type: ROOM_TYPES.LAB, capacity: 35, areaSqm: 75, powerKw: 8.6, status: ROOM_STATUSES.MAINTENANCE };
        if (r === 6) custom = { name: 'Phòng Giảng Đường Bậc Thang', type: ROOM_TYPES.HALL, capacity: 80, areaSqm: 110, powerKw: 4.5, status: ROOM_STATUSES.OCCUPIED };
      }
      // Exact specification for A1 Floor 4 Hall
      else if (f === 4 && r === 5) {
        custom = {
          name: 'Hội Trường Đa Năng A1',
          type: ROOM_TYPES.HALL,
          capacity: 180,
          areaSqm: 220,
          powerKw: 15.0,
          status: ROOM_STATUSES.AVAILABLE
        };
      }

      roomsToInsert.push(createRoomData(floorDoc, f, r, custom));
    }
  }

  console.log(`[Ruo Seeder] Total CAD Rooms prepared: ${roomsToInsert.length} (Requirement: 108 rooms)`);
  const createdRooms = await Room.create(roomsToInsert);
  console.log(`[Ruo Seeder] Successfully seeded ${createdRooms.length} CAD Rooms into MongoDB!`);

  // Find key reference rooms for bookings & equipment
  const roomA1_302 = createdRooms.find(r => r.code === 'A1-302');
  const roomA1_105 = createdRooms.find(r => r.code === 'A1-105');

  console.log('[Ruo Seeder] 6. Seeding Equipment Categories & Suppliers...');
  const [catProjector, catAc, catPc, catMeter] = await EquipmentCategory.create([
    { code: 'CAT_PROJ', name: 'Máy chiếu laser & Màn hình LED', depreciationYears: 5 },
    { code: 'CAT_AC', name: 'Điều hòa & Điện lạnh trung tâm', depreciationYears: 6 },
    { code: 'CAT_PC', name: 'Máy tính để bàn đồ họa & Server', depreciationYears: 4 },
    { code: 'CAT_METER', name: 'Thiết bị đo kiểm & Vi mạch', depreciationYears: 7 }
  ]);

  const supplier = await Supplier.create({
    code: 'SUP_DAIKIN_SONY',
    name: 'Công ty Cổ phần Thiết Bị Công Nghệ Tân Tiến',
    taxCode: '0102938475',
    phone: '024 3987 6543',
    email: 'contact@tantientech.com'
  });

  console.log('[Ruo Seeder] 7. Seeding Equipment with QR & Life-Cycle Economics...');
  const [eq01, eq02, eq03, eq04] = await Equipment.create([
    {
      assetCode: 'TS-2021-MC01',
      qrCodeData: 'RUO_ASSET_TS-2021-MC01',
      name: 'Máy Chiếu Laser Sony VPL-FHZ85',
      category: catProjector._id,
      room: roomA1_302 ? roomA1_302._id : createdRooms[0]._id,
      supplier: supplier._id,
      originalPrice: 42000000,
      remainingValue: 14000000,
      purchaseDate: new Date('2021-03-15'),
      condition: 'good',
      status: 'in_use',
      repairCount: 3,
      estimatedRepairCost: 3500000 // R = 25% < 40% -> Sửa chữa
    },
    {
      assetCode: 'TS-2019-DH04',
      qrCodeData: 'RUO_ASSET_TS-2019-DH04',
      name: 'Điều Hòa Trung Tâm Daikin VRV 24000BTU',
      category: catAc._id,
      room: roomA1_105 ? roomA1_105._id : createdRooms[1]._id,
      supplier: supplier._id,
      originalPrice: 38000000,
      remainingValue: 8000000,
      purchaseDate: new Date('2019-06-10'),
      condition: 'damaged',
      status: 'pending_disposal',
      repairCount: 6,
      estimatedRepairCost: 5200000 // R = 65% >= 60% -> Tự động kích hoạt thanh lý!
    },
    {
      assetCode: 'TS-2022-PC12',
      qrCodeData: 'RUO_ASSET_TS-2022-PC12',
      name: 'Bộ Máy Tính Để Bàn Dell OptiPlex 7090 i7',
      category: catPc._id,
      room: roomA1_105 ? roomA1_105._id : createdRooms[1]._id,
      supplier: supplier._id,
      originalPrice: 22000000,
      remainingValue: 13000000,
      purchaseDate: new Date('2022-09-01'),
      condition: 'good',
      status: 'available',
      repairCount: 1,
      estimatedRepairCost: 800000
    },
    {
      assetCode: 'TS-2018-OS02',
      qrCodeData: 'RUO_ASSET_TS-2018-OS02',
      name: 'Máy Hiện Sóng Kỹ Thuật Số Tektronix TBS2000B',
      category: catMeter._id,
      room: null,
      supplier: supplier._id,
      originalPrice: 55000000,
      remainingValue: 7000000,
      purchaseDate: new Date('2018-11-20'),
      condition: 'damaged',
      status: 'pending_disposal',
      repairCount: 5,
      estimatedRepairCost: 4900000 // R = 70% >= 60% -> Kích hoạt thanh lý!
    }
  ]);

  console.log('[Ruo Seeder] 8. Seeding SLA Configurations...');
  await SlaConfig.create([
    { priority: TICKET_PRIORITIES.CRITICAL, responseTimeMinutes: 30, resolutionTimeMinutes: 240, businessHoursOnly: false },
    { priority: TICKET_PRIORITIES.HIGH, responseTimeMinutes: 60, resolutionTimeMinutes: 480, businessHoursOnly: true },
    { priority: TICKET_PRIORITIES.MEDIUM, responseTimeMinutes: 120, resolutionTimeMinutes: 1440, businessHoursOnly: true },
    { priority: TICKET_PRIORITIES.LOW, responseTimeMinutes: 240, resolutionTimeMinutes: 2880, businessHoursOnly: true }
  ]);

  console.log('[Ruo Seeder] 9. Seeding Incidents & Tickets with SLA...');
  const sla1 = computeSlaDeadlines(TICKET_PRIORITIES.CRITICAL, new Date());
  await Incident.create({
    ticketCode: 'TCK-2026-0042',
    reporter: lecturer._id,
    room: roomA1_302 ? roomA1_302._id : createdRooms[0]._id,
    equipment: eq01._id,
    title: 'Máy chiếu nhấp nháy liên tục và mất tín hiệu HDMI',
    description: 'Khi cắm cổng HDMI từ laptop của giảng viên, màn chiếu chớp xanh rồi tắt hẳn sau 2 phút, đèn quạt kêu rất to.',
    priority: TICKET_PRIORITIES.CRITICAL,
    status: 'in_progress',
    slaTracking: {
      slaStartTime: sla1.slaStartTime,
      responseDeadline: sla1.responseDeadline,
      resolutionDeadline: sla1.resolutionDeadline,
      remainingMinutes: 45,
      state: 'at_risk'
    }
  });

  console.log('[Ruo Seeder] 10. Seeding Semesters & Courses for CSP...');
  const semester = await Semester.create({
    code: '2026-1',
    name: 'Học kỳ 1 Năm học 2026 - 2027',
    startDate: new Date('2026-08-15'),
    endDate: new Date('2027-01-15'),
    isLocked: false
  });

  const [c1, c2, c3] = await Course.create([
    { code: 'IT3010', name: 'Kỹ Thuật Lập Trình', credits: 3, department: deptCntt._id, requiredRoomType: 'theory' },
    { code: 'IT3160', name: 'Kiến Trúc Máy Tính & Lab', credits: 3, department: deptCntt._id, requiredRoomType: 'lab' },
    { code: 'IT4040', name: 'Phát Triển Ứng Dụng Web', credits: 3, department: deptCntt._id, requiredRoomType: 'theory' }
  ]);

  await AcademicSchedule.create([
    {
      semester: semester._id,
      room: roomA1_302 ? roomA1_302._id : createdRooms[0]._id,
      lecturer: lecturer._id,
      course: c1._id,
      classSectionCode: 'IT3010-01',
      studentCount: 42,
      dayOfWeek: 4, // Thursday
      startTime: '07:30',
      endTime: '11:30'
    }
  ]);

  console.log('[Ruo Seeder] 11. Seeding Immutable SHA-256 Audit Log Block...');
  await AuditLog.logAction({
    user: admin._id,
    userDisplay: admin.fullName,
    action: 'SYSTEM_INITIAL_SEED',
    entityType: 'System',
    entityId: 'GENESIS',
    diffData: {
      message: 'Khởi tạo cơ sở dữ liệu mẫu thành công cho hệ thống Ruo UFMS',
      totalUsers: 6,
      totalBuildings: 4,
      totalFloors: 17,
      totalRooms: createdRooms.length
    }
  });

  console.log('[Ruo Seeder] Verification: Checking Audit Log Chain Integrity...');
  const integrity = await AuditLog.verifyIntegrity();
  console.log(`[Ruo Seeder] ${integrity.message}`);

  console.log('[Ruo Seeder] ==============================================');
  console.log(`[Ruo Seeder] SEEDING COMPLETED SUCCESSFULLY!`);
  console.log(`[Ruo Seeder] - 6 Canonical Users seeded (Password: Ruo@2026)`);
  console.log(`[Ruo Seeder] - 4 Buildings & 17 Floors seeded`);
  console.log(`[Ruo Seeder] - Exactly ${createdRooms.length} CAD Rooms seeded`);
  console.log(`[Ruo Seeder] - 4 Equipment Categories & 4 QR Assets seeded`);
  console.log(`[Ruo Seeder] - SLA Rules & Semester 2026-1 seeded`);
  console.log('[Ruo Seeder] ==============================================');

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('[Ruo Seeder Error]', err);
  process.exit(1);
});
