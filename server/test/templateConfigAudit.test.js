import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  updateNotificationTemplate,
  resetNotificationTemplate
} from '../src/controllers/adminConfigController.js';
import { NotificationTemplate } from '../src/models/NotificationTemplate.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('UC-9.4 Template Config API & Audit Log Verification', () => {
  test('updateNotificationTemplate saves template and logs audit action with detected placeholders', async () => {
    const origFindOne = NotificationTemplate.findOne;
    const origFindOneAndUpdate = NotificationTemplate.findOneAndUpdate;
    const origLogAction = AuditLog.logAction;

    let auditRecord = null;

    try {
      NotificationTemplate.findOne = () => ({
        lean: async () => ({
          key: 'repair_assigned',
          subject: 'Old subject',
          title: 'Old title',
          body: 'Old body',
          badge_text: 'OLD'
        })
      });

      NotificationTemplate.findOneAndUpdate = async (filter, update) => ({
        key: filter.key,
        name: update.name,
        category: update.category,
        subject: update.subject,
        title: update.title,
        body: update.body,
        badge_text: update.badge_text,
        badge_color: update.badge_color,
        badge_bg: update.badge_bg,
        is_customized: true,
        updated_at: new Date()
      });

      AuditLog.logAction = async (payload) => {
        auditRecord = payload;
        return { success: true };
      };

      const req = {
        body: {
          key: 'repair_assigned',
          subject: '[RUO UFMS] Phân công ca trực cho {{userName}} — Phiếu #{{ticketCode}}',
          title: 'Ca sửa chữa mới được giao',
          body: 'Kính gửi {{userName}}, bạn được giao xử lý thiết bị {{equipmentName}} ({{equipmentCode}}) tại {{roomCode}}. Hạn chót: {{deadline}}.',
          badge_text: 'KHẨN CẤP'
        },
        user: {
          _id: 'admin_test_01',
          full_name: 'Lê Thị Uyên',
          code: 'AD-2026-01'
        },
        ip: '127.0.0.1'
      };

      let jsonRes = null;
      let statusCode = 200;
      const res = {
        status: (s) => {
          statusCode = s;
          return { json: (d) => { jsonRes = d; } };
        },
        json: (d) => { jsonRes = d; }
      };

      await updateNotificationTemplate(req, res);

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(jsonRes.success, true);
      assert.ok(jsonRes.message.includes('thành công'));
      assert.strictEqual(jsonRes.template.key, 'repair_assigned');
      assert.strictEqual(jsonRes.template.is_customized, true);

      // Verify detected placeholders in response
      assert.ok(Array.isArray(jsonRes.placeholders));
      assert.ok(jsonRes.placeholders.includes('userName'));
      assert.ok(jsonRes.placeholders.includes('equipmentName'));
      assert.ok(jsonRes.placeholders.includes('ticketCode'));

      // Verify live preview generation
      assert.ok(jsonRes.preview.body.includes('Lê Thị Uyên'));
      assert.ok(jsonRes.preview.body.includes('Máy Chiếu Sony'));

      // Verify cryptographic audit logging
      assert.ok(auditRecord, 'Must record audit log entry for template update');
      assert.strictEqual(auditRecord.action, 'TEMPLATE_UPDATE');
      assert.strictEqual(auditRecord.target_table, 'notification_templates');
      assert.strictEqual(auditRecord.entity_id, 'repair_assigned');
      assert.strictEqual(auditRecord.old_value.subject, 'Old subject');
      assert.ok(auditRecord.new_value.placeholders.includes('userName'));
      assert.ok(auditRecord.new_value.placeholders.includes('equipmentName'));
    } finally {
      NotificationTemplate.findOne = origFindOne;
      NotificationTemplate.findOneAndUpdate = origFindOneAndUpdate;
      AuditLog.logAction = origLogAction;
    }
  });

  test('resetNotificationTemplate deletes custom template and records TEMPLATE_RESET audit', async () => {
    const origFindOne = NotificationTemplate.findOne;
    const origDeleteOne = NotificationTemplate.deleteOne;
    const origLogAction = AuditLog.logAction;

    let resetAudit = null;

    try {
      NotificationTemplate.findOne = () => ({
        lean: async () => ({
          key: 'repair_assigned',
          subject: 'Custom subject',
          body: 'Custom body'
        })
      });

      NotificationTemplate.deleteOne = async () => ({ deletedCount: 1 });

      AuditLog.logAction = async (payload) => {
        resetAudit = payload;
        return { success: true };
      };

      const req = {
        body: { key: 'repair_assigned' },
        user: { _id: 'admin_test_01', full_name: 'Lê Thị Uyên', code: 'AD-01' },
        ip: '10.0.0.1'
      };

      let jsonRes = null;
      const res = {
        json: (d) => { jsonRes = d; }
      };

      await resetNotificationTemplate(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.template.is_customized, false);

      assert.ok(resetAudit, 'Must record reset audit');
      assert.strictEqual(resetAudit.action, 'TEMPLATE_RESET');
      assert.strictEqual(resetAudit.entity_id, 'repair_assigned');
    } finally {
      NotificationTemplate.findOne = origFindOne;
      NotificationTemplate.deleteOne = origDeleteOne;
      AuditLog.logAction = origLogAction;
    }
  });
});
