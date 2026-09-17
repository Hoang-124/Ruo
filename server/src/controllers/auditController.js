import { AuditLog } from '../models/AuditLog.js';

// @desc    Get system audit logs with filtering
// @route   GET /api/audit/logs
export const getAuditLogs = async (req, res) => {
  const { action, entityType, limit = 50 } = req.query;

  const query = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate('user', 'fullName employeeCode role');

  res.json({
    success: true,
    total: logs.length,
    logs
  });
};

// @desc    Verify the cryptographic integrity of the SHA-256 audit log chain
// @route   GET /api/audit/verify-chain
export const verifyAuditChain = async (req, res) => {
  const verification = await AuditLog.verifyIntegrity();
  res.json({
    success: true,
    verification
  });
};
