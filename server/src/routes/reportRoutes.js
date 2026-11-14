import express from 'express';
import {
  getStatisticalReport,
  getRepairFrequency,
  getWarrantyExpiring,
  getOverdueRepairs,
  exportStatisticalReport,
  saveCsvExport,
  openCsvExport
} from '../controllers/reportController.js';
import { getKpi, getHealthScore, getRepairCost, getEquipmentByRoom, getEquipmentByStatus } from '../controllers/dashboardController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Direct CSV/Excel save & open in Downloads folder (Admin, Facility Manager, Technician)
router.post('/save-csv', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN), saveCsvExport);
router.post('/open-csv', protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN), openCsvExport);

router.use(protect, requireRole(USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER));

// View operation dashboard (Facility Manager & Admin)
router.get('/dashboard', getKpi);

// View statistical report (Admin & Facility Manager)
router.get('/statistics', getStatisticalReport);
router.get('/equipment-health', getHealthScore);
router.get('/repair-costs', getRepairCost);
router.get('/by-room', getEquipmentByRoom);
router.get('/by-status', getEquipmentByStatus);
router.get('/repair-frequency', getRepairFrequency);
router.get('/warranty-expiring', getWarrantyExpiring);
router.get('/overdue-repairs', getOverdueRepairs);

// Export statistical report (Admin & Facility Manager)
router.get('/export', exportStatisticalReport);

export default router;
