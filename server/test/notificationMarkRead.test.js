import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  markNotificationsRead,
  markNotificationRead,
  markAllNotificationsRead,
  calculateCategoryCounts
} from '../src/controllers/notificationController.js';
import { Notification } from '../src/models/Notification.js';

describe('UC-9.2 Mark Read & Notification State Synchronization', () => {
  const mockUserId = 'user_mark_read_01';

  test('markNotificationsRead with single id updates notification state and returns live unread count', async () => {
    const origFindOneAndUpdate = Notification.findOneAndUpdate;
    const origCount = Notification.countDocuments;

    try {
      Notification.findOneAndUpdate = async (filter, update) => {
        assert.strictEqual(filter._id, 'notif_abc');
        assert.strictEqual(filter.user_id, mockUserId);
        assert.strictEqual(update.is_read, true);
        return {
          _id: 'notif_abc',
          user_id: mockUserId,
          type: 'repair_assigned',
          title: 'Ca sửa điều hòa P102',
          is_read: true,
          toObject: () => ({ _id: 'notif_abc', type: 'repair_assigned', is_read: true })
        };
      };

      Notification.countDocuments = async (query) => {
        if (query.is_read === false && !query.type) return 1; // 1 unread left
        if (query.type) return 0;
        return 5;
      };

      const req = {
        user: { _id: mockUserId },
        body: { id: 'notif_abc' }
      };

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await markNotificationsRead(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.modifiedCount, 1);
      assert.strictEqual(jsonRes.unreadCount, 1);
      assert.strictEqual(jsonRes.notification.isRead, true);
      assert.strictEqual(jsonRes.notification.category, 'repairs');
      assert.ok(jsonRes.categoryCounts, 'Must return categoryCounts');
    } finally {
      Notification.findOneAndUpdate = origFindOneAndUpdate;
      Notification.countDocuments = origCount;
    }
  });

  test('markNotificationsRead with batch ids array updates multiple notifications', async () => {
    const origUpdateMany = Notification.updateMany;
    const origCount = Notification.countDocuments;

    try {
      Notification.updateMany = async (filter, update) => {
        assert.deepStrictEqual(filter._id.$in, ['notif_1', 'notif_2']);
        assert.strictEqual(filter.user_id, mockUserId);
        assert.strictEqual(update.is_read, true);
        return { modifiedCount: 2 };
      };

      Notification.countDocuments = async (query) => {
        if (query.is_read === false && !query.type) return 0; // all cleared
        return 0;
      };

      const req = {
        user: { _id: mockUserId },
        body: { ids: ['notif_1', 'notif_2'] }
      };

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await markNotificationsRead(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.modifiedCount, 2);
      assert.strictEqual(jsonRes.unreadCount, 0);
      assert.strictEqual(jsonRes.categoryCounts.all, 0);
    } finally {
      Notification.updateMany = origUpdateMany;
      Notification.countDocuments = origCount;
    }
  });

  test('markNotificationsRead with empty body marks all notifications as read and clears navigation badge', async () => {
    const origUpdateMany = Notification.updateMany;

    try {
      Notification.updateMany = async (filter, update) => {
        assert.strictEqual(filter.user_id, mockUserId);
        assert.strictEqual(filter.is_read, false);
        assert.strictEqual(update.is_read, true);
        return { modifiedCount: 5 };
      };

      const req = {
        user: { _id: mockUserId },
        body: {} // empty body -> mark all
      };

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await markNotificationsRead(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.modifiedCount, 5);
      assert.strictEqual(jsonRes.unreadCount, 0, 'Unread count must be 0 to clear red badge');
      assert.strictEqual(jsonRes.categoryCounts.all, 0);
      assert.strictEqual(jsonRes.categoryCounts.repairs, 0);
      assert.strictEqual(jsonRes.categoryCounts.approvals, 0);
      assert.strictEqual(jsonRes.categoryCounts.deadlines, 0);
      assert.ok(jsonRes.message.includes('xóa chấm đỏ'));
    } finally {
      Notification.updateMany = origUpdateMany;
    }
  });
});
