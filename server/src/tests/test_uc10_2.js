import assert from 'assert';
import { getAllUsers, getUserById } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-10.2: USER DIRECTORY & ACTIVITY ---');

  const mockUsers = [
    {
      _id: '67a000000000000000000001',
      code: 'AD001',
      full_name: 'Quản Trị Viên',
      email: 'admin@ruo.edu.vn',
      role: USER_ROLES.ADMIN,
      department: 'Phòng QTHH',
      status: USER_STATUSES.ACTIVE
    },
    {
      _id: '67a000000000000000000002',
      code: 'KT001',
      full_name: 'Trần Văn Kỹ Thuật',
      email: 'tech@ruo.edu.vn',
      role: USER_ROLES.TECHNICIAN,
      department: 'Tổ Kỹ Thuật',
      status: USER_STATUSES.ACTIVE
    },
    {
      _id: '67a000000000000000000003',
      code: 'GV002',
      full_name: 'Nguyễn Chờ Duyệt',
      email: 'pending@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      department: 'Khoa CNTT',
      status: USER_STATUSES.PENDING_APPROVAL
    },
    {
      _id: '67a000000000000000000004',
      code: 'GV003',
      full_name: 'Lê Văn Khóa',
      email: 'locked@ruo.edu.vn',
      role: USER_ROLES.LECTURER,
      department: 'Khoa Ngoại Ngữ',
      status: USER_STATUSES.LOCKED
    }
  ];

  const mockAuditLogs = [
    {
      _id: 'log1',
      user_id: '67a000000000000000000001',
      action: 'USER_LOGIN',
      target_table: 'users',
      timestamp: new Date()
    },
    {
      _id: 'log2',
      user_id: '67a000000000000000000001',
      action: 'USER_UPDATE_PROFILE',
      target_table: 'users',
      timestamp: new Date()
    }
  ];

  // Mock User.find
  User.find = (query) => {
    let result = [...mockUsers];
    if (query.role) {
      result = result.filter(u => u.role === query.role);
    }
    if (query.status) {
      if (typeof query.status === 'object' && query.status.$in) {
        result = result.filter(u => query.status.$in.includes(u.status));
      } else {
        result = result.filter(u => u.status === query.status);
      }
    }
    if (query.$or) {
      result = result.filter(u => {
        return query.$or.some(cond => {
          const key = Object.keys(cond)[0];
          const regex = cond[key].$regex;
          return new RegExp(regex, 'i').test(u[key]);
        });
      });
    }

    return {
      select: () => ({
        sort: () => Promise.resolve(result)
      })
    };
  };

  // Mock User.countDocuments
  User.countDocuments = (filter = {}) => {
    if (filter.status) {
      if (typeof filter.status === 'object' && filter.status.$in) {
        return Promise.resolve(mockUsers.filter(u => filter.status.$in.includes(u.status)).length);
      }
      return Promise.resolve(mockUsers.filter(u => u.status === filter.status).length);
    }
    return Promise.resolve(mockUsers.length);
  };

  // Mock User.findById
  User.findById = (id) => ({
    select: () => Promise.resolve(mockUsers.find(u => u._id === id) || null)
  });

  // Mock AuditLog.find
  AuditLog.find = () => ({
    sort: () => ({
      limit: () => Promise.resolve(mockAuditLogs)
    })
  });

  // TEST 1: Lấy danh sách kèm số đếm Realtime Tabs
  console.log('▶ Test 1: Lấy danh sách người dùng kèm số đếm realtime tabs (all, pending, active, locked)');
  {
    let jsonResult = null;
    const req = { query: {} };
    const res = { json: (d) => { jsonResult = d; } };

    await getAllUsers(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.total, 4, 'Tổng số user là 4');
    assert.ok(jsonResult.counts, 'Phải có object counts');
    assert.strictEqual(jsonResult.counts.all, 4, 'Tổng counts.all = 4');
    assert.strictEqual(jsonResult.counts.pending, 1, 'Chờ duyệt counts.pending = 1');
    assert.strictEqual(jsonResult.counts.active, 2, 'Hoạt động counts.active = 2');
    assert.strictEqual(jsonResult.counts.locked, 1, 'Đã khóa counts.locked = 1');
    console.log('  ✔ Test 1 ĐẠT: Số đếm realtime các tab trả về chính xác.');
  }

  // TEST 2: Lọc theo tab Chờ phê duyệt (pending_approval)
  console.log('▶ Test 2: Lọc theo tab Chờ phê duyệt (status=pending_approval)');
  {
    let jsonResult = null;
    const req = { query: { status: 'pending_approval' } };
    const res = { json: (d) => { jsonResult = d; } };

    await getAllUsers(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.total, 1);
    assert.strictEqual(jsonResult.users[0].code, 'GV002');
    assert.strictEqual(jsonResult.counts.all, 4, 'Counts tổng vẫn giữ nguyên realtime');
    console.log('  ✔ Test 2 ĐẠT: Lọc tab Chờ duyệt chuẩn xác.');
  }

  // TEST 3: Lọc theo vai trò (role=technician)
  console.log('▶ Test 3: Lọc theo vai trò Kỹ thuật viên (role=technician)');
  {
    let jsonResult = null;
    const req = { query: { role: 'technician' } };
    const res = { json: (d) => { jsonResult = d; } };

    await getAllUsers(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.total, 1);
    assert.strictEqual(jsonResult.users[0].code, 'KT001');
    console.log('  ✔ Test 3 ĐẠT: Lọc vai trò chuẩn xác.');
  }

  // TEST 4: Tìm kiếm theo từ khóa
  console.log('▶ Test 4: Tìm kiếm người dùng theo từ khóa search');
  {
    let jsonResult = null;
    const req = { query: { search: 'Ngoại Ngữ' } };
    const res = { json: (d) => { jsonResult = d; } };

    await getAllUsers(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.total, 1);
    assert.strictEqual(jsonResult.users[0].code, 'GV003');
    console.log('  ✔ Test 4 ĐẠT: Tìm kiếm theo khoa phòng chuẩn xác.');
  }

  // TEST 5: Xem chi tiết người dùng kèm Activity History (AuditLog)
  console.log('▶ Test 5: Xem chi tiết người dùng kèm nhật ký hoạt động Activity (getUserById)');
  {
    let jsonResult = null;
    const req = { params: { id: '67a000000000000000000001' } };
    const res = { json: (d) => { jsonResult = d; } };

    await getUserById(req, res);

    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.user.code, 'AD001');
    assert.ok(Array.isArray(jsonResult.activities), 'Phải có mảng activities');
    assert.strictEqual(jsonResult.activities.length, 2, 'Có 2 bản ghi nhật ký hoạt động');
    assert.strictEqual(jsonResult.activities[0].action, 'USER_LOGIN');
    console.log('  ✔ Test 5 ĐẠT: Trả về chi tiết và lịch sử hoạt động AuditLog thành công.');
  }

  console.log('--- TOÀN BỘ 5/5 TEST CASES UC-10.2 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('Kiểm thử thất bại:', err);
  process.exit(1);
});
