import express from 'express';
import { 
  getEquipments, 
  getEquipmentByQR, 
  createEquipment,
  requestBorrowEquipment 
} from '../controllers/equipmentController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/', getEquipments);
router.get('/qr/:qrCode', getEquipmentByQR);
router.post('/', protect, requireRole(USER_ROLES.FACILITY_STAFF, USER_ROLES.ADMIN), createEquipment);
router.post('/borrow', protect, requestBorrowEquipment);

export default router;

