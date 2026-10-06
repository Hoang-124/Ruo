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
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  department: { type: String, default: '' },
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
  force_change_pw: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null, index: true },
  last_login_at: { type: Date, default: null },
  last_login_ip: { type: String, default: '' },
  deletedAt: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Virtual compatibility aliases
userSchema.virtual('employeeCode').get(function() { return this.code; }).set(function(v) { this.code = v; });
userSchema.virtual('fullName').get(function() { return this.full_name; }).set(function(v) { this.full_name = v; });
userSchema.virtual('passwordHash').get(function() { return this.password_hash; }).set(function(v) { this.password_hash = v; });

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
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

// Handle failed login attempt (15-min lockout on 5 attempts)
userSchema.methods.handleFailedLogin = async function () {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  const isNowLocked = this.failedLoginAttempts >= 5;
  if (isNowLocked) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
  }
  await this.save();
  return {
    isLocked: isNowLocked,
    attemptsLeft: Math.max(0, 5 - this.failedLoginAttempts),
    failedAttempts: this.failedLoginAttempts
  };
};

// Reset failed login counter on success
userSchema.methods.resetFailedLogin = async function (ipAddress = '') {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.last_login_at = new Date();
  if (ipAddress) this.last_login_ip = ipAddress;
  return await this.save();
};

userSchema.methods.incrementFailedAttempts = userSchema.methods.handleFailedLogin;
userSchema.methods.resetFailedAttempts = userSchema.methods.resetFailedLogin;

export const User = mongoose.model('User', userSchema);

// Department compatibility model
const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true }
});
export const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

// UserSession compatibility model
const userSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tokenHash: { type: String },
  deviceInfo: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  expiresAt: { type: Date },
  isRevoked: { type: Boolean, default: false }
}, { timestamps: true });
export const UserSession = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);

// PasswordReset compatibility model
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false }
}, { timestamps: true });
export const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);

export default User;
