import express from 'express';
import { 
  getSessions, 
  createSession, 
  getSessionById, 
  scanEquipmentInRoom, 
  reconcileSession 
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/sessions')
  .get(getSessions)
  .post(authorize('admin', 'maintenance_staff'), createSession);

router.route('/sessions/:id')
  .get(getSessionById);

router.post('/sessions/:id/scan', authorize('admin', 'maintenance_staff'), scanEquipmentInRoom);
router.put('/sessions/:id/reconcile', authorize('admin', 'maintenance_staff'), reconcileSession);

export default router;
