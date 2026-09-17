import express from 'express';
import { getAuditLogs, verifyAuditChain } from '../controllers/auditController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin')); // Only Admin can inspect cryptographic audit logs

router.get('/logs', getAuditLogs);
router.get('/verify-chain', verifyAuditChain);

export default router;
