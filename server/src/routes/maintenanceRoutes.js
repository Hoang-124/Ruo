import express from 'express';
import {
  createMaintenancePlan,
  updateMaintenancePlan,
  deleteMaintenancePlan,
  getMaintenancePlans,
  logMaintenanceResult,
  deleteMaintenanceRecord
} from '../controllers/maintenanceController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();
const operationalRoles = [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN];
const managerRoles = [USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN];

router.use(protect);
router.get('/plans', requireRole(...operationalRoles), getMaintenancePlans);
router.post('/plans', requireRole(...managerRoles), createMaintenancePlan);
router.put('/plans/:id', requireRole(...managerRoles), updateMaintenancePlan);
router.delete('/plans/:id', requireRole(...managerRoles), deleteMaintenancePlan);
router.put('/plans/:id/log', requireRole(...operationalRoles), logMaintenanceResult);
router.delete('/records/:recordId', requireRole(...operationalRoles), deleteMaintenanceRecord);

export default router;
