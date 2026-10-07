import { AuditLog } from '../models/AuditLog.js';

// @desc    Get system audit logs with filtering (UC: View audit log)
// @route   GET /api/audit/logs
export const getAuditLogs = async (req, res) => {
  try {
    const { action, target_table, limit = 50 } = req.query;

    const query = {};
    if (action) query.action = action;
    if (target_table) query.target_table = target_table;

    const logs = await AuditLog.find(query)
      .sort({ seq: -1 })
      .limit(Number(limit))
      .populate('user_id', 'full_name code role email');

    res.json({
      success: true,
      total: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify the cryptographic integrity of the SHA-256 audit log chain (UC: Verify audit chain)
// @route   GET /api/audit/verify-chain
export const verifyAuditChain = async (req, res) => {
  try {
    const verification = await AuditLog.verifyIntegrity();
    res.json({
      success: true,
      verification
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export audit logs as CSV (UC: Export audit log - Zero dependencies)
// @route   GET /api/audit/export
export const exportAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ seq: -1 })
      .limit(1000)
      .populate('user_id', 'full_name code email');

    const headers = ['Khối #', 'Thời Gian', 'Hành Động', 'Đối Tượng', 'Người Thực Hiện', 'IP', 'Mã SHA-256'];
    const rows = logs.map(l => [
      l.seq || '',
      `"${new Date(l.created_at).toISOString()}"`,
      `"${l.action}"`,
      `"${l.target_table || ''}"`,
      `"${l.user_display || (l.user_id ? l.user_id.full_name : 'Hệ Thống')}"`,
      `"${l.ip_address || ''}"`,
      `"${l.hash_sha256 || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ruo_audit_log_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
