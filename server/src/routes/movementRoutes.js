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
import { protect, requirePermission, hasGrantedPermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

const requireTransferRequestPermission = (req, res, next) => {
  if (
    Array.isArray(req.userPermissions) &&
    (hasGrantedPermission(req.userPermissions, 'movement:order') ||
      hasGrantedPermission(req.userPermissions, 'movement:confirm'))
  ) {
    return next();
  }
  return requirePermission(
    'movement:order',
    USER_ROLES.TECHNICIAN,
    USER_ROLES.FACILITY_MANAGER,
    USER_ROLES.ADMIN
  )(req, res, next);
};

// Transfer history is available to all authenticated operational roles (UC-4.5)
router.get(
  '/',
  requirePermission('equipment:read', USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER),
  getMovements
);
router.get(
  '/equipment/:id',
  requirePermission('equipment:read', USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER),
  getEquipmentTransfers
);
router.get(
  '/pending',
  requirePermission('movement:order', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN),
  getPendingTransfers
);

// Technicians, facility managers, and admins can request transfers (UC-4.1, UC-2.5/2.6)
router.post('/', requireTransferRequestPermission, createMovementOrder);

// Approve or reject transfer requests (UC-4.2, UC-4.3)
router.put(
  '/:id/approve',
  requirePermission('movement:order', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN),
  approveTransfer
);
router.put(
  '/:id/reject',
  requirePermission('movement:order', USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN),
  rejectTransfer
);

// Confirm equipment movement execution (Technician only - UC-4.4)
router.put(
  '/:id/complete',
  requirePermission('movement:confirm', USER_ROLES.TECHNICIAN),
  confirmMovement
);
router.put(
  '/:id/confirm',
  requirePermission('movement:confirm', USER_ROLES.TECHNICIAN),
  confirmMovement
);

export default router;
