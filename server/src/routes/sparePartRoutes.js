import express from 'express';
import {
  getSpareParts,
  updateSparePartStock,
  getPartsRequests,
  requestSpareParts,
  approvePartsRequest,
  rejectPartsRequest
} from '../controllers/sparePartController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// View spare parts stock (Technician, Facility Manager, Admin)
router.get('/', protect, getSpareParts);

// Update spare parts stock (Facility Manager, Admin)
router.put('/:id/stock', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), updateSparePartStock);

// View parts requests (Technician, Facility Manager, Admin)
router.get('/requests', protect, getPartsRequests);

// Request spare parts (Technician, Facility Manager, Admin)
router.post('/requests', protect, requireRole(USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), requestSpareParts);

// Approve parts request (Facility Manager, Admin)
router.put('/requests/:id/approve', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), approvePartsRequest);

// Reject parts request (Facility Manager, Admin)
router.put('/requests/:id/reject', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), rejectPartsRequest);

export default router;
