import express from 'express';
import {
  getDisposalList,
  createDisposalProposal,
  hcApproveDisposal,
  bghApproveDisposal,
  updateDisposalProcurement,
  completeDisposalReceipt,
  rejectDisposal
} from '../controllers/disposalController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// GET disposal list and candidate equipment
router.get('/', getDisposalList);

// Step 1: Staff or Admin proposes disposal (R >= 60%)
router.post('/', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), createDisposalProposal);

// Step 2: Manager HC approves
router.put('/:id/hc-approve', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), hcApproveDisposal);

// Step 3: BGH / Admin approves
router.put('/:id/bgh-approve', requireRole(USER_ROLES.ADMIN), bghApproveDisposal);

// Step 4: Manager updates procurement plan
router.put('/:id/procurement', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), updateDisposalProcurement);

// Step 5: Staff receives replacement & completes disposal
router.put('/:id/receipt', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), completeDisposalReceipt);

// Reject proposal at review steps
router.put('/:id/reject', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), rejectDisposal);

export default router;
