import express from 'express';
import { 
  getTransfers, 
  createTransfer, 
  approveTransfer, 
  rejectTransfer, 
  completeTransfer 
} from '../controllers/transferController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'maintenance_staff'));

router.route('/')
  .get(getTransfers)
  .post(createTransfer);

// Separation of Duties: ONLY Admin (Ban Giám Hiệu) approves/rejects transfers
router.put('/:id/approve', authorize('admin'), approveTransfer);
router.put('/:id/reject', authorize('admin'), rejectTransfer);

// Maintenance staff executes physical room transfer and completes
router.put('/:id/complete', authorize('admin', 'maintenance_staff'), completeTransfer);

export default router;

