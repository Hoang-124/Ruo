import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';
import { PasswordReset } from './PasswordReset.js';

// User Schema (Module 1: Authentication & Authorization)
// Conforming to dbdiagram.dbml: users collection (4 canonical roles: lecturer, technician, facility_manager, admin)
const userSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    uppercase: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true,
    index: true 
  },
  password_hash: { 
    type: String, 
    required: true,
    alias: 'passwordHash'
  },
  full_name: { 
    type: String, 
    required: true, 
    trim: true,
    alias: 'fullName'
  },
  phone: { 
    type: String, 
    default: '' 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  department: { 
    type: String, 
    default: 'Khoa Công Nghệ Thông Tin' 
  },
  role: { 
    type: String, 
    required: true, 
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.LECTURER,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(USER_STATUSES), 
    default: USER_STATUSES.ACTIVE,
    index: true 
  },
  requested_role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: null
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved_at: {
    type: Date,
    default: null
  },
  force_change_pw: { 
    type: Boolean, 
    default: false 
  },
  failed_login_attempts: { 
    type: Number, 
    default: 0,
    alias: 'failedLoginAttempts'
  },
  lock_until: { 
    type: Date, 
    default: null, 
    index: true,
    alias: 'lockUntil'
  },
  last_login_at: { 
    type: Date, 
    default: null,
    alias: 'lastLoginAt'
  },
  last_login_ip: { 
    type: String, 
    default: '',
    alias: 'lastLoginIp'
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Pre-save hook: Hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

// Check if account is temporarily locked (15-min lockout)
userSchema.methods.isLocked = function () {
  return Boolean(this.lock_until && this.lock_until.getTime() > Date.now());
};

// Handle failed login attempt (15-min lockout on 5 attempts)
userSchema.methods.handleFailedLogin = async function () {
  this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;
  const isNowLocked = this.failed_login_attempts >= 5;
  if (isNowLocked) {
    this.lock_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
  }
  await this.save();
  return {
    isLocked: isNowLocked,
    attemptsLeft: Math.max(0, 5 - this.failed_login_attempts),
    failedAttempts: this.failed_login_attempts
  };
};

// Reset failed login counter upon successful login
userSchema.methods.resetFailedLogin = async function (ipAddress = '') {
  this.failed_login_attempts = 0;
  this.lock_until = null;
  this.last_login_at = new Date();
  if (ipAddress) this.last_login_ip = ipAddress;
  return await this.save();
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Re-export PasswordReset and RefreshToken for backward test compatibility
import { RefreshToken } from './RefreshToken.js';
export { PasswordReset, RefreshToken, RefreshToken as UserSession };

export default User;
