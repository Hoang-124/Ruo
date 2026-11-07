import express from 'express';
import { getAuditLogs, verifyAuditChain, exportAuditLogs } from '../controllers/auditController.js';
import { analyzeAuditAnomalies } from '../controllers/aiController.js';
import { protect, requirePermission, requireRole } from '../middlewares/authMiddleware.js';
import { createRateLimiter } from '../middlewares/securityMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Tần suất gọi AI Kiểm toán SHA-256 vượt ngưỡng cho phép.'
});

router.use(protect);
router.use(requireRole(USER_ROLES.ADMIN)); // Only Admin can inspect & export audit logs

router.get('/logs', getAuditLogs);
router.get('/verify-chain', verifyAuditChain);
router.post('/ai-analyze', aiRateLimiter, requirePermission('audit:read', USER_ROLES.ADMIN), analyzeAuditAnomalies);
router.get('/export', exportAuditLogs);
router.get('/export/csv', exportAuditLogs);

export default router;
