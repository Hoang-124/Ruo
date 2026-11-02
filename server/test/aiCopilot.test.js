import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  triageIncidentReport,
  getRepairAiCopilot,
  analyzeInventoryDiscrepancies,
  analyzeAuditAnomalies
} from '../src/controllers/aiController.js';
import { Repair } from '../src/models/Repair.js';
import { RepairLog } from '../src/models/RepairLog.js';
import { Equipment } from '../src/models/Equipment.js';
import { Room } from '../src/models/Room.js';
import { SparePart } from '../src/models/SparePart.js';
import { User } from '../src/models/User.js';
import { InventorySession } from '../src/models/InventorySession.js';
import { InventoryLog } from '../src/models/InventoryLog.js';
import { AuditLog } from '../src/models/AuditLog.js';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

const chainable = (val) => {
  const q = Promise.resolve(val);
  q.populate = () => chainable(val);
  q.select = () => chainable(val);
  q.sort = () => chainable(val);
  q.limit = () => chainable(val);
  q.lean = () => chainable(val);
  return q;
};

describe('AI Copilot Suite — Feature #1 (Incident & Repair) and Feature #4 (Inventory & Audit)', () => {
  test('Feature #1A: triageIncidentReport rejects blank description with 400', async () => {
    const res = makeRes();
    await triageIncidentReport(
      {
        body: { room_id: 'room-1', equipment_id: 'eq-1', incident_description: '   ' },
        user: { _id: 'lec-1', role: 'lecturer' }
      },
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  test('Feature #1A: triageIncidentReport detects critical electrical hazard and duplicate open ticket', async (t) => {
    const origEq = Equipment.findById;
    const origRoom = Room.findById;
    const origRepairFind = Repair.find;
    t.after(() => {
      Equipment.findById = origEq;
      Room.findById = origRoom;
      Repair.find = origRepairFind;
    });

    Equipment.findById = () =>
      chainable({
        _id: 'eq-proj-1',
        code: 'EQ-2026-101',
        name: 'Máy chiếu laser Epson',
        brand: 'Epson',
        model: 'EB-L200F',
        status: 'in_use',
        repair_count: 2,
        category_id: { _id: 'cat-proj', name: 'Máy chiếu' }
      });
    Room.findById = () =>
      chainable({
        _id: 'room-p301',
        code: 'P301',
        name: 'Phòng lý thuyết 301',
        floor: 3,
        room_type: 'lecture'
      });
    Repair.find = () =>
      chainable([
        {
          _id: 'rep-dup-1',
          ticket_code: 'REP-DUP-001',
          equipment_id: { _id: 'eq-proj-1', code: 'EQ-2026-101', name: 'Máy chiếu laser Epson' },
          room_id: { _id: 'room-p301', code: 'P301' },
          status: 'reported',
          damage_level: 'major',
          incident_description: 'Máy chiếu có mùi khét nhẹ ở nguồn'
        }
      ]);

    const res = makeRes();
    await triageIncidentReport(
      {
        body: {
          room_id: 'room-p301',
          equipment_id: 'eq-proj-1',
          incident_description: 'Máy chiếu bốc khói khét, tia lửa điện ở ổ nguồn trần phòng P301!'
        },
        user: { _id: 'lec-1', role: 'lecturer' }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.triage.suggested_damage_level, 'critical');
    assert.equal(res.body.triage.has_exact_duplicate, true);
    assert.equal(res.body.triage.duplicate_tickets.length, 1);
    assert.equal(res.body.triage.duplicate_tickets[0].ticket_code, 'REP-DUP-001');
    assert.ok(res.body.triage.refined_description.length > 15);
    assert.ok(Array.isArray(res.body.triage.quick_checks) && res.body.triage.quick_checks.length >= 2);
  });

  test('Feature #1B: getRepairAiCopilot enforces row-level isolation for technicians and ranks dispatch + parts + disposal rRatio', async (t) => {
    const origRepairById = Repair.findById;
    const origRepairFind = Repair.find;
    const origLogFind = RepairLog.find;
    const origSpareFind = SparePart.find;
    const origEqFind = Equipment.find;
    const origUserFind = User.find;

    t.after(() => {
      Repair.findById = origRepairById;
      Repair.find = origRepairFind;
      RepairLog.find = origLogFind;
      SparePart.find = origSpareFind;
      Equipment.find = origEqFind;
      User.find = origUserFind;
    });

    const ticketDoc = {
      _id: 'rep-100',
      ticket_code: 'REP-2026-100',
      status: 'reported',
      damage_level: 'major',
      incident_description: 'Máy chiếu bật không lên đèn chiếu, bóng đèn báo lỗi đỏ liên tục',
      assigned_to: { _id: 'tech-assigned', full_name: 'KTV Đúng' },
      room_id: { _id: 'room-202', code: 'P202', name: 'Giảng đường 202', floor: 2 },
      equipment_id: {
        _id: 'eq-202',
        code: 'EQ-PROJ-202',
        name: 'Máy chiếu Sony VPL',
        brand: 'Sony',
        model: 'VPL-EX455',
        price: 15000000,
        remaining_value: 5000000,
        estimated_repair_cost: 3600000, // rRatio = 72% >= 60%!
        repair_count: 4,
        category_id: { _id: 'cat-proj', code: 'PROJ', name: 'Máy chiếu' }
      }
    };

    Repair.findById = () => chainable(ticketDoc);
    Repair.find = (filter = {}) => {
      // History for equipment vs active open repairs vs resolved history
      if (filter.equipment_id) {
        return chainable([
          { _id: 'rep-old-1', ticket_code: 'REP-OLD-1', incident_description: 'Thay bóng đèn chiếu', total_cost: 1800000, status: 'closed' }
        ]);
      }
      if (filter.status && filter.status.$in) {
        // tech-busy has 3 active tasks (1 overdue), tech-free has 0 active tasks
        return chainable([
          { _id: 'r1', assigned_to: 'tech-busy', status: 'in_progress', deadline: new Date(Date.now() - 3600_000) },
          { _id: 'r2', assigned_to: 'tech-busy', status: 'assigned', deadline: new Date(Date.now() + 7200_000) },
          { _id: 'r3', assigned_to: 'tech-busy', status: 'assigned', deadline: new Date(Date.now() + 7200_000) }
        ]);
      }
      return chainable([
        { _id: 'r-hist-1', assigned_to: 'tech-free', status: 'closed', equipment_id: { category_id: 'cat-proj' } }
      ]);
    };
    RepairLog.find = () => chainable([]);
    SparePart.find = () =>
      chainable([
        { _id: 'sp-lamp', code: 'SP-LAMP-01', name: 'Bóng đèn máy chiếu cao áp', stock: 4, min_stock: 2, price: 1500000, unit: 'Bóng' },
        { _id: 'sp-chair', code: 'SP-CHAIR-02', name: 'Bánh xe ghế xoay', stock: 12, min_stock: 5, price: 50000, unit: 'Cái' }
      ]);
    Equipment.find = () =>
      chainable([
        { _id: 'eq-spare-proj', code: 'EQ-SPARE-01', name: 'Máy chiếu dự phòng Epson', brand: 'Epson', model: 'X41', status: 'in_stock', category_id: 'cat-proj' }
      ]);
    User.find = () =>
      chainable([
        { _id: 'tech-busy', full_name: 'Trần Bận Rộn', code: 'KT01', department: 'Tổ Điện - Điện Tử', role: 'technician', status: 'active' },
        { _id: 'tech-free', full_name: 'Nguyễn Sẵn Sàng', code: 'KT02', department: 'Tổ Thiết Bị Nghe Nhìn', role: 'technician', status: 'active' }
      ]);

    // 1. Unauthorized technician check
    const forbiddenRes = makeRes();
    await getRepairAiCopilot(
      {
        params: { id: 'rep-100' },
        user: { _id: 'tech-other', role: 'technician' }
      },
      forbiddenRes
    );
    assert.equal(forbiddenRes.statusCode, 403);

    // 2. Facility manager full copilot response
    const fmRes = makeRes();
    await getRepairAiCopilot(
      {
        params: { id: 'rep-100' },
        user: { _id: 'fm-1', role: 'facility_manager' }
      },
      fmRes
    );
    assert.equal(fmRes.statusCode, 200);
    assert.equal(fmRes.body.success, true);
    const copilot = fmRes.body.copilot;
    assert.equal(copilot.dispatch_recommendation.recommended_technician._id, 'tech-free');
    assert.equal(copilot.dispatch_recommendation.recommended_replacement._id, 'eq-spare-proj');
    assert.equal(copilot.recommended_parts[0]._id, 'sp-lamp');
    assert.equal(copilot.disposal_advisory.should_consider_disposal, true);
    assert.ok(copilot.disposal_advisory.r_ratio >= 60);
  });

  test('Feature #4A: analyzeInventoryDiscrepancies flags zombie disposed assets, missing value exposure, and room hotspots', async (t) => {
    const origSess = InventorySession.findById;
    const origLogs = InventoryLog.find;
    const origEqFind = Equipment.find;
    const origRoomFind = Room.find;

    t.after(() => {
      InventorySession.findById = origSess;
      InventoryLog.find = origLogs;
      Equipment.find = origEqFind;
      Room.find = origRoomFind;
    });

    InventorySession.findById = () =>
      chainable({
        _id: 'sess-1',
        name: 'Kiểm kê Học kỳ 1 - Tòa A1',
        scope_type: 'building',
        status: 'in_progress',
        scope_ids: ['room-101', 'room-202']
      });
    Room.find = () => chainable([{ _id: 'room-101' }, { _id: 'room-202' }]);
    Equipment.find = () => chainable([]);
    InventoryLog.find = () =>
      chainable([
        {
          _id: 'log-1',
          status: 'wrong_location',
          note: '[CẢNH BÁO KIỂM TOÁN: Tài sản ĐÃ THANH LÝ (DISPOSED) nhưng vẫn xuất hiện thực tế tại phòng] Quét tại P101',
          scanned_room_id: { _id: 'room-101', code: 'P101', name: 'Phòng 101', floor: 1 },
          equipment_id: {
            _id: 'eq-zombie',
            code: 'EQ-ZOMBIE-99',
            name: 'PC Đồng bộ Dell Optiplex',
            status: 'disposed',
            price: 12000000,
            room_id: null
          }
        },
        {
          _id: 'log-2',
          status: 'missing',
          note: 'Không thấy tại phòng',
          scanned_room_id: { _id: 'room-202', code: 'P202', name: 'Phòng Lab 202', floor: 2 },
          equipment_id: {
            _id: 'eq-miss-1',
            code: 'EQ-MISS-01',
            name: 'Màn hình LG 27 inch',
            status: 'in_use',
            price: 6500000,
            room_id: { _id: 'room-202', code: 'P202', name: 'Phòng Lab 202', floor: 2 }
          }
        },
        {
          _id: 'log-3',
          status: 'matched',
          note: '',
          scanned_room_id: { _id: 'room-101', code: 'P101', name: 'Phòng 101', floor: 1 },
          equipment_id: {
            _id: 'eq-ok-1',
            code: 'EQ-OK-01',
            name: 'Điều hòa Daikin',
            status: 'in_use',
            price: 14000000,
            room_id: { _id: 'room-101', code: 'P101', name: 'Phòng 101', floor: 1 }
          }
        }
      ]);

    const res = makeRes();
    await analyzeInventoryDiscrepancies(
      {
        params: { id: 'sess-1' },
        user: { _id: 'fm-1', role: 'facility_manager' }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    const analysis = res.body.analysis;
    assert.equal(analysis.risk_level, 'critical');
    assert.equal(analysis.zombie_assets.length, 1);
    assert.equal(analysis.zombie_assets[0].code, 'EQ-ZOMBIE-99');
    assert.equal(analysis.metrics.missing_value_vnd, 6500000);
    assert.ok(analysis.hotspots_by_room.length >= 1);
    assert.ok(analysis.recommendations.length >= 2);
  });

  test('Feature #4B: analyzeAuditAnomalies detects SHA-256 chain tamper as CRITICAL and flags RBAC/lockout/off-hours patterns', async (t) => {
    const origVerify = AuditLog.verifyIntegrity;
    const origFind = AuditLog.find;
    t.after(() => {
      AuditLog.verifyIntegrity = origVerify;
      AuditLog.find = origFind;
    });

    // Case 1: Tampered chain
    AuditLog.verifyIntegrity = async () => ({
      isValid: false,
      totalLogs: 42,
      brokenAt: 19,
      reason: 'HASH_MISMATCH',
      message: 'Phát hiện chỉnh sửa trái phép tại seq=19'
    });
    AuditLog.find = () =>
      chainable([
        {
          seq: 19,
          action: 'UPDATE_ROLE_PERMISSIONS',
          target_table: 'roles',
          entity_id: 'role-lecturer',
          user_display: 'Admin Root',
          ip_address: '10.0.0.99',
          hashed_at: new Date('2026-10-25T19:30:00Z') // 02:30 AM UTC+7 (Sunday off-hours!)
        },
        {
          seq: 18,
          action: 'USER_ACCOUNT_TEMP_LOCKED',
          target_table: 'users',
          entity_id: 'user-7',
          user_display: 'Hệ Thống',
          ip_address: '192.168.1.50',
          hashed_at: new Date('2026-10-25T19:25:00Z')
        }
      ]);

    const res = makeRes();
    await analyzeAuditAnomalies(
      {
        body: { limit: 100 },
        query: {},
        user: { _id: 'admin-1', role: 'admin' }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    const report = res.body.analysis;
    assert.equal(report.risk_level, 'critical');
    assert.equal(report.chain_integrity.isValid, false);
    assert.equal(report.chain_integrity.brokenAt, 19);
    assert.ok(report.anomalies.some((a) => a.category === 'CHAIN_TAMPER'));
    assert.ok(report.anomalies.some((a) => a.category === 'RBAC_MUTATION'));
    assert.ok(report.anomalies.some((a) => a.category === 'AUTH_LOCKOUT'));
  });

  test('Live Gemini JSON integration falls back cleanly and enriches when GEMINI_API_KEY is present', async (t) => {
    const origKey = process.env.GEMINI_API_KEY;
    const origFetch = globalThis.fetch;
    const origEq = Equipment.findById;
    const origRoom = Room.findById;
    const origRepairFind = Repair.find;

    t.after(() => {
      if (origKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = origKey;
      globalThis.fetch = origFetch;
      Equipment.findById = origEq;
      Room.findById = origRoom;
      Repair.find = origRepairFind;
    });

    process.env.GEMINI_API_KEY = 'test-gemini-key';
    Equipment.findById = () => chainable({ _id: 'eq-1', code: 'EQ-01', name: 'Điều hòa Panasonic', brand: 'Panasonic', model: 'CU-N12' });
    Room.findById = () => chainable({ _id: 'r-1', code: 'P105', name: 'Phòng 105', floor: 1 });
    Repair.find = () => chainable([]);

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    suggested_damage_level: 'major',
                    refined_description: '[P105 - EQ-01] Điều hòa Panasonic mất lạnh hoàn toàn, nghi thiếu gas hoặc lỗi lốc nén.',
                    reasoning: 'Gián đoạn nhiệt độ phòng học đông sinh viên, cần xử lý trong 24h hành chính.',
                    quick_checks: ['Kiểm tra chế độ Cool trên remote', 'Quan sát đèn Timer có nhấp nháy lỗi không']
                  })
                }
              ]
            }
          }
        ]
      })
    });

    const res = makeRes();
    await triageIncidentReport(
      {
        body: { room_id: 'r-1', equipment_id: 'eq-1', incident_description: 'Điều hòa bật 18 độ nhưng chỉ thổi gió nóng' },
        user: { _id: 'lec-1', role: 'lecturer' }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.triage.engine, 'gemini');
    assert.equal(res.body.triage.suggested_damage_level, 'major');
    assert.match(res.body.triage.refined_description, /P105/);
  });
});
