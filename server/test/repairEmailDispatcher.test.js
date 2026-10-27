import { test, describe } from 'node:test';
import assert from 'node:assert';
import { assignRepairTask } from '../src/controllers/repairController.js';
import { Repair } from '../src/models/Repair.js';
import { RepairLog } from '../src/models/RepairLog.js';
import { Equipment } from '../src/models/Equipment.js';
import { Notification } from '../src/models/Notification.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { REPAIR_STATUSES } from '../src/config/constants.js';

describe('UC-9.3 Repair Assignment Task Email Dispatcher Integration', () => {
  test('assignRepairTicket triggers dispatchTaskAssignmentEmail and audit logging', async () => {
    const origRepairFindById = Repair.findById;
    const origUserFindById = User.findById;
    const origEqFindById = Equipment.findById;
    const origRepairLogCreate = RepairLog.create;
    const origNotifCreate = Notification.create;
    const origAuditLogAction = AuditLog.logAction;

    let auditLogged = null;

    try {
      const mockRepair = {
        _id: 'repair_test_001',
        ticket_code: 'RP-2026-999',
        status: REPAIR_STATUSES.REPORTED,
        equipment_id: 'eq_test_001',
        issue_description: 'Máy chiếu không lên nguồn tại phòng H1-302',
        priority: 'Khẩn cấp',
        save: async function () { return this; }
      };

      Repair.findById = async () => mockRepair;

      User.findById = (id) => ({
        select: async () => ({
          _id: id,
          email: 'tech.hoang@ruo.edu.vn',
          full_name: 'Kỹ Thuật Viên Hoàng',
          status: 'ACTIVE'
        }),
        _id: id,
        email: 'tech.hoang@ruo.edu.vn',
        full_name: 'Kỹ Thuật Viên Hoàng',
        status: 'ACTIVE'
      });

      Equipment.findById = () => ({
        populate: async () => ({
          _id: 'eq_test_001',
          code: 'EQ-PRJ-302',
          name: 'Máy Chiếu Sony Laser 4K',
          room_id: { code: 'H1-302', name: 'Phòng Hội Thảo H1-302' }
        })
      });

      RepairLog.create = async () => ({ _id: 'rlog_1' });
      Notification.create = async () => ({ _id: 'notif_1' });

      AuditLog.logAction = async (payload) => {
        auditLogged = payload;
        return { success: true };
      };

      const req = {
        params: { id: 'repair_test_001' },
        body: { assigned_to: 'tech_user_001' },
        user: { _id: 'manager_001', role: 'facility_manager' },
        ip: '192.168.1.100'
      };

      let jsonRes = null;
      const res = {
        json: (d) => { jsonRes = d; },
        status: (s) => ({ json: (d) => { jsonRes = { ...d, statusCode: s }; } })
      };

      await assignRepairTask(req, res);

      // Wait brief moment for async email dispatch promise to resolve
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(mockRepair.assigned_to, 'tech_user_001');
      assert.strictEqual(mockRepair.status, REPAIR_STATUSES.ASSIGNED);

      // Verify email dispatch and audit log
      assert.ok(auditLogged, 'Audit log must record task assignment email dispatch');
      assert.strictEqual(auditLogged.action, 'EMAIL_DISPATCH');
      assert.strictEqual(auditLogged.entity_id, 'RP-2026-999');
      assert.strictEqual(auditLogged.new_value.category, 'TASK_ASSIGNED');
      assert.strictEqual(auditLogged.new_value.recipient, 'tech.hoang@ruo.edu.vn');
      assert.ok(auditLogged.new_value.subject.includes('RP-2026-999'));
    } finally {
      Repair.findById = origRepairFindById;
      User.findById = origUserFindById;
      Equipment.findById = origEqFindById;
      RepairLog.create = origRepairLogCreate;
      Notification.create = origNotifCreate;
      AuditLog.logAction = origAuditLogAction;
    }
  });
});
