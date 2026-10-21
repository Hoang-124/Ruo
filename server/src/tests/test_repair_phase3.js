import assert from 'assert';
import mongoose from 'mongoose';
import {
  createRepairReport,
  getRepairs,
  getRepairById,
  assignRepairTask,
  acceptRepairTask,
  addRepairLog,
  reportRepairOutcome,
  closeRepairTicket,
  getEquipmentRepairHistory,
  getOverdueRepairs,
  getSlaComplianceStats,
  checkAndNotifyOverdueRepairs
} from '../controllers/repairController.js';
import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { Equipment } from '../models/Equipment.js';
import { User } from '../models/User.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  DAMAGE_LEVELS,
  REPAIR_STATUSES,
  REPAIR_OUTCOMES,
  EQUIPMENT_STATUSES,
  USER_ROLES
} from '../config/constants.js';

async function runWorkstream1Tests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ WORKSTREAM 1: CORE REPAIR LIFECYCLE (UC-5.1 → UC-5.8) ---');

  const eqId = new mongoose.Types.ObjectId().toString();
  const lecturerId = new mongoose.Types.ObjectId().toString();
  const managerId = new mongoose.Types.ObjectId().toString();
  const techId = new mongoose.Types.ObjectId().toString();
  const repairId = new mongoose.Types.ObjectId().toString();

  // Mock Equipment doc
  const mockEquipment = {
    _id: eqId,
    code: 'EQ-LAB-01',
    name: 'Máy Chiếu Phòng A1-201',
    brand: 'Panasonic',
    model: 'PT-VMZ50',
    room_id: { _id: 'room-201', code: 'A1-201', name: 'Phòng thực hành' },
    category_id: { _id: 'cat-01', code: 'PROJ', name: 'Máy chiếu' },
    price: 28000000,
    remaining_value: 20000000,
    status: EQUIPMENT_STATUSES.IN_USE,
    repair_count: 0,
    estimated_repair_cost: 0,
    save: async function () { return this; }
  };

  // Mock Repair doc
  let mockRepair = {
    _id: repairId,
    ticket_code: 'REP-2026-TEST01',
    equipment_id: eqId,
    reported_by: lecturerId,
    incident_description: 'Máy chiếu không lên nguồn, đèn tín hiệu nhấp nháy đỏ',
    damage_level: DAMAGE_LEVELS.MAJOR,
    deadline: new Date(Date.now() + 24 * 3600 * 1000),
    status: REPAIR_STATUSES.REPORTED,
    total_cost: 0,
    toObject: function () { return { ...this }; },
    toJSON: function () { return { ...this }; },
    save: async function () { return this; }
  };

  const mockLogs = [];

  const createPopulateChain = (result) => {
    const chain = {
      populate: () => chain,
      sort: async () => result
    };
    return chain;
  };

  // Mock Mongoose models
  Equipment.findById = (id) => {
    const doc = String(id) === String(eqId) ? mockEquipment : null;
    const query = {
      populate: () => query,
      then: (resolve) => resolve(doc),
      catch: (reject) => {}
    };
    return query;
  };

  Repair.create = async (doc) => {
    mockRepair = {
      ...doc,
      _id: repairId,
      ticket_code: 'REP-TEST-888',
      total_cost: 0,
      toObject: function () { return { ...this }; },
      toJSON: function () { return { ...this }; },
      save: async function () { return this; }
    };
    return mockRepair;
  };

  Repair.findById = (id) => {
    if (String(id) === String(repairId)) {
      mockRepair.populate = function () { return this; };
      const query = {
        populate: () => query,
        then: (resolve) => resolve(mockRepair),
        catch: (reject) => {}
      };
      return query;
    }
    const query = {
      populate: () => query,
      then: (resolve) => resolve(null),
      catch: (reject) => {}
    };
    return query;
  };

  Repair.find = (filter) => createPopulateChain([mockRepair]);

  RepairLog.create = async (doc) => {
    const created = { ...doc, _id: new mongoose.Types.ObjectId().toString(), created_at: new Date() };
    mockLogs.push(created);
    return created;
  };

  RepairLog.find = () => createPopulateChain(mockLogs);

  User.find = async () => [
    { _id: managerId, role: USER_ROLES.FACILITY_MANAGER, full_name: 'Trần Quản Lý', status: 'active' }
  ];

  Notification.create = async () => ({ success: true });
  AuditLog.logAction = async () => ({ success: true });
  EquipmentMovement.create = async () => ({ success: true });

  // ----------------------------------------------------
  // TEST 1: UC-5.1 - Report Damage (POST /api/repairs)
  // ----------------------------------------------------
  console.log('\n[Test 1] UC-5.1: Báo hỏng sự cố thiết bị tại phòng (createRepairReport)');
  {
    const req = {
      user: { _id: lecturerId, full_name: 'TS. Nguyễn Văn Giảng', code: 'GV001', role: USER_ROLES.LECTURER },
      body: {
        equipment_id: eqId,
        incident_description: 'Máy chiếu phòng A1-201 mất nguồn hoàn toàn, nghi ngờ hỏng nguồn',
        damage_level: DAMAGE_LEVELS.MAJOR
      },
      ip: '127.0.0.1'
    };

    let statusCode = 200;
    let jsonResult = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await createRepairReport(req, res);
    assert.strictEqual(statusCode, 201, 'Status code phải là 201 Created');
    assert.ok(jsonResult.success, 'Phải tạo báo cáo sự cố thành công');
    assert.strictEqual(jsonResult.data.damage_level, DAMAGE_LEVELS.MAJOR, 'Mức độ phải là MAJOR');
    assert.ok(jsonResult.data.deadline, 'Phải tự động tính deadline theo SLA');
    console.log('✓ PASS: Tạo phiếu báo hỏng thành công, deadline SLA tự động:', jsonResult.data.deadline);
  }

  // ----------------------------------------------------
  // TEST 2: UC-5.2 - Repair List & Filtering (GET /api/repairs)
  // ----------------------------------------------------
  console.log('\n[Test 2] UC-5.2: Tra cứu danh sách phiếu sửa chữa (getRepairs)');
  {
    const req = {
      query: { status: REPAIR_STATUSES.REPORTED }
    };

    let jsonResult = null;
    const res = {
      json: (data) => { jsonResult = data; }
    };

    await getRepairs(req, res);
    assert.ok(jsonResult.success, 'Query danh sách phải thành công');
    assert.ok(Array.isArray(jsonResult.data), 'Kết quả phải chứa mảng data');
    assert.ok(jsonResult.data.length >= 1, 'Phải có ít nhất 1 phiếu');
    console.log('✓ PASS: Danh sách phiếu trả về đúng định dạng, số lượng:', jsonResult.data.length);
  }

  // ----------------------------------------------------
  // TEST 3: UC-5.3 - Assign Repair Task (PUT /api/repairs/:id/assign)
  // ----------------------------------------------------
  console.log('\n[Test 3] UC-5.3: Phân công nhiệm vụ sửa chữa cho KTV (assignRepairTask)');
  {
    const req = {
      user: { _id: managerId, full_name: 'Quản Lý CSVC', code: 'QL01', role: USER_ROLES.FACILITY_MANAGER },
      params: { id: repairId },
      body: {
        assigned_to: techId,
        damage_level: DAMAGE_LEVELS.MAJOR,
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      }
    };

    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await assignRepairTask(req, res);
    assert.ok(jsonResult.success, 'Phân công KTV phải thành công');
    assert.strictEqual(jsonResult.data.status, REPAIR_STATUSES.ASSIGNED, 'Trạng thái chuyển sang ASSIGNED');
    assert.strictEqual(String(jsonResult.data.assigned_to), String(techId), 'Đúng KTV được giao');
    mockRepair.status = REPAIR_STATUSES.ASSIGNED;
    console.log('✓ PASS: Phân công KTV thành công, trạng thái ticket:', jsonResult.data.status);
  }

  // ----------------------------------------------------
  // TEST 4: UC-5.4 - Accept Repair (PUT /api/repairs/:id/accept)
  // ----------------------------------------------------
  console.log('\n[Test 4] UC-5.4: Kỹ thuật viên tiếp nhận ca sửa (acceptRepairTask)');
  {
    const req = {
      user: { _id: techId, full_name: 'KTV Trần Văn Sửa', code: 'KT01', role: USER_ROLES.TECHNICIAN },
      params: { id: repairId }
    };

    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await acceptRepairTask(req, res);
    assert.ok(jsonResult.success, 'Tiếp nhận ca sửa phải thành công');
    assert.strictEqual(jsonResult.data.status, REPAIR_STATUSES.IN_PROGRESS, 'Trạng thái chuyển sang IN_PROGRESS');
    mockRepair.status = REPAIR_STATUSES.IN_PROGRESS;
    console.log('✓ PASS: KTV tiếp nhận ca sửa thành công, trạng thái:', jsonResult.data.status);
  }

  // ----------------------------------------------------
  // TEST 5: UC-5.5 - Log Repair Progress & Parts (PUT /api/repairs/:id/progress)
  // ----------------------------------------------------
  console.log('\n[Test 5] UC-5.5: Ghi nhật ký tiến độ & phụ tùng thay thế (addRepairLog / progress)');
  {
    const req = {
      user: { _id: techId, full_name: 'KTV Trần Văn Sửa', code: 'KT01', role: USER_ROLES.TECHNICIAN },
      params: { id: repairId },
      body: {
        action: 'in_progress',
        description: 'Thay board nguồn và bóng đèn máy chiếu Panasonic VMZ50',
        parts_used: [{ name: 'Bóng đèn Laser 300W', qty: 1 }, { name: 'Cầu chì 10A', qty: 2 }],
        cost: 1500000
      }
    };

    let statusCode = 200;
    let jsonResult = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await addRepairLog(req, res);
    assert.strictEqual(statusCode, 201, 'Status code phải là 201 Created');
    assert.ok(jsonResult.success, 'Ghi nhận tiến độ sửa chữa thành công');
    assert.ok(jsonResult.data.description.includes('Bóng đèn Laser 300W'), 'Phải chứa tên linh kiện');
    assert.strictEqual(jsonResult.data.cost, 1500000, 'Chi phí phải đúng 1.500.000đ');
    assert.strictEqual(jsonResult.total_cost, 1500000, 'Tổng chi phí sửa chữa cập nhật đúng');
    console.log('✓ PASS: Cập nhật tiến độ & linh kiện thành công, tổng chi phí ca sửa:', jsonResult.total_cost);
  }

  // ----------------------------------------------------
  // TEST 6: UC-5.6 - Complete Repair (PUT /api/repairs/:id/resolve)
  // ----------------------------------------------------
  console.log('\n[Test 6] UC-5.6: Kỹ thuật viên hoàn tất ca sửa (reportRepairOutcome / resolve)');
  {
    const req = {
      user: { _id: techId, full_name: 'KTV Trần Văn Sửa', code: 'KT01', role: USER_ROLES.TECHNICIAN },
      params: { id: repairId },
      body: {
        outcome: REPAIR_OUTCOMES.REPAIRED,
        notes: 'Đã test chạy liên tục 30 phút, hình ảnh sáng rõ, nhiệt độ ổn định'
      }
    };

    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await reportRepairOutcome(req, res);
    assert.ok(jsonResult.success, 'Báo cáo kết quả phải thành công');
    assert.strictEqual(jsonResult.data.status, REPAIR_STATUSES.RESOLVED, 'Trạng thái chuyển sang RESOLVED');
    assert.strictEqual(jsonResult.data.outcome, REPAIR_OUTCOMES.REPAIRED, 'Outcome là repaired');
    mockRepair.status = REPAIR_STATUSES.RESOLVED;
    mockRepair.outcome = REPAIR_OUTCOMES.REPAIRED;
    console.log('✓ PASS: KTV hoàn tất sửa chữa, bàn giao nghiệm thu thành công!');
  }

  // ----------------------------------------------------
  // TEST 7: UC-5.8 - Asset Repair History (GET /api/repairs/equipment/:id)
  // ----------------------------------------------------
  console.log('\n[Test 7] UC-5.8: Tra cứu toàn bộ lịch sử sửa chữa theo tài sản (getEquipmentRepairHistory)');
  {
    const req = {
      params: { id: eqId }
    };

    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await getEquipmentRepairHistory(req, res);
    assert.ok(jsonResult.success, 'Tra cứu lịch sử sửa chữa theo thiết bị phải thành công');
    assert.ok(jsonResult.equipment, 'Phải có thông tin thiết bị');
    assert.strictEqual(jsonResult.equipment.code, 'EQ-LAB-01');
    assert.ok(jsonResult.repairs.length >= 1, 'Phải có ít nhất 1 phiếu sửa');
    assert.ok(jsonResult.totalCost >= 1500000, 'Chi phí lũy kế phải >= 1.500.000đ');
    console.log(`✓ PASS: Lịch sử sửa chữa thiết bị [${jsonResult.equipment.code}]: ${jsonResult.repairCount} lần sửa, tổng chi phí lũy kế: ${jsonResult.totalCost.toLocaleString('vi-VN')} đ`);
  }

  console.log('\n============================================================');
  console.log('TẤT CẢ 7/7 TESTS CHO WORKSTREAM 1 (UC-5.1 → UC-5.8) ĐÃ ĐẠT 100%!');
  console.log('============================================================\n');
}

async function runWorkstream2Tests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ WORKSTREAM 2: SLA, DEADLINES & OVERDUE INTELLIGENCE (UC-5.9, UC-7.1, UC-7.2) ---');

  const techId = new mongoose.Types.ObjectId().toString();
  const managerId = new mongoose.Types.ObjectId().toString();
  const eqId = new mongoose.Types.ObjectId().toString();

  const createPopulateChain = (result) => {
    const chain = {
      populate: () => chain,
      sort: async () => result,
      then: (resolve) => resolve(result)
    };
    return chain;
  };

  // ----------------------------------------------------
  // TEST 8: UC-5.9 - Overdue Repairs Tracking (GET /api/repairs/overdue)
  // ----------------------------------------------------
  console.log('\n[Test 8] UC-5.9: Quản lý & Lọc danh sách sửa chữa quá hạn SLA (getOverdueRepairs)');
  {
    const pastDeadline = new Date(Date.now() - 5 * 3600 * 1000); // 5 hours ago
    const mockOverdueRepairs = [
      {
        _id: 'rep-overdue-01',
        ticket_code: 'REP-OVERDUE-01',
        status: REPAIR_STATUSES.IN_PROGRESS,
        damage_level: DAMAGE_LEVELS.MAJOR,
        deadline: pastDeadline,
        equipment_id: { code: 'EQ-OVERDUE-01', name: 'Máy chiếu trễ hạn' },
        assigned_to: { _id: techId, full_name: 'KTV Trực' },
        toObject: function () { return { ...this }; }
      }
    ];

    Repair.find = (filter) => createPopulateChain(mockOverdueRepairs);

    const req = {
      query: {}
    };
    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await getOverdueRepairs(req, res);
    assert.ok(jsonResult.success, 'Query quá hạn phải thành công');
    assert.strictEqual(jsonResult.count, 1, 'Phải có 1 phiếu quá hạn');
    assert.strictEqual(jsonResult.data[0].deadline_status, 'overdue', 'Trạng thái SLA phải là overdue');
    assert.ok(jsonResult.data[0].overdue_minutes >= 290, 'Số phút trễ hạn phải tính toán chính xác >= 290 phút');
    assert.strictEqual(jsonResult.data[0].escalation_level, 'high_breach', 'Trễ > 4h phải gán escalation_level là high_breach');
    console.log(`✓ PASS: Phát hiện phiếu trễ hạn [${jsonResult.data[0].ticket_code}]: Trễ ${jsonResult.data[0].overdue_minutes} phút, Phân cấp cảnh báo: ${jsonResult.data[0].escalation_level}`);
  }

  // ----------------------------------------------------
  // TEST 9: UC-7.2 - SLA Compliance Rate & Metrics (GET /api/repairs/sla-stats)
  // ----------------------------------------------------
  console.log('\n[Test 9] UC-7.2: Thống kê & Báo cáo tỷ lệ tuân thủ SLA chuẩn ITIL (getSlaComplianceStats)');
  {
    const now = new Date();
    const mockSlaRepairs = [
      // 1. Resolved on time
      {
        _id: 'rep-sla-01',
        ticket_code: 'REP-SLA-01',
        status: REPAIR_STATUSES.RESOLVED,
        damage_level: DAMAGE_LEVELS.CRITICAL,
        created_at: new Date(now.getTime() - 6 * 3600 * 1000),
        deadline: new Date(now.getTime() - 2 * 3600 * 1000),
        completed_at: new Date(now.getTime() - 3 * 3600 * 1000), // Resolved 1h before deadline
        equipment_id: { code: 'EQ-01', name: 'Server' }
      },
      // 2. Resolved overdue
      {
        _id: 'rep-sla-02',
        ticket_code: 'REP-SLA-02',
        status: REPAIR_STATUSES.CLOSED,
        damage_level: DAMAGE_LEVELS.MAJOR,
        created_at: new Date(now.getTime() - 30 * 3600 * 1000),
        deadline: new Date(now.getTime() - 6 * 3600 * 1000),
        completed_at: new Date(now.getTime() - 2 * 3600 * 1000), // Resolved 4h after deadline
        equipment_id: { code: 'EQ-02', name: 'Switch' }
      },
      // 3. Open - currently overdue
      {
        _id: 'rep-sla-03',
        ticket_code: 'REP-SLA-03',
        status: REPAIR_STATUSES.IN_PROGRESS,
        damage_level: DAMAGE_LEVELS.MAJOR,
        created_at: new Date(now.getTime() - 10 * 3600 * 1000),
        deadline: new Date(now.getTime() - 1 * 3600 * 1000), // 1h past deadline
        equipment_id: { code: 'EQ-03', name: 'Router' }
      },
      // 4. Open - currently on track
      {
        _id: 'rep-sla-04',
        ticket_code: 'REP-SLA-04',
        status: REPAIR_STATUSES.ASSIGNED,
        damage_level: DAMAGE_LEVELS.MINOR,
        created_at: new Date(now.getTime() - 2 * 3600 * 1000),
        deadline: new Date(now.getTime() + 20 * 3600 * 1000), // 20h remaining
        equipment_id: { code: 'EQ-04', name: 'Projector' }
      }
    ];

    Repair.find = (filter) => createPopulateChain(mockSlaRepairs);

    const req = {};
    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await getSlaComplianceStats(req, res);
    assert.ok(jsonResult.success, 'Thống kê SLA phải thành công');
    const { data } = jsonResult;
    assert.strictEqual(data.total_with_deadline, 4, 'Tổng phiếu có SLA phải là 4');
    assert.strictEqual(data.resolved_count, 2, 'Số phiếu đã xử lý xong là 2');
    assert.strictEqual(data.on_time_resolved, 1, 'Số phiếu hoàn tất đúng hạn là 1');
    assert.strictEqual(data.overdue_resolved, 1, 'Số phiếu hoàn tất trễ hạn là 1');
    assert.strictEqual(data.currently_overdue, 1, 'Số phiếu đang mở bị quá hạn là 1');
    assert.strictEqual(data.currently_on_track, 1, 'Số phiếu đang mở đúng hạn là 1');
    assert.strictEqual(data.compliance_rate, 50.0, 'Tỷ lệ tuân thủ phải là 50%');
    assert.ok(data.avg_resolution_hours > 0, 'Thời gian xử lý TB MTTR phải > 0');
    assert.strictEqual(data.by_damage_level.critical.on_time, 1, 'Mức critical đúng hạn 1');
    console.log(`✓ PASS: Thống kê SLA: Tỷ lệ tuân thủ = ${data.compliance_rate}%, MTTR = ${data.avg_resolution_hours}h, Đang quá hạn = ${data.currently_overdue}`);
  }

  // ----------------------------------------------------
  // TEST 10: UC-5.9 - SLA Breach Scanner & Notifications (checkAndNotifyOverdueRepairs)
  // ----------------------------------------------------
  console.log('\n[Test 10] UC-5.9: Quét vi phạm SLA tự động & phát sinh Notification (checkAndNotifyOverdueRepairs)');
  {
    const mockOverdueRepair = {
      _id: new mongoose.Types.ObjectId(),
      ticket_code: 'REP-BREACH-01',
      status: REPAIR_STATUSES.IN_PROGRESS,
      deadline: new Date(Date.now() - 3600 * 1000),
      assigned_to: techId,
      equipment_id: { code: 'EQ-CAM-01', name: 'Camera AI Giám Sát' }
    };

    Repair.find = (filter) => createPopulateChain([mockOverdueRepair]);
    User.find = async (filter) => [{ _id: managerId, role: USER_ROLES.FACILITY_MANAGER }];

    const sentNotifs = [];
    Notification.findOne = async () => null; // Chưa có thông báo trong 24h
    Notification.create = async (doc) => {
      sentNotifs.push(doc);
      return doc;
    };

    const req = {};
    let jsonResult = null;
    const res = {
      status: (code) => res,
      json: (data) => { jsonResult = data; }
    };

    await checkAndNotifyOverdueRepairs(req, res);
    assert.ok(jsonResult.success, 'Quét vi phạm phải thành công');
    assert.strictEqual(jsonResult.overdue_tickets_count, 1, 'Phát hiện 1 phiếu trễ hạn');
    assert.strictEqual(jsonResult.notifications_sent, 2, 'Gửi 2 thông báo (1 KTV, 1 Manager)');
    assert.strictEqual(sentNotifs.length, 2);
    assert.strictEqual(sentNotifs[0].type, 'deadline_overdue', 'Loại thông báo là deadline_overdue');
    console.log(`✓ PASS: Đã quét phát hiện phiếu trễ hạn, tạo ${sentNotifs.length} thông báo cảnh báo SLA tới KTV và Manager thành công!`);
  }

  console.log('\n============================================================');
  console.log('TẤT CẢ 3/3 TESTS CHO WORKSTREAM 2 (UC-5.9, UC-7.1, UC-7.2) ĐÃ ĐẠT 100%!');
  console.log('TỔNG CỘNG 10/10 TESTS PHASE 3 ĐÃ VƯỢT QUA TOÀN DIỆN!');
  console.log('============================================================\n');
}

async function main() {
  await runWorkstream1Tests();
  await runWorkstream2Tests();
}

main().catch((err) => {
  console.error('XẢY RA LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
  process.exit(1);
});

