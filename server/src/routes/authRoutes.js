import express from 'express';
import {
  login,
  register,
  logout,
  refreshToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  getAllUsers
} from '../controllers/authController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// UC-1.1: Login (email/MSSV + password) -> Access Token (15m) + Refresh Token (7d)
router.post('/login', login);

// UC-1.0: Register (họ tên, email, MSSV/mã CB, mật khẩu, vai trò)
router.post('/register', register);

// UC-1.2: Logout (hủy token hiện tại hoặc toàn bộ thiết bị)
router.post('/logout', protect, logout);

// Token Refresh
router.post('/refresh-token', refreshToken);

// UC-1.3: Forgot Password (gửi OTP 6 số, TTL 15m, rate limit 3 lần/giờ)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// UC-1.4: Change Password (validate pass cũ + mới >= 8 ký tự, thu hồi session khác)
router.post('/change-password', protect, changePassword);

// UC-1.5: Profile View (xem thông tin cá nhân & điểm uy tín reputeScore 0-100)
router.get('/me', protect, getMe);

// UC-1.6: Update Profile (sửa SĐT, avatar; khóa cứng MSSV, email trường, khoa)
router.put('/me', protect, updateProfile);

// Committee & Assignment user selector
router.get('/users', protect, getAllUsers);

export default router;
