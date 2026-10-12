import express from 'express';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getUserNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
