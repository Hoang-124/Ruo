import express from 'express';
import {
  getMovements,
  createMovementOrder,
  confirmMovement
} from '../controllers/movementController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// View movement orders & history (Facility Manager, Technician, Admin)
router.get('/', protect, getMovements);

// Order equipment transfer (Facility Manager only)
router.post('/', protect, requireRole(USER_ROLES.FACILITY_MANAGER), createMovementOrder);

// Confirm equipment movement execution (Technician only)
router.put('/:id/confirm', protect, requireRole(USER_ROLES.TECHNICIAN), confirmMovement);

// Compatibility endpoint for complete
router.put('/:id/complete', protect, requireRole(USER_ROLES.TECHNICIAN), confirmMovement);

export default router;
