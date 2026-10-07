import { Notification } from '../models/Notification.js';

// @desc    Get user notifications (UC: View notifications)
// @route   GET /api/notifications
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      user_id: req.user._id,
      is_read: false
    });

    res.json({
      success: true,
      unreadCount,
      total: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại.' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true }
    );

    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
