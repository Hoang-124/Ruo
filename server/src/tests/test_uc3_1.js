import assert from 'assert';
import mongoose from 'mongoose';
import { createEquipment, getEquipmentById } from '../controllers/equipmentController.js';
import { hasGrantedPermission } from '../middlewares/authMiddleware.js';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Supplier } from '../models/Supplier.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Repair } from '../models/Repair.js';
import { PreventiveMaintenance } from '../models/PreventiveMaintenance.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, EQUIPMENT_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-3.1: CREATE EQUIPMENT & INITIAL LIFECYCLE ---');

  // Setup In-Memory Mock Database
  let mockEquipments = [];
  let mockMovements = [];
  let loggedAuditActions = [];

  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return payload;
  };

  Category.findById = (id) => Promise.resolve({ _id: id, name: 'Thiết bị hiển thị', code: 'DISP' });
  Category.findOne = () => Promise.resolve({ _id: '67a000000000000000000010', name: 'Thiết bị hiển thị', code: 'DISP' });

  const mockRoomA1_201 = {
    _id: '67a000000000000000000020',
    code: 'A1-201',
    name: 'Phòng Lab Đa Phương Tiện',
    building: 'A1',
    floor: 2,
    status: 'active'
  };
  Room.findById = (id) => Promise.resolve(String(id) === String(mockRoomA1_201._id) ? mockRoomA1_201 : null);
  Room.findOne = () => Promise.resolve(mockRoomA1_201);

  Supplier.findById = (id) => Promise.resolve({ _id: id, name: 'Công ty Công nghệ Giáo dục Sao Mai' });

  Equipment.findOne = (query) => {
    const found = mockEquipments.find(e => {
      if (query.code && e.code === query.code) return true;
      if (query.qr_code && e.qr_code === query.qr_code) return true;
      return false;
    });
    return {
      populate: function() { return this; },
      then: function(resolve) {
        if (!found) return resolve(null);
        resolve({
          ...found,
          category_id: { _id: found.category_id, name: 'Thiết bị hiển thị', code: 'DISP' },
          room_id: found.room_id ? mockRoomA1_201 : null
        });
      }
    };
  };

  Equipment.create = async (doc) => {
    const newDoc = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      save: async function() { return this; }
    };
    mockEquipments.push(newDoc);
    return newDoc;
  };

  Equipment.findById = (id) => {
    const found = mockEquipments.find(e => String(e._id) === String(id));
    return {
      populate: function() { return this; },
      then: function(resolve) {
        if (!found) return resolve(null);
        resolve({
          ...found,
          category_id: { _id: found.category_id, name: 'Thiết bị hiển thị', code: 'DISP' },
          room_id: found.room_id ? mockRoomA1_201 : null
        });
      }
    };
  };

  EquipmentMovement.create = async (doc) => {
    const newMov = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      created_at: new Date()
    };
    mockMovements.push(newMov);
    return newMov;
  };

  EquipmentMovement.find = (query) => ({
    populate: function() { return this; },
    sort: function() { return this; },
    then: function(resolve) {
      resolve(mockMovements.filter(m => String(m.equipment_id) === String(query.equipment_id)));
    }
  });

  Repair.find = () => ({
    populate: function() { return this; },
    sort: function() { return this; },
    then: function(resolve) { resolve([]); }
  });

  PreventiveMaintenance.find = () => ({
    populate: function() { return this; },
    sort: function() { return this; },
    then: function(resolve) { resolve([]); }
  });

  const createMockRes = () => {
    return {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  };

  // ----------------------------------------------------
  // TEST 1: POST /api/equipments - Tạo thiết bị mới thành công
  // ----------------------------------------------------
  console.log('\n▶ Test 1 (UC-3.1): Đăng ký thiết bị mới kèm unique code, serial, model, nguyên giá, ngày mua, hạn BH, phòng');
  const req1 = {
    user: {
      _id: '67a000000000000000000002',
      role: USER_ROLES.FACILITY_MANAGER,
      full_name: 'Trần Quản Lý',
      code: 'QL001'
    },
    hasPermission: (code) => code === 'equipment:create',
    body: {
      code: 'EQ-TEST-001',
      qr_code: 'QR-EQ-TEST-001',
      name: 'Máy Chiếu Laser Panasonic PT-MZ880',
      brand: 'Panasonic',
      model: 'PT-MZ880',
      serial_number: 'SN-2026-9912',
      category_id: '67a000000000000000000010',
      room_id: '67a000000000000000000020',
      price: 45000000,
      purchase_date: '2026-02-01',
      warranty_expiry: '2028-02-01',
      depreciation_rate: 20
    }
  };
  const res1 = createMockRes();
  await createEquipment(req1, res1);

  assert.strictEqual(res1.statusCode, 201, 'Status code phải là 201 Created');
  assert.strictEqual(res1.jsonData.success, true);
  assert.strictEqual(res1.jsonData.equipment.code, 'EQ-TEST-001');
  assert.strictEqual(res1.jsonData.equipment.status, EQUIPMENT_STATUSES.IN_USE, 'Thiết bị được xếp phòng phải có status là IN_USE');
  assert(res1.jsonData.lifecycle, 'Response phải đính kèm chu trình vòng đời khởi tạo (lifecycle)');
  assert.strictEqual(res1.jsonData.lifecycle.stages[0].reached, true, 'Giai đoạn Tiếp nhận (ONBOARDING) phải đạt');
  console.log('  ✔ Test 1 ĐẠT: Thiết bị mới khởi tạo thành công (HTTP 201) với đầy đủ thông số nghiệp vụ và vòng đời.');

  // ----------------------------------------------------
  // TEST 2: Duplicate Asset Code Rejection (HTTP 409 Conflict)
  // ----------------------------------------------------
  console.log('\n▶ Test 2 (UC-3.1): Bắt lỗi trùng lặp Mã Tài Sản (HTTP 409 Conflict)');
  const req2 = {
    user: req1.user,
    hasPermission: () => true,
    body: {
      code: 'EQ-TEST-001', // duplicate code
      name: 'Máy Chiếu Trùng Mã',
      category_id: '67a000000000000000000010',
      price: 20000000
    }
  };
  const res2 = createMockRes();
  await createEquipment(req2, res2);

  assert.strictEqual(res2.statusCode, 409, 'Trùng mã phải trả về 409 Conflict');
  assert.strictEqual(res2.jsonData.success, false);
  assert(res2.jsonData.message.includes('EQ-TEST-001'));
  console.log('  ✔ Test 2 ĐẠT: Chặn trùng mã tài sản chuẩn xác với mã lỗi HTTP 409.');

  // ----------------------------------------------------
  // TEST 3: Duplicate QR Code Rejection (HTTP 409 Conflict)
  // ----------------------------------------------------
  console.log('\n▶ Test 3 (UC-3.1): Bắt lỗi trùng lặp Mã QR định danh (HTTP 409 Conflict)');
  const req3 = {
    user: req1.user,
    hasPermission: () => true,
    body: {
      code: 'EQ-TEST-002', // different code
      qr_code: 'QR-EQ-TEST-001', // duplicate QR
      name: 'Máy Chiếu Khác',
      category_id: '67a000000000000000000010',
      price: 20000000
    }
  };
  const res3 = createMockRes();
  await createEquipment(req3, res3);

  assert.strictEqual(res3.statusCode, 409, 'Trùng QR phải trả về 409 Conflict');
  assert.strictEqual(res3.jsonData.success, false);
  assert(res3.jsonData.message.includes('Mã QR'));
  console.log('  ✔ Test 3 ĐẠT: Chặn trùng mã QR định danh chuẩn xác với mã lỗi HTTP 409.');

  // ----------------------------------------------------
  // TEST 4: Date Logic Inversion (warranty_expiry < purchase_date)
  // ----------------------------------------------------
  console.log('\n▶ Test 4 (UC-3.1): Kiểm tra logic ngày: Hạn bảo hành không được trước Ngày mua (HTTP 400)');
  const req4 = {
    user: req1.user,
    hasPermission: () => true,
    body: {
      code: 'EQ-TEST-003',
      name: 'Máy In Canon',
      category_id: '67a000000000000000000010',
      price: 8000000,
      purchase_date: '2026-06-01',
      warranty_expiry: '2025-06-01' // earlier than purchase date
    }
  };
  const res4 = createMockRes();
  await createEquipment(req4, res4);

  assert.strictEqual(res4.statusCode, 400, 'Nghịch lý ngày phải trả về 400 Bad Request');
  assert.strictEqual(res4.jsonData.success, false);
  assert(res4.jsonData.message.includes('Hạn bảo hành không được nhỏ hơn Ngày mua'));
  console.log('  ✔ Test 4 ĐẠT: Bắt lỗi nghịch lý hạn bảo hành trước ngày mua thành công.');

  // ----------------------------------------------------
  // TEST 5: Auto Initial EquipmentMovement Recording
  // ----------------------------------------------------
  console.log('\n▶ Test 5 (UC-3.1 & UC-3.4): Tự động ghi nhận nhật ký điều chuyển ban đầu khi bố trí vào phòng');
  assert.strictEqual(mockMovements.length, 1, 'Phải tự động tạo 1 bản ghi EquipmentMovement ban đầu');
  assert.strictEqual(mockMovements[0].to_room_id, '67a000000000000000000020');
  assert.strictEqual(mockMovements[0].from_room_id, null, 'Nguồn ban đầu từ kho (null)');
  console.log('  ✔ Test 5 ĐẠT: Tự động ghi nhận nhật ký điều chuyển phân bổ ban đầu về phòng A1-201.');

  // ----------------------------------------------------
  // TEST 6: Role Authorization - Manager, Technician, Admin can create
  // ----------------------------------------------------
  console.log('\n▶ Test 6 (UC-3.1 & UC-12.1): Quyền hạn 3 vai trò đặc quyền (Manager, Technician, Admin)');
  const allowedRoles = [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN];
  for (const role of allowedRoles) {
    const reqAuth = {
      user: { _id: new mongoose.Types.ObjectId(), role, full_name: 'Tester' },
      hasPermission: () => true,
      body: {
        code: `EQ-ROLE-${role.toUpperCase()}`,
        name: `Tài sản test role ${role}`,
        category_id: '67a000000000000000000010',
        price: 10000000
      }
    };
    const resAuth = createMockRes();
    await createEquipment(reqAuth, resAuth);
    assert.strictEqual(resAuth.statusCode, 201, `Vai trò [${role}] phải tạo được thiết bị`);
  }
  console.log('  ✔ Test 6 ĐẠT: Cả 3 vai trò (Quản lý CSVC, Kỹ thuật viên, Quản trị viên) đều được ủy quyền tạo thiết bị.');

  // ----------------------------------------------------
  // TEST 7: Lecturer Role Rejection (HTTP 403 Forbidden)
  // ----------------------------------------------------
  console.log('\n▶ Test 7 (UC-3.1): Chặn Giảng viên tạo thiết bị (HTTP 403 Forbidden)');
  const req7 = {
    user: {
      _id: '67a000000000000000000009',
      role: USER_ROLES.LECTURER,
      full_name: 'Giảng viên Nguyễn'
    },
    hasPermission: () => false, // no equipment:create
    body: {
      code: 'EQ-ILLEGAL-009',
      name: 'Tài sản lậu',
      category_id: '67a000000000000000000010',
      price: 5000000
    }
  };
  const res7 = createMockRes();
  await createEquipment(req7, res7);

  assert.strictEqual(res7.statusCode, 403, 'Giảng viên phải bị chặn 403');
  assert.strictEqual(res7.jsonData.success, false);
  console.log('  ✔ Test 7 ĐẠT: Giảng viên bị chặn ngay lập tức với HTTP 403 khi cố tạo tài sản.');

  // ----------------------------------------------------
  // TEST 8: GET /api/equipments/:id - Life-cycle Timeline & Warranty Metrics
  // ----------------------------------------------------
  console.log('\n▶ Test 8 (UC-3.1 & UC-3.5): Tra cứu chi tiết tài sản kèm timeline dòng đời và chỉ số bảo hành');
  const req8 = {
    params: { id: 'EQ-TEST-001' } // lookup by Asset Code fallback
  };
  const res8 = createMockRes();
  await getEquipmentById(req8, res8);

  assert.strictEqual(res8.statusCode, 200);
  assert.strictEqual(res8.jsonData.success, true);
  assert.strictEqual(res8.jsonData.equipment.code, 'EQ-TEST-001');
  assert(res8.jsonData.lifecycle, 'Phải có cấu trúc lifecycle');
  assert.strictEqual(res8.jsonData.lifecycle.stages.length, 5, 'Phải có đủ 5 giai đoạn vòng đời');
  assert.strictEqual(res8.jsonData.warrantyInfo.status, 'active');
  assert(res8.jsonData.warrantyInfo.daysRemaining > 0, 'Còn hạn bảo hành');
  assert(res8.jsonData.depreciation, 'Phải có bảng tính khấu hao đường thẳng');
  console.log('  ✔ Test 8 ĐẠT: Tra cứu thành công chi tiết thiết bị bằng Mã tài sản kèm 5 giai đoạn vòng đời và hạn BH.');

  console.log('\n--- TOÀN BỘ 8/8 TEST CASES UC-3.1 CREATE EQUIPMENT & LIFECYCLE ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
