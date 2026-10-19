import { Notification } from '../models/Notification.js';
import { NOTIFICATION_TYPES } from '../config/constants.js';
import {
  sendNewRepairAssignedEmail,
  sendApprovalRequestEmail,
  sendDeadlineWarningEmail,
  sendEmail
} from '../services/emailService.js';

// Map notification types to high-level categories for UC-9.1 Notification Drawer
export const NOTIFICATION_CATEGORIES = {
  REPAIRS: 'repairs',
  APPROVALS: 'approvals',
  DEADLINES: 'deadlines',
  GENERAL: 'general'
};

export const categorizeNotificationType = (type) => {
  switch (type) {
    case 'repair_assigned':
    case 'repair_resolved':
    case 'repair_unrepairable':
    case 'replacement_needed':
    case 'incident_reported':
    case NOTIFICATION_TYPES.INCIDENT_REPORTED:
    case NOTIFICATION_TYPES.REPAIR_ASSIGNED:
    case NOTIFICATION_TYPES.REPAIR_RESOLVED:
    case NOTIFICATION_TYPES.REPAIR_UNREPAIRABLE:
    case NOTIFICATION_TYPES.REPLACEMENT_NEEDED:
      return NOTIFICATION_CATEGORIES.REPAIRS;

    case 'movement_ordered':
    case 'parts_request':
    case 'disposal_request':
    case 'role_approval_request':
    case NOTIFICATION_TYPES.MOVEMENT_ORDERED:
    case NOTIFICATION_TYPES.PARTS_REQUEST:
    case NOTIFICATION_TYPES.DISPOSAL_REQUEST:
    case NOTIFICATION_TYPES.ROLE_APPROVAL_REQUEST:
      return NOTIFICATION_CATEGORIES.APPROVALS;

    case 'deadline_overdue':
    case 'warranty_expiring':
    case NOTIFICATION_TYPES.DEADLINE_OVERDUE:
    case NOTIFICATION_TYPES.WARRANTY_EXPIRING:
      return NOTIFICATION_CATEGORIES.DEADLINES;

    default:
      return NOTIFICATION_CATEGORIES.GENERAL;
  }
};

const getCategoryTypeQuery = (category) => {
  if (category === NOTIFICATION_CATEGORIES.REPAIRS) {
    return [
      'repair_assigned',
      'repair_resolved',
      'repair_unrepairable',
      'replacement_needed',
      'incident_reported',
      NOTIFICATION_TYPES.INCIDENT_REPORTED,
      NOTIFICATION_TYPES.REPAIR_ASSIGNED,
      NOTIFICATION_TYPES.REPAIR_RESOLVED,
      NOTIFICATION_TYPES.REPAIR_UNREPAIRABLE,
      NOTIFICATION_TYPES.REPLACEMENT_NEEDED
    ];
  }
  if (category === NOTIFICATION_CATEGORIES.APPROVALS) {
    return [
      'movement_ordered',
      'parts_request',
      'disposal_request',
      'role_approval_request',
      NOTIFICATION_TYPES.MOVEMENT_ORDERED,
      NOTIFICATION_TYPES.PARTS_REQUEST,
      NOTIFICATION_TYPES.DISPOSAL_REQUEST,
      NOTIFICATION_TYPES.ROLE_APPROVAL_REQUEST
    ];
  }
  if (category === NOTIFICATION_CATEGORIES.DEADLINES) {
    return [
      'deadline_overdue',
      'warranty_expiring',
      NOTIFICATION_TYPES.DEADLINE_OVERDUE,
      NOTIFICATION_TYPES.WARRANTY_EXPIRING
    ];
  }
  return null;
};

// @desc    Get user notifications with drawer category filtering (UC-9.1)
// @route   GET /api/notifications
export const getUserNotifications = async (req, res) => {
  try {
    const { category, unreadOnly, page = 1, limit = 50 } = req.query;
    const filter = { user_id: req.user._id };

    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.is_read = false;
    }

    if (category && category !== 'all') {
      const allowedTypes = getCategoryTypeQuery(category);
      if (allowedTypes) {
        filter.type = { $in: allowedTypes };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [rawNotifications, total, unreadCount, repairCount, approvalCount, deadlineCount] = await Promise.all([
      Notification.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user_id: req.user._id, is_read: false }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.REPAIRS) }
      }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.APPROVALS) }
      }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.DEADLINES) }
      })
    ]);

    // Attach categorized metadata for frontend drawer presentation
    const notifications = rawNotifications.map((n) => {
      const itemCategory = categorizeNotificationType(n.type);
      return {
        ...n,
        id: n._id.toString(),
        category: itemCategory,
        isRead: n.is_read
      };
    });

    res.json({
      success: true,
      unreadCount,
      categoryCounts: {
        all: unreadCount,
        repairs: repairCount,
        approvals: approvalCount,
        deadlines: deadlineCount
      },
      page: pageNum,
      limit: limitNum,
      total,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Fast real-time unread badge counter for header badge polling (UC-9.1)
// @route   GET /api/notifications/unread-count
export const getUnreadBadgeCount = async (req, res) => {
  try {
    const [unreadCount, repairCount, approvalCount, deadlineCount] = await Promise.all([
      Notification.countDocuments({ user_id: req.user._id, is_read: false }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.REPAIRS) }
      }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.APPROVALS) }
      }),
      Notification.countDocuments({
        user_id: req.user._id,
        is_read: false,
        type: { $in: getCategoryTypeQuery(NOTIFICATION_CATEGORIES.DEADLINES) }
      })
    ]);

    res.json({
      success: true,
      unreadCount,
      categoryCounts: {
        all: unreadCount,
        repairs: repairCount,
        approvals: approvalCount,
        deadlines: deadlineCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark single notification as read (UC-9.2)
// @route   PATCH /api/notifications/:id/read or PUT /api/notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại hoặc không thuộc quyền sở hữu.' });
    }

    const unreadCount = await Notification.countDocuments({ user_id: req.user._id, is_read: false });

    res.json({
      success: true,
      unreadCount,
      notification: {
        ...notification.toObject(),
        id: notification._id.toString(),
        category: categorizeNotificationType(notification.type),
        isRead: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read (UC-9.2)
// @route   PATCH /api/notifications/read-all or PUT /api/notifications/read-all
export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount || 0,
      unreadCount: 0,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single notification from drawer
// @route   DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo để xóa.' });
    }

    const unreadCount = await Notification.countDocuments({ user_id: req.user._id, is_read: false });

    res.json({
      success: true,
      unreadCount,
      message: 'Đã xóa thông báo thành công.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed / Generate demo notifications for testing & presentation (UC-9.1 Demo Helper)
// @route   POST /api/notifications/seed-demo
export const seedDemoNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = Date.now();

    const sampleData = [
      {
        user_id: userId,
        type: NOTIFICATION_TYPES.REPAIR_ASSIGNED,
        title: 'Ca sửa mới: Máy chiếu Sony VPL-EX570',
        message: 'Bạn được phân công xử lý sự cố bóng đèn mờ tại phòng P302. Hạn chót: 17:00 ngày mai.',
        reference_type: 'repair',
        is_read: false
      },
      {
        user_id: userId,
        type: NOTIFICATION_TYPES.MOVEMENT_ORDERED,
        title: 'Duyệt phiếu: Điều chuyển 02 Máy tính All-in-One',
        message: 'Yêu cầu điều chuyển thiết bị từ Kho Thiết Bị A1 sang Phòng Lab 401 đang chờ bạn xét duyệt.',
        reference_type: 'equipment_movement',
        is_read: false
      },
      {
        user_id: userId,
        type: NOTIFICATION_TYPES.DEADLINE_OVERDUE,
        title: 'Cảnh báo deadline: Phiếu sửa #TK-2026-042',
        message: 'Nhiệm vụ sửa điều hòa phòng P104 đã vượt quá hạn cam kết SLA 2 tiếng. Cần xử lý khẩn cấp.',
        reference_type: 'repair',
        is_read: false
      }
    ];

    const created = await Notification.insertMany(sampleData);

    // Also trigger email service test dispatch if user has email
    if (req.user.email) {
      sendNewRepairAssignedEmail({
        to: req.user.email,
        technicianName: req.user.full_name || 'Kỹ thuật viên',
        ticketCode: `TK-DEMO-${now.toString().slice(-4)}`,
        equipmentCode: 'EQ-PRJ-302',
        equipmentName: 'Máy chiếu Sony VPL-EX570',
        roomCode: 'P302',
        priority: 'Khẩn Cấp',
        deadline: '17:00 ngày mai'
      }).catch((err) => console.warn('[Seed Demo Email Error]:', err.message));
    }

    const unreadCount = await Notification.countDocuments({ user_id: userId, is_read: false });

    res.status(201).json({
      success: true,
      message: 'Đã tạo 3 thông báo mẫu (Ca sửa mới, Duyệt phiếu, Cảnh báo deadline).',
      unreadCount,
      notifications: created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
