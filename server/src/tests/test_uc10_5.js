import assert from 'assert';
import { toggleUserLock, adminResetPassword } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.5: TOGGLE STATUS & FORCE RESET PASSWORD ---');

  let mockDb = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Quản Trị Viên Toàn Quyền',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Phòng QTHH',
      status: USER_STATUSES.ACTIVE,
      lock_reason: null,
      locked_at: null,
      locked_by: null,
      force_change_pw: false,
      failed_login_attempts: 0,
      lock_until: null,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      code: 'GV002',
      full_name: 'Nguyễn Văn Giảng Viên',
      email: 'gv.nguyen@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Công Nghệ Thông Tin',
      status: USER_STATUSES.ACTIVE,
      lock_reason: null,
      locked_at: null,
      locked_by: null,
      force_change_pw: false,
      failed_login_attempts: 2,
      lock_until: null,
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

  // TEST 1: Admin Soft Lock tài khoản kèm lý do (PATCH /api/auth/users/:id/lock)
  console.log('▶ Test 1: Admin soft lock tài khoản có lý do và thu hồi phiên làm việc tức thời');
  {
    revokedUserIds = [];
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: {
        action: 'lock',
        reason: 'Nghi vấn lộ thông tin đăng nhập từ thiết bị lạ'
      }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserLock(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.status, USER_STATUSES.LOCKED);
    assert.strictEqual(mockDb[1].status, USER_STATUSES.LOCKED);
    assert.strictEqual(mockDb[1].lock_reason, 'Nghi vấn lộ thông tin đăng nhập từ thiết bị lạ');
    assert(mockDb[1].locked_at instanceof Date, 'locked_at phải được ghi nhận thời điểm');
    assert.strictEqual(mockDb[1].locked_by, adminReqUser._id);
    assert.strictEqual(responseData.revokedSessions, 2);
    assert(revokedUserIds.includes('67a000000000000000000002'), 'Phiên làm việc phải bị thu hồi ngay');

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'LOCK_USER');
    assert.strictEqual(lastAudit.new_value.lock_reason, 'Nghi vấn lộ thông tin đăng nhập từ thiết bị lạ');
    console.log('  ✔ Test 1 ĐẠT: Khóa tài khoản thành công, lưu lý do và thu hồi phiên làm việc tức thời.');
  }

  // TEST 2: Admin Mở khóa tài khoản (unlock)
  console.log('▶ Test 2: Admin mở khóa tài khoản (unlock) - làm sạch lý do và reset failed attempts');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { action: 'unlock' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserLock(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(mockDb[1].status, USER_STATUSES.ACTIVE);
    assert.strictEqual(mockDb[1].lock_reason, null);
    assert.strictEqual(mockDb[1].locked_at, null);
    assert.strictEqual(mockDb[1].locked_by, null);
    assert.strictEqual(mockDb[1].failed_login_attempts, 0);

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'UNLOCK_USER');
    console.log('  ✔ Test 2 ĐẠT: Mở khóa tài khoản thành công, reset trạng thái tài khoản về bình thường.');
  }

  // TEST 3: Guard-rail - Chặn Admin tự khóa chính mình
  console.log('▶ Test 3: Guard-rail - Chặn Admin tự khóa tài khoản của chính mình');
  {
    const req = {
      params: { id: '67a000000000000000000001' },
      user: adminReqUser,
      body: { action: 'lock' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await toggleUserLock(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('không thể tự khóa tài khoản'));
    console.log('  ✔ Test 3 ĐẠT: Cơ chế phòng vệ tự khóa của Admin hoạt động chính xác.');
  }

  // TEST 4: Force Reset Password tự sinh mật khẩu ngẫu nhiên
  console.log('▶ Test 4: Force Reset Password tự sinh mật khẩu ngẫu nhiên (POST /api/admin/users/:id/reset-password)');
  {
    revokedUserIds = [];
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: {}
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminResetPassword(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert(responseData.tempPassword.startsWith('Ruo@'), 'Mật khẩu tự sinh phải có định dạng Ruo@...');
    assert.strictEqual(responseData.force_change_pw, true);
    assert.strictEqual(mockDb[1].force_change_pw, true);
    assert.strictEqual(mockDb[1].failed_login_attempts, 0);
    assert.strictEqual(responseData.revokedSessions, 2);
    assert(revokedUserIds.includes('67a000000000000000000002'), 'Phiên làm việc phải bị thu hồi khi reset password');

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'ADMIN_RESET_PASSWORD');
    console.log('  ✔ Test 4 ĐẠT: Đặt lại mật khẩu ngẫu nhiên thành công, bật force_change_pw và thu hồi token.');
  }

  // TEST 5: Force Reset Password với mật khẩu chỉ định hợp lệ
  console.log('▶ Test 5: Force Reset Password với mật khẩu chỉ định hợp lệ');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { new_password: 'FacultyPassword@2026' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminResetPassword(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.tempPassword, 'FacultyPassword@2026');
    assert.strictEqual(mockDb[1].force_change_pw, true);
    console.log('  ✔ Test 5 ĐẠT: Đặt lại mật khẩu chỉ định thành công.');
  }

  // TEST 6: Bắt lỗi khi mật khẩu chỉ định không đủ độ dài
  console.log('▶ Test 6: Bắt lỗi khi mật khẩu chỉ định không đủ độ dài (< 6 ký tự)');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { new_password: '123' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminResetPassword(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('tối thiểu 6 ký tự'));
    console.log('  ✔ Test 6 ĐẠT: Bắt lỗi mật khẩu ngắn chuẩn xác.');
  }

  console.log('--- TOÀN BỘ 6/6 TEST CASES UC-10.5 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
