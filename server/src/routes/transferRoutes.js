import express from 'express';
import { 
  getTransfers, 
  createTransfer, 
  approveTransfer, 
  rejectTransfer, 
  completeTransfer 
} from '../controllers/transferController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// View transfers (All authenticated actors: Manager, Staff, Admin)
router.get('/', requireRole(USER_ROLES.MANAGER, USER_ROLES.STAFF, USER_ROLES.ADMIN), getTransfers);

// Initiate transfer (Staff, Admin)
router.post('/', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), createTransfer);

// Manager reviews and approves/rejects (Manager, Admin)
router.put('/:id/approve', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), approveTransfer);
router.put('/:id/reject', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), rejectTransfer);

// Staff completes physical handover (Staff, Admin)
router.put('/:id/complete', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), completeTransfer);

export default router;
