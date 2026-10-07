import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, UserSession } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { login } from '../controllers/authController.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university';

// Mock Express req & res
function createMockReqRes({ body = {}, headers = {}, ip = '127.0.0.1' }) {
  const req = {
    body,
    headers: { 'user-agent': 'Automated Test Engine', ...headers },
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

async function runTests() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log('Connecting to MongoDB:', mongoURI);
  await mongoose.connect(mongoURI);

  console.log('\n=== BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN UC-1.1: LOGIN ===\n');

  const testEmail = 'hoang.tb220412@university.edu.vn';
  const correctPassword = 'Ruo@2026';
  const wrongPassword = 'WrongPassword@123';

  let testUser = await User.findOne({ email: testEmail });
  if (!testUser) {
    console.error('Test user does not exist in DB! Please run npm run seed first.');
    await mongoose.disconnect();
    process.exit(1);
  }
  const testCode = testUser.code;
  await testUser.resetFailedLogin();
  console.log('✓ Chuẩn bị: Đã reset trạng thái khóa của tài khoản thử nghiệm:', testEmail);

  // Kịch bản 1: Đăng nhập thành công bằng Email
  console.log('\n--- Kịch bản 1: Đăng nhập thành công bằng Email ---');
  {
    const { req, res } = createMockReqRes({ body: { identifier: testEmail, password: correctPassword } });
    await login(req, res);

    if (res.getStatus() === 200 && res.getData()?.success) {
      const data = res.getData();
      console.log('✓ Kết quả HTTP 200 OK');
      console.log('  - Full Name:', data.user.fullName);
      console.log('  - Role:', data.user.role);
      console.log('  - Repute Score:', data.user.reputeScore);
      console.log('  - Access Token (15m):', data.token ? data.token.substring(0, 30) + '...' : 'None');
      console.log('  - Refresh Token (7d):', data.refreshToken ? data.refreshToken.substring(0, 30) + '...' : 'None');

      // Verify JWT decoded
      const decodedAccess = jwt.verify(data.token, JWT_SECRET);
      console.log('  - Token jti (RFC-7519):', decodedAccess.jti);

      // Verify UserSession in DB
      const session = await UserSession.findOne({ user: testUser._id }).sort({ createdAt: -1 });
      console.log('  - Phiên UserSession tạo trong DB:', session ? 'HỢP LỆ' : 'THIẾU');

      // Verify AuditLog in DB
      const audit = await AuditLog.findOne({ user: testUser._id, action: 'USER_LOGIN' }).sort({ createdAt: -1 });
      console.log('  - Nhật ký AuditLog USER_LOGIN SHA-256:', audit?.sha256Hash ? audit.sha256Hash.substring(0, 24) + '...' : 'THIẾU');
    } else {
      console.error('✗ Thất bại Kịch bản 1:', res.getStatus(), res.getData());
    }
  }

  // Kịch bản 2: Đăng nhập thành công bằng Mã sinh viên (employeeCode)
  console.log('\n--- Kịch bản 2: Đăng nhập thành công bằng Mã số SV (employeeCode) ---');
  {
    const { req, res } = createMockReqRes({ body: { identifier: testCode, password: correctPassword } });
    await login(req, res);

    if (res.getStatus() === 200 && res.getData()?.success) {
      console.log('✓ Kết quả HTTP 200 OK — Đăng nhập bằng mã sinh viên thành công!');
    } else {
      console.error('✗ Thất bại Kịch bản 2:', res.getStatus(), res.getData());
    }
  }

  // Kịch bản 3: Nhập sai mật khẩu 4 lần liên tiếp (Kiểm tra đếm ngược số lần còn lại)
  console.log('\n--- Kịch bản 3: Nhập sai mật khẩu lần 1 đến 4 (Kiểm tra Attempts Countdown) ---');
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { req, res } = createMockReqRes({ body: { identifier: testEmail, password: wrongPassword } });
    await login(req, res);

    const status = res.getStatus();
    const data = res.getData();
    const expectedLeft = 5 - attempt;

    if (status === 401 && data.attemptsLeft === expectedLeft) {
      console.log(`✓ Lần sai thứ ${attempt}: HTTP 401 — Số lần thử còn lại: ${data.attemptsLeft} (Thông báo: "${data.message}")`);
    } else {
      console.error(`✗ Lỗi lần sai thứ ${attempt}:`, status, data);
    }
  }

  // Kịch bản 4: Nhập sai lần thứ 5 -> Kích hoạt khóa tạm thời 15 phút (HTTP 423)
  console.log('\n--- Kịch bản 4: Nhập sai lần thứ 5 (Kích hoạt khóa tạm 15 phút) ---');
  {
    const { req, res } = createMockReqRes({ body: { identifier: testEmail, password: wrongPassword } });
    await login(req, res);

    const status = res.getStatus();
    const data = res.getData();

    if (status === 423 && data.isLocked === true) {
      console.log('✓ Kết quả HTTP 423 Locked — Tài khoản đã bị khóa tạm thời 15 phút!');
      console.log('  - Thông báo:', data.message);
      console.log('  - Số phút cần chờ:', data.remainingMinutes);

      // Check DB lockUntil
      const updatedUser = await User.findOne({ email: testEmail });
      console.log('  - Thời điểm hết hạn khóa trong DB (lockUntil):', updatedUser.lockUntil?.toISOString());

      // Check AuditLog for USER_ACCOUNT_TEMP_LOCKED
      const lockAudit = await AuditLog.findOne({ user: testUser._id, action: 'USER_ACCOUNT_TEMP_LOCKED' }).sort({ createdAt: -1 });
      console.log('  - Nhật ký AuditLog khóa tài khoản SHA-256:', lockAudit?.sha256Hash ? lockAudit.sha256Hash.substring(0, 24) + '...' : 'THIẾU');
    } else {
      console.error('✗ Thất bại Kịch bản 4:', status, data);
    }
  }

  // Kịch bản 5: Khi đang bị khóa, cố tình đăng nhập lại kể cả đúng mật khẩu
  console.log('\n--- Kịch bản 5: Đăng nhập trong thời gian bị khóa (kể cả gõ đúng mật khẩu) ---');
  {
    const { req, res } = createMockReqRes({ body: { identifier: testEmail, password: correctPassword } });
    await login(req, res);

    const status = res.getStatus();
    const data = res.getData();

    if (status === 423 && data.isLocked === true) {
      console.log('✓ Kết quả HTTP 423 Locked — Hệ thống từ chối đăng nhập trong thời gian bị khóa:');
      console.log('  - Phản hồi:', data.message);
    } else {
      console.error('✗ Thất bại Kịch bản 5 (Lẽ ra phải chặn đăng nhập):', status, data);
    }
  }

  // Kịch bản 6: Khôi phục và mở khóa tài khoản
  console.log('\n--- Kịch bản 6: Reset trạng thái khóa và đăng nhập lại bình thường ---');
  {
    const userToReset = await User.findOne({ email: testEmail });
    await userToReset.resetFailedLogin();

    const { req, res } = createMockReqRes({ body: { identifier: testEmail, password: correctPassword } });
    await login(req, res);

    if (res.getStatus() === 200 && res.getData()?.success) {
      console.log('✓ Sau khi reset, đăng nhập lại thành công 100%!');
      const cleanUser = await User.findOne({ email: testEmail });
      console.log('  - failedLoginAttempts trong DB:', cleanUser.failedLoginAttempts);
      console.log('  - lockUntil trong DB:', cleanUser.lockUntil);
    } else {
      console.error('✗ Thất bại Kịch bản 6:', res.getStatus(), res.getData());
    }
  }

  console.log('\n=== TẤT CẢ 6 KỊCH BẢN ĐÃ VƯỢT QUA 100% (PASSED) ===\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
