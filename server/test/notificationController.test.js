import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  categorizeNotificationType,
  NOTIFICATION_CATEGORIES,
  getUserNotifications,
  getUnreadBadgeCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from '../src/controllers/notificationController.js';
import { Notification } from '../src/models/Notification.js';

describe('notificationController (UC-9.1 - Notification Center & Real-time Badge)', () => {
  test('categorizeNotificationType properly maps UC types into 3 main groups', () => {
    // 1. Ca sửa mới & sự cố (Repairs)
    assert.strictEqual(categorizeNotificationType('repair_assigned'), NOTIFICATION_CATEGORIES.REPAIRS);
    assert.strictEqual(categorizeNotificationType('repair_resolved'), NOTIFICATION_CATEGORIES.REPAIRS);
    assert.strictEqual(categorizeNotificationType('incident_reported'), NOTIFICATION_CATEGORIES.REPAIRS);

    // 2. Duyệt phiếu (Approvals)
    assert.strictEqual(categorizeNotificationType('movement_ordered'), NOTIFICATION_CATEGORIES.APPROVALS);
    assert.strictEqual(categorizeNotificationType('parts_request'), NOTIFICATION_CATEGORIES.APPROVALS);
    assert.strictEqual(categorizeNotificationType('disposal_request'), NOTIFICATION_CATEGORIES.APPROVALS);

    // 3. Cảnh báo deadline & SLA (Deadlines)
    assert.strictEqual(categorizeNotificationType('deadline_overdue'), NOTIFICATION_CATEGORIES.DEADLINES);
    assert.strictEqual(categorizeNotificationType('warranty_expiring'), NOTIFICATION_CATEGORIES.DEADLINES);

    // 4. Default fallback
    assert.strictEqual(categorizeNotificationType('unknown_type'), NOTIFICATION_CATEGORIES.GENERAL);
  });

  test('getUserNotifications returns categorized notifications and unread badge counters', async () => {
    const mockUserId = 'user_uyen_001';
    const fakeData = [
      {
        _id: 'notif_1',
        user_id: mockUserId,
        type: 'repair_assigned',
        title: 'Ca sửa mới: Điều hòa P102',
        message: 'Bạn được phân công sửa điều hòa',
        is_read: false
      },
      {
        _id: 'notif_2',
        user_id: mockUserId,
        type: 'movement_ordered',
        title: 'Duyệt phiếu điều chuyển máy chiếu',
        message: 'Phòng P201 sang P302',
        is_read: false
      },
      {
        _id: 'notif_3',
        user_id: mockUserId,
        type: 'deadline_overdue',
        title: 'Cảnh báo deadline SLA',
        message: 'Phiếu sửa đã quá hạn',
        is_read: true
      }
    ];

    // Mock Notification queries
    const origFind = Notification.find;
    const origCount = Notification.countDocuments;

    try {
      Notification.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => fakeData
            })
          })
        })
      });

      Notification.countDocuments = async (query) => {
        if (query.is_read === false && !query.type) return 2; // unreadCount
        if (query.type && Array.isArray(query.type.$in)) {
          if (query.type.$in.includes('repair_assigned')) return 1;
          if (query.type.$in.includes('movement_ordered')) return 1;
          if (query.type.$in.includes('deadline_overdue')) return 0;
        }
        return fakeData.length;
      };

      const req = {
        user: { _id: mockUserId },
        query: { category: 'all' }
      };

      let jsonOutput = null;
      const res = {
        json: (data) => {
          jsonOutput = data;
        }
      };

      await getUserNotifications(req, res);

      assert.ok(jsonOutput, 'Response must return json');
      assert.strictEqual(jsonOutput.success, true);
      assert.strictEqual(jsonOutput.unreadCount, 2, 'Total unread should be 2');
      assert.strictEqual(jsonOutput.categoryCounts.repairs, 1, 'Repairs unread count should be 1');
      assert.strictEqual(jsonOutput.categoryCounts.approvals, 1, 'Approvals unread count should be 1');
      assert.strictEqual(jsonOutput.categoryCounts.deadlines, 0, 'Deadlines unread count should be 0');
      assert.strictEqual(jsonOutput.notifications.length, 3);
      assert.strictEqual(jsonOutput.notifications[0].category, 'repairs');
      assert.strictEqual(jsonOutput.notifications[1].category, 'approvals');
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCount;
    }
  });

  test('getUnreadBadgeCount responds quickly with category counts for real-time badge', async () => {
    const origCount = Notification.countDocuments;
    try {
      Notification.countDocuments = async (query) => {
        if (!query.type) return 5;
        if (query.type.$in.includes('repair_assigned')) return 2;
        if (query.type.$in.includes('movement_ordered')) return 2;
        if (query.type.$in.includes('deadline_overdue')) return 1;
        return 0;
      };

      const req = { user: { _id: 'u123' } };
      let result = null;
      const res = { json: (data) => { result = data; } };

      await getUnreadBadgeCount(req, res);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.unreadCount, 5);
      assert.strictEqual(result.categoryCounts.repairs, 2);
      assert.strictEqual(result.categoryCounts.approvals, 2);
      assert.strictEqual(result.categoryCounts.deadlines, 1);
    } finally {
      Notification.countDocuments = origCount;
    }
  });

  test('markNotificationRead updates single notification and returns new unreadCount', async () => {
    const origFindOneAndUpdate = Notification.findOneAndUpdate;
    const origCount = Notification.countDocuments;

    try {
      Notification.findOneAndUpdate = async () => ({
        _id: 'n_01',
        user_id: 'u_01',
        title: 'Nhiệm vụ',
        type: 'repair_assigned',
        is_read: true,
        toObject: () => ({ _id: 'n_01', type: 'repair_assigned', is_read: true })
      });
      Notification.countDocuments = async () => 1;

      const req = { user: { _id: 'u_01' }, params: { id: 'n_01' } };
      let result = null;
      const res = { json: (data) => { result = data; } };

      await markNotificationRead(req, res);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.unreadCount, 1);
      assert.strictEqual(result.notification.isRead, true);
      assert.strictEqual(result.notification.category, 'repairs');
    } finally {
      Notification.findOneAndUpdate = origFindOneAndUpdate;
      Notification.countDocuments = origCount;
    }
  });

  test('markAllNotificationsRead updates all unread notifications', async () => {
    const origUpdateMany = Notification.updateMany;
    try {
      Notification.updateMany = async () => ({ modifiedCount: 4 });

      const req = { user: { _id: 'u_01' } };
      let result = null;
      const res = { json: (data) => { result = data; } };

      await markAllNotificationsRead(req, res);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.unreadCount, 0);
      assert.strictEqual(result.modifiedCount, 4);
    } finally {
      Notification.updateMany = origUpdateMany;
    }
  });

  test('deleteNotification deletes target item and returns updated unreadCount', async () => {
    const origFindOneAndDelete = Notification.findOneAndDelete;
    const origCount = Notification.countDocuments;
    try {
      Notification.findOneAndDelete = async () => ({ _id: 'n_02' });
      Notification.countDocuments = async () => 0;

      const req = { user: { _id: 'u_01' }, params: { id: 'n_02' } };
      let result = null;
      const res = { json: (data) => { result = data; } };

      await deleteNotification(req, res);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.unreadCount, 0);
    } finally {
      Notification.findOneAndDelete = origFindOneAndDelete;
      Notification.countDocuments = origCount;
    }
  });
});
