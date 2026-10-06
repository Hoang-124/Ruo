import mongoose from 'mongoose';
import crypto from 'crypto';
import { canonicalJSON } from '../utils/canonicalJson.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// AuditLog Schema with Cryptographic SHA-256 Tamper-Evident Chain
const auditLogSchema = new mongoose.Schema({
  seq: { 
    type: Number, 
    required: true, 
    unique: true, 
    index: true 
  },
  action: { 
    type: String, 
    required: true, 
    index: true 
  },
  target_table: { 
    type: String, 
    required: true, 
    index: true 
  },
  entity_id: { 
    type: String, 
    required: true, 
    index: true 
  },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null, 
    index: true 
  },
  user_display: { 
    type: String, 
    default: 'Hệ Thống' 
  },
  old_value: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  new_value: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  ip_address: { 
    type: String, 
    default: '127.0.0.1' 
  },
  hashed_at: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  previous_hash: { 
    type: String, 
    required: true 
  },
  hash_sha256: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: false } 
});

auditLogSchema.index({ target_table: 1, entity_id: 1, created_at: -1 });

/**
 * Builds the canonical deterministic payload for hashing
 */
function buildHashPayload(logData) {
  return canonicalJSON({
    seq: logData.seq,
    previous_hash: logData.previous_hash,
    hashed_at: logData.hashed_at instanceof Date ? logData.hashed_at.toISOString() : new Date(logData.hashed_at).toISOString(),
    user_id: logData.user_id ? logData.user_id.toString() : 'SYSTEM',
    action: logData.action,
    target_table: logData.target_table,
    entity_id: logData.entity_id ? logData.entity_id.toString() : 'N/A',
    old_value: logData.old_value ?? null,
    new_value: logData.new_value ?? null
  });
}

/**
 * Appends a new chained audit record with cryptographic SHA-256 hash
 */
auditLogSchema.statics.logAction = async function ({ 
  user_id = null,
  user_display = 'Hệ Thống',
  action,
  target_table = 'general',
  entity_id = 'N/A',
  ip_address = '127.0.0.1',
  old_value = null,
  new_value = null
}) {
  const latestLog = await this.findOne().sort({ seq: -1 });
  const nextSeq = latestLog ? latestLog.seq + 1 : 1;
  const prevHash = latestLog ? latestLog.hash_sha256 : GENESIS_HASH;
  const hashedAt = new Date();

  const payload = buildHashPayload({
    seq: nextSeq,
    previous_hash: prevHash,
    hashed_at: hashedAt,
    user_id,
    action,
    target_table,
    entity_id,
    old_value,
    new_value
  });

  const sha256Hash = crypto.createHash('sha256').update(payload).digest('hex');

  const newLog = await this.create({
    seq: nextSeq,
    user_id,
    user_display,
    action,
    target_table,
    entity_id: entity_id ? entity_id.toString() : 'N/A',
    ip_address,
    old_value,
    new_value,
    hashed_at: hashedAt,
    previous_hash: prevHash,
    hash_sha256: sha256Hash
  });

  return newLog;
};

/**
 * Verifies the mathematical and cryptographic integrity of the entire audit chain.
 * Recomputes every block hash from raw fields and verifies backwards links.
 */
auditLogSchema.statics.verifyIntegrity = async function () {
  const logs = await this.find().sort({ seq: 1 });

  if (!logs || logs.length === 0) {
    return {
      isValid: true,
      totalLogs: 0,
      message: 'Nhật ký kiểm toán chưa có bản ghi nào.'
    };
  }

  for (let i = 0; i < logs.length; i++) {
    const cur = logs[i];
    const expectedSeq = i + 1;

    // 1. Check sequence order continuity
    if (cur.seq !== expectedSeq) {
      return {
        isValid: false,
        totalLogs: logs.length,
        brokenAt: cur.seq,
        reason: 'SEQ_GAP',
        message: `Phát hiện gián đoạn số thứ tự (seq gap) tại bản ghi seq=${cur.seq}, kỳ vọng seq=${expectedSeq}.`
      };
    }

    // 2. Check previous hash link
    const expectedPrevHash = (i === 0) ? GENESIS_HASH : logs[i - 1].hash_sha256;
    if (cur.previous_hash !== expectedPrevHash) {
      return {
        isValid: false,
        totalLogs: logs.length,
        brokenAt: cur.seq,
        reason: 'LINK_BROKEN',
        message: `Sai lệch liên kết previous_hash tại bản ghi seq=${cur.seq}. Dữ liệu chuỗi trước đó đã bị can thiệp.`
      };
    }

    // 3. Recompute SHA-256 hash from raw field content
    const recomputedPayload = buildHashPayload({
      seq: cur.seq,
      previous_hash: cur.previous_hash,
      hashed_at: cur.hashed_at,
      user_id: cur.user_id,
      action: cur.action,
      target_table: cur.target_table,
      entity_id: cur.entity_id,
      old_value: cur.old_value,
      new_value: cur.new_value
    });

    const calculatedHash = crypto.createHash('sha256').update(recomputedPayload).digest('hex');

    if (calculatedHash !== cur.hash_sha256) {
      return {
        isValid: false,
        totalLogs: logs.length,
        brokenAt: cur.seq,
        reason: 'HASH_MISMATCH',
        message: `Phát hiện nội dung dữ liệu bị chỉnh sửa trái phép tại bản ghi seq=${cur.seq}. Giá trị băm không khớp.`
      };
    }
  }

  return {
    isValid: true,
    valid: true,
    totalLogs: logs.length,
    total_checked: logs.length,
    message: 'Toàn bộ chuỗi kiểm toán SHA-256 hoàn toàn nguyên vẹn, không có dấu hiệu chỉnh sửa.'
  };
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
