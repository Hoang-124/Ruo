import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  interpolateTemplate,
  getNotificationTemplates,
  updateNotificationTemplate,
  resetNotificationTemplate
} from '../src/controllers/adminConfigController.js';
import { NotificationTemplate } from '../src/models/NotificationTemplate.js';

describe('Admin Notification & Email Template Editor (UC-9.2 / UC-9.3)', () => {
  test('interpolateTemplate replaces {{placeholders}} with given dictionary values', () => {
    const raw = 'Phiếu #{{ticket_code}} cho thiết bị {{equipment_name}} tại phòng {{room_code}}';
    const result = interpolateTemplate(raw, {
      ticket_code: 'TK-2026-999',
      equipment_name: 'Máy Chiếu Panasonic',
      room_code: 'P501'
    });

    assert.strictEqual(
      result,
      'Phiếu #TK-2026-999 cho thiết bị Máy Chiếu Panasonic tại phòng P501'
    );
  });

  test('interpolateTemplate preserves unprovided placeholders gracefully', () => {
    const raw = 'Phiếu #{{ticket_code}} - Ưu tiên: {{priority}}';
    const result = interpolateTemplate(raw, { ticket_code: 'TK-123' });
    assert.strictEqual(result, 'Phiếu #TK-123 - Ưu tiên: {{priority}}');
  });

  test('getNotificationTemplates returns default presets when no custom records exist', async () => {
    const origFind = NotificationTemplate.find;
    try {
      NotificationTemplate.find = () => ({
        lean: async () => []
      });

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await getNotificationTemplates({}, res);

      assert.strictEqual(jsonRes.success, true);
      assert.ok(jsonRes.total >= 4);
      assert.ok(jsonRes.templates.some((t) => t.key === 'repair_assigned'));
      assert.ok(jsonRes.templates.some((t) => t.key === 'approval_request'));
      assert.ok(jsonRes.templates.some((t) => t.key === 'deadline_overdue'));
      assert.ok(jsonRes.templates.some((t) => t.key === 'password_reset'));
    } finally {
      NotificationTemplate.find = origFind;
    }
  });

  test('updateNotificationTemplate validates required fields and saves customization', async () => {
    const origFindOneAndUpdate = NotificationTemplate.findOneAndUpdate;
    try {
      NotificationTemplate.findOneAndUpdate = async (filter, update) => {
        assert.strictEqual(filter.key, 'repair_assigned');
        assert.strictEqual(update.is_customized, true);
        return {
          key: 'repair_assigned',
          subject: update.subject,
          title: update.title,
          body: update.body,
          badge_text: update.badge_text,
          badge_color: update.badge_color,
          badge_bg: update.badge_bg,
          is_customized: true,
          updated_at: new Date()
        };
      };

      const req = {
        body: {
          key: 'repair_assigned',
          subject: '[ĐẠI HỌC RUO] Nhiệm vụ sửa khẩn cấp #{{ticket_code}}',
          title: 'Phân công sửa chữa ưu tiên',
          body: 'Yêu cầu đồng chí kỹ thuật viên kiểm tra ngay máy #{{ticket_code}}.',
          badge_text: 'KHẨN CẤP'
        }
      };

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await updateNotificationTemplate(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.ok(jsonRes.template.is_customized);
      assert.strictEqual(jsonRes.template.badge_text, 'KHẨN CẤP');
      assert.strictEqual(jsonRes.template.subject, '[ĐẠI HỌC RUO] Nhiệm vụ sửa khẩn cấp #{{ticket_code}}');
    } finally {
      NotificationTemplate.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  test('updateNotificationTemplate rejects unknown template key', async () => {
    const req = {
      body: {
        key: 'invalid_non_existent_key',
        subject: 'test',
        title: 'test',
        body: 'test'
      }
    };

    let status = 200;
    let jsonRes = null;
    const res = {
      status: (s) => { status = s; return res; },
      json: (d) => { jsonRes = d; }
    };

    await updateNotificationTemplate(req, res);

    assert.strictEqual(status, 400);
    assert.strictEqual(jsonRes.success, false);
    assert.ok(jsonRes.message.includes('không hợp lệ'));
  });

  test('resetNotificationTemplate deletes custom record and restores default', async () => {
    const origDeleteOne = NotificationTemplate.deleteOne;
    try {
      NotificationTemplate.deleteOne = async (filter) => {
        assert.strictEqual(filter.key, 'deadline_overdue');
        return { deletedCount: 1 };
      };

      const req = { body: { key: 'deadline_overdue' } };
      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await resetNotificationTemplate(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.template.is_customized, false);
      assert.ok(jsonRes.message.includes('khôi phục'));
    } finally {
      NotificationTemplate.deleteOne = origDeleteOne;
    }
  });
});
