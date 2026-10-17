import express from 'express';
import {
  getRepairs,
  getRepairById,
  getEquipmentRepairHistory,
  createRepairReport,
  assignRepairTask,
  acceptRepairTask,
  addRepairLog,
  reportRepairOutcome,
  closeRepairTicket,
  evaluateRepairQuality
} from '../controllers/repairController.js';
import { protect, requirePermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Read repairs & equipment repair history (UC-5.2, UC-5.8)
router.get('/', protect, getRepairs);
router.get('/equipment/:id', protect, getEquipmentRepairHistory);
router.get('/:id', protect, getRepairById);

// Report malfunction (Lecturer, Technician when doing inventory, FM, Admin) (UC-5.1)
router.post('/', protect, requirePermission('incident:create', USER_ROLES.LECTURER, USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createRepairReport);

// Assign repair task & replacement equipment (Facility Manager only) (UC-5.3)
router.put('/:id/assign', protect, requirePermission('repair:assign', USER_ROLES.FACILITY_MANAGER), assignRepairTask);

// Accept repair task (Technician only) (UC-5.4)
router.put('/:id/accept', protect, requirePermission('repair:accept', USER_ROLES.TECHNICIAN), acceptRepairTask);

// Update progress log & parts replacement (Technician only) (UC-5.5)
router.post('/:id/logs', protect, requirePermission('repair:log', USER_ROLES.TECHNICIAN), addRepairLog);
router.put('/:id/progress', protect, requirePermission('repair:log', USER_ROLES.TECHNICIAN), addRepairLog);

// Report repair outcome & resolve ticket (Technician only) (UC-5.6)
router.put('/:id/outcome', protect, requirePermission('repair:report_outcome', USER_ROLES.TECHNICIAN), reportRepairOutcome);
router.put('/:id/resolve', protect, requirePermission('repair:report_outcome', USER_ROLES.TECHNICIAN), reportRepairOutcome);

// Close repair ticket & assign post-repair location (Facility Manager only)
router.put('/:id/close', protect, requirePermission('repair:close', USER_ROLES.FACILITY_MANAGER), closeRepairTicket);

// Evaluate repair quality (Lecturer only)
router.post('/:id/evaluate', protect, requirePermission('repair:rate', USER_ROLES.LECTURER), evaluateRepairQuality);

export default router;

