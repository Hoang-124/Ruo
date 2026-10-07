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

// Update spare parts stock (Facility Manager only)
router.put('/:id/stock', protect, requireRole(USER_ROLES.FACILITY_MANAGER), updateSparePartStock);

// View parts requests
router.get('/requests', protect, getPartsRequests);

// Request spare parts (Technician only)
router.post('/requests', protect, requireRole(USER_ROLES.TECHNICIAN), requestSpareParts);

// Approve parts request (Facility Manager only)
router.put('/requests/:id/approve', protect, requireRole(USER_ROLES.FACILITY_MANAGER), approvePartsRequest);

// Reject parts request (Facility Manager only)
router.put('/requests/:id/reject', protect, requireRole(USER_ROLES.FACILITY_MANAGER), rejectPartsRequest);

export default router;
