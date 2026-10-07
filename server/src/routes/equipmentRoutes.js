import express from 'express';
import {
  getEquipments,
  getEquipmentById,
  getEquipmentByQR,
  getEquipmentCategories,
  createEquipment,
  updateEquipment,
  updateWarrantyInfo
} from '../controllers/equipmentController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/', getEquipments);
router.get('/categories', getEquipmentCategories);
router.get('/qr/:qrCode', getEquipmentByQR);
router.get('/:id', getEquipmentById);

// Register equipment (Facility Manager, Admin)
router.post('/', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), createEquipment);

// Update equipment info (Facility Manager, Admin)
router.put('/:id', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), updateEquipment);

// Update warranty info (Facility Manager, Admin)
router.patch('/:id/warranty', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), updateWarrantyInfo);
router.put('/:id/warranty', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), updateWarrantyInfo);

export default router;
