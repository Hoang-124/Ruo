import assert from 'assert';
import { getMe, updateProfile } from '../controllers/authController.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

// Setup mock objects and run automated test suite
async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ UC-1.5 VÀ UC-1.6 ---');

  // Mock User
  const mockUserInstance = {
    _id: '67a000000000000000000001',
    code: 'GV2026001',
    email: 'lecturer@ruo.edu.vn',
    full_name: 'TS. Nguyễn Văn A',
    phone: '0912345678',
    avatar: 'NA',
    department: 'Khoa Công Nghệ Thông Tin',
    role: 'lecturer',
    status: 'active',
    force_change_pw: false,
    repute_score: 95,
    save: async function() { return this; }
  };

  // Mock AuditLog
  AuditLog.logAction = async () => true;

  // Mock User.findById
  User.findById = (id) => ({
    select: (sel) => Promise.resolve(mockUserInstance),
    then: (resolve) => resolve(mockUserInstance)
  });

  // TEST 1: UC-1.5 Profile View (getMe)
  console.log('▶ Test 1: UC-1.5 Profile View (GET /api/auth/me)');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = { user: { _id: mockUserInstance._id } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await getMe(req, res);

    assert.strictEqual(jsonResult.success, true, 'getMe phải trả về success: true');
    assert.strictEqual(jsonResult.user.code, 'GV2026001', 'Mã NV phải khớp');
    assert.strictEqual(jsonResult.user.full_name, 'TS. Nguyễn Văn A', 'Họ tên phải khớp');
    assert.strictEqual(jsonResult.user.email, 'lecturer@ruo.edu.vn', 'Email phải khớp');
    assert.strictEqual(jsonResult.user.department, 'Khoa Công Nghệ Thông Tin', 'Phòng ban phải khớp');
    assert.strictEqual(jsonResult.user.phone, '0912345678', 'SĐT phải khớp');
    assert.strictEqual(jsonResult.user.avatar, 'NA', 'Avatar phải khớp');
    assert.strictEqual(jsonResult.user.role, 'lecturer', 'Vai trò phải khớp');
    assert.strictEqual(jsonResult.user.reputeScore, 95, 'Repute score phải có giá trị 95');
    assert.strictEqual(jsonResult.user.reputeTier, 'Xuất Sắc', 'Hạng tín nhiệm phải là Xuất Sắc');
    console.log('  ✔ Test 1 ĐẠT: Toàn bộ thông tin cá nhân và điểm tín nhiệm (Repute Score) được trả về chính xác.');
  }

  // TEST 2: UC-1.6 Update Profile Thành Công
  console.log('▶ Test 2: UC-1.6 Update Profile (PUT /api/auth/me) hợp lệ');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: mockUserInstance._id },
      body: {
        fullName: 'PGS. TS. Nguyễn Văn A',
        phone: '0988776655',
        avatar: 'NVA'
      },
      ip: '127.0.0.1'
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await updateProfile(req, res);

    assert.strictEqual(jsonResult.success, true, 'Cập nhật phải thành công');
    assert.strictEqual(mockUserInstance.full_name, 'PGS. TS. Nguyễn Văn A', 'Họ tên được cập nhật');
    assert.strictEqual(mockUserInstance.phone, '0988776655', 'SĐT được cập nhật');
    assert.strictEqual(mockUserInstance.avatar, 'NVA', 'Avatar được cập nhật');
    console.log('  ✔ Test 2 ĐẠT: Cập nhật họ tên, SĐT, avatar thành công.');
  }

  // TEST 3: UC-1.6 Khóa cứng mã nhân viên (không cho đổi mã NV)
  console.log('▶ Test 3: UC-1.6 Khóa cứng - Chặn thay đổi Mã NV');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: mockUserInstance._id },
      body: {
        code: 'HACKED_CODE_999'
      }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await updateProfile(req, res);

    assert.strictEqual(statusCode, 400, 'Phải trả về status 400');
    assert.strictEqual(jsonResult.success, false);
    assert.match(jsonResult.message, /khóa cứng/i, 'Thông báo phải nêu rõ mã NV bị khóa cứng');
    console.log('  ✔ Test 3 ĐẠT: Chặn thành công hành vi cố tình sửa mã NV.');
  }

  // TEST 4: UC-1.6 Khóa cứng email (không cho đổi email)
  console.log('▶ Test 4: UC-1.6 Khóa cứng - Chặn thay đổi Email nhà trường');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: mockUserInstance._id },
      body: {
        email: 'attacker@evil.com'
      }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await updateProfile(req, res);

    assert.strictEqual(statusCode, 400, 'Phải trả về status 400');
    assert.strictEqual(jsonResult.success, false);
    assert.match(jsonResult.message, /khóa cứng/i, 'Thông báo phải nêu rõ email bị khóa cứng');
    console.log('  ✔ Test 4 ĐẠT: Chặn thành công hành vi cố tình sửa email.');
  }

  // TEST 5: UC-1.6 Validate số điện thoại sai định dạng
  console.log('▶ Test 5: UC-1.6 Validate SĐT không hợp lệ');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: mockUserInstance._id },
      body: {
        phone: '123456' // Sai định dạng di động VN 10 chữ số
      }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await updateProfile(req, res);

    assert.strictEqual(statusCode, 400, 'Phải trả về status 400');
    assert.strictEqual(jsonResult.success, false);
    assert.match(jsonResult.message, /Số điện thoại không hợp lệ/i);
    console.log('  ✔ Test 5 ĐẠT: Bắt lỗi số điện thoại không hợp lệ chuẩn xác.');
  }

  // TEST 6: UC-1.6 Validate họ tên rỗng
  console.log('▶ Test 6: UC-1.6 Validate họ tên quá ngắn');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: mockUserInstance._id },
      body: {
        fullName: 'A' // < 2 ký tự
      }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };

    await updateProfile(req, res);

    assert.strictEqual(statusCode, 400, 'Phải trả về status 400');
    assert.strictEqual(jsonResult.success, false);
    assert.match(jsonResult.message, /Họ và tên/i);
    console.log('  ✔ Test 6 ĐẠT: Bắt lỗi họ và tên không hợp lệ.');
  }

  console.log('--- TOÀN BỘ 6/6 TEST CASES UC-1.5 VÀ UC-1.6 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('Kiểm thử thất bại:', err);
  process.exit(1);
});
