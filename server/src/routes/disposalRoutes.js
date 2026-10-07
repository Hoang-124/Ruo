import express from 'express';
import {
  getDisposalList,
  createDisposalProposal,
  approveDisposal,
  rejectDisposal,
  hcApproveDisposal,
  bghApproveDisposal,
  updateDisposalProcurement,
  completeDisposalReceipt
} from '../controllers/disposalController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// View disposal requests (Admin, Facility Manager)
router.get('/', protect, getDisposalList);

// Propose disposal (Facility Manager only)
router.post('/', protect, requireRole(USER_ROLES.FACILITY_MANAGER), createDisposalProposal);

// Approve disposal request (Admin only)
router.put('/:id/approve', protect, requireRole(USER_ROLES.ADMIN), approveDisposal);

// Reject disposal request (Admin only)
router.put('/:id/reject', protect, requireRole(USER_ROLES.ADMIN), rejectDisposal);

// Compatibility endpoints for legacy tests
router.put('/:id/hc-approve', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER), hcApproveDisposal);
router.put('/:id/bgh-approve', protect, requireRole(USER_ROLES.ADMIN), bghApproveDisposal);
router.put('/:id/procurement', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER), updateDisposalProcurement);
router.put('/:id/receipt', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN), completeDisposalReceipt);

export default router;
