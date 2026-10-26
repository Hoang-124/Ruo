import express from 'express';
import {
  getSpareParts,
  createSparePart,
  updateSparePart,
  deleteSparePart,
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

// Create new spare part (Facility Manager, Admin) (UC-5.12)
router.post('/', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createSparePart);

// Update spare part details (Facility Manager, Admin) (UC-5.12)
router.put('/:id', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), updateSparePart);

// Delete spare part (Facility Manager, Admin) (UC-5.12)
router.delete('/:id', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), deleteSparePart);

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
