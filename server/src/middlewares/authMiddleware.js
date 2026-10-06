import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { USER_STATUSES, USER_ROLES } from '../config/constants.js';

export const protect = async (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cấu hình hệ thống: JWT_SECRET chưa được thiết lập.'
    });
  }

  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập. Vui lòng cung cấp mã xác thực (Bearer Token).'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    // Reject refresh tokens used as access tokens
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không hợp lệ. Refresh Token không được sử dụng để truy cập API.'
      });
    }

    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password_hash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản người dùng không tồn tại trong hệ thống.'
      });
    }

    if (user.status === USER_STATUSES.LOCKED || user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang bị khóa do nhập sai mật khẩu quá 5 lần hoặc lệnh quản trị.'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Mã xác thực không hợp lệ hoặc đã hết hạn (15 phút). Vui lòng đăng nhập lại.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * RBAC authorization middleware
 * Admin always has universal override capability.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu xác thực tài khoản.' });
    }

    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Quyền truy cập bị từ chối. Chức năng này yêu cầu một trong các vai trò: [${allowedRoles.join(', ')}]. Vai trò hiện tại của bạn là: ${req.user.role}`
      });
    }

    next();
  };
};

export const authorize = requireRole;
export default protect;
