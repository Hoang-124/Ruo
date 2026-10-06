import express from 'express';
import { 
  getRepairs, 
  getRepairById, 
  createRepairReport, 
  assignRepairTask, 
  addRepairLog, 
  resolveRepair, 
  closeRepair 
} from '../controllers/repairController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

router.get('/', getRepairs);
router.get('/:id', getRepairById);

// Staff or Manager can report equipment malfunction
router.post('/', requireRole(USER_ROLES.STAFF, USER_ROLES.MANAGER, USER_ROLES.ADMIN), createRepairReport);

// Manager assigns task to staff/external unit
router.put('/:id/assign', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), assignRepairTask);

// Staff logs progress and material costs
router.post('/:id/logs', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), addRepairLog);

// Staff resolves technical repair
router.put('/:id/resolve', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), resolveRepair);

// Manager reviews and signs off / closes ticket
router.put('/:id/close', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), closeRepair);

export default router;
