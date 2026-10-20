import express from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import { getKpi } from '../controllers/dashboardController.js';

const router = express.Router();
router.use(protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER));
router.get('/kpi', getKpi);
export default router;
