import express from 'express';
import { 
  getDisposalList, 
  createDisposalProposal, 
  advanceDisposalStep 
} from '../controllers/disposalController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('maintenance_staff', 'admin'));

router.get('/', getDisposalList);
router.post('/', createDisposalProposal);
router.put('/:id/step', advanceDisposalStep);

export default router;

