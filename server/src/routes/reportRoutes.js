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

// View statistical report (Admin & Facility Manager)
router.get('/statistics', getStatisticalReport);
router.get('/equipment-health', getStatisticalReport);
router.get('/repair-costs', getStatisticalReport);

// Export statistical report (Admin & Facility Manager)
router.get('/export', exportStatisticalReport);

export default router;
