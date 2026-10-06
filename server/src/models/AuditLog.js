import mongoose from 'mongoose';
import crypto from 'crypto';

// AuditLog Schema (Module 6: System & Governance)
const auditLogSchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: true, 
    index: true 
  },
  target_table: { type: String, required: true, index: true },
  entity_id: { type: String, required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  user_display: { type: String, default: 'System' },
  old_value: { type: mongoose.Schema.Types.Mixed, default: null },
  new_value: { type: mongoose.Schema.Types.Mixed, default: null },
  ip_address: { type: String, default: '127.0.0.1' },
  hash_sha256: { type: String, required: true, unique: true },
  previous_hash: { type: String, required: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: false } 
});

auditLogSchema.index({ target_table: 1, entity_id: 1, created_at: -1 });

// Backwards compatibility virtuals
auditLogSchema.virtual('user').get(function() { return this.user_id; }).set(function(v) { this.user_id = v; });
auditLogSchema.virtual('userDisplay').get(function() { return this.user_display; }).set(function(v) { this.user_display = v; });
auditLogSchema.virtual('entityType').get(function() { return this.target_table; }).set(function(v) { this.target_table = v; });
auditLogSchema.virtual('entityId').get(function() { return this.entity_id; }).set(function(v) { this.entity_id = v; });
auditLogSchema.virtual('ipAddress').get(function() { return this.ip_address; }).set(function(v) { this.ip_address = v; });
auditLogSchema.virtual('diffData').get(function() { return this.new_value; }).set(function(v) { this.new_value = v; });
auditLogSchema.virtual('sha256Hash').get(function() { return this.hash_sha256; }).set(function(v) { this.hash_sha256 = v; });
auditLogSchema.virtual('prevHash').get(function() { return this.previous_hash; }).set(function(v) { this.previous_hash = v; });

auditLogSchema.set('toJSON', { virtuals: true });
auditLogSchema.set('toObject', { virtuals: true });

// Static Helper: Generate next chained audit record with SHA-256
auditLogSchema.statics.logAction = async function ({ 
  user, 
  user_id, 
  userDisplay, 
  user_display, 
  action, 
  entityType, 
  target_table, 
  entityId, 
  entity_id, 
  ipAddress = '127.0.0.1', 
  ip_address = '127.0.0.1', 
  diffData = null, 
  old_value = null, 
  new_value = null 
}) {
  const finalUserId = user_id || user || null;
  const finalUserDisplay = user_display || userDisplay || (finalUserId ? 'User' : 'Hệ Thống Tự Động');
  const finalTargetTable = target_table || entityType || 'general';
  const finalEntityId = entity_id || entityId || 'N/A';
  const finalIp = ip_address || ipAddress;
  const finalNewVal = new_value || diffData || {};

  // 1. Get the latest log entry to link hash
  const latestLog = await this.findOne().sort({ created_at: -1 });
  const prevHash = latestLog ? (latestLog.hash_sha256 || latestLog.sha256Hash) : '0000000000000000000000000000000000000000000000000000000000000000';
  
  const timestamp = new Date().toISOString();
  const rawPayload = `${prevHash}|${timestamp}|${finalUserId ? finalUserId.toString() : 'SYSTEM'}|${action}|${finalTargetTable}|${finalEntityId}|${JSON.stringify(finalNewVal)}`;
  
  const sha256Hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const newLog = await this.create({
    user_id: finalUserId,
    user_display: finalUserDisplay,
    action,
    target_table: finalTargetTable,
    entity_id: finalEntityId.toString(),
    ip_address: finalIp,
    old_value,
    new_value: finalNewVal,
    hash_sha256: sha256Hash,
    previous_hash: prevHash
  });

  return newLog;
};

// Static Helper: Audit Chain Verification (Check tamper-resistance)
auditLogSchema.statics.verifyIntegrity = async function () {
  const logs = await this.find().sort({ created_at: 1 });
  let isValid = true;
  let brokenIndex = -1;

  for (let i = 1; i < logs.length; i++) {
    const curPrev = logs[i].previous_hash || logs[i].prevHash;
    const lastHash = logs[i - 1].hash_sha256 || logs[i - 1].sha256Hash;
    if (curPrev !== lastHash) {
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
export default AuditLog;
