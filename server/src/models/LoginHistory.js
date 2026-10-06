import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ip_address: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['success', 'failed', 'locked'], 
    default: 'success' 
  },
  failure_reason: { 
    type: String, 
    enum: ['wrong_password', 'account_locked', 'rate_limited', 'user_not_found', ''], 
    default: '' 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: false } 
});

// TTL Index: expire logs after 90 days (7,776,000 seconds)
loginHistorySchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

export const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);
export default LoginHistory;
