import express from 'express';
import {
  getRepairs,
  getRepairById,
  createRepairReport,
  assignRepairTask,
  acceptRepairTask,
  addRepairLog,
  reportRepairOutcome,
  closeRepairTicket,
  evaluateRepairQuality
} from '../controllers/repairController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Read repairs
router.get('/', protect, getRepairs);
router.get('/:id', protect, getRepairById);

// Report malfunction (Lecturer, Technician when doing inventory, FM, Admin)
router.post('/', protect, requireRole(USER_ROLES.LECTURER, USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createRepairReport);

// Assign repair task & replacement equipment (Facility Manager only)
router.put('/:id/assign', protect, requireRole(USER_ROLES.FACILITY_MANAGER), assignRepairTask);

// Accept repair task (Technician only)
router.put('/:id/accept', protect, requireRole(USER_ROLES.TECHNICIAN), acceptRepairTask);

// Update progress log (Technician only)
router.post('/:id/logs', protect, requireRole(USER_ROLES.TECHNICIAN), addRepairLog);

// Report repair outcome (Technician only)
router.put('/:id/outcome', protect, requireRole(USER_ROLES.TECHNICIAN), reportRepairOutcome);
router.put('/:id/resolve', protect, requireRole(USER_ROLES.TECHNICIAN), reportRepairOutcome);

// Close repair ticket & assign post-repair location (Facility Manager only)
router.put('/:id/close', protect, requireRole(USER_ROLES.FACILITY_MANAGER), closeRepairTicket);

// Evaluate repair quality (Lecturer only)
router.post('/:id/evaluate', protect, requireRole(USER_ROLES.LECTURER), evaluateRepairQuality);

export default router;
