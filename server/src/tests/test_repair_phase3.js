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
  getEquipmentRepairHistory
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

runWorkstream1Tests().catch((err) => {
  console.error('XẢY RA LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
  process.exit(1);
});
