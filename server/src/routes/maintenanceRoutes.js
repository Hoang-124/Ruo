import express from 'express';
import { getPlans, createPlan, getLogs, executeChecklist } from '../controllers/maintenanceController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

router.route('/plans')
  .get(getPlans)
  .post(requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), createPlan);

router.route('/logs')
  .get(getLogs)
  .post(requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), executeChecklist);

export default router;
