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
router.get('/unread-count', getUserNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.put('/read-all', markAllNotificationsRead);
router.put('/mark-all-read', markAllNotificationsRead);
router.patch('/mark-all-read', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.put('/:id/read', markNotificationRead);

export default router;
