import express from 'express';
import {
  getSessions,
  createSession,
  getSessionById,
  scanEquipmentInRoom,
  reconcileSession,
  exportInventoryReport
} from '../controllers/inventoryController.js';
import { protect, requirePermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

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

// Get session details
router.get('/sessions/:id', protect, getSessionById);
router.get('/:id', protect, getSessionById);

export default router;
