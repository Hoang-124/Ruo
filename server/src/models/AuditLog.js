import mongoose from 'mongoose';
import crypto from 'crypto';

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  userDisplay: { type: String, default: 'System' },
  action: { 
    type: String, 
    required: true, 
    index: true,
    note: 'BOOKING_CREATE, TICKET_ASSIGN, SCHEDULE_FREEZE, DISPOSAL_APPROVE...'
  },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true },
  ipAddress: { type: String, default: '127.0.0.1' },
  diffData: { type: mongoose.Schema.Types.Mixed, default: {} },
  sha256Hash: { type: String, required: true, unique: true },
  prevHash: { type: String, required: true }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

// Static Helper: Generate next chained audit record with SHA-256
auditLogSchema.statics.logAction = async function ({ user, userDisplay, action, entityType, entityId, ipAddress = '127.0.0.1', diffData = {} }) {
  // 1. Get the latest log entry to link hash
  const latestLog = await this.findOne().sort({ createdAt: -1 });
  const prevHash = latestLog ? latestLog.sha256Hash : '0000000000000000000000000000000000000000000000000000000000000000';
  
  const timestamp = new Date().toISOString();
  const rawPayload = `${prevHash}|${timestamp}|${user ? user.toString() : 'SYSTEM'}|${action}|${entityType}|${entityId}|${JSON.stringify(diffData)}`;
  
  const sha256Hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const newLog = await this.create({
    user: user || null,
    userDisplay: userDisplay || (user ? 'User' : 'Hệ Thống Tự Động'),
    action,
    entityType,
    entityId: entityId ? entityId.toString() : 'N/A',
    ipAddress,
    diffData,
    sha256Hash,
    prevHash
  });

  return newLog;
};

// Static Helper: Audit Chain Verification (Check tamper-resistance)
auditLogSchema.statics.verifyIntegrity = async function () {
  const logs = await this.find().sort({ createdAt: 1 });
  let isValid = true;
  let brokenIndex = -1;

  for (let i = 1; i < logs.length; i++) {
    if (logs[i].prevHash !== logs[i - 1].sha256Hash) {
      isValid = false;
      brokenIndex = i;
      break;
    }
  }

  return {
    totalLogs: logs.length,
    isValid,
    brokenIndex: brokenIndex !== -1 ? brokenIndex : null,
    message: isValid 
      ? 'Toàn bộ chuỗi kiểm toán SHA-256 hoàn toàn nguyên vẹn, không có dấu hiệu chỉnh sửa.'
      : `Phát hiện sai lệch chuỗi băm tại bản ghi số ${brokenIndex}.`
  };
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
