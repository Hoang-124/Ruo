import assert from 'assert';
import { approveUser } from '../controllers/authController.js';
import { createBuilding, updateBuilding, deleteBuilding } from '../controllers/facilityController.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { Building } from '../models/Room.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.7: ROLE APPROVAL, APPOINTMENT & BUILDING MASTER DATA ---');

  let mockDb = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Admin BGH Toàn Quyền',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Ban Giám Hiệu',
      status: USER_STATUSES.ACTIVE,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000002',
      code: 'NV002',
      full_name: 'Nguyễn Văn Đăng Ký Quản Lý',
      email: 'nguyen.ql@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      requested_role: USER_ROLES.FACILITY_MANAGER,
      department: 'Phòng Quản Trị Thiết Bị',
      status: USER_STATUSES.PENDING_APPROVAL,
      approved_by: null,
      approved_at: null,
      approval_note: null,
      rejection_reason: null,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: '67a000000000000000000003',
      code: 'KT003',
      full_name: 'Lê Kỹ Thuật Viên Dự Bị',
      email: 'le.kt@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      requested_role: USER_ROLES.TECHNICIAN,
      department: 'Tổ Kỹ Thuật Sửa Chữa',
      status: USER_STATUSES.PENDING_APPROVAL,
      approved_by: null,
      approved_at: null,
      approval_note: null,
      rejection_reason: null,
      toObject() { return { ...this }; },
      save: async function() { return this; }
    }
  ];

  let loggedAuditActions = [];
  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return payload;
  };

  let revokedTokensCount = 0;
  RefreshToken.updateMany = async (query, update) => {
    revokedTokensCount += 2;
    return { modifiedCount: 2 };
  };

  User.findById = (id) => {
    const found = mockDb.find(u => u._id === id || u._id.toString() === id.toString());
    return Promise.resolve(found || null);
  };

  const adminOperator = mockDb[0];

  // TEST 1: Admin phê duyệt bổ nhiệm chức vụ Quản Lý CSVC theo nguyện vọng đăng ký
  console.log('▶ Test 1: Admin phê duyệt bổ nhiệm chức vụ Quản Lý CSVC (POST /api/auth/users/:id/approve)');
  {
    const targetUser = mockDb[1];
    const req = {
      user: adminOperator,
      params: { id: targetUser._id },
      body: {
        action: 'approve',
        note: 'Đạt chuẩn chứng chỉ Quản lý Tài sản Nhà nước theo QĐ số 45/QĐ-BGH'
      },
      ip: '192.168.1.100'
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await approveUser(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(targetUser.role, USER_ROLES.FACILITY_MANAGER);
    assert.strictEqual(targetUser.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(targetUser.requested_role, null);
    assert.strictEqual(targetUser.approved_by, adminOperator._id);
    assert(targetUser.approved_at instanceof Date);
    assert.strictEqual(targetUser.approval_note, 'Đạt chuẩn chứng chỉ Quản lý Tài sản Nhà nước theo QĐ số 45/QĐ-BGH');

    // AuditLog check
    const audit = loggedAuditActions.find(a => a.action === 'APPROVE_USER_ROLE');
    assert(audit, 'Phải ghi nhận nhật ký APPROVE_USER_ROLE');
    assert.strictEqual(audit.new_value.role, USER_ROLES.FACILITY_MANAGER);
    assert.strictEqual(audit.new_value.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(audit.ip_address, '192.168.1.100');
    console.log('  ✔ Test 1 ĐẠT: Phê duyệt bổ nhiệm Quản Lý CSVC thành công, kích hoạt active và ghi log.');
  }

  // TEST 2: Admin từ chối nguyện vọng chức vụ và hạ về Giảng Viên thường
  console.log('▶ Test 2: Admin từ chối nguyện vọng chức vụ (hạ về Giảng Viên thường - UC-10.7)');
  {
    const targetUser = mockDb[2];
    const req = {
      user: adminOperator,
      params: { id: targetUser._id },
      body: {
        action: 'reject',
        note: 'Chưa đủ chứng chỉ an toàn thiết bị điện bậc 3'
      },
      ip: '192.168.1.101'
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await approveUser(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(targetUser.role, USER_ROLES.LECTURER);
    assert.strictEqual(targetUser.status, USER_STATUSES.ACTIVE);
    assert.strictEqual(targetUser.requested_role, null);
    assert.strictEqual(targetUser.rejection_reason, 'Chưa đủ chứng chỉ an toàn thiết bị điện bậc 3');

    // AuditLog check
    const audit = loggedAuditActions.find(a => a.action === 'REJECT_USER_ROLE');
    assert(audit, 'Phải ghi nhận nhật ký REJECT_USER_ROLE');
    assert.strictEqual(audit.new_value.role, USER_ROLES.LECTURER);
    assert.strictEqual(audit.new_value.status, USER_STATUSES.ACTIVE);
    console.log('  ✔ Test 2 ĐẠT: Từ chối bổ nhiệm thành công, tài khoản kích hoạt vai trò Giảng Viên.');
  }

  // TEST 3: Validate vai trò không hợp lệ khi phê duyệt
  console.log('▶ Test 3: Validate vai trò (role) không hợp lệ');
  {
    const req = {
      user: adminOperator,
      params: { id: mockDb[1]._id },
      body: {
        action: 'approve',
        role: 'invalid_super_role'
      }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await approveUser(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('không hợp lệ'));
    console.log('  ✔ Test 3 ĐẠT: Chặn thành công vai trò không hợp lệ.');
  }

  // TEST 4: Bắt lỗi khi người dùng không tồn tại (404 Not Found)
  console.log('▶ Test 4: Bắt lỗi khi người dùng không tồn tại');
  {
    const req = {
      user: adminOperator,
      params: { id: '67a000000000000000000999' },
      body: { action: 'approve' }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await approveUser(req, res);
    assert.strictEqual(statusCode, 404);
    assert.strictEqual(responseData.success, false);
    console.log('  ✔ Test 4 ĐẠT: Trả về mã lỗi 404 chuẩn xác.');
  }

  // TEST 5: Thu hồi phiên đăng nhập (Session Invalidation) khi thay đổi chức vụ
  console.log('▶ Test 5: Thu hồi phiên đăng nhập khi phê duyệt hoặc từ chối');
  {
    assert(revokedTokensCount > 0, 'Phải thực hiện thu hồi các phiên đăng nhập cũ.');
    console.log(`  ✔ Test 5 ĐẠT: Đã thu hồi ${revokedTokensCount} phiên làm việc cũ để áp dụng quyền mới.`);
  }

  // TEST 6: CRUD /api/admin/buildings Master Data - Khởi tạo tòa nhà
  console.log('▶ Test 6: CRUD /api/admin/buildings - Khởi tạo tòa nhà mới');
  {
    let mockBuildings = [];
    Building.findOne = ({ code }) => Promise.resolve(mockBuildings.find(b => b.code === code) || null);
    Building.create = (doc) => {
      const b = { ...doc, _id: '67b000000000000000000001', save: async function() { return this; } };
      mockBuildings.push(b);
      return Promise.resolve(b);
    };

    const req = {
      body: {
        code: 'b2',
        name: 'Tòa Nhà Kỹ Thuật B2',
        campusZone: 'Khu B',
        totalFloors: 6,
        description: 'Tòa nhà thực hành kỹ thuật máy tính'
      }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; }
    };

    await createBuilding(req, res);
    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.building.code, 'B2');
    assert.strictEqual(responseData.building.totalFloors, 6);
    console.log('  ✔ Test 6 ĐẠT: Khởi tạo tòa nhà Master Data mới thành công.');

    // Bắt lỗi trùng mã tòa nhà
    await createBuilding(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.success, false);
    assert(responseData.message.includes('đã tồn tại'));
    console.log('  ✔ Test 6.1 ĐẠT: Chặn trùng mã tòa nhà chuẩn xác.');
  }

  // TEST 7: CRUD /api/admin/buildings Master Data - Cập nhật & Vô hiệu hóa
  console.log('▶ Test 7: CRUD /api/admin/buildings - Cập nhật và Vô hiệu hóa tòa nhà');
  {
    const mockB = {
      _id: '67b000000000000000000001',
      code: 'B2',
      name: 'Tòa Nhà B2',
      campusZone: 'Khu B',
      totalFloors: 6,
      isActive: true,
      save: async function() { return this; }
    };
    Building.findById = (id) => Promise.resolve(id === mockB._id ? mockB : null);

    const updateReq = {
      params: { id: mockB._id },
      body: { name: 'Tòa Nhà Công Nghệ B2 Đổi Tên', totalFloors: 7 }
    };
    let updateResData = null;
    const updateRes = {
      status: () => updateRes,
      json: (d) => { updateResData = d; }
    };

    await updateBuilding(updateReq, updateRes);
    assert.strictEqual(updateResData.success, true);
    assert.strictEqual(mockB.name, 'Tòa Nhà Công Nghệ B2 Đổi Tên');
    assert.strictEqual(mockB.totalFloors, 7);
    console.log('  ✔ Test 7.1 ĐẠT: Cập nhật thông tin tòa nhà thành công.');

    const deleteReq = { params: { id: mockB._id } };
    let deleteResData = null;
    const deleteRes = {
      status: () => deleteRes,
      json: (d) => { deleteResData = d; }
    };

    await deleteBuilding(deleteReq, deleteRes);
    assert.strictEqual(deleteResData.success, true);
    assert.strictEqual(mockB.isActive, false);
    console.log('  ✔ Test 7.2 ĐẠT: Vô hiệu hóa (soft delete) tòa nhà thành công.');
  }

  console.log('--- TOÀN BỘ 7/7 TEST CASES UC-10.7 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
