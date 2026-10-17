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
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
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

// Buildings (Master Data Spatial Navigation)
router.get('/buildings', getBuildings);
router.post('/buildings', protect, requireRole(USER_ROLES.ADMIN), createBuilding);
router.put('/buildings/:id', protect, requireRole(USER_ROLES.ADMIN), updateBuilding);
router.delete('/buildings/:id', protect, requireRole(USER_ROLES.ADMIN), deleteBuilding);

// Rooms & Space (Module 02)
router.get('/rooms', protect, getAllRooms);
router.post('/rooms', protect, requireRole(USER_ROLES.ADMIN), createRoom);
router.get('/rooms/:id/shortage', protect, getRoomShortage);
router.get('/warehouse/stock', protect, getWarehouseStock);

export default router;
