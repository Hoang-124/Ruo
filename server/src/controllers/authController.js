import jwt from 'jsonwebtoken';
import { User, Role } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  const { email, employeeCode, password } = req.body;

  const query = email ? { email: email.toLowerCase() } : { employeeCode: employeeCode.toUpperCase() };
  const user = await User.findOne(query).populate('department');

  if (user && (await user.comparePassword(password))) {
    // Log login action
    await AuditLog.logAction({
      user: user._id,
      userDisplay: user.fullName,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department ? user.department.name : null,
        className: user.className,
        reputeScore: user.reputeScore,
        avatar: user.avatar
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác.'
    });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('department');
  res.json({
    success: true,
    user
  });
};

// @desc    Get all users list (for assignment / committee selector)
// @route   GET /api/auth/users
export const getAllUsers = async (req, res) => {
  const { role } = req.query;
  const query = { deletedAt: null };
  if (role) query.role = role;

  const users = await User.find(query).select('-passwordHash').populate('department');
  res.json({
    success: true,
    total: users.length,
    users
  });
};
