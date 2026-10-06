import express from 'express';
import { 
  getEquipments, 
  getEquipmentCategories,
  getEquipmentByQR,
  getEquipmentById,
  createEquipment 
} from '../controllers/equipmentController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Protected endpoints for equipment management
router.use(protect);

router.get('/', getEquipments);
router.get('/categories', getEquipmentCategories);
router.get('/qr/:qrCode', getEquipmentByQR);
router.get('/:id', getEquipmentById);
router.post('/', requireRole(USER_ROLES.STAFF, USER_ROLES.ADMIN), createEquipment);

export default router;
