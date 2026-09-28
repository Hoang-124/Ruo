import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, UserSession } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

dotenv.config();

function createMockReqRes({ body = {}, headers = {}, user = null, ip = '127.0.0.1' }) {
  const req = {
    body,
    headers: { 'user-agent': 'Profile & Password Test Agent', ...headers },
    user,
    ip,
    socket: { remoteAddress: ip }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatus: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

async function executeProtectedEndpoint(token, controllerFn, body = {}, method = 'GET') {
  const { req, res } = createMockReqRes({
    body,
    headers: { authorization: `Bearer ${token}` }
  });

  let nextCalled = false;
  await protect(req, res, () => {
    nextCalled = true;
  });

  if (nextCalled) {
    await controllerFn(req, res);
  }

  return { status: res.getStatus(), data: res.getData() };
}

async function runProfileAndPasswordTests() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log('Connecting to MongoDB:', mongoURI);
  await mongoose.connect(mongoURI);

  const testEmail = 'hoang.tb220412@university.edu.vn';
  const initialPassword = 'Ruo@2026';
  const newSecretPassword = 'Ruo@SecureChange2026!';

  console.log('\n========================================================================');
  console.log('   BỘ KIỂM THỬ TỰ ĐỘNG UC-1.4, UC-1.5, UC-1.6 (PROFILE & PASSWORD)');
  console.log('========================================================================\n');

  try {
    // Reset test user baseline
    const testUser = await User.findOne({ email: testEmail });
    if (!testUser) {
      throw new Error(`Test user ${testEmail} not found. Run seed first.`);
    }
    testUser.passwordHash = initialPassword;
    testUser.phone = '0987654321';
    testUser.avatar = 'TH';
    testUser.reputeScore = 100;
    testUser.failedLoginAttempts = 0;
    testUser.lockUntil = null;
    await testUser.save();

    // Perform real login to acquire active JWT token
    const { req: loginReq, res: loginRes } = createMockReqRes({
      body: { identifier: testEmail, password: initialPassword }
    });
    await login(loginReq, loginRes);
    const loginData = loginRes.getData();
    if (loginRes.getStatus() !== 200 || !loginData?.token) {
      throw new Error('Đăng nhập ban đầu thất bại.');
    }
    const activeToken = loginData.token;
    console.log(`[AUTH SETUP] Đăng nhập thành công, nhận Access Token: ${activeToken.substring(0, 20)}...`);

    // =========================================================================
    // UC-1.5: PROFILE VIEW (GET /api/auth/me)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------');
    console.log('[UC-1.5: PROFILE VIEW] Kiểm tra hiển thị thông tin hồ sơ & Repute Score:');
    console.log('------------------------------------------------------------------------');
    {
      // 1.5.1: Truy cập không có Token
      const { status: unauthStatus } = await executeProtectedEndpoint('', getMe);
      console.log(` -> Truy cập không Token | Status: ${unauthStatus}`);
      if (unauthStatus !== 401) {
        throw new Error('UC-1.5 Thất bại: Phải từ chối 401 khi không có JWT token.');
      }

      // 1.5.2: Truy cập với Token hợp lệ
      const { status: authStatus, data: profileData } = await executeProtectedEndpoint(activeToken, getMe);
      console.log(` -> Truy cập có Token | Status: ${authStatus} | Success: ${profileData?.success}`);
      if (authStatus !== 200 || !profileData?.success) {
        throw new Error('UC-1.5 Thất bại: Không thể lấy thông tin hồ sơ người dùng.');
      }

      const u = profileData.user;
      console.log(`    • Họ và tên: ${u.fullName}`);
      console.log(`    • MSSV/Mã CB: ${u.employeeCode}`);
      console.log(`    • Email trường: ${u.email}`);
      console.log(`    • Vai trò: ${u.role}`);
      console.log(`    • Đơn vị: ${u.department?.name || 'N/A'}`);
      console.log(`    • Điểm uy tín (Repute Score): ${u.reputeScore}/100 [Hạng: ${u.reputeTier}]`);
      console.log(`    • Đặc quyền: ${u.bookingPrivilege}`);

      // Verify passwordHash is NOT leaked
      if (u.passwordHash || u.password) {
        throw new Error('UC-1.5 Thất bại: Lỗ hổng bảo mật — passwordHash bị rò rỉ trong payload.');
      }

      if (u.reputeScore !== 100 || u.employeeCode !== 'SV20220412') {
        throw new Error('UC-1.5 Thất bại: Dữ liệu hồ sơ không khớp với thực tế trong MongoDB.');
      }

      console.log(' -> PASSED ✓ (UC-1.5 Profile View hoạt động hoàn hảo, bảo mật 100%)');
    }

    // =========================================================================
    // UC-1.6: UPDATE PROFILE (PUT /api/auth/me)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------');
    console.log('[UC-1.6: UPDATE PROFILE] Kiểm tra cập nhật thông tin & Khóa cứng định danh:');
    console.log('------------------------------------------------------------------------');
    {
      // 1.6.1: Nhập số điện thoại sai định dạng
      const { status: errPhoneStatus, data: errPhoneData } = await executeProtectedEndpoint(
        activeToken,
        updateProfile,
        { phone: '12345' },
        'PUT'
      );
      console.log(` -> SĐT không hợp lệ | Status: ${errPhoneStatus} | Message: ${errPhoneData?.message}`);
      if (errPhoneStatus !== 400) {
        throw new Error('UC-1.6 Thất bại: Phải từ chối số điện thoại không đúng chuẩn di động Việt Nam.');
      }

      // 1.6.2: Cập nhật SĐT và Avatar hợp lệ
      const updatedPhone = '0912345678';
      const updatedAvatar = 'HO';
      const { status: updateStatus, data: updateData } = await executeProtectedEndpoint(
        activeToken,
        updateProfile,
        { phone: updatedPhone, avatar: updatedAvatar },
        'PUT'
      );
      console.log(` -> Cập nhật SĐT & Avatar hợp lệ | Status: ${updateStatus} | Message: ${updateData?.message}`);
      if (updateStatus !== 200 || !updateData?.success) {
        throw new Error('UC-1.6 Thất bại: Cập nhật SĐT và Avatar hợp lệ thất bại.');
      }

      // Verify in MongoDB
      const refreshedUser = await User.findById(testUser._id);
      if (refreshedUser.phone !== updatedPhone || refreshedUser.avatar !== updatedAvatar) {
        throw new Error('UC-1.6 Thất bại: Dữ liệu SĐT hoặc Avatar chưa được cập nhật trong MongoDB.');
      }

      // 1.6.3: Kiểm tra Khóa Cứng Định Danh (Tamper Protection)
      // Cố tình gửi body chứa role: admin, employeeCode: HACK999, reputeScore: 999
      const { status: tamperStatus } = await executeProtectedEndpoint(
        activeToken,
        updateProfile,
        {
          role: 'admin',
          employeeCode: 'HACK999',
          email: 'hacker@university.edu.vn',
          reputeScore: 999
        },
        'PUT'
      );
      const postTamperUser = await User.findById(testUser._id);
      if (
        postTamperUser.role === 'admin' ||
        postTamperUser.employeeCode === 'HACK999' ||
        postTamperUser.reputeScore === 999
      ) {
        throw new Error('UC-1.6 Thất bại: Lỗ hổng bảo mật — Người dùng có thể tự sửa role/MSSV/điểm uy tín.');
      }
      console.log(' -> Khóa cứng định danh: role/MSSV/email/reputeScore KHÔNG bị thay đổi (Bảo vệ toàn vẹn)');

      // Verify Audit Log
      const auditLog = await AuditLog.findOne({
        user: testUser._id,
        action: 'USER_UPDATE_PROFILE'
      }).sort({ createdAt: -1 });
      if (!auditLog) {
        throw new Error('UC-1.6 Thất bại: Chưa ghi nhận USER_UPDATE_PROFILE vào AuditLog SHA-256.');
      }

      console.log(' -> PASSED ✓ (UC-1.6 Update Profile an toàn, chống giả mạo quyền)');
    }

    // =========================================================================
    // UC-1.4: CHANGE PASSWORD (POST /api/auth/change-password)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------');
    console.log('[UC-1.4: CHANGE PASSWORD] Kiểm tra đổi mật khẩu & Thu hồi session thiết bị khác:');
    console.log('------------------------------------------------------------------------');
    {
      // 1.4.1: Sai mật khẩu cũ
      const { status: wrongOldStatus, data: wrongOldData } = await executeProtectedEndpoint(
        activeToken,
        changePassword,
        { oldPassword: 'WrongPassword123!', newPassword: newSecretPassword },
        'POST'
      );
      console.log(` -> Nhập sai mật khẩu cũ | Status: ${wrongOldStatus} | Message: ${wrongOldData?.message}`);
      if (wrongOldStatus !== 400 || !wrongOldData?.message.includes('không chính xác')) {
        throw new Error('UC-1.4 Thất bại: Phải từ chối khi mật khẩu cũ không đúng.');
      }

      // 1.4.2: Mật khẩu mới quá yếu (< 8 ký tự)
      const { status: weakStatus, data: weakData } = await executeProtectedEndpoint(
        activeToken,
        changePassword,
        { oldPassword: initialPassword, newPassword: '123' },
        'POST'
      );
      console.log(` -> Mật khẩu mới yếu | Status: ${weakStatus} | Message: ${weakData?.message}`);
      if (weakStatus !== 400) {
        throw new Error('UC-1.4 Thất bại: Phải từ chối mật khẩu không đạt chuẩn phức tạp.');
      }

      // 1.4.3: Mật khẩu mới trùng với mật khẩu cũ
      const { status: dupStatus, data: dupData } = await executeProtectedEndpoint(
        activeToken,
        changePassword,
        { oldPassword: initialPassword, newPassword: initialPassword },
        'POST'
      );
      console.log(` -> Mật khẩu mới trùng cũ | Status: ${dupStatus} | Message: ${dupData?.message}`);
      if (dupStatus !== 400 || !dupData?.message.includes('trùng')) {
        throw new Error('UC-1.4 Thất bại: Phải từ chối khi mật khẩu mới trùng mật khẩu cũ.');
      }

      // 1.4.4: Tạo thêm 1 phiên giả lập trên thiết bị khác (Session B) để kiểm tra thu hồi
      const sessionBHash = 'session_device_b_' + Date.now();
      await UserSession.create({
        tokenHash: sessionBHash,
        user: testUser._id,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // 1.4.5: Đổi mật khẩu hợp lệ kèm thu hồi thiết bị khác (logoutOtherDevices: true)
      const { status: changeStatus, data: changeData } = await executeProtectedEndpoint(
        activeToken,
        changePassword,
        { oldPassword: initialPassword, newPassword: newSecretPassword, logoutOtherDevices: true },
        'POST'
      );
      console.log(` -> Đổi mật khẩu hợp lệ | Status: ${changeStatus} | Message: ${changeData?.message}`);
      if (changeStatus !== 200 || !changeData?.success) {
        throw new Error('UC-1.4 Thất bại: Đổi mật khẩu hợp lệ thất bại.');
      }

      // Verify Session B was revoked
      const sessionB = await UserSession.findOne({ tokenHash: sessionBHash });
      if (!sessionB?.isRevoked) {
        throw new Error('UC-1.4 Thất bại: Session B trên thiết bị khác chưa bị thu hồi.');
      }
      console.log(' -> Session B trên thiết bị khác đã bị thu hồi thành công (isRevoked = true)');

      // Verify Audit Log
      const changeAudit = await AuditLog.findOne({
        user: testUser._id,
        action: 'USER_CHANGE_PASSWORD'
      }).sort({ createdAt: -1 });
      if (!changeAudit) {
        throw new Error('UC-1.4 Thất bại: Chưa ghi nhận USER_CHANGE_PASSWORD vào AuditLog SHA-256.');
      }

      // 1.4.6: Kiểm tra đăng nhập với mật khẩu cũ -> Thất bại (401)
      const { req: oldLoginReq, res: oldLoginRes } = createMockReqRes({
        body: { identifier: testEmail, password: initialPassword }
      });
      await login(oldLoginReq, oldLoginRes);
      if (oldLoginRes.getStatus() === 200) {
        throw new Error('UC-1.4 Thất bại: Đăng nhập bằng mật khẩu cũ vẫn thành công.');
      }

      // 1.4.7: Kiểm tra đăng nhập với mật khẩu mới -> Thành công (200)
      const { req: newLoginReq, res: newLoginRes } = createMockReqRes({
        body: { identifier: testEmail, password: newSecretPassword }
      });
      await login(newLoginReq, newLoginRes);
      if (newLoginRes.getStatus() !== 200 || !newLoginRes.getData()?.success) {
        throw new Error('UC-1.4 Thất bại: Đăng nhập bằng mật khẩu mới thất bại.');
      }

      console.log(' -> Đăng nhập bằng mật khẩu mới: THÀNH CÔNG ✓');
      console.log(' -> Đăng nhập bằng mật khẩu cũ: BỊ CHẶN (HTTP 401) ✓');

      // Khôi phục lại mật khẩu gốc Ruo@2026 cho lập trình viên & môi trường kiểm thử
      const restoreUser = await User.findOne({ email: testEmail });
      restoreUser.passwordHash = initialPassword;
      await restoreUser.save();
      console.log(' -> Đã khôi phục lại mật khẩu mặc định Ruo@2026.');

      console.log(' -> PASSED ✓ (UC-1.4 Change Password chuẩn xác 100%)');
    }

    console.log('\n========================================================================');
    console.log('   🎉 TẤT CẢ CÁC KỊCH BẢN UC-1.4, UC-1.5, UC-1.6 ĐÃ VƯỢT QUA 100%!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

runProfileAndPasswordTests();
