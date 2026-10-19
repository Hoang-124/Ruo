import express from 'express';
import {
  getUserNotifications,
  getUnreadBadgeCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  seedDemoNotifications
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// UC-9.1: Notification Center & Real-time badge
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadBadgeCount);
router.post('/seed-demo', seedDemoNotifications);

// UC-9.2: Mark notifications as read
router.patch('/read-all', markAllNotificationsRead);
router.put('/read-all', markAllNotificationsRead);
router.put('/mark-all-read', markAllNotificationsRead);
router.patch('/mark-all-read', markAllNotificationsRead);

router.patch('/:id/read', markNotificationRead);
router.put('/:id/read', markNotificationRead);

// UC-9.1: Dismiss / delete notification
router.delete('/:id', deleteNotification);

export default router;
