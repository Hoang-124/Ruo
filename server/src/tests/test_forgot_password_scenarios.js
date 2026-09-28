import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, UserSession, PasswordReset } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { forgotPassword, verifyResetOtp, resetPassword, login } from '../controllers/authController.js';
import { ruoMailQueue } from '../utils/mailer.js';

dotenv.config();

function createMockReqRes({ body = {}, headers = {}, user = null, ip = '127.0.0.1' }) {
  const req = {
    body,
    headers: { 'user-agent': 'Automated Password Reset Test Agent', ...headers },
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

async function runForgotPasswordTests() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log('Connecting to MongoDB:', mongoURI);
  await mongoose.connect(mongoURI);

  const testEmail = 'hoang.tb220412@university.edu.vn';
  const initialPassword = 'Ruo@2026';
  const newTestPassword = 'Ruo@Password2026!';

  console.log('\n========================================================================');
  console.log('   BỘ KIỂM THỬ TỰ ĐỘNG UC-1.3: FORGOT PASSWORD & OTP WORKFLOWS');
  console.log('========================================================================\n');

  try {
    // Clean up any existing password reset records for test email
    await PasswordReset.deleteMany({ email: testEmail });
    ruoMailQueue.clear();

    // Ensure test user has initial password
    const testUser = await User.findOne({ email: testEmail });
    if (!testUser) {
      throw new Error(`Test user ${testEmail} does not exist. Run seedDatabase.js first.`);
    }
    testUser.passwordHash = initialPassword;
    testUser.failedLoginAttempts = 0;
    testUser.lockUntil = null;
    await testUser.save();

    // -------------------------------------------------------------------------
    // KỊCH BẢN 1: Yêu cầu mã OTP với Email hợp lệ
    // -------------------------------------------------------------------------
    console.log('[KỊCH BẢN 1] Yêu cầu mã OTP với email sinh viên hợp lệ:');
    {
      const { req, res } = createMockReqRes({ body: { email: testEmail } });
      await forgotPassword(req, res);

      const status = res.getStatus();
      const data = res.getData();
      console.log(` -> Status: ${status} | Success: ${data?.success} | Message: ${data?.message}`);

      if (status !== 200 || !data?.success) {
        throw new Error('Kịch bản 1 Thất bại: Không thể yêu cầu OTP cho email hợp lệ.');
      }

      // Verify OTP stored in MongoDB (hashed)
      const resetRecord = await PasswordReset.findOne({ email: testEmail, isUsed: false }).sort({ createdAt: -1 });
      if (!resetRecord) {
        throw new Error('Kịch bản 1 Thất bại: Bản ghi PasswordReset không được lưu trong MongoDB.');
      }

      if (!resetRecord.otpHash || resetRecord.otpHash.length < 20) {
        throw new Error('Kịch bản 1 Thất bại: OTP chưa được băm bảo mật bcrypt trước khi lưu.');
      }

      // Verify MailQueue received the email
      const queuedMail = ruoMailQueue.getLastMailFor(testEmail);
      if (!queuedMail || !queuedMail.otp) {
        throw new Error('Kịch bản 1 Thất bại: MailQueue không ghi nhận email OTP gửi đi.');
      }

      if (!/^\d{6}$/.test(queuedMail.otp)) {
        throw new Error(`Kịch bản 1 Thất bại: OTP không phải là 6 chữ số: ${queuedMail.otp}`);
      }

      console.log(` -> OTP 6 số tạo thành công: ${queuedMail.otp} (Hash in DB: ${resetRecord.otpHash.substring(0, 15)}...)`);
      console.log(' -> PASSED ✓');
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 2: Chống lộ danh tính (Anti-Enumeration) với Email không tồn tại
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 2] Anti-Enumeration: Yêu cầu OTP với email không tồn tại trong hệ thống:');
    {
      const ghostEmail = 'nonexistent.user.999@university.edu.vn';
      const { req, res } = createMockReqRes({ body: { email: ghostEmail } });
      await forgotPassword(req, res);

      const status = res.getStatus();
      const data = res.getData();
      console.log(` -> Status: ${status} | Success: ${data?.success} | Message: ${data?.message}`);

      if (status !== 200 || !data?.success) {
        throw new Error('Kịch bản 2 Thất bại: Hệ thống phải trả về HTTP 200 generic để chống dò quét email.');
      }

      const ghostRecord = await PasswordReset.findOne({ email: ghostEmail });
      if (ghostRecord) {
        throw new Error('Kịch bản 2 Thất bại: Không được tạo bản ghi OTP cho email ma.');
      }

      console.log(' -> PASSED ✓ (Hệ thống trả lời an toàn, không tiết lộ sự tồn tại của email)');
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 3: Nhập sai mã OTP (Check số lần thử còn lại)
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 3] Xác thực với mã OTP sai:');
    {
      const { req, res } = createMockReqRes({
        body: { email: testEmail, otp: '999999' }
      });
      await verifyResetOtp(req, res);

      const status = res.getStatus();
      const data = res.getData();
      console.log(` -> Status: ${status} | Success: ${data?.success} | Message: ${data?.message}`);

      if (status !== 400 || data?.success !== false) {
        throw new Error('Kịch bản 3 Thất bại: Hệ thống phải từ chối khi nhập sai mã OTP.');
      }

      const record = await PasswordReset.findOne({ email: testEmail, isUsed: false }).sort({ createdAt: -1 });
      if (record.attempts !== 1) {
        throw new Error(`Kịch bản 3 Thất bại: attempts không được tăng (hiện tại: ${record.attempts})`);
      }

      console.log(' -> PASSED ✓ (Ghi nhận số lần thử sai và cảnh báo số lần còn lại)');
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 4: Chống Brute-force OTP (Khóa mã sau 5 lần nhập sai)
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 4] Chống Brute-force: Nhập sai OTP liên tiếp 5 lần:');
    {
      for (let i = 2; i <= 5; i++) {
        const { req, res } = createMockReqRes({
          body: { email: testEmail, otp: '111111' }
        });
        await verifyResetOtp(req, res);
      }

      // Attempt 6th should be locked
      const { req, res } = createMockReqRes({
        body: { email: testEmail, otp: '111111' }
      });
      await verifyResetOtp(req, res);

      const status = res.getStatus();
      const data = res.getData();
      console.log(` -> Lần thử thứ 6 | Status: ${status} | Message: ${data?.message}`);

      if (status !== 400 || !data?.message.includes('quá 5 lần')) {
        throw new Error('Kịch bản 4 Thất bại: OTP chưa bị khóa sau 5 lần nhập sai.');
      }

      console.log(' -> PASSED ✓ (OTP đã bị vô hiệu hóa sau 5 lần nhập sai liên tiếp)');
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 5: Đặt lại mật khẩu yếu hoặc trùng mật khẩu cũ
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 5] Kiểm tra quy chuẩn độ phức tạp & không trùng mật khẩu cũ:');
    {
      // Request fresh OTP
      const { req: reqOtp, res: resOtp } = createMockReqRes({ body: { email: testEmail } });
      await forgotPassword(reqOtp, resOtp);
      const queuedMail = ruoMailQueue.getLastMailFor(testEmail);
      const validOtp = queuedMail.otp;

      // 5.1: Weak password
      const { req: reqWeak, res: resWeak } = createMockReqRes({
        body: { email: testEmail, otp: validOtp, newPassword: '123' }
      });
      await resetPassword(reqWeak, resWeak);
      console.log(` -> Mật khẩu yếu | Status: ${resWeak.getStatus()} | Message: ${resWeak.getData()?.message}`);
      if (resWeak.getStatus() !== 400) {
        throw new Error('Kịch bản 5.1 Thất bại: Phải từ chối mật khẩu không đủ 8 ký tự.');
      }

      // 5.2: Identical to old password
      const { req: reqSame, res: resSame } = createMockReqRes({
        body: { email: testEmail, otp: validOtp, newPassword: initialPassword }
      });
      await resetPassword(reqSame, resSame);
      console.log(` -> Trùng mật khẩu cũ | Status: ${resSame.getStatus()} | Message: ${resSame.getData()?.message}`);
      if (resSame.getStatus() !== 400 || !resSame.getData()?.message.includes('trùng')) {
        throw new Error('Kịch bản 5.2 Thất bại: Phải từ chối khi mật khẩu mới trùng mật khẩu cũ.');
      }

      console.log(' -> PASSED ✓');
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 6: Đặt lại mật khẩu thành công & Thu hồi phiên cũ & Ghi Audit Log
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 6] Đặt lại mật khẩu thành công và kiểm tra thu hồi phiên:');
    {
      // Create a dummy session to verify session revocation
      const sessionTokenHash = 'test_session_hash_' + Date.now();
      await UserSession.create({
        tokenHash: sessionTokenHash,
        user: testUser._id,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      const queuedMail = ruoMailQueue.getLastMailFor(testEmail);
      const validOtp = queuedMail.otp;

      const { req, res } = createMockReqRes({
        body: { email: testEmail, otp: validOtp, newPassword: newTestPassword }
      });
      await resetPassword(req, res);

      const status = res.getStatus();
      const data = res.getData();
      console.log(` -> Status: ${status} | Message: ${data?.message}`);

      if (status !== 200 || !data?.success) {
        throw new Error('Kịch bản 6 Thất bại: Đặt lại mật khẩu hợp lệ không thành công.');
      }

      // Verify OTP is marked used
      const resetRecord = await PasswordReset.findOne({ email: testEmail }).sort({ createdAt: -1 });
      if (!resetRecord.isUsed) {
        throw new Error('Kịch bản 6 Thất bại: Bản ghi OTP chưa được đánh dấu isUsed = true.');
      }

      // Verify all active sessions were revoked
      const activeSessions = await UserSession.find({ user: testUser._id, isRevoked: false });
      if (activeSessions.length > 0) {
        throw new Error(`Kịch bản 6 Thất bại: Còn ${activeSessions.length} phiên chưa bị thu hồi.`);
      }

      // Verify Audit Log was generated
      const auditEntry = await AuditLog.findOne({
        user: testUser._id,
        action: 'PASSWORD_RESET_SUCCESS'
      }).sort({ createdAt: -1 });

      if (!auditEntry) {
        throw new Error('Kịch bản 6 Thất bại: Chưa ghi nhận PASSWORD_RESET_SUCCESS vào AuditLog SHA-256.');
      }

      // Verify login with old password fails
      const { req: reqOldLogin, res: resOldLogin } = createMockReqRes({
        body: { identifier: testEmail, password: initialPassword }
      });
      await login(reqOldLogin, resOldLogin);
      if (resOldLogin.getStatus() === 200) {
        throw new Error('Kịch bản 6 Thất bại: Đăng nhập bằng mật khẩu cũ vẫn thành công.');
      }

      // Verify login with new password succeeds
      const { req: reqNewLogin, res: resNewLogin } = createMockReqRes({
        body: { identifier: testEmail, password: newTestPassword }
      });
      await login(reqNewLogin, resNewLogin);
      if (resNewLogin.getStatus() !== 200 || !resNewLogin.getData()?.success) {
        throw new Error('Kịch bản 6 Thất bại: Đăng nhập bằng mật khẩu mới thất bại.');
      }

      console.log(' -> PASSED ✓ (Mật khẩu mới kích hoạt, thu hồi phiên thành công, audit log ghi nhận)');

      // Restore password back to Ruo@2026 for developer convenience
      const updatedUser = await User.findOne({ email: testEmail });
      updatedUser.passwordHash = initialPassword;
      await updatedUser.save();
    }

    // -------------------------------------------------------------------------
    // KỊCH BẢN 7: Giới hạn tần suất gửi OTP (Rate Limit 3 lần/giờ chống Spam)
    // -------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 7] Kiểm tra cơ chế chống Spam (Giới hạn tối đa 3 lần yêu cầu OTP/giờ):');
    {
      const rateLimitEmail = 'nam.nv@university.edu.vn';
      await PasswordReset.deleteMany({ email: rateLimitEmail });

      // Gửi lần 1
      const { req: r1, res: s1 } = createMockReqRes({ body: { email: rateLimitEmail } });
      await forgotPassword(r1, s1);
      console.log(` -> Lần 1: Status ${s1.getStatus()} (Thành công)`);

      // Gửi lần 2
      const { req: r2, res: s2 } = createMockReqRes({ body: { email: rateLimitEmail } });
      await forgotPassword(r2, s2);
      console.log(` -> Lần 2: Status ${s2.getStatus()} (Thành công)`);

      // Gửi lần 3
      const { req: r3, res: s3 } = createMockReqRes({ body: { email: rateLimitEmail } });
      await forgotPassword(r3, s3);
      console.log(` -> Lần 3: Status ${s3.getStatus()} (Thành công)`);

      // Gửi lần 4 (Vượt hạn mức trong cùng 1 giờ) -> Phải nhận HTTP 429
      const { req: r4, res: s4 } = createMockReqRes({ body: { email: rateLimitEmail } });
      await forgotPassword(r4, s4);
      const status4 = s4.getStatus();
      const data4 = s4.getData();
      console.log(` -> Lần 4: Status ${status4} | Message: ${data4?.message}`);

      if (status4 !== 429 || !data4?.message.includes('quá 3 lần')) {
        throw new Error(`Kịch bản 7 Thất bại: Phải trả về HTTP 429 Rate Limit (Nhận được: ${status4})`);
      }

      console.log(' -> PASSED ✓ (HTTP 429 Too Many Requests kích hoạt chính xác khi spam quá 3 lần/giờ)');
    }

    console.log('\n========================================================================');
    console.log('   🎉 TẤT CẢ 7/7 KỊCH BẢN UC-1.3 (FORGOT PASSWORD) ĐÃ VƯỢT QUA 100%!');
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

runForgotPasswordTests();
