import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Department, Role, User } from '../models/User.js';
import { Building, Floor, Room } from '../models/Facility.js';
import { EquipmentCategory, Supplier, Equipment } from '../models/Equipment.js';
import { SlaConfig, Incident, MaintenanceTicket } from '../models/Incident.js';
import { Semester, Course, AcademicSchedule } from '../models/Academic.js';
import { AuditLog } from '../models/AuditLog.js';
import { computeSlaDeadlines } from '../services/slaReactor.js';
import { USER_ROLES, TICKET_PRIORITIES } from '../config/constants.js';

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

  console.log('[Ruo Seeder] 3. Seeding Users (Password: Ruo@2026)...');
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
      phone: '0987 654 321',
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
      phone: '0912 345 678',
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
      phone: '0903 112 233',
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
      phone: '0934 889 900',
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
      phone: '0945 667 788',
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
      phone: '024 3869 1234',
      reputeScore: 100,
      avatar: 'AD'
    }
  ]);

  console.log('[Ruo Seeder] 4. Seeding Buildings & Floors...');
  const [bldgA1, bldgB1, bldgB2, bldgC1] = await Building.create([
    { code: 'A1', name: 'Tòa A1 - Giảng Đường Chính', totalFloors: 5, campusZone: 'Khu A' },
    { code: 'B1', name: 'Tòa B1 - Viện Điện & IoT', totalFloors: 4, campusZone: 'Khu B' },
    { code: 'B2', name: 'Tòa B2 - Viện CNTT & Lab', totalFloors: 4, campusZone: 'Khu B' },
    { code: 'C1', name: 'Tòa C1 - Hội Trường Đa Năng & Smart Room', totalFloors: 4, campusZone: 'Khu C' }
  ]);

  const floorA1_F3 = await Floor.create({
    building: bldgA1._id,
    floorNumber: 3,
    name: 'Tầng 3 - Tòa A1'
  });

  const floorB2_F1 = await Floor.create({
    building: bldgB2._id,
    floorNumber: 1,
    name: 'Tầng 1 - Tòa B2'
  });

  const floorB1_F2 = await Floor.create({
    building: bldgB1._id,
    floorNumber: 2,
    name: 'Tầng 2 - Tòa B1'
  });

  console.log('[Ruo Seeder] 5. Seeding Spatial CAD Rooms...');
  const roomsA1_F3 = await Room.create([
    {
      code: 'A1-301',
      name: 'Phòng Giảng Chuyên Đề A',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'theory',
      capacity: 40,
      areaSqm: 55,
      powerKw: 2.1,
      status: 'occupied',
      sensors: [
        { sensorCode: 'SN-TEMP-301', sensorType: 'temperature', currentValue: 24.2, unit: '°C' }
      ]
    },
    {
      code: 'A1-302',
      name: 'Phòng Học Lý Thuyết Đa Phương Tiện',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'theory',
      capacity: 45,
      areaSqm: 60,
      powerKw: 2.8,
      status: 'occupied',
      sensors: [
        { sensorCode: 'SN-TEMP-302', sensorType: 'temperature', currentValue: 23.8, unit: '°C' }
      ]
    },
    {
      code: 'A1-303',
      name: 'Phòng Thảo Luận Nhóm & Seminar',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'meeting',
      capacity: 25,
      areaSqm: 40,
      powerKw: 1.4,
      status: 'occupied',
      sensors: [
        { sensorCode: 'SN-TEMP-303', sensorType: 'temperature', currentValue: 25.1, unit: '°C' }
      ]
    },
    {
      code: 'A1-304',
      name: 'Phòng Học Tương Tác Thông Minh',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'smart',
      capacity: 50,
      areaSqm: 70,
      powerKw: 3.2,
      status: 'available',
      sensors: [
        { sensorCode: 'SN-TEMP-304', sensorType: 'temperature', currentValue: 24.0, unit: '°C' }
      ]
    },
    {
      code: 'A1-305',
      name: 'Phòng Lab Thiết Bị Thực Nghiệm',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'lab',
      capacity: 35,
      areaSqm: 75,
      powerKw: 8.6,
      status: 'maintenance',
      sensors: [
        { sensorCode: 'SN-TEMP-305', sensorType: 'temperature', currentValue: 26.5, unit: '°C' }
      ]
    },
    {
      code: 'A1-306',
      name: 'Phòng Giảng Đường Bậc Thang',
      building: bldgA1._id,
      floor: floorA1_F3._id,
      floorNumber: 3,
      department: deptCntt._id,
      type: 'hall',
      capacity: 80,
      areaSqm: 110,
      powerKw: 4.5,
      status: 'occupied',
      sensors: [
        { sensorCode: 'SN-TEMP-306', sensorType: 'temperature', currentValue: 23.5, unit: '°C' }
      ]
    }
  ]);

  const roomB2_105 = await Room.create({
    code: 'B2-105',
    name: 'Phòng Lab Máy Tính Chuyên Dụng 1',
    building: bldgB2._id,
    floor: floorB2_F1._id,
    floorNumber: 1,
    department: deptCntt._id,
    type: 'lab',
    capacity: 35,
    areaSqm: 75,
    powerKw: 12.4,
    status: 'maintenance'
  });

  const roomA1_405 = await Room.create({
    code: 'A1-405',
    name: 'Hội Trường Đa Năng A1',
    building: bldgA1._id,
    floor: floorA1_F3._id,
    floorNumber: 4,
    department: deptCntt._id,
    type: 'hall',
    capacity: 180,
    areaSqm: 220,
    powerKw: 15.0,
    status: 'available'
  });

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
      room: roomsA1_F3[1]._id, // A1-302
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
      room: roomB2_105._id,
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
      room: roomB2_105._id,
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
    room: roomsA1_F3[1]._id, // A1-302
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
      room: roomsA1_F3[1]._id, // A1-302
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
      totalRooms: roomsA1_F3.length + 1
    }
  });

  console.log('[Ruo Seeder] Verification: Checking Audit Log Chain Integrity...');
  const integrity = await AuditLog.verifyIntegrity();
  console.log(`[Ruo Seeder] ${integrity.message}`);

  console.log('[Ruo Seeder] SEEDING COMPLETED SUCCESSFULLY!');
  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('[Ruo Seeder Error]', err);
  process.exit(1);
});
