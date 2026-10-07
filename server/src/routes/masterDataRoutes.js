import express from 'express';
import {
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getRepairUnits,
  createRepairUnit
} from '../controllers/masterDataController.js';
import {
  getAllRooms,
  createRoom,
  getRoomShortage,
  getWarehouseStock
} from '../controllers/facilityController.js';
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

// Rooms & Space (Module 02)
router.get('/rooms', getAllRooms);
router.post('/rooms', protect, requireRole(USER_ROLES.ADMIN), createRoom);
router.get('/rooms/:id/shortage', protect, getRoomShortage);
router.get('/warehouse/stock', protect, getWarehouseStock);

export default router;
