import express from 'express';
import {
  getBuildings,
  getCadCanvasRooms,
  getRooms,
  getRoomByCode,
  createRoom,
  updateRoom,
  deactivateRoom,
  updateRoomStatus
} from '../controllers/facilityController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ── Public / All authenticated users ─────────────────────────────────
router.get('/buildings', getBuildings);
router.get('/cad-canvas', getCadCanvasRooms);

// ── UC-3.2: Room List View (authenticated users can browse) ──────────
router.get('/rooms', protect, getRooms);

// ── UC-3.3: Room Detail View ─────────────────────────────────────────
router.get('/rooms/:code', protect, getRoomByCode);

// ── UC-3.1: Create Room (Facility Staff / Admin only) ────────────────
router.post('/rooms', protect, requireRole('facility_staff', 'admin'), createRoom);

// ── UC-3.4: Update Room Info (Facility Staff / Admin only) ───────────
router.put('/rooms/:id', protect, requireRole('facility_staff', 'admin'), updateRoom);

// ── UC-3.5: Deactivate Room (Facility Staff / Admin only) ────────────
router.put('/rooms/:id/deactivate', protect, requireRole('facility_staff', 'admin'), deactivateRoom);

// ── UC-3.6: Update Room Status (Facility Staff / Admin only) ─────────
router.put('/rooms/:id/status', protect, requireRole('facility_staff', 'admin'), updateRoomStatus);

export default router;
