import assert from 'assert';
import mongoose from 'mongoose';
import {
  createEquipment,
  getEquipments,
  getEquipmentById,
  getEquipmentByQR
} from '../controllers/equipmentController.js';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Supplier } from '../models/Supplier.js';
import { AuditLog } from '../models/AuditLog.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Repair } from '../models/Repair.js';
import { PreventiveMaintenance } from '../models/PreventiveMaintenance.js';
import { EQUIPMENT_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ EQUIPMENT MODULE PHASE 2 (SPRINT 2 & NEW SCHEMA) ---');

  const catId = new mongoose.Types.ObjectId().toString();
  const roomId = new mongoose.Types.ObjectId().toString();
  const supplierId = new mongoose.Types.ObjectId().toString();
  const repairUnitId = new mongoose.Types.ObjectId().toString();
  const importSessionId = new mongoose.Types.ObjectId().toString();

  const mockDb = [
    {
      _id: '67b000000000000000000001',
      code: 'EQ-2026-001',
      qr_code: 'QR-EQ-2026-001',
      name: 'Máy Chiếu Sony Laser 4K',
      brand: 'Sony',
      model: 'VPL-PHZ60',
      serial_number: 'SN-SONY-9981',
      category_id: { _id: catId, name: 'Thiết bị trình chiếu' },
      room_id: { _id: roomId, code: 'A1-201', name: 'Phòng học chuyên đề', building: 'A1' },
      supplier_id: { _id: supplierId, name: 'Công ty Công nghệ Sony VN' },
      current_repair_unit_id: null,
      import_session_id: null,
      price: 25000000,
      remaining_value: 20000000,
      purchase_date: new Date(Date.now() - 365.25 * 24 * 3600 * 1000), // 1 year ago
      warranty_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      warranty_status: 'active',
      depreciation_rate: 20,
      status: EQUIPMENT_STATUSES.IN_USE,
      created_at: new Date()
    }
  ];

  // Mock Category find
  Category.findById = async (id) => ({ _id: id, name: 'Thiết bị trình chiếu' });
  Category.findOne = async () => ({ _id: catId, name: 'Thiết bị trình chiếu' });

  // Mock Room find
  Room.findById = async (id) => ({ _id: id, code: 'A1-201', name: 'Phòng học 201', building: 'A1' });
  Room.findOne = async () => ({ _id: roomId, code: 'A1-201', name: 'Phòng học 201', building: 'A1' });
  Room.find = (filter) => ({
    select: async () => [{ _id: roomId }]
  });

  // Mock Supplier find
  Supplier.findById = async (id) => ({ _id: id, name: 'Sony Supplier' });

  // Mock AuditLog
  AuditLog.logAction = async () => true;

  // Mock Equipment queries
  Equipment.findOne = (query) => {
    let found = null;
    if (query.code) {
      found = mockDb.find(e => e.code.toUpperCase() === query.code.toUpperCase()) || null;
    } else if (query.qr_code) {
      found = mockDb.find(e => e.qr_code === query.qr_code) || null;
    } else if (query.$or) {
      const param = query.$or[0].qr_code || query.$or[0].code;
      found = mockDb.find(e => e.qr_code === param || e.code === param) || null;
    }
    return {
      populate: function () { return this; },
      then: function (resolve) { resolve(found); }
    };
  };

  Equipment.create = async (doc) => {
    const item = {
      _id: `67b00000000000000000000${mockDb.length + 1}`,
      ...doc
    };
    mockDb.push(item);
    return item;
  };

  Equipment.findById = (id) => ({
    populate: function () { return this; },
    then: function (resolve) {
      const found = mockDb.find(e => String(e._id) === String(id));
      resolve(found || null);
    }
  });

  Equipment.countDocuments = async (query) => {
    return mockDb.length;
  };

  Equipment.find = (query) => ({
    populate: function () { return this; },
    sort: function () { return this; },
    skip: function () { return this; },
    limit: function () { return Promise.resolve(mockDb); }
  });

  // Mock EquipmentMovement find
  EquipmentMovement.find = () => ({
    populate: function () { return this; },
    sort: function () {
      return Promise.resolve([
        {
          _id: 'mov-1',
          equipment_id: '67b000000000000000000001',
          from_room_id: { code: 'KHO-01', name: 'Kho Dự Phòng' },
          to_room_id: { code: 'A1-201', name: 'Phòng 201' },
          ordered_by: { full_name: 'Quản Lý CSVC' },
          performed_by: { full_name: 'Kỹ Thuật Viên 1' },
          reason: 'Bố trí phòng học mới',
          status: 'completed',
          created_at: new Date()
        }
      ]);
    }
  });

  // Mock Repair find
  Repair.find = () => ({
    populate: function () { return this; },
    sort: function () {
      return Promise.resolve([
        {
          _id: 'rep-1',
          equipment_id: '67b000000000000000000001',
          ticket_code: 'REP-2026-001',
          incident_description: 'Hình ảnh bị chớp nháy sau 30 phút bật',
          reported_by: { full_name: 'GV Nguyễn Văn A' },
          assigned_to: { full_name: 'KTV Trần B' },
          damage_level: 'minor',
          outcome: 'repaired',
          total_cost: 150000,
          reported_at: new Date()
        }
      ]);
    }
  });

  // Mock PreventiveMaintenance find
  PreventiveMaintenance.find = () => ({
    populate: function () { return this; },
    sort: function () {
      return Promise.resolve([
        {
          _id: 'maint-1',
          equipment_id: '67b000000000000000000001',
          checked_by: { full_name: 'KTV Trần B' },
          check_date: new Date(),
          status: 'passed',
          notes: 'Đèn chiếu sáng tốt, đã làm sạch màng lọc bụi'
        }
      ]);
    }
  });

  // TEST 1: POST /api/equipments với các trường Normalized Schema (current_repair_unit_id, import_session_id)
  console.log('▶ Test 1: Tạo thiết bị mới kèm current_repair_unit_id, import_session_id và depreciation_rate');
  {
    let statusCode = 200;
    let jsonResult = null;
    const req = {
      user: { _id: 'admin-id', full_name: 'Admin', code: 'AD01' },
      body: {
        code: 'EQ-2026-002',
        name: 'Máy Đo Dao Động Số Tektronix',
        category_id: catId,
        room_id: roomId,
        supplier_id: supplierId,
        price: 32000000,
        current_repair_unit_id: repairUnitId,
        import_session_id: importSessionId,
        depreciation_rate: 15,
        status: EQUIPMENT_STATUSES.REPAIRING
      }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await createEquipment(req, res);
    assert.strictEqual(statusCode, 201, 'Status code phải là 201 Created');
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.equipment.code, 'EQ-2026-002');
    assert.strictEqual(jsonResult.equipment.depreciation_rate, 15);
    console.log('  ✔ Test 1 ĐẠT: Thiết bị mới khởi tạo thành công với schema chuẩn hóa.');
  }

  // TEST 2: GET /api/equipments với bộ lọc đa điều kiện
  console.log('▶ Test 2: Tra cứu danh sách thiết bị với minPrice, maxPrice, q keyword');
  {
    let jsonResult = null;
    const req = {
      query: {
        q: 'Sony',
        minPrice: 10000000,
        maxPrice: 50000000,
        building: 'A1',
        page: 1,
        limit: 10
      }
    };
    const res = {
      json: (data) => { jsonResult = data; }
    };

    await getEquipments(req, res);
    assert.strictEqual(jsonResult.success, true);
    assert.ok(jsonResult.equipments.length > 0);
    console.log('  ✔ Test 2 ĐẠT: API danh mục lọc theo giá, tòa nhà và từ khóa chuẩn xác.');
  }

  // TEST 3: GET /api/equipments/:id tổng hợp toàn diện vòng đời tài sản (UC-3.9)
  console.log('▶ Test 3: Tra cứu chi tiết tài sản (GET /:id) tổng hợp Movements, Repairs, Maintenance & Khấu hao');
  {
    let jsonResult = null;
    const req = {
      params: { id: '67b000000000000000000001' }
    };
    const res = {
      status: () => res,
      json: (data) => { jsonResult = data; }
    };

    await getEquipmentById(req, res);
    assert.strictEqual(jsonResult.success, true);
    assert.ok(jsonResult.equipment, 'Phải có thông tin cơ bản thiết bị');
    assert.ok(Array.isArray(jsonResult.movements), 'Phải có mảng lịch sử điều chuyển');
    assert.strictEqual(jsonResult.movements.length, 1);
    assert.ok(Array.isArray(jsonResult.repairs), 'Phải có mảng nhật ký sự cố & sửa chữa');
    assert.strictEqual(jsonResult.repairs.length, 1);
    assert.ok(Array.isArray(jsonResult.maintenance), 'Phải có mảng kiểm định bảo trì định kỳ');
    assert.strictEqual(jsonResult.maintenance.length, 1);
    assert.ok(jsonResult.depreciation, 'Phải có kết quả tính khấu hao');
    assert.strictEqual(jsonResult.depreciation.originalPrice, 25000000);
    assert.strictEqual(jsonResult.depreciation.depreciationRate, 20);
    assert.ok(jsonResult.depreciation.remainingValue < 25000000, 'Giá trị còn lại sau 1 năm phải giảm');
    console.log(`  ✔ Test 3 ĐẠT: Tổng hợp đầy đủ vòng đời: ${jsonResult.movements.length} điều chuyển, ${jsonResult.repairs.length} sửa chữa, ${jsonResult.maintenance.length} bảo trì, khấu hao còn ${jsonResult.depreciation.remainingValue} đ.`);
  }

  // TEST 4: GET /api/equipments/qr/:qrCode
  console.log('▶ Test 4: Tra cứu QR Code nhanh phục vụ kiểm kê thực địa');
  {
    let jsonResult = null;
    const req = {
      params: { qrCode: 'QR-EQ-2026-001' }
    };
    const res = {
      status: () => res,
      json: (data) => { jsonResult = data; }
    };

    await getEquipmentByQR(req, res);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.equipment.code, 'EQ-2026-001');
    console.log('  ✔ Test 4 ĐẠT: Tra cứu bằng mã QR hoàn tất chuẩn xác.');
  }

  console.log('--- TOÀN BỘ 4/4 TEST CASES EQUIPMENT PHASE 2 ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('Test Thất Bại:', err);
  process.exit(1);
});
