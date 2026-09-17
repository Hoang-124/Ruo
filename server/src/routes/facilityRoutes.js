import express from 'express';
import { getBuildings, getCadCanvasRooms, getRoomByCode } from '../controllers/facilityController.js';

const router = express.Router();

router.get('/buildings', getBuildings);
router.get('/cad-canvas', getCadCanvasRooms);
router.get('/rooms/:code', getRoomByCode);

export default router;
