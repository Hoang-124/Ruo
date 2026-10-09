import express from 'express';
import { 
  getBuildings, 
  getAllRooms,
  createRoom,
  updateRoom,
  getCadCanvasRooms, 
  getRoomByCode,
  getRoomShortage,
  getWarehouseStock
} from '../controllers/facilityController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/buildings', getBuildings);
router.get('/cad-canvas', getCadCanvasRooms);
router.get('/warehouse/stock', protect, getWarehouseStock);

router.get('/rooms', protect, getAllRooms);
router.post('/rooms', protect, requireRole(USER_ROLES.ADMIN), createRoom);
router.put('/rooms/:id', protect, requireRole(USER_ROLES.ADMIN), updateRoom);
router.get('/rooms/:code', protect, getRoomByCode);
router.get('/rooms/:id/shortage', protect, getRoomShortage);

export default router;
