import mongoose from 'mongoose';

// PasswordReset Schema (Module 1: Authentication & Authorization)
// Conforming to dbdiagram.dbml: password_resets collection
const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  otp_hash: {
    type: String,
    required: true,
    alias: 'otpHash'
  },
  purpose: {
    type: String,
    enum: ['register', 'reset_password'],
    default: 'reset_password'
  },
  attempts: {
    type: Number,
    default: 0
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expires: '15m' },
    alias: 'expiresAt'
  },
  is_used: {
    type: Boolean,
    default: false,
    alias: 'isUsed'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Query normalization hook to support legacy isUsed, expiresAt, otpHash, and createdAt
passwordResetSchema.pre(['find', 'findOne', 'countDocuments', 'updateMany', 'updateOne', 'deleteMany'], function () {
  const filter = this.getFilter();
  if (filter) {
    if ('isUsed' in filter) {
      filter.is_used = filter.isUsed;
      delete filter.isUsed;
    }
    if ('expiresAt' in filter) {
      filter.expires_at = filter.expiresAt;
      delete filter.expiresAt;
    }
    if ('otpHash' in filter) {
      filter.otp_hash = filter.otpHash;
      delete filter.otpHash;
    }
  }
  const sort = this.options?.sort;
  if (sort && typeof sort === 'object') {
    if ('createdAt' in sort) {
      sort.created_at = sort.createdAt;
      delete sort.createdAt;
    }
    if ('expiresAt' in sort) {
      sort.expires_at = sort.expiresAt;
      delete sort.expiresAt;
    }
  }
});

passwordResetSchema.set('toJSON', { virtuals: true });
passwordResetSchema.set('toObject', { virtuals: true });

export const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;
