import express from 'express';
import {
  getSessions,
  createSession,
  getSessionById,
  scanEquipmentInRoom,
  reconcileSession
} from '../controllers/inventoryController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.route('/sessions')
  .get(protect, getSessions)
  .post(protect, requireRole(USER_ROLES.FACILITY_MANAGER), createSession);

router.route('/sessions/:id')
  .get(protect, getSessionById);

// Scan QR code in room (Technician only)
router.post('/sessions/:id/scan', protect, requireRole(USER_ROLES.TECHNICIAN), scanEquipmentInRoom);

// Reconcile session (Facility Manager only)
router.put('/sessions/:id/reconcile', protect, requireRole(USER_ROLES.FACILITY_MANAGER), reconcileSession);

export default router;
