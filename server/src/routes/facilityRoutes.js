import express from 'express';
import { 
  getBuildings, 
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getAllRooms,
  createRoom,
  getCadCanvasRooms, 
  getRoomByCode,
  getRoomShortage,
  getWarehouseStock
} from '../controllers/facilityController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

// Master Data: Buildings CRUD
router.get('/buildings', getBuildings);
router.post('/buildings', protect, requireRole(USER_ROLES.ADMIN), createBuilding);
router.put('/buildings/:id', protect, requireRole(USER_ROLES.ADMIN), updateBuilding);
router.delete('/buildings/:id', protect, requireRole(USER_ROLES.ADMIN), deleteBuilding);
router.get('/cad-canvas', getCadCanvasRooms);
router.get('/warehouse/stock', protect, getWarehouseStock);

router.get('/rooms', getAllRooms);
router.post('/rooms', protect, requireRole(USER_ROLES.ADMIN), createRoom);
router.get('/rooms/:code', getRoomByCode);
router.get('/rooms/:id/shortage', protect, getRoomShortage);

export default router;
