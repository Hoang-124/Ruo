import express from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import { getKpi, getRepairCost, getHealthScore } from '../controllers/dashboardController.js';

const router = express.Router();
router.use(protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER));
router.get('/kpi', getKpi);
router.get('/repair-cost', getRepairCost);
router.get('/health-score', getHealthScore);
export default router;
