import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  dispatchPasswordResetOtpEmail,
  dispatchTaskAssignmentEmail,
  dispatchDisposalNotificationEmail,
  getEmailQueue,
  clearEmailQueue
} from '../src/services/emailService.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('UC-9.3 Automated Email Dispatcher & Audit Log Trail', () => {
  beforeEach(() => {
    clearEmailQueue();
  });

  test('dispatchPasswordResetOtpEmail dispatches OTP email and invokes audit logging', async () => {
    let loggedAction = null;
    const origLogAction = AuditLog.logAction;

    try {
      AuditLog.logAction = async (payload) => {
        loggedAction = payload;
        return { success: true };
      };

      const result = await dispatchPasswordResetOtpEmail({
        to: 'gv.nguyen@ruo.edu.vn',
        otp: '654321',
        expiryMinutes: 15,
        ipAddress: '192.168.1.100'
      });

      assert.strictEqual(result.success, true);
      const queue = getEmailQueue();
      assert.strictEqual(queue.length, 1);
      assert.strictEqual(queue[0].to, 'gv.nguyen@ruo.edu.vn');
      assert.strictEqual(queue[0].category, 'AUTH_OTP');

      assert.ok(loggedAction, 'Audit log action must be triggered');
      assert.strictEqual(loggedAction.action, 'EMAIL_DISPATCH');
      assert.strictEqual(loggedAction.target_table, 'audit_logs');
      assert.strictEqual(loggedAction.entity_id, 'gv.nguyen@ruo.edu.vn');
      assert.strictEqual(loggedAction.new_value.category, 'AUTH_OTP');
    } finally {
      AuditLog.logAction = origLogAction;
    }
  });

  test('dispatchTaskAssignmentEmail dispatches work order email and records audit trail', async () => {
    let loggedAction = null;
    const origLogAction = AuditLog.logAction;

    try {
      AuditLog.logAction = async (payload) => {
        loggedAction = payload;
        return { success: true };
      };

      const result = await dispatchTaskAssignmentEmail({
        to: 'ktv.nam@ruo.edu.vn',
        technicianName: 'Trần Văn Nam',
        ticketCode: 'TK-2026-102',
        equipmentCode: 'EQ-PRJ-08',
        equipmentName: 'Máy Chiếu Epson EB-X06',
        roomCode: 'P402',
        priority: 'Khẩn Cấp',
        deadline: '17:00 ngày 26/10/2026',
        description: 'Bóng đèn nhấp nháy liên tục'
      });

      assert.strictEqual(result.success, true);
      const queue = getEmailQueue();
      assert.strictEqual(queue.length, 1);
      assert.strictEqual(queue[0].to, 'ktv.nam@ruo.edu.vn');
      assert.strictEqual(queue[0].category, 'TASK_ASSIGNED');
      assert.ok(queue[0].subject.includes('TK-2026-102'));

      assert.ok(loggedAction);
      assert.strictEqual(loggedAction.action, 'EMAIL_DISPATCH');
      assert.strictEqual(loggedAction.entity_id, 'TK-2026-102');
    } finally {
      AuditLog.logAction = origLogAction;
    }
  });

  test('dispatchDisposalNotificationEmail dispatches equipment disposal notification with audit log', async () => {
    let loggedAction = null;
    const origLogAction = AuditLog.logAction;

    try {
      AuditLog.logAction = async (payload) => {
        loggedAction = payload;
        return { success: true };
      };

      const result = await dispatchDisposalNotificationEmail({
        to: 'bgh@ruo.edu.vn',
        recipientName: 'Ban Giám Hiệu',
        equipmentCode: 'EQ-AC-10',
        equipmentName: 'Điều hòa Daikin 18000BTU',
        reason: 'Hỏng block nén, rò rỉ gas nghiêm trọng',
        recoveryValue: 500000,
        proposalId: 'TL-2026-003',
        isApproved: false
      });

      assert.strictEqual(result.success, true);
      const queue = getEmailQueue();
      assert.strictEqual(queue.length, 1);
      assert.strictEqual(queue[0].to, 'bgh@ruo.edu.vn');
      assert.strictEqual(queue[0].category, 'DISPOSAL_NOTIFICATION');
      assert.ok(queue[0].subject.includes('EQ-AC-10'));

      assert.ok(loggedAction);
      assert.strictEqual(loggedAction.action, 'EMAIL_DISPATCH');
      assert.strictEqual(loggedAction.entity_id, 'EQ-AC-10');
    } finally {
      AuditLog.logAction = origLogAction;
    }
  });
});
