import express from 'express';
import {
  getDashboardMetrics,
  getStatisticalReport,
  exportStatisticalReport
} from '../controllers/reportController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// View operation dashboard (Facility Manager & Admin)
router.get('/dashboard', getDashboardMetrics);

// View statistical report (Admin)
router.get('/statistics', requireRole(USER_ROLES.ADMIN), getStatisticalReport);

// Export statistical report (Admin)
router.get('/export', requireRole(USER_ROLES.ADMIN), exportStatisticalReport);

export default router;
