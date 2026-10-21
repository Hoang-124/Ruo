import express from 'express';
import {
  createMaintenancePlan,
  getMaintenancePlans,
  logMaintenanceResult
} from '../controllers/maintenanceController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
const operationalRoles = [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER];

router.use(protect);
router.get('/plans', requireRole(...operationalRoles), getMaintenancePlans);
router.post('/plans', requireRole(USER_ROLES.FACILITY_MANAGER), createMaintenancePlan);
router.put('/plans/:id/log', requireRole(USER_ROLES.TECHNICIAN), logMaintenanceResult);

export default router;
