import assert from 'assert';
import { updateUserRole, toggleUserStatus } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.4: UPDATE USER ROLE & SESSION INVALIDATION ---');

  let mockDb = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Quản Trị Viên Toàn Quyền',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Phòng QTHH',
      status: USER_STATUSES.ACTIVE,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      code: 'GV002',
      full_name: 'Trần Văn Giảng Viên',
      email: 'tran.gv@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      requested_role: USER_ROLES.TECHNICIAN,
      department: 'Khoa Công Nghệ Thông Tin',
      status: USER_STATUSES.ACTIVE,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    }
  ];

  let revokedUserIds = [];
  RefreshToken.updateMany = async (filter, update) => {
    if (filter.user_id) {
      revokedUserIds.push(filter.user_id.toString());
    }
    return { modifiedCount: 2 };
  };

  const loggedAuditActions = [];
  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return true;
  };

  // Mock User.findById
  User.findById = (id) => {
    const found = mockDb.find(u => u._id === id);
    if (!found) return Promise.resolve(null);
    return Promise.resolve(found);
  };

  const adminReqUser = {
    _id: '67a000000000000000000001',
    code: 'AD001',
    full_name: 'Quản Trị Viên Toàn Quyền',
    role: USER_ROLES.ADMIN
  };

  // TEST 1: Cập nhật vai trò hợp lệ và thu hồi phiên làm việc (PATCH /api/auth/users/:id/role)
  console.log('▶ Test 1: Admin điều chỉnh vai trò trực tiếp và thu hồi phiên làm việc cũ (updateUserRole)');
  {
    revokedUserIds = [];
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { role: USER_ROLES.TECHNICIAN }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await updateUserRole(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.user.role, USER_ROLES.TECHNICIAN);
    assert.strictEqual(responseData.revokedSessions, 2);
    assert(revokedUserIds.includes('67a000000000000000000002'), 'Phiên làm việc của user phải bị thu hồi');
    assert.strictEqual(mockDb[1].requested_role, null, 'requested_role trùng khớp phải được xóa');

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'UPDATE_ROLE');
    assert.strictEqual(lastAudit.new_value.role, USER_ROLES.TECHNICIAN);
    assert.strictEqual(lastAudit.new_value.revoked_sessions, 2);
    console.log('  ✔ Test 1 ĐẠT: Cập nhật vai trò thành công, thu hồi 2 refresh token và ghi nhận nhật ký kiểm toán.');
  }

  // TEST 2: Chặn Admin tự hạ quyền của chính mình
  console.log('▶ Test 2: Guard-rail - Chặn Admin tự hạ vai trò quản trị viên của chính mình');
  {
    const req = {
      params: { id: '67a000000000000000000001' },
      user: adminReqUser,
      body: { role: USER_ROLES.LECTURER }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await updateUserRole(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('tự hạ quyền Quản trị viên'));
    console.log('  ✔ Test 2 ĐẠT: Cơ chế phòng vệ tự hạ quyền hoạt động chính xác.');
  }

  // TEST 3: Từ chối vai trò không hợp lệ
  console.log('▶ Test 3: Validate vai trò (role) không hợp lệ');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { role: 'INVALID_ROLE_XYZ' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await updateUserRole(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    console.log('  ✔ Test 3 ĐẠT: Bắt lỗi vai trò không hợp lệ chuẩn xác.');
  }

  // TEST 4: Khóa tài khoản và thu hồi toàn bộ phiên đăng nhập (PUT /api/admin/users/:id/toggle-status)
  console.log('▶ Test 4: Khóa tài khoản và hủy toàn bộ phiên làm việc (toggleUserStatus)');
  {
    revokedUserIds = [];
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { status: USER_STATUSES.LOCKED }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserStatus(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.status, USER_STATUSES.LOCKED);
    assert(revokedUserIds.includes('67a000000000000000000002'), 'Tài khoản bị khóa phải bị thu hồi toàn bộ token');

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'LOCK_USER');
    console.log('  ✔ Test 4 ĐẠT: Khóa tài khoản thành công và thu hồi phiên làm việc tức thời.');
  }

  // TEST 5: Mở khóa tài khoản (toggleUserStatus sang active)
  console.log('▶ Test 5: Mở khóa tài khoản người dùng');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { status: USER_STATUSES.ACTIVE }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserStatus(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(mockDb[1].failed_login_attempts, 0);

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'UNLOCK_USER');
    console.log('  ✔ Test 5 ĐẠT: Mở khóa tài khoản và reset số lần đăng nhập sai thành công.');
  }

  // TEST 6: Chặn Admin tự khóa tài khoản chính mình
  console.log('▶ Test 6: Guard-rail - Chặn Admin tự khóa tài khoản của chính mình');
  {
    const req = {
      params: { id: '67a000000000000000000001' },
      user: adminReqUser,
      body: { status: USER_STATUSES.LOCKED }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserStatus(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('tự khóa tài khoản Quản trị viên'));
    console.log('  ✔ Test 6 ĐẠT: Chặn thành công hành vi Admin tự khóa chính mình.');
  }

  console.log('--- TOÀN BỘ 6/6 TEST CASES UC-10.4 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ Kiểm thử UC-10.4 thất bại:', err);
  process.exit(1);
});
