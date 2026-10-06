import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

// User Schema (Module 1: Authentication & Authorization)
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
    required: true 
  },
  full_name: { 
    type: String, 
    required: true, 
    trim: true 
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
    default: 'Phòng Hành Chính Quản Trị' 
  },
  role: { 
    type: String, 
    required: true, 
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.STAFF,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(USER_STATUSES), 
    default: USER_STATUSES.ACTIVE,
    index: true 
  },
  force_change_pw: { 
    type: Boolean, 
    default: false 
  },
  failed_login_attempts: { 
    type: Number, 
    default: 0 
  },
  lock_until: { 
    type: Date, 
    default: null, 
    index: true 
  },
  last_login_at: { 
    type: Date, 
    default: null 
  },
  last_login_ip: { 
    type: String, 
    default: '' 
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

export const User = mongoose.model('User', userSchema);

// Department Model
const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

// PasswordReset Model
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: '15m' } },
  isUsed: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

passwordResetSchema.alias('created_at', 'createdAt');
passwordResetSchema.alias('updated_at', 'updatedAt');

export const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);

export default User;
