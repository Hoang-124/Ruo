import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createDisposalProposal, approveDisposal } from '../src/controllers/disposalController.js';
import { Disposal } from '../src/models/Disposal.js';
import { Equipment } from '../src/models/Equipment.js';
import { Notification } from '../src/models/Notification.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { DISPOSAL_STATUSES, EQUIPMENT_STATUSES, USER_ROLES } from '../src/config/constants.js';

describe('UC-9.3 Disposal Email Dispatcher Integration', () => {
  test('createDisposalProposal triggers automated disposal email to Admins with audit log', async () => {
    const origEqFindById = Equipment.findById;
    const origDisposalCreate = Disposal.create;
    const origDisposalFindOne = Disposal.findOne;
    const origAuditLogAction = AuditLog.logAction;
    const origUserFind = User.find;
    const origNotifInsertMany = Notification.insertMany;

    const auditDispatches = [];

    try {
      Disposal.findOne = async () => null;
      const mockEquipment = {
        _id: '67b000000000000000000901',
        code: 'EQ-SRV-901',
        name: 'Máy Chủ HP ProLiant Gen9',
        price: 10000000,
        estimated_repair_cost: 7000000,
        status: EQUIPMENT_STATUSES.BROKEN,
        save: async function () { return this; }
      };

      Equipment.findById = async () => mockEquipment;

      Disposal.create = async (data) => ({
        _id: 'disp_prop_777',
        ...data
      });

      User.find = () => ({
        select: async () => [
          {
            _id: 'admin_user_01',
            email: 'admin.truong@ruo.edu.vn',
            full_name: 'Ban Giám Hiệu - Thầy Hiệu Trưởng'
          }
        ]
      });

      Notification.insertMany = async () => [];

      AuditLog.logAction = async (payload) => {
        if (payload.action === 'EMAIL_DISPATCH') {
          auditDispatches.push(payload);
        }
        return { success: true };
      };

      const req = {
        body: {
          equipment_id: '67b000000000000000000901',
          reason: 'Lỗi bo mạch chủ và nguồn điện không thể khắc phục',
          recovery_value: 2500000
        },
        user: {
          _id: 'manager_001',
          full_name: 'Lê Quản Lý',
          code: 'NV-2026-01',
          role: USER_ROLES.FACILITY_MANAGER
        },
        ip: '192.168.1.50'
      };

      let jsonRes = null;
      let statusCode = 200;
      const res = {
        status: (s) => {
          statusCode = s;
          return {
            json: (d) => { jsonRes = d; }
          };
        },
        json: (d) => { jsonRes = d; }
      };

      await createDisposalProposal(req, res);

      // Allow async email dispatch to resolve
      await new Promise(r => setTimeout(r, 60));

      assert.strictEqual(statusCode, 201);
      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(mockEquipment.status, EQUIPMENT_STATUSES.PENDING_DISPOSAL);

      // Verify email dispatch audit log
      assert.strictEqual(auditDispatches.length, 1);
      const emailAudit = auditDispatches[0];
      assert.strictEqual(emailAudit.action, 'EMAIL_DISPATCH');
      assert.strictEqual(emailAudit.entity_id, 'EQ-SRV-901');
      assert.strictEqual(emailAudit.new_value.category, 'DISPOSAL_NOTIFICATION');
      assert.strictEqual(emailAudit.new_value.recipient, 'admin.truong@ruo.edu.vn');
      assert.ok(emailAudit.new_value.subject.includes('EQ-SRV-901'));
    } finally {
      Equipment.findById = origEqFindById;
      Disposal.create = origDisposalCreate;
      Disposal.findOne = origDisposalFindOne;
      AuditLog.logAction = origAuditLogAction;
      User.find = origUserFind;
      Notification.insertMany = origNotifInsertMany;
    }
  });

  test('approveDisposal triggers automated email to proposer with audit log', async () => {
    const origDisposalFindById = Disposal.findById;
    const origUserFindById = User.findById;
    const origUserFind = User.find;
    const origNotifInsertMany = Notification.insertMany;
    const origEqFindById = Equipment.findById;
    const origAuditLogAction = AuditLog.logAction;

    let emailAudit = null;

    try {
      const mockProposal = {
        _id: 'disp_prop_777',
        equipment_id: '67b000000000000000000901',
        proposed_by: 'proposer_user_01',
        reason: 'Hỏng hoàn toàn sau 8 năm sử dụng',
        recovery_value: 1500000,
        status: DISPOSAL_STATUSES.HC_APPROVED,
        save: async function () { return this; }
      };

      Disposal.findById = async () => mockProposal;

      User.find = () => ({
        select: async () => []
      });

      Notification.insertMany = async () => [];

      User.findById = (id) => ({
        select: async () => ({
          _id: id,
          email: 'manager.nguyen@ruo.edu.vn',
          full_name: 'Nguyễn Quản Lý CSVC'
        })
      });

      Equipment.findById = () => ({
        select: async () => ({
          _id: '67b000000000000000000901',
          code: 'EQ-SRV-901',
          name: 'Máy Chủ HP ProLiant Gen9'
        }),
        _id: '67b000000000000000000901',
        code: 'EQ-SRV-901',
        name: 'Máy Chủ HP ProLiant Gen9',
        status: EQUIPMENT_STATUSES.PENDING_DISPOSAL,
        save: async function () { return this; }
      });

      AuditLog.logAction = async (payload) => {
        if (payload.action === 'EMAIL_DISPATCH') {
          emailAudit = payload;
        }
        return { success: true };
      };

      const req = {
        params: { id: 'disp_prop_777' },
        body: { decision_number: 'QD-TL-2026-05' },
        user: {
          _id: 'admin_001',
          full_name: 'Phó Hiệu Trưởng',
          code: 'BGH-01',
          role: USER_ROLES.ADMIN
        },
        ip: '10.0.0.5'
      };

      let jsonRes = null;
      const res = {
        status: (s) => ({ json: (d) => { jsonRes = { ...d, statusCode: s }; } }),
        json: (d) => { jsonRes = d; }
      };

      await approveDisposal(req, res);

      // Allow async email dispatch to resolve
      await new Promise(r => setTimeout(r, 60));

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(mockProposal.status, DISPOSAL_STATUSES.BGH_APPROVED);

      // Verify email dispatch audit log
      assert.ok(emailAudit, 'Disposal approval must record email dispatch audit log');
      assert.strictEqual(emailAudit.action, 'EMAIL_DISPATCH');
      assert.strictEqual(emailAudit.entity_id, 'EQ-SRV-901');
      assert.strictEqual(emailAudit.new_value.category, 'DISPOSAL_NOTIFICATION');
      assert.strictEqual(emailAudit.new_value.recipient, 'manager.nguyen@ruo.edu.vn');
      assert.ok(emailAudit.new_value.subject.includes('Phê duyệt thanh lý'));
    } finally {
      Disposal.findById = origDisposalFindById;
      User.findById = origUserFindById;
      User.find = origUserFind;
      Notification.insertMany = origNotifInsertMany;
      Equipment.findById = origEqFindById;
      AuditLog.logAction = origAuditLogAction;
    }
  });
});
