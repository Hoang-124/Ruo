import express from 'express';
import {
  getMovements,
  createMovementOrder,
  confirmMovement
} from '../controllers/movementController.js';
import { protect, requirePermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// View movement orders & history (Facility Manager, Technician, Admin)
router.get('/', protect, getMovements);

// Order equipment transfer (Facility Manager, Admin)
// Admin needs this to empty a room before deactivating it (UC-2.5 / UC-2.6).
router.post('/', protect, requirePermission('movement:order', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createMovementOrder);

// Confirm equipment movement execution (Technician only)
router.put('/:id/confirm', protect, requirePermission('movement:confirm', USER_ROLES.TECHNICIAN), confirmMovement);

// Compatibility endpoint for complete
router.put('/:id/complete', protect, requirePermission('movement:confirm', USER_ROLES.TECHNICIAN), confirmMovement);

export default router;
