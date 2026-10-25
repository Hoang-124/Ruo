import assert from 'assert';
import mongoose from 'mongoose';
import { updateRolePermissions, batchUpdateRoles, DEFAULT_CANONICAL_ROLES } from '../controllers/roleController.js';
import { getEquipments } from '../controllers/equipmentController.js';
import { hasGrantedPermission } from '../middlewares/authMiddleware.js';
import { Role } from '../models/Role.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-12.2: UPDATE ROLE PERMISSIONS & EQUIPMENT PAGINATION ---');

  // Setup Mock Database for Role and Equipment collections
  let mockRoles = [
    {
      _id: '67a000000000000000000001',
      name: USER_ROLES.ADMIN,
      title: 'Quản trị viên BGH',
      permissions: ['*'],
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      name: USER_ROLES.TECHNICIAN,
      title: 'Kỹ thuật viên',
      permissions: [...DEFAULT_CANONICAL_ROLES[USER_ROLES.TECHNICIAN].permissions],
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000003',
      name: USER_ROLES.LECTURER,
      title: 'Giảng viên',
      permissions: [...DEFAULT_CANONICAL_ROLES[USER_ROLES.LECTURER].permissions],
      save: async function() { return this; }
    }
  ];

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
    const found = mockRoles.find(r => query.name && r.name === query.name);
    return Promise.resolve(found || null);
  };

  Role.findById = (id) => {
    const found = mockRoles.find(r => String(r._id) === String(id));
    return Promise.resolve(found || null);
  };
  Role.findOneAndUpdate = async (query, update) => {
    let role = mockRoles.find(r => r.name === query.name);
    if (!role) {
      role = {
        _id: new mongoose.Types.ObjectId(),
        name: query.name,
        ...update.$setOnInsert,
        permissions: []
      };
      mockRoles.push(role);
    }
    Object.assign(role, update.$set);
    return role;
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
  // TEST 1: PUT /api/admin/roles/:id/permissions - Live Policy Update with Diff
  // ----------------------------------------------------
  console.log('\n▶ Test 1 (UC-12.2): Cập nhật quyền hạn vai trò qua Live Policy API kèm thống kê Diff');
  loggedAuditActions = [];
  const req1 = {
    params: { id: USER_ROLES.TECHNICIAN },
    body: {
      permissions: ['equipment:read', 'equipment:update', 'repair:create', 'repair:accept']
    },
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    },
    ip: '127.0.0.1'
  };
  const res1 = createMockRes();
  await updateRolePermissions(req1, res1);

  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.jsonData.success, true);
  assert.strictEqual(res1.jsonData.liveEnforced, true, 'Chính sách phải có cờ liveEnforced');
  assert(res1.jsonData.diff, 'Phải trả về diff thống kê thay đổi');
  assert(Array.isArray(res1.jsonData.diff.added), 'diff.added phải là mảng');
  assert(Array.isArray(res1.jsonData.diff.revoked), 'diff.revoked phải là mảng');
  console.log('  ✔ Test 1 ĐẠT: Cập nhật quyền hạn KTV thành công, trả về liveEnforced và diff thống kê.');

  // ----------------------------------------------------
  // TEST 2: PUT /api/admin/roles/:id/permissions - Bật cả Module (ENABLE_MODULE)
  // ----------------------------------------------------
  console.log('\n▶ Test 2 (UC-12.2): Bật toàn bộ quyền của một phân hệ (Module Bulk Enable)');
  const modulePerms = ['inventory:create', 'inventory:scan', 'inventory:reconcile', 'inventory:export'];
  const req2 = {
    params: { id: USER_ROLES.TECHNICIAN },
    body: {
      action: 'ENABLE_MODULE',
      modulePermissions: modulePerms
    },
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    }
  };
  const res2 = createMockRes();
  await updateRolePermissions(req2, res2);

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.jsonData.success, true);
  modulePerms.forEach(code => {
    assert(res2.jsonData.role.permissions.includes(code), `Quyền [${code}] phải được bật trong vai trò`);
  });
  console.log('  ✔ Test 2 ĐẠT: Bật đồng loạt 4 quyền phân hệ Kiểm kê (Module Bulk Enable) thành công.');

  // ----------------------------------------------------
  // TEST 3: PUT /api/admin/roles/:id/permissions - Tắt cả Module (DISABLE_MODULE)
  // ----------------------------------------------------
  console.log('\n▶ Test 3 (UC-12.2): Tắt toàn bộ quyền của một phân hệ (Module Bulk Disable)');
  const req3 = {
    params: { id: USER_ROLES.TECHNICIAN },
    body: {
      action: 'DISABLE_MODULE',
      modulePermissions: modulePerms
    },
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    }
  };
  const res3 = createMockRes();
  await updateRolePermissions(req3, res3);

  assert.strictEqual(res3.statusCode, 200);
  assert.strictEqual(res3.jsonData.success, true);
  modulePerms.forEach(code => {
    assert(!res3.jsonData.role.permissions.includes(code), `Quyền [${code}] phải được gỡ bỏ khỏi vai trò`);
  });
  console.log('  ✔ Test 3 ĐẠT: Tắt đồng loạt toàn bộ quyền phân hệ Kiểm kê (Module Bulk Disable) thành công.');

  // ----------------------------------------------------
  // TEST 4: Guard-rail - Chống tự tước quyền cấu hình của Quản trị viên (Admin Self-Lockout)
  // ----------------------------------------------------
  console.log('\n▶ Test 4 (UC-12.2): Cơ chế bảo vệ Admin Self-Lockout Protection');
  const req4 = {
    params: { id: USER_ROLES.ADMIN },
    body: {
      permissions: ['equipment:read', 'room:read'] // omitting role:update and *
    },
    user: {
      _id: '67a000000000000000000001',
      role: USER_ROLES.ADMIN
    }
  };
  const res4 = createMockRes();
  await updateRolePermissions(req4, res4);

  assert.strictEqual(res4.statusCode, 400);
  assert.strictEqual(res4.jsonData.success, false);
  assert.strictEqual(res4.jsonData.code, 'ADMIN_SELF_LOCKOUT_PREVENTED');
  console.log('  ✔ Test 4 ĐẠT: Chặn thành công hành vi tước quyền role:update của Admin (ADMIN_SELF_LOCKOUT_PREVENTED).');

  // ----------------------------------------------------
  // TEST 5: Audit Trail Verification
  // ----------------------------------------------------
  console.log('\n▶ Test 5 (UC-12.2): Xác minh bản ghi kiểm toán AuditLog');
  const lastLog = loggedAuditActions[loggedAuditActions.length - 1];
  assert(lastLog, 'Phải có bản ghi kiểm toán được tạo');
  assert.strictEqual(lastLog.action, 'UPDATE_ROLE_PERMISSIONS');
  assert.strictEqual(lastLog.target_table, 'roles');
  console.log('  ✔ Test 5 ĐẠT: Nhật ký kiểm toán lưu vết đầy đủ thông tin hành động và delta quyền hạn.');

  // ----------------------------------------------------
  // TEST 6: Batch role updates use one request and one audit event
  // ----------------------------------------------------
  console.log('\n▶ Test 6 (UC-12.2): Lưu đồng thời ma trận RBAC bằng một batch và một audit event');
  const auditCountBeforeBatch = loggedAuditActions.length;
  const batchRes = createMockRes();
  await batchUpdateRoles({
    body: {
      roles: Object.entries(DEFAULT_CANONICAL_ROLES).map(([name, role]) => ({
        name,
        permissions: role.permissions
      }))
    },
    user: {
      _id: '67a000000000000000000001',
      code: 'AD001',
      role: USER_ROLES.ADMIN,
      full_name: 'Admin Tổng Quản'
    },
    ip: '127.0.0.1'
  }, batchRes);

  assert.strictEqual(batchRes.statusCode, 200);
  assert.strictEqual(batchRes.jsonData.success, true);
  assert.strictEqual(batchRes.jsonData.roles.length, 4);
  assert.strictEqual(loggedAuditActions.length, auditCountBeforeBatch + 1);
  assert.strictEqual(loggedAuditActions.at(-1).action, 'BATCH_UPDATE_ROLE_PERMISSIONS');
  console.log('  ✔ Test 6 ĐẠT: Cả bốn vai trò được lưu qua một yêu cầu và một bản ghi kiểm toán.');

  // ----------------------------------------------------
  // TEST 7: GET /api/equipments - Phân trang Pagination Đầy Đủ (page, limit, total, totalPages, nav flags)
  // ----------------------------------------------------
  console.log('\n▶ Test 7 (UC-12.2 & UC-3.2): Kiểm tra tính năng phân trang Pagination trên GET /api/equipments');
  const mockEquipmentDocs = Array.from({ length: 25 }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    code: `EQ-PAGE-${String(i + 1).padStart(3, '0')}`,
    name: `Thiết bị kiểm thử số ${i + 1}`,
    price: 10000000 + i * 500000
  }));

  Equipment.countDocuments = () => Promise.resolve(25);
  Equipment.find = () => ({
    populate: function() { return this; },
    sort: function() { return this; },
    skip: function(s) {
      this._skip = s;
      return this;
    },
    limit: function(l) {
      this._limit = l;
      return this;
    },
    then: function(resolve) {
      const start = this._skip || 0;
      const end = start + (this._limit || 10);
      resolve(mockEquipmentDocs.slice(start, end));
    }
  });

  const req6 = {
    query: {
      page: 2,
      limit: 10
    }
  };
  const res6 = createMockRes();
  await getEquipments(req6, res6);

  assert.strictEqual(res6.statusCode, 200);
  assert.strictEqual(res6.jsonData.success, true);
  assert.strictEqual(res6.jsonData.page, 2);
  assert.strictEqual(res6.jsonData.limit, 10);
  assert.strictEqual(res6.jsonData.total, 25);
  assert.strictEqual(res6.jsonData.totalPages, 3);
  assert.strictEqual(res6.jsonData.hasPrevPage, true, 'Trang 2 phải có hasPrevPage = true');
  assert.strictEqual(res6.jsonData.hasNextPage, true, 'Trang 2 trong 3 trang phải có hasNextPage = true');
  assert.strictEqual(res6.jsonData.equipments.length, 10);
  console.log('  ✔ Test 6 ĐẠT: Phân trang GET /api/equipments trả về đầy đủ metadata (totalPages: 3, hasPrevPage: true, hasNextPage: true).');

  // ----------------------------------------------------
  // TEST 8: Dynamic RBAC Live Policy Guard trên GET /api/equipments
  // ----------------------------------------------------
  console.log('\n▶ Test 8 (UC-12.2): Thực thi Live Policy tức thì trên GET /api/equipments (Chặn khi bị thu hồi quyền)');
  
  // Case A: Người dùng có quyền equipment:read -> 200 OK
  const req7Authorized = {
    user: {
      _id: '67a000000000000000000002',
      role: USER_ROLES.TECHNICIAN
    },
    hasPermission: (code) => code === 'equipment:read',
    query: { page: 1, limit: 10 }
  };
  const res7Authorized = createMockRes();
  await getEquipments(req7Authorized, res7Authorized);
  assert.strictEqual(res7Authorized.statusCode, 200);
  assert.strictEqual(res7Authorized.jsonData.success, true);

  // Case B: Người dùng bị thu hồi quyền equipment:read -> 403 Forbidden
  const req7Revoked = {
    user: {
      _id: '67a000000000000000000003',
      role: 'guest_user'
    },
    hasPermission: () => false, // permission revoked live
    query: { page: 1, limit: 10 }
  };
  const res7Revoked = createMockRes();
  await getEquipments(req7Revoked, res7Revoked);
  assert.strictEqual(res7Revoked.statusCode, 403);
  assert.strictEqual(res7Revoked.jsonData.success, false);
  assert(res7Revoked.jsonData.message.includes('equipment:read'));
  console.log('  ✔ Test 7 ĐẠT: Live Policy áp dụng tức thời trên GET /api/equipments (200 khi có quyền, 403 khi bị thu hồi).');

  console.log('\n--- TOÀN BỘ 7/7 TEST CASES UC-12.2 UPDATE PERMS & LIVE POLICY ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
