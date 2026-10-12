import express from 'express';
import {
  getPartsRequests,
  requestSpareParts,
  approvePartsRequest,
  rejectPartsRequest
} from '../controllers/sparePartController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// View parts requests (Technician, Facility Manager, Admin)
router.get('/', getPartsRequests);

// Request spare parts (Technician, Facility Manager, Admin)
router.post('/', requireRole(USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), requestSpareParts);

// Approve parts request (Facility Manager, Admin)
router.put('/:id/approve', requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), approvePartsRequest);

// Reject parts request (Facility Manager, Admin)
router.put('/:id/reject', requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), rejectPartsRequest);

export default router;
