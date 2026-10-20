import assert from 'assert';
import mongoose from 'mongoose';
import { getRoles, updateRolePermissions, batchUpdateRoles, resetDefaultRoles, DEFAULT_CANONICAL_ROLES } from '../controllers/roleController.js';
import { createEquipment } from '../controllers/equipmentController.js';
import { hasGrantedPermission, requirePermission, requireRole } from '../middlewares/authMiddleware.js';
import { Role } from '../models/Role.js';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-12.1: ROLES MATRIX & DYNAMIC RBAC GUARDS ---');

  // Setup Mock Database for Role collection
  let mockRoles = [];
  let loggedAuditActions = [];

  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return payload;
  };

  Role.find = () => ({
    sort: () => Promise.resolve([...mockRoles]),
    then: (resolve) => resolve([...mockRoles])
  });

  Role.findOne = (query) => {
    const found = mockRoles.find(r => {
      if (query.name && r.name !== query.name) return false;
      return true;
    });
    return Promise.resolve(found || null);
  };

  Role.findById = (id) => {
    const found = mockRoles.find(r => String(r._id) === String(id));
    return Promise.resolve(found || null);
  };

  Role.findOneAndUpdate = async (filter, update, options) => {
    let existingIndex = mockRoles.findIndex(r => r.name === filter.name);
    if (existingIndex >= 0) {
      if (update.$set) Object.assign(mockRoles[existingIndex], update.$set);
      return mockRoles[existingIndex];
    } else if (options?.upsert) {
      const newRole = {
        _id: new mongoose.Types.ObjectId(),
        name: filter.name,
        ...(update.$setOnInsert || {}),
        save: async function() { return this; }
      };
      mockRoles.push(newRole);
      return newRole;
    }
    return null;
  };

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
  // TEST 1: GET /api/admin/roles - Auto-seed and return 4 Canonical Roles
  // ----------------------------------------------------
  console.log('\n▶ Test 1 (UC-12.1): Khởi tạo và tra cứu Ma trận quyền hạn 4 vai trò chuẩn');
  mockRoles = []; // start empty to test auto-seeding

  const req1 = { query: {} };
  const res1 = createMockRes();
  await getRoles(req1, res1);

  assert.strictEqual(res1.statusCode, 200, 'HTTP status phải là 200');
  assert.strictEqual(res1.jsonData.success, true, 'success phải là true');
  assert.strictEqual(res1.jsonData.total, 4, 'Phải có đúng 4 vai trò chuẩn');
  assert.strictEqual(res1.jsonData.canonicalRolesCount, 4, 'canonicalRolesCount phải là 4');
  
  const roleNames = res1.jsonData.roles.map(r => r.name);
  assert(roleNames.includes(USER_ROLES.ADMIN), 'Ma trận phải có vai trò Admin');
  assert(roleNames.includes(USER_ROLES.FACILITY_MANAGER), 'Ma trận phải có vai trò Quản lý CSVC');
  assert(roleNames.includes(USER_ROLES.TECHNICIAN), 'Ma trận phải có vai trò Kỹ thuật viên');
  assert(roleNames.includes(USER_ROLES.LECTURER), 'Ma trận phải có vai trò Giảng viên');
  console.log('  ✔ Test 1 ĐẠT: Tự động seed và trả về ma trận 4 vai trò chuẩn (Admin, Quản lý, Kỹ thuật viên, Giảng viên).');

  // ----------------------------------------------------
  // TEST 2: GET /api/admin/roles?name=lecturer - Filter theo vai trò cụ thể
  // ----------------------------------------------------
  console.log('\n▶ Test 2 (UC-12.1): Tra cứu ma trận lọc theo tên vai trò (?name=lecturer)');
  const req2 = { query: { name: 'lecturer' } };
  const res2 = createMockRes();
  await getRoles(req2, res2);

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.jsonData.total, 1, 'Chỉ lọc ra 1 vai trò Giảng viên');
  assert.strictEqual(res2.jsonData.roles[0].name, USER_ROLES.LECTURER);
  assert(Array.isArray(res2.jsonData.roles[0].permissions), 'Danh sách quyền hạn phải là một mảng');
  assert(!res2.jsonData.roles[0].permissions.includes('equipment:create'), 'Giảng viên không được có quyền equipment:create');
  console.log('  ✔ Test 2 ĐẠT: Lọc chính xác quyền hạn của Giảng viên (chỉ quyền đọc/mượn/báo hỏng, không có quyền tạo thiết bị).');

  // ----------------------------------------------------
  // TEST 3: Dynamic RBAC helper hasGrantedPermission & Wildcard Matching
  // ----------------------------------------------------
  console.log('\n▶ Test 3 (UC-12.1): Kiểm tra thuật toán phân quyền động hasGrantedPermission');
  const adminPerms = ['*'];
  const managerPerms = DEFAULT_CANONICAL_ROLES[USER_ROLES.FACILITY_MANAGER].permissions;
  const lecturerPerms = DEFAULT_CANONICAL_ROLES[USER_ROLES.LECTURER].permissions;

  // Wildcard check
  assert.strictEqual(hasGrantedPermission(adminPerms, 'equipment:create'), true, 'Admin wildcard phải cấp quyền tạo thiết bị');
  assert.strictEqual(hasGrantedPermission(adminPerms, 'any:arbitrary:code'), true, 'Admin wildcard phải match bất kỳ quyền nào');

  // Exact & Prefix check
  assert.strictEqual(hasGrantedPermission(managerPerms, 'equipment:create'), true, 'Quản lý CSVC phải có quyền equipment:create');
  assert.strictEqual(hasGrantedPermission(lecturerPerms, 'equipment:create'), false, 'Giảng viên không được có quyền equipment:create');
  assert.strictEqual(hasGrantedPermission(['equipment:*'], 'equipment:create'), true, 'Prefix match equipment:* phải match equipment:create');
  console.log('  ✔ Test 3 ĐẠT: Thuật toán kiểm tra phân quyền động wildcard (*) và namespace chuẩn xác.');

  // ----------------------------------------------------
  // TEST 4: PUT /api/roles/:id - Dynamic RBAC Update & Audit Log
  // ----------------------------------------------------
  console.log('\n▶ Test 4 (UC-12.1 & UC-12.2): Cập nhật quyền hạn vai trò động & Lưu vết AuditLog');
  loggedAuditActions = [];
  const req4 = {
    params: { id: USER_ROLES.TECHNICIAN },
    body: {
      permissions: ['equipment:read', 'equipment:update', 'repair:create', 'repair:update']
    },
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    },
    ip: '127.0.0.1'
  };
  const res4 = createMockRes();
  await updateRolePermissions(req4, res4);

  assert.strictEqual(res4.statusCode, 200);
  assert.strictEqual(res4.jsonData.success, true);
  assert.strictEqual(loggedAuditActions.length, 1, 'Phải ghi 1 bản ghi AuditLog');
  assert.strictEqual(loggedAuditActions[0].action, 'UPDATE_ROLE_PERMISSIONS');
  console.log('  ✔ Test 4 ĐẠT: Cập nhật quyền hạn vai trò động thành công kèm bản ghi AuditLog.');

  // ----------------------------------------------------
  // TEST 5: POST /api/roles/reset-defaults - Khôi phục phân quyền gốc chuẩn (SoD Reset)
  // ----------------------------------------------------
  console.log('\n▶ Test 5 (UC-12.1): Khôi phục ma trận phân quyền mặc định theo tiêu chuẩn');
  loggedAuditActions = [];
  const req5 = {
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    },
    ip: '127.0.0.1'
  };
  const res5 = createMockRes();
  await resetDefaultRoles(req5, res5);

  assert.strictEqual(res5.statusCode, 200);
  assert.strictEqual(res5.jsonData.success, true);
  assert.strictEqual(loggedAuditActions.length, 1);
  assert.strictEqual(loggedAuditActions[0].action, 'RESET_ROLE_PERMISSIONS_DEFAULT');
  console.log('  ✔ Test 5 ĐẠT: Khôi phục cấu hình phân quyền chuẩn SoD thành công.');

  // ----------------------------------------------------
  // TEST 6: POST /api/equipments - Cho phép người dùng có quyền equipment:create
  // ----------------------------------------------------
  console.log('\n▶ Test 6 (UC-12.1 & UC-3.1): Cho phép Quản lý / KTV tạo thiết bị với quyền equipment:create');
  
  // Mock Category and Equipment models for creation test
  Category.findById = () => Promise.resolve({ _id: '67a000000000000000000010', name: 'Máy tính' });
  Category.findOne = () => Promise.resolve({ _id: '67a000000000000000000010', name: 'Máy tính' });
  Room.findById = () => Promise.resolve({ _id: '67a000000000000000000020', name: 'Phòng Lab 101' });
  Room.findOne = () => Promise.resolve({ _id: '67a000000000000000000020', name: 'Phòng Lab 101' });
  const mockEquipId = new mongoose.Types.ObjectId();
  Equipment.findOne = () => Promise.resolve(null);
  Equipment.create = async (doc) => ({
    ...doc,
    _id: mockEquipId,
    save: async function() { return this; }
  });
  Equipment.findById = () => ({
    populate: function() { return this; },
    then: function(resolve) {
      resolve({
        _id: mockEquipId,
        code: 'EQ-RBAC-001',
        name: 'Máy chủ Dell PowerEdge R750',
        price: 125000000
      });
    }
  });

  const req6 = {
    user: {
      _id: '67a000000000000000000002',
      role: USER_ROLES.FACILITY_MANAGER,
      full_name: 'Nguyễn Văn Quản Lý'
    },
    userPermissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.FACILITY_MANAGER].permissions,
    hasPermission: (code) => hasGrantedPermission(DEFAULT_CANONICAL_ROLES[USER_ROLES.FACILITY_MANAGER].permissions, code),
    body: {
      code: 'EQ-RBAC-001',
      name: 'Máy chủ Dell PowerEdge R750',
      category_id: '67a000000000000000000010',
      price: 125000000,
      purchase_date: '2026-03-01'
    }
  };
  const res6 = createMockRes();
  await createEquipment(req6, res6, (err) => { if (err) throw err; });

  assert.strictEqual(res6.statusCode, 201, 'Quản lý có quyền equipment:create phải tạo thành công 201');
  assert.strictEqual(res6.jsonData.success, true);
  assert.strictEqual(res6.jsonData.equipment.code, 'EQ-RBAC-001');
  console.log('  ✔ Test 6 ĐẠT: Quản lý CSVC với quyền equipment:create tạo thiết bị mới thành công (HTTP 201).');

  // ----------------------------------------------------
  // TEST 7: POST /api/equipments - Chặn người dùng không có quyền equipment:create (Lecturer / Revoked)
  // ----------------------------------------------------
  console.log('\n▶ Test 7 (UC-12.1 & UC-3.1): Chặn Giảng viên hoặc vai trò bị thu hồi quyền equipment:create (HTTP 403)');
  const req7 = {
    user: {
      _id: '67a000000000000000000003',
      role: USER_ROLES.LECTURER,
      full_name: 'Trần Giảng Viên'
    },
    userPermissions: DEFAULT_CANONICAL_ROLES[USER_ROLES.LECTURER].permissions,
    hasPermission: (code) => hasGrantedPermission(DEFAULT_CANONICAL_ROLES[USER_ROLES.LECTURER].permissions, code),
    body: {
      code: 'EQ-ILLEGAL-001',
      name: 'Máy chiếu lậu',
      category_id: '67a000000000000000000010',
      price: 15000000
    }
  };
  const res7 = createMockRes();
  await createEquipment(req7, res7, () => {});

  assert.strictEqual(res7.statusCode, 403, 'Người không có quyền equipment:create phải bị chặn 403');
  assert.strictEqual(res7.jsonData.success, false);
  assert(res7.jsonData.message.includes('equipment:create'), 'Thông báo lỗi phải nêu rõ quyền equipment:create');
  console.log('  ✔ Test 7 ĐẠT: Giảng viên bị chặn ngay lập tức với HTTP 403 khi gọi POST /api/equipments.');

  console.log('\n--- TOÀN BỘ 7/7 TEST CASES UC-12.1 ROLES MATRIX & DYNAMIC RBAC ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
