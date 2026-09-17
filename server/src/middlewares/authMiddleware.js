import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { USER_STATUSES } from '../config/constants.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập. Vui lòng đăng nhập để lấy mã Token.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university');
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản người dùng không tồn tại trong hệ thống.'
      });
    }

    if (user.status === USER_STATUSES.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa do vi phạm chính sách hoặc điểm uy tín quá thấp.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
    });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu xác thực tài khoản.' });
    }

    // Admin has universal override capability
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Quyền truy cập bị từ chối. Chức năng này yêu cầu một trong các vai trò: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
};
