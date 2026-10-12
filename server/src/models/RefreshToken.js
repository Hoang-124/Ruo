import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, alias: 'user' },
  token: { type: String, required: true, unique: true, alias: 'tokenHash' },
  device_info: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  expires_at: { type: Date, required: true, alias: 'expiresAt' },
  is_revoked: { type: Boolean, default: false, alias: 'isRevoked' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Query normalization hook for legacy queries
refreshTokenSchema.pre(['find', 'findOne', 'countDocuments', 'updateMany', 'updateOne', 'deleteMany'], function () {
  const filter = this.getFilter();
  if (filter) {
    if ('user' in filter) {
      filter.user_id = filter.user;
      delete filter.user;
    }
    if ('tokenHash' in filter) {
      filter.token = filter.tokenHash;
      delete filter.tokenHash;
    }
    if ('isRevoked' in filter) {
      filter.is_revoked = filter.isRevoked;
      delete filter.isRevoked;
    }
    if ('expiresAt' in filter) {
      filter.expires_at = filter.expiresAt;
      delete filter.expiresAt;
    }
  }
});

// TTL Index: automatically delete expired tokens
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
