import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, USER_STATUSES } from '../config/constants.js';

// Department Schema
const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' }
}, { timestamps: true });

export const Department = mongoose.model('Department', departmentSchema);

// Role Schema
const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    enum: Object.values(USER_ROLES) 
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  permissions: [{ type: String }] // e.g. ['room:book', 'ticket:assign', 'disposal:approve']
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);

// User Schema
const userSchema = new mongoose.Schema({
  employeeCode: { 
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
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  className: { type: String, default: '' },
  role: { 
    type: String, 
    required: true, 
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.STUDENT,
    index: true 
  },
  reputeScore: { 
    type: Number, 
    default: 100, 
    min: 0, 
    max: 100,
    note: 'Điểm uy tín tự động giảm khi No-Show mượn phòng'
  },
  status: { 
    type: String, 
    enum: Object.values(USER_STATUSES), 
    default: USER_STATUSES.ACTIVE,
    index: true 
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Pre-save hook: Hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Deduct repute score on No-Show
userSchema.methods.deductReputeScore = async function (points, reason = 'NO_SHOW') {
  this.reputeScore = Math.max(0, this.reputeScore - points);
  if (this.reputeScore <= 30) {
    this.status = USER_STATUSES.LOCKED; // Automatically lock account if repute falls critically low
  }
  await this.save();
  return this.reputeScore;
};

export const User = mongoose.model('User', userSchema);

// User Session Schema
const userSessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshTokenHash: { type: String, default: null, index: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  isRevoked: { type: Boolean, default: false, index: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

export const UserSession = mongoose.model('UserSession', userSessionSchema);

// Password Reset OTP Schema (TTL 15 minutes)
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  isUsed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: '15m' } }
}, { timestamps: true });

export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
