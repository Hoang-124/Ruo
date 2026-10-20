import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { DEFAULT_CANONICAL_ROLES } from '../controllers/roleController.js';
import { USER_STATUSES } from '../config/constants.js';

export const hasGrantedPermission = (permissions = [], code = '') => {
  if (!code || !Array.isArray(permissions)) return false;
  if (permissions.includes('*') || permissions.includes(code)) return true;
  const prefix = code.split(':')[0];
  return Boolean(prefix && permissions.includes(`${prefix}:*`));
};

export const protect = async (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university';

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

    let rolePermissions = DEFAULT_CANONICAL_ROLES[user.role]?.permissions || [];
    let permissionsFromDb = false;
    if (mongoose.connection.readyState === 1) {
      const dbRole = await Role.findOne({ name: user.role }).select('permissions');
      if (dbRole && Array.isArray(dbRole.permissions)) {
        rolePermissions = dbRole.permissions;
        permissionsFromDb = true;
      }
    }

    req.user = user;
    req.userPermissions = rolePermissions;
    req.userPermissionsFromDb = permissionsFromDb;
    req.hasPermission = (code) => hasGrantedPermission(rolePermissions, code);
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
 * Strict principle: Only explicitly allowed roles can access the endpoint.
 * No universal override: người làm không tự duyệt việc của mình.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu xác thực tài khoản.' });
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

/**
 * Dynamic permission authorization middleware backed by the Role matrix (UC-12.1 & UC-12.2).
 * When req.userPermissions is explicitly provided (or loaded from DB Role), live permissions
 * strictly govern access so toggling a permission in UC-12.2 takes effect immediately.
 */
export const requirePermission = (permissionCode, ...fallbackRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu xác thực tài khoản.' });
    }

    if (Array.isArray(req.userPermissions)) {
      if (hasGrantedPermission(req.userPermissions, permissionCode)) {
        return next();
      }
      if (!req.userPermissionsFromDb && fallbackRoles.length > 0 && fallbackRoles.includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Quyền truy cập bị từ chối. Nghiệp vụ yêu cầu quyền [${permissionCode}] trên Ma trận RBAC (Vai trò hiện tại: ${req.user.role}).`
      });
    }

    const defaultPerms = DEFAULT_CANONICAL_ROLES[req.user.role]?.permissions || [];
    if (hasGrantedPermission(defaultPerms, permissionCode)) {
      return next();
    }

    if (fallbackRoles.length > 0 && fallbackRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Quyền truy cập bị từ chối. Nghiệp vụ yêu cầu quyền [${permissionCode}] trên Ma trận RBAC.`
    });
  };
};

export const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  return next();
};

export const authorize = requireRole;
export default protect;
