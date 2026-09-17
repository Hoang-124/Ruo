import express from 'express';
import { 
  getDisposalList, 
  createDisposalProposal, 
  advanceDisposalStep 
} from '../controllers/disposalController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getDisposalList);
router.post('/', requireRole('facility_staff', 'maintenance', 'admin'), createDisposalProposal);
router.put('/:id/step', requireRole('facility_staff', 'maintenance', 'admin'), advanceDisposalStep);

export default router;
