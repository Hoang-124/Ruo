import express from 'express';
import { 
  getRepairs, 
  getRepairById, 
  createRepairReport, 
  assignRepairTask, 
  addRepairLog, 
  resolveRepair, 
  submitRepairFeedback 
} from '../controllers/repairController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRepairs)
  .post(createRepairReport); // Lecturer & Staff can report

router.route('/:id')
  .get(getRepairById);

router.put('/:id/assign', authorize('admin', 'maintenance_staff'), assignRepairTask);
router.post('/:id/logs', authorize('admin', 'maintenance_staff'), addRepairLog);
router.put('/:id/resolve', authorize('admin', 'maintenance_staff'), resolveRepair);
router.post('/:id/feedback', submitRepairFeedback); // Lecturer evaluates

export default router;
