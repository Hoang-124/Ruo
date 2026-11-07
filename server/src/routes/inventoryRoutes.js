import express from 'express';
import {
  getSessions,
  createSession,
  getSessionById,
  scanEquipmentInRoom,
  reconcileSession,
  exportInventoryReport
} from '../controllers/inventoryController.js';
import { analyzeInventoryDiscrepancies } from '../controllers/aiController.js';
import { protect, requirePermission, requireRole } from '../middlewares/authMiddleware.js';
import { createRateLimiter } from '../middlewares/securityMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Tần suất gọi AI Kiểm toán Kiểm kê vượt ngưỡng cho phép.'
});

// Support both /api/inventory/sessions and /api/inventory-sessions (UC-3.9)
router.route('/sessions')
  .get(protect, getSessions)
  .post(protect, requirePermission('inventory:create', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createSession);

router.route('/')
  .get(protect, getSessions)
  .post(protect, requirePermission('inventory:create', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createSession);

// Export inventory report with digital signature (UC-3.11)
router.get('/sessions/:id/export', protect, requirePermission('inventory:export', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN), exportInventoryReport);
router.get('/:id/export', protect, requirePermission('inventory:export', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN), exportInventoryReport);

// Scan QR code in room (UC-3.10: Technician, Facility Manager) — support both PUT and POST
router.post('/sessions/:id/scan', protect, requirePermission('inventory:scan', USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), scanEquipmentInRoom);
router.put('/sessions/:id/scan', protect, requirePermission('inventory:scan', USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), scanEquipmentInRoom);
router.post('/:id/scan', protect, requirePermission('inventory:scan', USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), scanEquipmentInRoom);
router.put('/:id/scan', protect, requirePermission('inventory:scan', USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), scanEquipmentInRoom);

// Reconcile session (Facility Manager, Admin)
router.put('/sessions/:id/reconcile', protect, requirePermission('inventory:reconcile', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), reconcileSession);
router.put('/:id/reconcile', protect, requirePermission('inventory:reconcile', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), reconcileSession);

// AI Inventory Discrepancy & Zombie Asset Analyst (Feature #4A)
router.post(
  '/sessions/:id/ai-analyze',
  protect,
  aiRateLimiter,
  requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN),
  analyzeInventoryDiscrepancies
);
router.post(
  '/:id/ai-analyze',
  protect,
  aiRateLimiter,
  requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN),
  analyzeInventoryDiscrepancies
);

// Get session details
router.get('/sessions/:id', protect, getSessionById);
router.get('/:id', protect, getSessionById);

export default router;
