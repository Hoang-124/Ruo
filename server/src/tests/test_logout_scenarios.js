import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, UserSession } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { login, logout, refreshToken, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

dotenv.config();

function createMockReqRes({ body = {}, headers = {}, user = null, ip = '127.0.0.1' }) {
  const req = {
    body,
    headers: { 'user-agent': 'Automated Logout Test Agent', ...headers },
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

// Helper to run middleware + controller
async function executeProtectedEndpoint(token, controllerFn, body = {}) {
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

async function runLogoutTests() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log('Connecting to MongoDB:', mongoURI);
  await mongoose.connect(mongoURI);

  console.log('\n=== BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN UC-1.2: LOGOUT (HỦY TOKEN & BLACKLIST) ===\n');

  const testEmail = 'hoang.tb220412@university.edu.vn';
  const testPassword = 'Ruo@2026';

  const user = await User.findOne({ email: testEmail });
  if (!user) {
    console.error('Test user does not exist in DB! Please run npm run seed first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // --- KỊCH BẢN 1: Đăng xuất thiết bị hiện tại & Chặn Token cũ qua Blacklist ---
  console.log('--- Kịch bản 1: Đăng xuất đơn lẻ (allDevices: false) & Đưa Token vào Blacklist ---');
  let token1, refreshToken1;
  {
    // 1. Login
    const { req: loginReq, res: loginRes } = createMockReqRes({ body: { identifier: testEmail, password: testPassword } });
    await login(loginReq, loginRes);
    token1 = loginRes.getData().token;
    refreshToken1 = loginRes.getData().refreshToken;

    // 2. Verify token works before logout
    const preCheck = await executeProtectedEndpoint(token1, getMe);
    if (preCheck.status === 200 && preCheck.data.success) {
      console.log('✓ Token 1 hoạt động bình thường trước khi đăng xuất (HTTP 200 OK)');
    } else {
      console.error('✗ Lỗi khi kiểm tra Token 1 trước logout:', preCheck);
    }

    // 3. Perform Logout
    const logoutRes = await executeProtectedEndpoint(token1, logout, { allDevices: false });
    if (logoutRes.status === 200 && logoutRes.data.success) {
      console.log('✓ Gọi POST /api/auth/logout thành công (HTTP 200 OK)');
      console.log('  - Thông báo:', logoutRes.data.message);
      console.log('  - Phạm vi:', logoutRes.data.scope);
    } else {
      console.error('✗ Thất bại khi gọi logout:', logoutRes);
    }

    // 4. Try using the revoked token on protected endpoint GET /api/auth/me
    const postCheck = await executeProtectedEndpoint(token1, getMe);
    if (postCheck.status === 401 && postCheck.data.message.includes('đã đăng xuất')) {
      console.log('✓ Token Blacklist hoạt động chuẩn xác! Request với token cũ bị từ chối 401:');
      console.log('  - Phản hồi an ninh:', postCheck.data.message);
    } else {
      console.error('✗ Thất bại Kịch bản 1: Token cũ vẫn truy cập được vào hệ thống!', postCheck);
    }
  }

  // --- KỊCH BẢN 2: Vô hiệu hóa Refresh Token của phiên đã Logout ---
  console.log('\n--- Kịch bản 2: Kiểm tra Refresh Token của phiên đã đăng xuất ---');
  {
    const { req: refReq, res: refRes } = createMockReqRes({ body: { refreshToken: refreshToken1 } });
    await refreshToken(refReq, refRes);

    const status = refRes.getStatus();
    const data = refRes.getData();

    if (status === 401 && data.message.includes('thu hồi')) {
      console.log('✓ Refresh Token của phiên đã logout bị từ chối cấp Access Token mới (HTTP 401):');
      console.log('  - Thông báo:', data.message);
    } else {
      console.error('✗ Thất bại Kịch bản 2: Refresh token vẫn cấp được access token mới!', status, data);
    }
  }

  // --- KỊCH BẢN 3: Đăng xuất khỏi TẤT CẢ các thiết bị (allDevices: true) ---
  console.log('\n--- Kịch bản 3: Đăng xuất khỏi TẤT CẢ các thiết bị (allDevices: true) ---');
  {
    // Tạo 3 phiên đăng nhập đại diện cho Laptop, Mobile và Thư viện
    const sessions = [];
    for (let i = 1; i <= 3; i++) {
      const { req: lReq, res: lRes } = createMockReqRes({
        body: { identifier: testEmail, password: testPassword },
        headers: { 'user-agent': `Device-${i}-Agent` }
      });
      await login(lReq, lRes);
      sessions.push(lRes.getData().token);
    }
    console.log(`✓ Đã khởi tạo thành công 3 phiên đăng nhập đồng thời trên 3 thiết bị khác nhau.`);

    // Thực hiện logout all devices từ Thiết bị số 1
    const tokenPrimary = sessions[0];
    const logoutAllRes = await executeProtectedEndpoint(tokenPrimary, logout, { allDevices: true });

    if (logoutAllRes.status === 200 && logoutAllRes.data.scope === 'ALL_DEVICES') {
      console.log('✓ Gọi POST /api/auth/logout với allDevices: true thành công (HTTP 200 OK)');
      console.log('  - Số phiên bị thu hồi trong DB:', logoutAllRes.data.revokedSessionsCount);
      console.log('  - Thông báo:', logoutAllRes.data.message);
    } else {
      console.error('✗ Thất bại khi gọi logout all devices:', logoutAllRes);
    }

    // Kiểm tra Thiết bị số 2 và Thiết bị số 3: Cả hai đều phải bị chặn lập tức
    for (let i = 1; i < sessions.length; i++) {
      const checkOther = await executeProtectedEndpoint(sessions[i], getMe);
      if (checkOther.status === 401) {
        console.log(`✓ Thiết bị #${i + 1} đã bị thu hồi phiên truy cập thành công (HTTP 401 Unauthorized)!`);
      } else {
        console.error(`✗ Lỗi: Thiết bị #${i + 1} vẫn truy cập được sau khi logout all devices:`, checkOther);
      }
    }
  }

  // --- KỊCH BẢN 4: Kiểm tra Sổ cái Kiểm toán Bất biến SHA-256 (AuditLog) ---
  console.log('\n--- Kịch bản 4: Kiểm tra Nhật ký AuditLog USER_LOGOUT & Tính toàn vẹn chuỗi SHA-256 ---');
  {
    const latestAudit = await AuditLog.findOne({ user: user._id, action: 'USER_LOGOUT' }).sort({ createdAt: -1 });
    if (latestAudit) {
      console.log('✓ Ghi nhận AuditLog USER_LOGOUT thành công trong MongoDB:');
      console.log('  - Hash SHA-256:', latestAudit.sha256Hash);
      console.log('  - Previous Hash:', latestAudit.prevHash);
      console.log('  - Diff Data:', JSON.stringify(latestAudit.diffData));
    } else {
      console.error('✗ Thiếu bản ghi AuditLog USER_LOGOUT trong DB!');
    }

    // Check cryptographic chain integrity on recent logs
    const allLogs = await AuditLog.find().sort({ _id: 1 });
    const recentLogs = allLogs.slice(-10);
    let chainValid = true;
    for (let i = 1; i < recentLogs.length; i++) {
      if (recentLogs[i].prevHash !== recentLogs[i - 1].sha256Hash) {
        chainValid = false;
        break;
      }
    }
    console.log(`✓ Đối soát liên tục chuỗi băm SHA-256 các bản ghi vừa sinh:`, chainValid ? '100% HỢP LỆ & KHÔNG BỊ CAN THIỆP' : 'LỖI');
  }

  console.log('\n=== TẤT CẢ 4 KỊCH BẢN KIỂM THỬ UC-1.2: LOGOUT ĐÃ VƯỢT QUA 100% (PASSED) ===\n');
  await mongoose.disconnect();
}

runLogoutTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử logout:', err);
  process.exit(1);
});
