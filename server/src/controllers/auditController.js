import { AuditLog } from '../models/AuditLog.js';

// @desc    Get system audit logs with filtering
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

// @desc    Verify the cryptographic integrity of the SHA-256 audit log chain
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
