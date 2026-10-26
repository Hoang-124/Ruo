import express from 'express';
import {
  getDisposalList,
  createDisposalProposal,
  approveDisposal,
  rejectDisposal,
  hcApproveDisposal,
  bghApproveDisposal,
  updateDisposalProcurement,
  completeDisposalReceipt,
  rejectHcDisposal
} from '../controllers/disposalController.js';
import { protect, requirePermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
export const DISPOSAL_WORKFLOW_PERMISSION = 'disposal:propose';

// View disposal requests (Admin, Facility Manager)
router.get('/', protect, getDisposalList);

// Propose disposal (Technician & Facility Manager) (UC-7.7)
router.post('/', protect, requirePermission(DISPOSAL_WORKFLOW_PERMISSION, USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER), createDisposalProposal);

// Approve disposal request (Admin only)
router.put('/:id/approve', protect, requirePermission('disposal:approve', USER_ROLES.ADMIN), approveDisposal);

// Reject disposal request (Admin only)
router.put('/:id/reject', protect, requirePermission('disposal:approve', USER_ROLES.ADMIN), rejectDisposal);

// RACI workflow endpoints
router.put('/:id/hc-approve', protect, requirePermission('disposal:propose', USER_ROLES.FACILITY_MANAGER), hcApproveDisposal);
router.put('/:id/hc-reject', protect, requirePermission('disposal:propose', USER_ROLES.FACILITY_MANAGER), rejectHcDisposal);
router.put('/:id/bgh-approve', protect, requirePermission('disposal:approve', USER_ROLES.ADMIN), bghApproveDisposal);
router.put('/:id/procurement', protect, requirePermission('disposal:propose', USER_ROLES.FACILITY_MANAGER), updateDisposalProcurement);
router.put('/:id/receipt', protect, requirePermission(DISPOSAL_WORKFLOW_PERMISSION, USER_ROLES.TECHNICIAN), completeDisposalReceipt);

export default router;
