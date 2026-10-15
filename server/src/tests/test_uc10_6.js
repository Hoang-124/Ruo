import assert from 'assert';
import bcrypt from 'bcryptjs';
import { adminResetPassword, login, changePassword } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.6: RESET PASSWORD & ENFORCE NEXT LOGIN CHANGE ---');

  let currentRawPassword = 'InitialPassword@2026';
  let currentHashedPassword = await bcrypt.hash(currentRawPassword, 10);

  let mockDb = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Quản Trị Viên Toàn Quyền',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Phòng QTHH',
      status: USER_STATUSES.ACTIVE,
      force_change_pw: false,
      failed_login_attempts: 0,
      lock_until: null,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      code: 'GV002',
      full_name: 'Trần Văn Giảng Viên',
      email: 'tran.gv@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Công Nghệ Thông Tin',
      status: USER_STATUSES.ACTIVE,
      password_hash: currentHashedPassword,
      force_change_pw: false,
      failed_login_attempts: 3,
      lock_until: null,
      isLocked() { return false; },
      resetFailedLogin: async function() { this.failed_login_attempts = 0; return true; },
      handleFailedLogin: async function() { return { isLocked: false, attemptsLeft: 4, failedAttempts: 1 }; },
      comparePassword: async function(entered) {
        return await bcrypt.compare(entered, this.password_hash);
      },
      toObject() { return { ...this }; },
      save: async function() {
        if (this.password_hash && !this.password_hash.startsWith('$2')) {
          this.password_hash = await bcrypt.hash(this.password_hash, 10);
        }
        return this;
      }
    }
  ];

  let revokedUserIds = [];
  RefreshToken.updateMany = async (filter, update) => {
    if (filter.user_id) {
      revokedUserIds.push(filter.user_id.toString());
    }
    return { modifiedCount: 1 };
  };
  RefreshToken.create = async () => ({ token: 'mock_token' });

  const loggedAuditActions = [];
  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return true;
  };

  User.findById = (id) => {
    const found = mockDb.find(u => u._id === id.toString());
    if (!found) return Promise.resolve(null);
    return Promise.resolve(found);
  };

  User.findOne = (query) => {
    const found = mockDb.find(u => {
      if (query.email && u.email === query.email.toLowerCase()) return true;
      if (query.code && u.code === query.code.toUpperCase()) return true;
      if (query.$or) {
        return query.$or.some(q => {
          if (q.email && u.email === q.email.toLowerCase()) return true;
          if (q.code && u.code === q.code.toUpperCase()) return true;
          return false;
        });
      }
      return false;
    });
    return Promise.resolve(found || null);
  };

  const adminReqUser = {
    _id: '67a000000000000000000001',
    code: 'AD001',
    full_name: 'Quản Trị Viên Toàn Quyền',
    role: USER_ROLES.ADMIN
  };

  let generatedTempPassword = '';

  // TEST 1: Admin cấp mật khẩu ngẫu nhiên cho người dùng (POST /api/auth/users/:id/reset-password)
  console.log('▶ Test 1: Admin cấp mật khẩu ngẫu nhiên (POST /api/auth/users/:id/reset-password)');
  {
    revokedUserIds = [];
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: {} // Không truyền mật khẩu -> Tự sinh mật khẩu ngẫu nhiên
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
    assert(responseData.tempPassword.startsWith('Ruo@'), 'Mật khẩu ngẫu nhiên phải theo định dạng Ruo@...');
    assert.strictEqual(responseData.force_change_pw, true);
    assert.strictEqual(mockDb[1].force_change_pw, true, 'force_change_pw phải được bật');
    assert.strictEqual(mockDb[1].failed_login_attempts, 0, 'failed_login_attempts phải được reset');
    assert(revokedUserIds.includes('67a000000000000000000002'), 'Phiên đăng nhập cũ phải bị thu hồi');

    generatedTempPassword = responseData.tempPassword;
    console.log(`  ✔ Test 1 ĐẠT: Cấp mật khẩu ngẫu nhiên [${generatedTempPassword}] thành công, bật cờ force_change_pw.`);
  }

  // TEST 2: Người dùng đăng nhập bằng mật khẩu tạm vừa cấp -> Trả về force_change_pw: true
  console.log('▶ Test 2: Người dùng đăng nhập bằng mật khẩu tạm vừa cấp -> Nhận cờ force_change_pw: true');
  {
    const req = {
      body: {
        identifier: 'tran.gv@ruo.edu.vn',
        password: generatedTempPassword
      },
      headers: { 'user-agent': 'Chrome Test Browser' },
      socket: { remoteAddress: '127.0.0.1' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await login(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.user.force_change_pw, true, 'User phải nhận cờ force_change_pw = true khi đăng nhập');
    assert(responseData.token, 'Phải sinh Access Token');
    console.log('  ✔ Test 2 ĐẠT: Đăng nhập thành công, hệ thống thông báo người dùng phải đổi mật khẩu.');
  }

  // TEST 3: Người dùng thực hiện đổi mật khẩu bắt buộc (POST /api/auth/change-password)
  console.log('▶ Test 3: Người dùng đổi mật khẩu bắt buộc thành công -> Cờ force_change_pw được tắt');
  {
    const req = {
      user: mockDb[1],
      body: {
        oldPassword: generatedTempPassword,
        newPassword: 'NewSecurePass@2026'
      }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await changePassword(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(mockDb[1].force_change_pw, false, 'Cờ force_change_pw phải được tắt sau khi đổi mật khẩu');

    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'USER_CHANGE_PASSWORD');
    console.log('  ✔ Test 3 ĐẠT: Đổi mật khẩu thành công và giải tỏa yêu cầu đổi mật khẩu (force_change_pw = false).');
  }

  // TEST 4: Đăng nhập lại với mật khẩu mới -> Không còn yêu cầu đổi mật khẩu
  console.log('▶ Test 4: Đăng nhập lại với mật khẩu mới -> force_change_pw = false');
  {
    const req = {
      body: {
        identifier: 'tran.gv@ruo.edu.vn',
        password: 'NewSecurePass@2026'
      },
      headers: { 'user-agent': 'Chrome Test Browser' },
      socket: { remoteAddress: '127.0.0.1' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await login(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.user.force_change_pw, false, 'Không còn cờ force_change_pw');
    console.log('  ✔ Test 4 ĐẠT: Đăng nhập bằng mật khẩu mới thành công, tài khoản ở trạng thái bình thường.');
  }

  // TEST 5: Bắt lỗi khi đổi mật khẩu mới trùng với mật khẩu hiện tại
  console.log('▶ Test 5: Bắt lỗi khi mật khẩu mới trùng với mật khẩu hiện tại');
  {
    const req = {
      user: mockDb[1],
      body: {
        oldPassword: 'NewSecurePass@2026',
        newPassword: 'NewSecurePass@2026'
      }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await changePassword(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('không được trùng'));
    console.log('  ✔ Test 5 ĐẠT: Bắt lỗi trùng mật khẩu hiện tại chuẩn xác.');
  }

  // TEST 6: Bắt lỗi khi mật khẩu mới không đạt chuẩn bảo mật
  console.log('▶ Test 6: Bắt lỗi khi mật khẩu mới không đạt chuẩn bảo mật');
  {
    const req = {
      user: mockDb[1],
      body: {
        oldPassword: 'NewSecurePass@2026',
        newPassword: 'weak'
      }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await changePassword(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('tối thiểu 8 ký tự'));
    console.log('  ✔ Test 6 ĐẠT: Bắt lỗi chính sách mật khẩu yếu chuẩn xác.');
  }

  console.log('--- TOÀN BỘ 6/6 TEST CASES UC-10.6 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
