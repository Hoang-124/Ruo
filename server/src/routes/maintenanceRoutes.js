import express from 'express';
import { getPlans, createPlan, getLogs, executeChecklist } from '../controllers/maintenanceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/plans')
  .get(getPlans)
  .post(authorize('admin', 'maintenance_staff'), createPlan);

router.route('/logs')
  .get(getLogs)
  .post(authorize('admin', 'maintenance_staff'), executeChecklist);

export default router;
