import assert from 'assert';
import { getUserById, adminUpdateUser } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.3: USER DETAIL & RBAC UPDATE ---');

  let mockDb = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Quản Trị Viên Hệ Thống',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Phòng Quản Trị Hệ Thống',
      phone: '0912345678',
      status: USER_STATUSES.ACTIVE,
      repute_score: 100,
      requested_role: null,
      created_at: new Date('2026-01-01T00:00:00Z'),
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      code: 'GV002',
      full_name: 'Giảng Viên Nguyễn Văn An',
      email: 'an.nv@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Công Nghệ Thông Tin',
      phone: '0987654321',
      status: USER_STATUSES.PENDING_APPROVAL,
      repute_score: 95,
      requested_role: USER_ROLES.FACILITY_MANAGER,
      created_at: new Date('2026-02-15T00:00:00Z'),
      toObject() { return { ...this }; },
      save: async function() { return this; }
    }
  ];

  const loggedAuditActions = [];
  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return true;
  };

  AuditLog.find = () => ({
    sort: () => ({
      limit: () => Promise.resolve([
        {
          _id: 'audit_01',
          action: 'USER_LOGIN',
          seq: 1,
          ip_address: '127.0.0.1',
          created_at: new Date()
        }
      ])
    })
  });

  // Mock User.findById
  User.findById = (id) => {
    const found = mockDb.find(u => u._id === id);
    if (!found) return { select: () => Promise.resolve(null), ...Promise.resolve(null) };
    return {
      ...found,
      select: () => Promise.resolve(found),
      then: (resolve) => resolve(found)
    };
  };

  const adminReqUser = {
    _id: '67a000000000000000000001',
    code: 'AD001',
    full_name: 'Quản Trị Viên Hệ Thống',
    role: USER_ROLES.ADMIN
  };

  // TEST 1: Xem chi tiết hồ sơ & lịch sử hoạt động (GET /api/auth/users/:id)
  console.log('▶ Test 1: Xem chi tiết hồ sơ, chức vụ đăng ký và lịch sử tài khoản (getUserById)');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await getUserById(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.user.code, 'GV002');
    assert.strictEqual(responseData.user.requested_role, USER_ROLES.FACILITY_MANAGER);
    assert.strictEqual(responseData.user.repute_score, 95);
    assert(Array.isArray(responseData.activities), 'Activities list must be returned');
    console.log('  ✔ Test 1 ĐẠT: Lấy đầy đủ thông tin hồ sơ, chức vụ đăng ký và danh sách lịch sử.');
  }

  // TEST 2: Cập nhật RBAC và hồ sơ thành công (PUT /api/admin/users/:id)
  console.log('▶ Test 2: Admin cập nhật vai trò RBAC và chuyển trạng thái hoạt động (adminUpdateUser)');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: {
        role: USER_ROLES.FACILITY_MANAGER,
        status: USER_STATUSES.ACTIVE,
        department: 'Phòng Quản Trị Cơ Sở Vật Chất',
        phone: '0901234567'
      }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminUpdateUser(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.user.role, USER_ROLES.FACILITY_MANAGER);
    assert.strictEqual(responseData.user.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(responseData.user.department, 'Phòng Quản Trị Cơ Sở Vật Chất');
    assert.strictEqual(responseData.user.phone, '0901234567');
    assert.strictEqual(responseData.user.requested_role, null, 'Trùng role được bổ nhiệm nên xóa requested_role');

    // Kiểm tra AuditLog được ghi lại
    const lastAudit = loggedAuditActions[loggedAuditActions.length - 1];
    assert.strictEqual(lastAudit.action, 'RBAC_UPDATE');
    assert.strictEqual(lastAudit.target_table, 'users');
    console.log('  ✔ Test 2 ĐẠT: Cập nhật RBAC thành công và ghi nhận nhật ký kiểm toán RBAC_UPDATE.');
  }

  // TEST 3: Cập nhật điểm tín nhiệm Repute Score
  console.log('▶ Test 3: Admin điều chỉnh điểm tín nhiệm (Repute Score)');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { repute_score: 98 }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminUpdateUser(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.user.repute_score, 98);
    console.log('  ✔ Test 3 ĐẠT: Điểm tín nhiệm cập nhật chuẩn xác.');
  }

  // TEST 4: Khóa cứng - Chặn sửa đổi Mã cán bộ và Email
  console.log('▶ Test 4: Khóa cứng (Hard-lock) - Chặn hành vi cố tình đổi mã cán bộ hoặc email');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { code: 'GV999' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminUpdateUser(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('mã cán bộ'));
    console.log('  ✔ Test 4 ĐẠT: Chặn thành công hành vi sửa mã cán bộ.');
  }

  // TEST 5: Validate vai trò không hợp lệ
  console.log('▶ Test 5: Validate vai trò (role) không hợp lệ');
  {
    const req = {
      params: { id: '67a000000000000000000002' },
      user: adminReqUser,
      body: { role: 'SUPER_HERO' }
    };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await adminUpdateUser(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    console.log('  ✔ Test 5 ĐẠT: Bắt lỗi vai trò không hợp lệ chuẩn xác.');
  }

  // TEST 6: Guard-rail - Chặn Admin tự hạ quyền hoặc tự khóa tài khoản của chính mình
  console.log('▶ Test 6: Guard-rail - Chặn Admin tự hạ quyền của chính mình');
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

    await adminUpdateUser(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('hạ quyền Admin'));
    console.log('  ✔ Test 6 ĐẠT: Bảo vệ Admin không bị tự hạ quyền.');
  }

  console.log('--- TOÀN BỘ 6/6 TEST CASES UC-10.3 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ Kiểm thử UC-10.3 thất bại:', err);
  process.exit(1);
});
