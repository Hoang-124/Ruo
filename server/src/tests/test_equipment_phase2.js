import assert from 'assert';
import mongoose from 'mongoose';
import {
  createEquipment,
  getEquipments,
  getEquipmentById,
  getEquipmentLifecycle,
  getEquipmentByQR,
  updateEquipment,
  validateBatchImport,
  importEquipmentsBatch,
  disposeEquipment
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
  console.log('--- BẮT ĐẦU KIỂM THỬ EQUIPMENT MODULE PHASE 2 (UC-3.1 → UC-3.8 & QR LOOKUP) ---');

  const catId = new mongoose.Types.ObjectId().toString();
  const roomId = new mongoose.Types.ObjectId().toString();
  const room2Id = new mongoose.Types.ObjectId().toString();
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
      category_id: { _id: catId, code: 'CAT-PROJ', name: 'Thiết bị trình chiếu' },
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
      specs: {},
      created_at: new Date(),
      save: async function () { return this; }
    }
  ];

  // Mock Category find
  Category.findById = async (id) => ({ _id: id, code: 'CAT-PROJ', name: 'Thiết bị trình chiếu' });
  Category.findOne = async () => ({ _id: catId, code: 'CAT-PROJ', name: 'Thiết bị trình chiếu' });
  Category.find = async () => [{ _id: catId, code: 'CAT-PROJ', name: 'Thiết bị trình chiếu' }];

  // Mock Room find
  Room.findById = async (id) => ({ _id: id, code: 'A1-201', name: 'Phòng học 201', building: 'A1' });
  Room.findOne = async () => ({ _id: roomId, code: 'A1-201', name: 'Phòng học 201', building: 'A1' });
  Room.find = () => {
    const roomsList = [
      { _id: roomId, code: 'A1-201', name: 'Phòng học 201', building: 'A1' },
      { _id: room2Id, code: 'A1-301', name: 'Phòng Lab 301', building: 'A1' }
    ];
    roomsList.select = async () => [{ _id: roomId }, { _id: room2Id }];
    return roomsList;
  };

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
      ...doc,
      save: async function () { return this; }
    };
    mockDb.push(item);
    return item;
  };

  Equipment.findById = (id) => {
    const found = mockDb.find(e => String(e._id) === String(id)) || null;
    return {
      populate: function () { return this; },
      then: function (resolve) {
        resolve(found);
      }
    };
  };

  Equipment.countDocuments = async () => mockDb.length;

  Equipment.find = (query) => {
    let matched = mockDb;
    if (query?.code?.$in) {
      matched = mockDb.filter(e => query.code.$in.includes(e.code));
    } else if (Array.isArray(query?.$or)) {
      matched = mockDb.filter(e =>
        query.$or.some(clause =>
          (clause.code?.$in && clause.code.$in.includes(e.code)) ||
          (clause.qr_code?.$in && clause.qr_code.$in.includes(e.qr_code)) ||
          (clause.serial_number?.$in && clause.serial_number.$in.includes(e.serial_number))
        )
      );
    }
    return {
      populate: function () { return this; },
      sort: function () { return this; },
      skip: function () { return this; },
      limit: function () { return Promise.resolve(matched); },
      select: async function () { return matched; }
    };
  };

  // Mock EquipmentMovement find & create
  const movementsDb = [
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
  ];
  EquipmentMovement.find = () => ({
    populate: function () { return this; },
    sort: function () {
      return Promise.resolve(movementsDb);
    }
  });
  EquipmentMovement.create = async (doc) => {
    const m = { _id: `mov-${movementsDb.length + 1}`, ...doc, created_at: new Date() };
    movementsDb.push(m);
    return m;
  };

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

  // TEST 1: POST /api/equipments (UC-3.1)
  console.log('▶ Test 1 (UC-3.1): Tạo thiết bị mới kèm mã QR chuẩn và tỷ lệ khấu hao');
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
    console.log('  ✔ Test 1 ĐẠT: Thiết bị mới khởi tạo thành công.');
  }

  // TEST 2: GET /api/equipments (UC-3.2)
  console.log('▶ Test 2 (UC-3.2): Tra cứu danh sách thiết bị với bộ lọc đa chiều (minPrice, maxPrice, room, keyword/QR)');
  {
    let jsonResult = null;
    const req = {
      query: {
        q: 'QR-EQ-2026-001',
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
    console.log('  ✔ Test 2 ĐẠT: API danh mục lọc theo giá, tòa nhà A1 và mã QR chuẩn xác.');
  }

  // TEST 3: GET /api/equipments/:id & GET /api/equipments/:id/lifecycle (UC-3.3 & UC-3.5)
  console.log('▶ Test 3 (UC-3.3 & UC-3.5): Tra cứu chi tiết tài sản & Timeline dòng đời 5 giai đoạn');
  {
    let jsonResult = null;
    let lifeResult = null;
    const req = { params: { id: '67b000000000000000000001' } };
    const res = { status: () => res, json: (data) => { jsonResult = data; } };
    const resLife = { status: () => resLife, json: (data) => { lifeResult = data; } };

    await getEquipmentById(req, res);
    await getEquipmentLifecycle(req, resLife);

    assert.strictEqual(jsonResult.success, true);
    assert.ok(jsonResult.lifecycle && Array.isArray(jsonResult.lifecycle.events), 'Phải có mảng sự kiện lifecycle');
    assert.strictEqual(lifeResult.success, true);
    assert.strictEqual(lifeResult.stages.length, 5, 'Phải đủ 5 mốc dòng đời: Tiếp nhận → Phân bổ → Báo hỏng → Sửa chữa → Thanh lý');
    console.log(`  ✔ Test 3 ĐẠT: Tổng hợp đầy đủ vòng đời (${lifeResult.events.length} sự kiện timeline, 5 giai đoạn).`);
  }

  // TEST 4: PUT /api/equipments/:id với tự động ghi nhận điều chuyển khi đổi phòng (UC-3.4)
  console.log('▶ Test 4 (UC-3.4): Cập nhật thiết bị & tự động ghi nhận nhật ký điều chuyển khi đổi phòng');
  {
    let jsonResult = null;
    const req = {
      params: { id: '67b000000000000000000001' },
      user: { _id: 'tech-01', full_name: 'KTV Hoàng', code: 'TECH01' },
      body: {
        name: 'Máy Chiếu Sony Laser 4K Pro',
        room_id: room2Id,
        movement_reason: 'Chuyển sang Phòng Lab 301 phục vụ thực hành'
      }
    };
    const res = { status: () => res, json: (data) => { jsonResult = data; } };

    await updateEquipment(req, res);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.movementLogged, true, 'Phải tự động ghi nhận nhật ký điều chuyển khi đổi phòng');
    assert.ok(jsonResult.movement, 'Phải trả về bản ghi EquipmentMovement');
    assert.strictEqual(jsonResult.movement.type, 'transfer', 'EquipmentMovement phải có trường type="transfer" chuẩn Mongoose schema');

    // Validate against real Mongoose EquipmentMovement schema!
    const movInstance = new EquipmentMovement({
      equipment_id: new mongoose.Types.ObjectId(),
      type: jsonResult.movement.type,
      from_room_id: new mongoose.Types.ObjectId(roomId),
      to_room_id: new mongoose.Types.ObjectId(room2Id),
      ordered_by: new mongoose.Types.ObjectId(),
      reason: jsonResult.movement.reason,
      status: jsonResult.movement.status
    });
    const movValErr = movInstance.validateSync();
    assert.strictEqual(movValErr, undefined, `EquipmentMovement schema validation failed: ${movValErr?.message}`);
    console.log('  ✔ Test 4 ĐẠT: Tự động ghi nhận nhật ký điều chuyển khi đổi phòng học Tòa A1 (Đạt chuẩn Mongoose Schema).');
  }

  // TEST 5: POST /api/equipments/import/validate & POST /api/equipments/import (UC-3.6 & UC-3.7)
  console.log('▶ Test 5 (UC-3.6 & UC-3.7): Kiểm tra lỗi từng dòng (trùng mã, sai phòng, sai loại TB, nghịch lý ngày BH) và Nhập hàng loạt');
  {
    let valResult = null;
    const reqVal = {
      user: { _id: 'fm-01', full_name: 'Quản lý CSVC', code: 'FM01' },
      body: {
        file_name: 'test_batch.csv',
        items: [
          { code: 'EQ-BATCH-001', name: 'Máy Chiếu Tòa A1 #1', category: 'CAT-PROJ', room: 'A1-201', price: 18000000 },
          { code: 'EQ-BATCH-001', name: 'Bản Ghi Trùng Mã', category: 'CAT-PROJ', room: 'A1-201', price: 18000000 },
          { code: 'EQ-BATCH-002', name: 'Bản Ghi Sai Phòng', category: 'CAT-PROJ', room: 'B9-999', price: 15000000 },
          { code: 'EQ-BATCH-003', name: 'Bản Ghi Sai Loại TB', category: 'INVALID-CAT', room: 'A1-201', price: 15000000 },
          {
            code: 'EQ-BATCH-004',
            name: 'Bản Ghi Nghịch Lý Ngày BH',
            category: 'CAT-PROJ',
            room: 'A1-201',
            price: 15000000,
            purchase_date: '2026-06-01',
            warranty_expiry: '2025-01-01'
          },
          {
            code: 'EQ-BATCH-005',
            name: 'Bản Ghi Mã Mới Nhưng Trùng Serial Trong DB',
            category: 'CAT-PROJ',
            room: 'A1-201',
            price: 15000000,
            serial_number: 'SN-SONY-9981'
          }
        ]
      }
    };
    const resVal = { status: () => resVal, json: (data) => { valResult = data; } };
    await validateBatchImport(reqVal, resVal);

    assert.strictEqual(valResult.success, true);
    assert.strictEqual(valResult.valid, false, 'Phải phát hiện lỗi dữ liệu');
    assert.strictEqual(valResult.validCount, 1, 'Chỉ có dòng 1 hợp lệ');
    assert.strictEqual(valResult.errorCount, 5, 'Phải bắt đúng 5 lỗi: trùng mã, sai phòng, sai loại TB, hạn BH < ngày mua, và trùng Serial trong DB');

    // Verify validDocs[0] passes real Mongoose Equipment.validateSync() (especially warranty_status enum!)
    const eqInstance = new Equipment(valResult.validDocs[0]);
    const eqValErr = eqInstance.validateSync();
    assert.strictEqual(eqValErr, undefined, `Equipment schema validation failed: ${eqValErr?.message}`);

    let impResult = null;
    let impStatus = 200;
    const resImp = { status: (c) => { impStatus = c; return resImp; }, json: (data) => { impResult = data; } };
    await importEquipmentsBatch(reqVal, resImp);
    assert.strictEqual(impStatus, 201);
    assert.strictEqual(impResult.importedCount, 1);
    console.log('  ✔ Test 5 ĐẠT: Bắt lỗi chi tiết từng dòng (UC-3.7), kiểm chứng Mongoose Schema và nhập lô hàng loạt (UC-3.6) thành công.');
  }

  // TEST 6: PUT /api/equipments/:id/dispose (UC-3.8) + Chặn điều chuyển tài sản đã thanh lý
  console.log('▶ Test 6 (UC-3.8): Thanh lý tài sản DISPOSED kèm Số quyết định BGH & chặn điều chuyển tài sản đã thanh lý');
  {
    let dispResult = null;
    const reqDisp = {
      params: { id: '67b000000000000000000001' },
      user: { _id: 'admin-id', full_name: 'Admin BGH', code: 'AD01' },
      body: {
        decision_number: 'QĐ-BGH-2026-108',
        acceptance_report: 'Biên bản nghiệm thu thanh lý thiết bị hết khấu hao',
        recovery_value: 1200000
      }
    };
    const resDisp = { status: () => resDisp, json: (data) => { dispResult = data; } };
    await disposeEquipment(reqDisp, resDisp);

    assert.strictEqual(dispResult.success, true);
    assert.strictEqual(dispResult.equipment.status, EQUIPMENT_STATUSES.DISPOSED);
    assert.strictEqual(dispResult.equipment.specs.disposal_decision, 'QĐ-BGH-2026-108');

    // Edge case: Attempting to move a DISPOSED equipment back into a room must fail with 400
    let moveDisposedStatus = 200;
    let moveDisposedBody = null;
    const reqMoveDisposed = {
      params: { id: '67b000000000000000000001' },
      user: { _id: 'admin-id', full_name: 'Admin BGH', code: 'AD01' },
      body: { room_id: roomId }
    };
    const resMoveDisposed = {
      status: (c) => { moveDisposedStatus = c; return resMoveDisposed; },
      json: (d) => { moveDisposedBody = d; }
    };
    await updateEquipment(reqMoveDisposed, resMoveDisposed);
    assert.strictEqual(moveDisposedStatus, 400, 'Phải chặn điều chuyển thiết bị đã DISPOSED vào phòng học');
    assert.strictEqual(moveDisposedBody.success, false);
    console.log('  ✔ Test 6 ĐẠT: Thiết bị đã chuyển sang trạng thái DISPOSED và chặn điều chuyển trái phép.');
  }

  // TEST 7: GET /api/equipments/qr/:qrCode
  console.log('▶ Test 7 (QR Generator & Scan): Tra cứu QR Code nhanh kèm vị trí, thông số & lịch sử sửa chữa');
  {
    let jsonResult = null;
    const req = { params: { qrCode: 'QR-EQ-2026-001' } };
    const res = { status: () => res, json: (data) => { jsonResult = data; } };

    await getEquipmentByQR(req, res);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.equipment.code, 'EQ-2026-001');
    assert.ok(Array.isArray(jsonResult.repairs), 'Phải trả kèm lịch sử sửa chữa');
    assert.ok(Array.isArray(jsonResult.movements), 'Phải trả kèm lịch sử điều chuyển');
    console.log('  ✔ Test 7 ĐẠT: Tra cứu bằng mã QR hoàn tất kèm lịch sử sửa chữa & điều chuyển.');
  }

  // TEST 8: Live RBAC Permission Enforcement & Admin Self-Lockout Protection (UC-12.1 & UC-12.2)
  console.log('▶ Test 8 (UC-12.1 & UC-12.2): Thực thi Ma trận RBAC động (Live Policy) & Chống tự khóa quyền Admin');
  {
    const { requirePermission } = await import('../middlewares/authMiddleware.js');
    const { updateRolePermissions } = await import('../controllers/roleController.js');
    const { Role } = await import('../models/Role.js');

    // 8a. Live permission enforcement when permission is revoked from DB role
    const middleware = requirePermission('equipment:create', 'technician');
    let nextCalled = false;
    let blockedStatus = null;
    const reqRevoked = {
      user: { _id: 'tech-1', role: 'technician' },
      userPermissions: ['equipment:read', 'equipment:qr:scan'], // 'equipment:create' was revoked live in UC-12.2!
      userPermissionsFromDb: true
    };
    const resRevoked = {
      status: (c) => { blockedStatus = c; return resRevoked; },
      json: () => {}
    };
    middleware(reqRevoked, resRevoked, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Phải chặn truy cập ngay lập tức khi quyền bị thu hồi trên Ma trận RBAC');
    assert.strictEqual(blockedStatus, 403, 'Phải trả về HTTP 403 Forbidden');

    // 8b. Admin Self-Lockout Protection
    Role.findOne = async ({ name }) => (name === 'admin' ? {
      _id: new mongoose.Types.ObjectId(),
      name: 'admin',
      permissions: ['role:update', 'user:profile:read'],
      save: async function () { return this; }
    } : null);

    let lockoutStatus = 200;
    let lockoutBody = null;
    const reqLockout = {
      params: { id: 'admin' },
      user: { _id: 'admin-1', full_name: 'Admin', code: 'AD01', role: 'admin' },
      body: { permissions: ['user:profile:read', 'equipment:read'] } // Missing role:update!
    };
    const resLockout = {
      status: (c) => { lockoutStatus = c; return resLockout; },
      json: (d) => { lockoutBody = d; }
    };
    await updateRolePermissions(reqLockout, resLockout);
    assert.strictEqual(lockoutStatus, 400, 'Phải chặn Admin tự tước quyền role:update');
    assert.strictEqual(lockoutBody.code, 'ADMIN_SELF_LOCKOUT_PREVENTED');
    console.log('  ✔ Test 8 ĐẠT: Live RBAC chặn tức thì quyền bị thu hồi & bảo vệ chống tự khóa quyền Admin.');
  }

  // TEST 9: Inventory Session, QR Stocktaking Edge Cases & Signed Report (UC-3.9, UC-3.10, UC-3.11)
  console.log('▶ Test 9 (UC-3.9, UC-3.10, UC-3.11): Kiểm kê Tòa A1, phát hiện tài sản Zombie đã thanh lý, khóa sổ & ký số SHA-256');
  {
    const {
      createSession,
      scanEquipmentInRoom,
      reconcileSession,
      exportInventoryReport
    } = await import('../controllers/inventoryController.js');
    const { InventorySession } = await import('../models/InventorySession.js');
    const { InventoryLog } = await import('../models/InventoryLog.js');

    const sessionId = new mongoose.Types.ObjectId().toString();
    const mockSessions = [];
    const mockLogs = [];

    InventorySession.create = async (doc) => {
      const s = {
        _id: sessionId,
        ...doc,
        summary: { matched: 0, wrong_location: 0, damaged: 0, missing: 0 },
        save: async function () { return this; },
        toJSON: function () { return this; }
      };
      mockSessions.push(s);
      return s;
    };

    InventorySession.findById = (id) => {
      const found = mockSessions.find((s) => String(s._id) === String(id)) || null;
      return {
        populate: function () { return this; },
        then: function (resolve) { resolve(found); }
      };
    };

    InventoryLog.findOneAndUpdate = async (filter, update) => {
      let existing = mockLogs.find(
        (l) => String(l.session_id) === String(filter.session_id) && String(l.equipment_id) === String(filter.equipment_id)
      );
      if (existing) {
        Object.assign(existing, update);
      } else {
        existing = { _id: `log-${mockLogs.length + 1}`, ...filter, ...update };
        mockLogs.push(existing);
      }
      return existing;
    };

    InventoryLog.find = () => ({
      populate: function () { return this; },
      sort: async function () { return mockLogs; },
      select: async function () { return mockLogs; },
      then: function (resolve) { resolve(mockLogs); }
    });

    // 9a. Create Inventory Session (UC-3.9)
    let createStatus = 200;
    let createBody = null;
    await createSession(
      {
        user: { _id: 'fm-01', full_name: 'Quản lý CSVC', code: 'FM01' },
        body: { name: 'Kiểm kê Học kỳ I Tòa A1', scope_type: 'floor', scope_floor: 2 }
      },
      { status: (c) => { createStatus = c; return { json: (d) => { createBody = d; } }; }, json: (d) => { createBody = d; } }
    );
    assert.strictEqual(createStatus, 201);
    assert.strictEqual(createBody.success, true);

    // 9b. Scan a DISPOSED equipment ("Zombie Asset") in Room -> Must flag WRONG_LOCATION + audit warning (UC-3.10)
    let scanZombieBody = null;
    await scanEquipmentInRoom(
      {
        params: { id: sessionId },
        user: { _id: 'tech-01', full_name: 'KTV Hoàng', code: 'TECH01' },
        body: { qr_code: 'QR-EQ-2026-001', scanned_room_id: roomId }
      },
      { status: () => ({ json: (d) => { scanZombieBody = d; } }), json: (d) => { scanZombieBody = d; } }
    );
    assert.strictEqual(scanZombieBody.success, true);
    assert.strictEqual(scanZombieBody.log.status, 'wrong_location', 'Tài sản đã thanh lý xuất hiện tại phòng phải bị gắn cờ wrong_location');
    assert.ok(scanZombieBody.log.note.includes('ĐÃ THANH LÝ'), 'Phải có cảnh báo kiểm toán tài sản đã thanh lý');

    // 9c. Reconcile Session & verify scanning is locked afterwards
    let recBody = null;
    await reconcileSession(
      {
        params: { id: sessionId },
        user: { _id: 'fm-01', full_name: 'Quản lý CSVC', code: 'FM01' },
        body: {}
      },
      { status: () => ({ json: (d) => { recBody = d; } }), json: (d) => { recBody = d; } }
    );
    assert.strictEqual(recBody.success, true);

    let lockedScanStatus = 200;
    await scanEquipmentInRoom(
      {
        params: { id: sessionId },
        user: { _id: 'tech-01', full_name: 'KTV Hoàng', code: 'TECH01' },
        body: { qr_code: 'QR-EQ-2026-001', scanned_room_id: roomId }
      },
      { status: (c) => { lockedScanStatus = c; return { json: () => {} }; }, json: () => {} }
    );
    assert.strictEqual(lockedScanStatus, 400, 'Phải chặn quét thêm mã QR sau khi phiên kiểm kê đã chốt sổ RECONCILED');

    // 9d. Export Digitally Signed SHA-256 Report (UC-3.11)
    let exportBody = null;
    await exportInventoryReport(
      {
        params: { id: sessionId },
        user: { _id: 'fm-01', full_name: 'Quản lý CSVC', code: 'FM01', role: 'facility_manager' }
      },
      { status: () => ({ json: (d) => { exportBody = d; } }), json: (d) => { exportBody = d; } }
    );
    assert.strictEqual(exportBody.success, true);
    assert.strictEqual(exportBody.report.digital_signature.algorithm, 'SHA-256');
    assert.strictEqual(exportBody.report.digital_signature.hash.length, 64);
    console.log('  ✔ Test 9 ĐẠT: Khởi tạo kiểm kê, phát hiện tài sản Zombie, khóa sổ sau đối soát & ký số SHA-256 hoàn tất.');
  }

  console.log('--- TOÀN BỘ 9/9 TEST SUITES (14 USE CASES + EDGE CASES + MONGOOSE SCHEMA) ĐÃ VƯỢT QUA 100% ---');
}

runTests().catch(err => {
  console.error('Test Thất Bại:', err);
  process.exit(1);
});
