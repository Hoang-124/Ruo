import express from 'express';
import {
  login,
  register,
  verifyRegisterOtp,
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
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserLock,
  adminResetPassword,
  approveUser
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

// Guest Module: Register, Verify email OTP, Real-time Duplicate Check
router.post('/register', register);
router.post('/verify-register-otp', verifyRegisterOtp);
router.get('/check-duplicate', checkDuplicate);

// Account: Login (email/mã NV + password) -> Access Token (15m) + Refresh Token (7d)
router.post('/login', loginLimiter, login);

// Account: Logout (hủy refresh token)
router.post('/logout', protect, logout);

// Token Refresh (Token rotation)
router.post('/refresh-token', refreshToken);

// Guest: Recover password (gửi OTP 6 số, TTL 15m, rate limit 5 lần/giờ)
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Account: Change password
router.post('/change-password', protect, changePassword);

// Account: View & Update Profile
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

// Admin Module: User Management (Admin Only)
router.get('/users', protect, requireRole(USER_ROLES.ADMIN), getAllUsers);
router.post('/users', protect, requireRole(USER_ROLES.ADMIN), createUser);
router.get('/users/:id', protect, requireRole(USER_ROLES.ADMIN), getUserById);
router.patch('/users/:id/role', protect, requireRole(USER_ROLES.ADMIN), updateUserRole);
router.patch('/users/:id/lock', protect, requireRole(USER_ROLES.ADMIN), toggleUserLock);
router.post('/users/:id/reset-password', protect, requireRole(USER_ROLES.ADMIN), adminResetPassword);
router.post('/users/:id/approve', protect, requireRole(USER_ROLES.ADMIN), approveUser);

export default router;
