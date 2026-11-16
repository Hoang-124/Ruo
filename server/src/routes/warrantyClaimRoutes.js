import express from 'express';
import {
  createWarrantyClaim,
  getWarrantyClaims,
  updateWarrantyClaimStatus
} from '../controllers/warrantyClaimController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
const warrantyRoles = [
  USER_ROLES.TECHNICIAN,
  USER_ROLES.FACILITY_MANAGER,
  USER_ROLES.ADMIN
];

router.use(protect, requireRole(...warrantyRoles));
router.get('/', getWarrantyClaims);
router.post('/', createWarrantyClaim);
router.patch('/:id/status', updateWarrantyClaimStatus);

export default router;
