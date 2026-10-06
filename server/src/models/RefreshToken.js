import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  device_info: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  expires_at: { type: Date, required: true },
  is_revoked: { type: Boolean, default: false }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// TTL Index: automatically delete expired tokens
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
