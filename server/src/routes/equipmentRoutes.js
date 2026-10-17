import express from 'express';
import {
  getEquipments,
  getEquipmentById,
  getEquipmentLifecycle,
  getEquipmentByQR,
  getEquipmentCategories,
  createEquipment,
  updateEquipment,
  validateBatchImport,
  importEquipmentsBatch,
  disposeEquipment,
  updateWarrantyInfo,
  deleteEquipment
} from '../controllers/equipmentController.js';
import { protect, requireRole, requirePermission } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Directory, QR lookup & Lifecycle (UC-3.2, UC-3.3, UC-3.5, QR Lookup)
router.get('/', getEquipments);
router.get('/categories', getEquipmentCategories);
router.get('/qr/:qrCode', getEquipmentByQR);
router.get('/code/:qrCode', getEquipmentByQR);
router.get('/:id/lifecycle', getEquipmentLifecycle);
router.get('/:id', getEquipmentById);

// Batch Import & Row-level Validation (UC-3.6 & UC-3.7: Manager, Admin)
router.post('/import/validate', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), validateBatchImport);
router.post('/import', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), importEquipmentsBatch);

// Register equipment (UC-3.1 & UC-12.1 Dynamic RBAC: Manager, Technician, Admin)
router.post(
  '/',
  protect,
  requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN),
  requirePermission('equipment:create', USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN),
  createEquipment
);

// Asset Disposal / Retirement (UC-3.8: Manager, Admin)
router.put('/:id/dispose', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), disposeEquipment);
router.post('/:id/dispose', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), disposeEquipment);

// Update equipment info & auto movement tracking (UC-3.4: Manager, Technician, Admin)
router.put('/:id', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN), updateEquipment);
router.delete('/:id', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN), deleteEquipment);

// Update warranty info (Facility Manager, Technician, Admin)
router.patch('/:id/warranty', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN), updateWarrantyInfo);
router.put('/:id/warranty', protect, requireRole(USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN), updateWarrantyInfo);

export default router;
