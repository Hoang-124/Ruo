import express from 'express';
import { 
  getSessions, 
  createSession, 
  getSessionById, 
  scanEquipmentInRoom, 
  reconcileSession 
} from '../controllers/inventoryController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

router.route('/sessions')
  .get(getSessions)
  .post(requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), createSession);

router.route('/sessions/:id')
  .get(getSessionById);

router.post('/sessions/:id/scan', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), scanEquipmentInRoom);
router.put('/sessions/:id/reconcile', requireRole(USER_ROLES.MANAGER, USER_ROLES.ADMIN), reconcileSession);

export default router;
