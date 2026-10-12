import express from 'express';
import { getAuditLogs, verifyAuditChain, exportAuditLogs } from '../controllers/auditController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);
router.use(requireRole(USER_ROLES.ADMIN)); // Only Admin can inspect & export audit logs

router.get('/logs', getAuditLogs);
router.get('/verify-chain', verifyAuditChain);
router.get('/export', exportAuditLogs);

export default router;
