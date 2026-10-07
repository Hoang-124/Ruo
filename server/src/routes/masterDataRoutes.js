import express from 'express';
import {
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getRepairUnits,
  createRepairUnit
} from '../controllers/masterDataController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Categories
router.get('/categories', getCategories);
router.post('/categories', protect, requireRole(USER_ROLES.ADMIN), createCategory);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', protect, requireRole(USER_ROLES.ADMIN), createSupplier);

// Repair Units
router.get('/repair-units', getRepairUnits);
router.post('/repair-units', protect, requireRole(USER_ROLES.ADMIN), createRepairUnit);

export default router;
