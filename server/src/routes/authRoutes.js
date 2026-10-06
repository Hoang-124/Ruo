import express from 'express';
import {
  login,
  register,
  checkDuplicate,
  logout,
  refreshToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  createUser,
  getAllUsers
} from '../controllers/authController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { createRateLimiter } from '../middlewares/securityMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Quá nhiều yêu cầu đăng nhập từ IP này.'
});

const forgotLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Quá nhiều yêu cầu OTP từ IP này.'
});

// UC-1.0: Register & Real-time Duplicate Check
router.post('/register', register);
router.get('/check-duplicate', checkDuplicate);

// UC-1.1: Login (email/mã NV + password) -> Access Token (15m) + Refresh Token (7d)
router.post('/login', loginLimiter, login);

// UC-1.2: Logout (hủy refresh token)
router.post('/logout', protect, logout);

// Token Refresh (Token rotation)
router.post('/refresh-token', refreshToken);

// UC-1.3: Forgot Password (gửi OTP 6 số, TTL 15m, rate limit 3 lần/giờ)
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// UC-1.4: Change Password (validate pass cũ + mới >= 8 ký tự, thu hồi refresh token)
router.post('/change-password', protect, changePassword);

// UC-1.5: Profile View
router.get('/me', protect, getMe);

// UC-1.6: Update Profile (sửa SĐT, avatar; khóa cứng mã NV, email, phòng ban)
router.put('/me', protect, updateProfile);

// UC-10.1 & UC-10.2: Admin User Management
router.post('/users', protect, requireRole(USER_ROLES.ADMIN), createUser);
router.get('/users', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER), getAllUsers);

export default router;
