import assert from 'assert';
import mongoose from 'mongoose';
import { getEquipments, updateEquipment } from '../controllers/equipmentController.js';
import { hasGrantedPermission } from '../middlewares/authMiddleware.js';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Supplier } from '../models/Supplier.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES, EQUIPMENT_STATUSES, MOVEMENT_TYPES, MOVEMENT_STATUSES } from '../config/constants.js';

async function runTests() {
  console.log('\n--- BẮT ĐẦU KIỂM THỬ UC-3.2: EQUIPMENT DIRECTORY & MOVEMENT TRACKING ---\n');

  // Setup In-Memory Mock Dataset
  const catDisplays = { _id: new mongoose.Types.ObjectId(), name: 'Thiết bị hiển thị', code: 'DISP' };
  const catNetwork = { _id: new mongoose.Types.ObjectId(), name: 'Thiết bị mạng', code: 'NETW' };
  const catComputing = { _id: new mongoose.Types.ObjectId(), name: 'Máy tính & Máy chủ', code: 'COMP' };

  const roomA1_201 = { _id: new mongoose.Types.ObjectId(), code: 'A1-201', name: 'Lab Đa Phương Tiện', building: 'A1', floor: 2, status: 'active' };
  const roomA1_302 = { _id: new mongoose.Types.ObjectId(), code: 'A1-302', name: 'Giảng Đường Lớn', building: 'A1', floor: 3, status: 'active' };

  let mockEquipments = [
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'EQ-DISP-001',
      qr_code: 'QR-EQ-DISP-001',
      name: 'Máy Chiếu Laser Panasonic PT-MZ880',
      category_id: catDisplays._id,
      room_id: roomA1_201._id,
      brand: 'Panasonic',
      model: 'PT-MZ880',
      serial_number: 'SN-PANA-98124',
      price: 28000000,
      status: EQUIPMENT_STATUSES.IN_USE,
      warranty_status: 'active',
      purchase_date: new Date('2025-01-15'),
      warranty_expiry: new Date('2027-01-15'),
      created_at: new Date('2025-01-15T08:00:00Z'),
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'EQ-NETW-002',
      qr_code: 'QR-EQ-NETW-002',
      name: 'Switch Cisco Catalyst 2960X 48 Port',
      category_id: catNetwork._id,
      room_id: roomA1_201._id,
      brand: 'Cisco',
      model: 'WS-C2960X-48TS-L',
      serial_number: 'SN-CISCO-44129',
      price: 18500000,
      status: EQUIPMENT_STATUSES.IN_USE,
      warranty_status: 'active',
      purchase_date: new Date('2025-02-10'),
      warranty_expiry: new Date('2028-02-10'),
      created_at: new Date('2025-02-10T09:30:00Z'),
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'EQ-COMP-003',
      qr_code: 'QR-EQ-COMP-003',
      name: 'Máy Chủ Dell PowerEdge R740',
      category_id: catComputing._id,
      room_id: null, // Trong kho dự phòng
      brand: 'Dell',
      model: 'PowerEdge R740',
      serial_number: 'SN-DELL-88231',
      price: 65000000,
      status: EQUIPMENT_STATUSES.IN_STOCK,
      warranty_status: 'active',
      purchase_date: new Date('2025-03-01'),
      warranty_expiry: new Date('2028-03-01'),
      created_at: new Date('2025-03-01T10:00:00Z'),
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'EQ-DISP-004',
      qr_code: 'QR-EQ-DISP-004',
      name: 'Màn Hình Cảm Ứng Tương Tác ViewSonic 75 inch',
      category_id: catDisplays._id,
      room_id: roomA1_302._id,
      brand: 'ViewSonic',
      model: 'IFP7550-3',
      serial_number: 'SN-VIEW-55219',
      price: 45000000,
      status: EQUIPMENT_STATUSES.UNDER_MAINTENANCE,
      warranty_status: 'expired',
      purchase_date: new Date('2023-01-10'),
      warranty_expiry: new Date('2024-01-10'),
      created_at: new Date('2023-01-10T14:00:00Z'),
      save: async function() { return this; }
    }
  ];

  let mockMovements = [];
  let loggedAuditActions = [];

  AuditLog.logAction = async (payload) => {
    loggedAuditActions.push(payload);
    return payload;
  };

  Category.findById = (id) => {
    if (String(id) === String(catDisplays._id)) return Promise.resolve(catDisplays);
    if (String(id) === String(catNetwork._id)) return Promise.resolve(catNetwork);
    if (String(id) === String(catComputing._id)) return Promise.resolve(catComputing);
    return Promise.resolve(null);
  };

  Category.findOne = (query) => {
    if (query.$or) {
      const codeOrName = query.$or[0]?.code;
      if (codeOrName === 'DISP') return Promise.resolve(catDisplays);
      if (codeOrName === 'NETW') return Promise.resolve(catNetwork);
      if (codeOrName === 'COMP') return Promise.resolve(catComputing);
    }
    return Promise.resolve(catDisplays);
  };

  Room.findById = (id) => {
    if (String(id) === String(roomA1_201._id)) return Promise.resolve(roomA1_201);
    if (String(id) === String(roomA1_302._id)) return Promise.resolve(roomA1_302);
    return Promise.resolve(null);
  };

  Room.findOne = (query) => {
    if (query.code === 'A1-201') return Promise.resolve(roomA1_201);
    if (query.code === 'A1-302') return Promise.resolve(roomA1_302);
    return Promise.resolve(null);
  };

  Room.find = () => Promise.resolve([roomA1_201, roomA1_302]);

  EquipmentMovement.create = async (doc) => {
    const item = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      created_at: new Date()
    };
    mockMovements.push(item);
    return item;
  };

  // Mock Equipment.countDocuments and Equipment.find with flexible in-memory filtering
  Equipment.countDocuments = async (query = {}) => {
    let filtered = [...mockEquipments];
    if (query.category_id) {
      filtered = filtered.filter(e => String(e.category_id) === String(query.category_id));
    }
    if (query.status) {
      filtered = filtered.filter(e => e.status === query.status);
    }
    if (query.room_id !== undefined) {
      filtered = filtered.filter(e => query.room_id === null ? e.room_id === null : String(e.room_id) === String(query.room_id));
    }
    if (query.price) {
      if (query.price.$gte !== undefined) filtered = filtered.filter(e => e.price >= query.price.$gte);
      if (query.price.$lte !== undefined) filtered = filtered.filter(e => e.price <= query.price.$lte);
    }
    if (query.qr_code && query.qr_code.$regex) {
      const reg = new RegExp(query.qr_code.$regex, query.qr_code.$options || 'i');
      filtered = filtered.filter(e => reg.test(e.qr_code));
    }
    if (query.$or) {
      filtered = filtered.filter(e => {
        return query.$or.some(clause => {
          for (const key of Object.keys(clause)) {
            if (clause[key]?.$regex) {
              const reg = new RegExp(clause[key].$regex, clause[key].$options || 'i');
              if (reg.test(String(e[key] || ''))) return true;
            }
          }
          return false;
        });
      });
    }
    return filtered.length;
  };

  Equipment.find = (query = {}) => {
    let filtered = [...mockEquipments];
    if (query.category_id) {
      filtered = filtered.filter(e => String(e.category_id) === String(query.category_id));
    }
    if (query.status) {
      filtered = filtered.filter(e => e.status === query.status);
    }
    if (query.room_id !== undefined) {
      filtered = filtered.filter(e => query.room_id === null ? e.room_id === null : String(e.room_id) === String(query.room_id));
    }
    if (query.price) {
      if (query.price.$gte !== undefined) filtered = filtered.filter(e => e.price >= query.price.$gte);
      if (query.price.$lte !== undefined) filtered = filtered.filter(e => e.price <= query.price.$lte);
    }
    if (query.qr_code && query.qr_code.$regex) {
      const reg = new RegExp(query.qr_code.$regex, query.qr_code.$options || 'i');
      filtered = filtered.filter(e => reg.test(e.qr_code));
    }
    if (query.$or) {
      filtered = filtered.filter(e => {
        return query.$or.some(clause => {
          for (const key of Object.keys(clause)) {
            if (clause[key]?.$regex) {
              const reg = new RegExp(clause[key].$regex, clause[key].$options || 'i');
              if (reg.test(String(e[key] || ''))) return true;
            }
          }
          return false;
        });
      });
    }

    const chain = {
      populate: function() { return chain; },
      sort: function(criteria) {
        if (criteria?.price) {
          filtered.sort((a, b) => (criteria.price === 1 ? a.price - b.price : b.price - a.price));
        } else {
          filtered.sort((a, b) => b.created_at - a.created_at);
        }
        return chain;
      },
      skip: function(offset) {
        filtered = filtered.slice(offset);
        return chain;
      },
      limit: function(lim) {
        filtered = filtered.slice(0, lim);
        return chain;
      },
      then: function(resolve) {
        resolve(filtered);
      }
    };
    return chain;
  };

  Equipment.findById = (id) => {
    const found = mockEquipments.find(e => String(e._id) === String(id));
    const chain = {
      populate: function() { return chain; },
      then: function(resolve) {
        resolve(found || null);
      }
    };
    return chain;
  };

  Equipment.findOne = (query) => {
    const found = mockEquipments.find(e => {
      if (query.code && e.code === query.code) return true;
      if (query.qr_code && e.qr_code === query.qr_code) return true;
      return false;
    });
    const chain = {
      populate: function() { return chain; },
      then: function(resolve) {
        resolve(found || null);
      }
    };
    return chain;
  };

  // Helper response mock
  const createMockRes = () => {
    return {
      statusCode: 200,
      data: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(payload) {
        this.data = payload;
        return this;
      }
    };
  };

  // ==========================================
  // TEST 1: Directory Pagination & Metadata
  // ==========================================
  console.log('▶ Test 1 (UC-3.2): Tra cứu danh mục tài sản kèm phân trang chuẩn & metadata');
  {
    const req = {
      query: { page: '1', limit: '2' },
      user: { _id: 'u-admin', role: 'admin' },
      hasPermission: () => true
    };
    const res = createMockRes();
    await getEquipments(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.total, 4);
    assert.strictEqual(res.data.page, 1);
    assert.strictEqual(res.data.limit, 2);
    assert.strictEqual(res.data.totalPages, 2);
    assert.strictEqual(res.data.hasPrevPage, false);
    assert.strictEqual(res.data.hasNextPage, true);
    assert.strictEqual(res.data.equipments.length, 2);
    console.log('  ✔ Test 1 ĐẠT: Phân trang trả về đầy đủ metadata (total: 4, page: 1, limit: 2, totalPages: 2).');
  }

  // ==========================================
  // TEST 2: Multi-field Keyword Search (Name, Code, Model, Brand)
  // ==========================================
  console.log('\n▶ Test 2 (UC-3.2): Tìm kiếm thiết bị theo từ khóa (Tên, Model, Serial, Brand)');
  {
    const req = {
      query: { search: 'Panasonic' },
      user: { _id: 'u-mgr', role: 'facility_manager' },
      hasPermission: () => true
    };
    const res = createMockRes();
    await getEquipments(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.total, 1);
    assert.strictEqual(res.data.equipments[0].code, 'EQ-DISP-001');
    assert.strictEqual(res.data.equipments[0].brand, 'Panasonic');
    console.log('  ✔ Test 2 ĐẠT: Tìm kiếm theo hãng "Panasonic" trả về chính xác máy chiếu PT-MZ880.');
  }

  // ==========================================
  // TEST 3: Search by QR Code
  // ==========================================
  console.log('\n▶ Test 3 (UC-3.2): Tìm kiếm thiết bị theo Mã QR chuẩn hóa (QR-EQ-...)');
  {
    const req = {
      query: { qr_code: 'QR-EQ-NETW-002' },
      user: { _id: 'u-tech', role: 'technician' },
      hasPermission: () => true
    };
    const res = createMockRes();
    await getEquipments(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.total, 1);
    assert.strictEqual(res.data.equipments[0].code, 'EQ-NETW-002');
    assert.strictEqual(res.data.equipments[0].name, 'Switch Cisco Catalyst 2960X 48 Port');
    console.log('  ✔ Test 3 ĐẠT: Tìm kiếm bằng mã QR định danh chuẩn khớp chính xác Switch Cisco.');
  }

  // ==========================================
  // TEST 4: Multi-dimensional Filters (Category, Status, Room, Price Range)
  // ==========================================
  console.log('\n▶ Test 4 (UC-3.2): Bộ lọc đa chiều (Chủng loại, Trạng thái, Phòng học, Tầm giá)');
  {
    // Filter by Price range: 20 triệu - 50 triệu
    const reqPrice = {
      query: { min_price: '20000000', max_price: '50000000' },
      user: { _id: 'u-admin', role: 'admin' },
      hasPermission: () => true
    };
    const resPrice = createMockRes();
    await getEquipments(reqPrice, resPrice);

    assert.strictEqual(resPrice.statusCode, 200);
    assert.strictEqual(resPrice.data.total, 2); // 28M (Panasonic) & 45M (ViewSonic)
    const codes = resPrice.data.equipments.map(e => e.code);
    assert.ok(codes.includes('EQ-DISP-001'));
    assert.ok(codes.includes('EQ-DISP-004'));
    console.log('  ✔ Test 4.1 ĐẠT: Lọc theo tầm giá (20M - 50M) trả về chính xác 2 thiết bị.');

    // Filter by Room: Kho dự phòng (room_id: 'warehouse' hoặc null)
    const reqStock = {
      query: { room_id: 'warehouse', status: EQUIPMENT_STATUSES.IN_STOCK },
      user: { _id: 'u-admin', role: 'admin' },
      hasPermission: () => true
    };
    const resStock = createMockRes();
    await getEquipments(reqStock, resStock);

    assert.strictEqual(resStock.statusCode, 200);
    assert.strictEqual(resStock.data.total, 1);
    assert.strictEqual(resStock.data.equipments[0].code, 'EQ-COMP-003');
    console.log('  ✔ Test 4.2 ĐẠT: Lọc kho dự phòng & trạng thái IN_STOCK trả về Máy chủ Dell.');
  }

  // ==========================================
  // TEST 5: Accessible to All 4 Roles (Admin, Manager, Technician, Lecturer)
  // ==========================================
  console.log('\n▶ Test 5 (UC-3.2): Quyền tra cứu danh mục tài sản mở cho cả 4 vai trò chính thức');
  {
    const roles = [
      USER_ROLES.ADMIN,
      USER_ROLES.FACILITY_MANAGER,
      USER_ROLES.TECHNICIAN,
      USER_ROLES.LECTURER
    ];

    for (const role of roles) {
      const req = {
        query: { page: 1, limit: 10 },
        user: { _id: `u-${role}`, role },
        hasPermission: (perm) => perm === 'equipment:read'
      };
      const res = createMockRes();
      await getEquipments(req, res);

      assert.strictEqual(res.statusCode, 200, `Vai trò ${role} phải được phép đọc danh mục tài sản`);
      assert.strictEqual(res.data.success, true);
    }
    console.log('  ✔ Test 5 ĐẠT: Cả 4 vai trò (Admin, Quản lý CSVC, KTV, Giảng viên) đều tra cứu được danh mục.');
  }

  // ==========================================
  // TEST 6: Dynamic RBAC Guard on equipment:read (HTTP 403 when revoked)
  // ==========================================
  console.log('\n▶ Test 6 (UC-3.2 & UC-12.2): Chặn truy cập nếu bị thu hồi quyền equipment:read (HTTP 403)');
  {
    const req = {
      query: {},
      user: { _id: 'u-restricted', role: USER_ROLES.LECTURER },
      hasPermission: (perm) => false // Bị thu hồi quyền equipment:read
    };
    const res = createMockRes();
    await getEquipments(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('equipment:read'));
    console.log('  ✔ Test 6 ĐẠT: Trả về HTTP 403 Forbidden khi người dùng bị thu hồi quyền equipment:read.');
  }

  // ==========================================
  // TEST 7: PUT /api/equipments/:id with Automatic Movement Tracking
  // ==========================================
  console.log('\n▶ Test 7 (UC-3.2 & UC-3.4): Cập nhật thiết bị và tự động ghi vết điều chuyển (Movement Tracking)');
  {
    // Case 7.1: Điều chuyển từ phòng A1-201 sang phòng A1-302 (TRANSFER)
    const eqToMove = mockEquipments[0]; // EQ-DISP-001 đang ở A1-201
    const reqTransfer = {
      params: { id: eqToMove._id.toString() },
      body: {
        room_id: roomA1_302._id.toString(),
        movement_reason: 'Điều chuyển máy chiếu phục vụ hội thảo khoa học tại A1-302'
      },
      user: { _id: 'u-tech-01', full_name: 'Nguyễn Văn Kỹ Thuật', code: 'TECH01', role: 'technician' }
    };
    const resTransfer = createMockRes();
    await updateEquipment(reqTransfer, resTransfer);

    assert.strictEqual(resTransfer.statusCode, 200);
    assert.strictEqual(resTransfer.data.success, true);
    assert.strictEqual(resTransfer.data.movementLogged, true);
    assert.strictEqual(resTransfer.data.movementTracked, true);
    assert.ok(resTransfer.data.movement);
    assert.strictEqual(resTransfer.data.movement.type, MOVEMENT_TYPES.TRANSFER);
    assert.strictEqual(String(resTransfer.data.movement.from_room_id), String(roomA1_201._id));
    assert.strictEqual(String(resTransfer.data.movement.to_room_id), String(roomA1_302._id));
    assert.strictEqual(resTransfer.data.movement.status, MOVEMENT_STATUSES.COMPLETED);
    console.log('  ✔ Test 7.1 ĐẠT: Tự động ghi nhật ký điều chuyển TRANSFER (A1-201 → A1-302) kèm lý do.');

    // Case 7.2: Thu hồi thiết bị từ phòng về Kho dự phòng (TO_STOCK)
    const reqToStock = {
      params: { id: eqToMove.code }, // Test lookup by asset code!
      body: {
        room_id: 'warehouse',
        movement_reason: 'Thu hồi về kho để bảo dưỡng định kỳ'
      },
      user: { _id: 'u-mgr-01', full_name: 'Trần Quản Lý', code: 'MGR01', role: 'facility_manager' }
    };
    const resToStock = createMockRes();
    await updateEquipment(reqToStock, resToStock);

    assert.strictEqual(resToStock.statusCode, 200);
    assert.strictEqual(resToStock.data.movementLogged, true);
    assert.strictEqual(resToStock.data.movement.type, MOVEMENT_TYPES.TO_STOCK);
    assert.strictEqual(resToStock.data.movement.to_room_id, null);
    assert.strictEqual(eqToMove.status, EQUIPMENT_STATUSES.IN_STOCK);
    console.log('  ✔ Test 7.2 ĐẠT: Tra cứu bằng Mã tài sản và tự động ghi nhận TO_STOCK về kho dự phòng.');

    // Case 7.3: Bàn giao từ Kho dự phòng vào phòng học (ALLOCATION)
    const eqStock = mockEquipments[2]; // Dell Server đang ở kho (room_id: null)
    const reqAlloc = {
      params: { id: eqStock._id.toString() },
      body: {
        room_id: roomA1_201._id.toString(),
        movement_reason: 'Bàn giao máy chủ đưa vào sử dụng thực tế tại Lab A1-201'
      },
      user: { _id: 'u-admin-01', full_name: 'Admin Tổng', code: 'ADMIN01', role: 'admin' }
    };
    const resAlloc = createMockRes();
    await updateEquipment(reqAlloc, resAlloc);

    assert.strictEqual(resAlloc.statusCode, 200);
    assert.strictEqual(resAlloc.data.movementLogged, true);
    assert.strictEqual(resAlloc.data.movement.type, MOVEMENT_TYPES.ALLOCATION);
    assert.strictEqual(resAlloc.data.movement.from_room_id, null);
    assert.strictEqual(String(resAlloc.data.movement.to_room_id), String(roomA1_201._id));
    assert.strictEqual(eqStock.status, EQUIPMENT_STATUSES.IN_USE);
    console.log('  ✔ Test 7.3 ĐẠT: Bàn giao thiết bị từ kho vào phòng phân loại chuẩn ALLOCATION.');
  }

  // ==========================================
  // TEST 8: Role Protection on Equipment Movement & Update
  // ==========================================
  console.log('\n▶ Test 8 (UC-3.2 & UC-12.1): Chặn Giảng viên cập nhật vị trí thiết bị (equipment:update required)');
  {
    // Giảng viên chỉ có quyền đọc và báo hỏng, không có quyền equipment:update
    const lecturerPerms = ['equipment:read', 'equipment:report', 'ticket:create'];
    const canRead = hasGrantedPermission(lecturerPerms, 'equipment:read');
    const canUpdate = hasGrantedPermission(lecturerPerms, 'equipment:update');

    assert.strictEqual(canRead, true, 'Giảng viên phải có quyền equipment:read');
    assert.strictEqual(canUpdate, false, 'Giảng viên không được phép có quyền equipment:update');
    console.log('  ✔ Test 8 ĐẠT: RBAC chặn thành công vai trò Giảng viên thực hiện điều chuyển thiết bị.');
  }

  console.log('\n--- TOÀN BỘ 8/8 TEST CASES UC-3.2 EQUIPMENT DIRECTORY ĐÃ VƯỢT QUA 100% ---\n');
}

runTests().catch(err => {
  console.error('LỖI KIỂM THỬ UC-3.2:', err);
  process.exit(1);
});
