import express from 'express';
import {
  getMovements,
  getPendingTransfers,
  getEquipmentTransfers,
  createMovementOrder,
  approveTransfer,
  rejectTransfer,
  confirmMovement
} from '../controllers/movementController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// Transfer history is available to all authenticated operational roles.
router.get('/', requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER), getMovements);
router.get('/equipment/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER), getEquipmentTransfers);
router.get('/pending', requireRole(USER_ROLES.FACILITY_MANAGER), getPendingTransfers);

// Technicians and facility managers can request transfers for facility-manager approval.
router.post('/', requireRole(USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), createMovementOrder);
router.put('/:id/approve', requireRole(USER_ROLES.FACILITY_MANAGER), approveTransfer);
router.put('/:id/reject', requireRole(USER_ROLES.FACILITY_MANAGER), rejectTransfer);

// Confirm equipment movement execution (Technician only).
router.put('/:id/complete', requireRole(USER_ROLES.TECHNICIAN), confirmMovement);
router.put('/:id/confirm', requireRole(USER_ROLES.TECHNICIAN), confirmMovement);

export default router;
