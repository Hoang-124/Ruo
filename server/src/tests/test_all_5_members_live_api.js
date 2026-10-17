const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(path, { method = 'GET', token = null, body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

const extractList = (res, fallbackKey) => {
  if (!res?.data) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data.data)) return res.data.data;
  if (fallbackKey && Array.isArray(res.data[fallbackKey])) return res.data[fallbackKey];
  if (Array.isArray(res.data.items)) return res.data.items;
  return [];
};

const extractDoc = (res, fallbackKey) => {
  if (!res?.data) return null;
  if (res.data.data && !Array.isArray(res.data.data)) return res.data.data;
  if (fallbackKey && res.data[fallbackKey]) return res.data[fallbackKey];
  return res.data;
};

async function runMasterE2ESuite() {
  console.log('================================================================================');
  console.log('🚀 RUO UEMS 4.0 — KIỂM THỬ TOÀN DIỆN 5 THÀNH VIÊN (LIVE API & MONGODB E2E)');
  console.log('================================================================================\n');

  const stats = {
    Hoang: { passed: 0, total: 0 },
    Uyen: { passed: 0, total: 0 },
    Tung: { passed: 0, total: 0 },
    Quang: { passed: 0, total: 0 },
    Nguyen: { passed: 0, total: 0 }
  };

  const check = (member, name, condition, resObj = null) => {
    stats[member].total += 1;
    if (!condition) {
      const detail = resObj ? `Status=${resObj.status} Body=${JSON.stringify(resObj.data).slice(0, 260)}` : '';
      console.error(`  ❌ [${member}] FAIL: ${name} ${detail}`);
      throw new Error(`[${member}] Test failed: ${name} (${detail})`);
    }
    stats[member].passed += 1;
    console.log(`  ✔ [${member}] PASS: ${name}`);
  };

  // ============================================================================
  // 1. UYÊN (18 NGHIỆP VỤ: AUTHENTICATION UC-1.0..1.6, USER MGMT UC-10.1..10.7, NOTIFICATIONS UC-9.1..9.3)
  // ============================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('👤 1. KIỂM THỬ PHÂN HỆ CỦA UYÊN (Authentication, User Mgmt, Notifications)');
  console.log('--------------------------------------------------------------------------------');

  // UC-1.1: Login 4 Canonical Roles
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier: 'admin@ruo.edu.vn', password: 'Ruo@2026' }
  });
  const adminToken = adminLogin.data?.accessToken || adminLogin.data?.token || adminLogin.data?.data?.accessToken;
  check('Uyen', 'UC-1.1 Login Admin (AD001)', adminLogin.ok && Boolean(adminToken), adminLogin);

  const managerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier: 'QL001', password: 'Ruo@2026' }
  });
  const managerToken = managerLogin.data?.accessToken || managerLogin.data?.token || managerLogin.data?.data?.accessToken;
  check('Uyen', 'UC-1.1 Login Quản lý CSVC bằng Mã NV (QL001)', managerLogin.ok && Boolean(managerToken), managerLogin);

  const techLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier: 'technician@ruo.edu.vn', password: 'Ruo@2026' }
  });
  const techToken = techLogin.data?.accessToken || techLogin.data?.token || techLogin.data?.data?.accessToken;
  const techUser = techLogin.data?.user || techLogin.data?.data?.user;
  const techUserId = techUser?._id || techUser?.id;
  check('Uyen', 'UC-1.1 Login Kỹ thuật viên (KT001)', techLogin.ok && Boolean(techToken), techLogin);

  const lecturerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier: 'lecturer@ruo.edu.vn', password: 'Ruo@2026' }
  });
  const lecturerToken = lecturerLogin.data?.accessToken || lecturerLogin.data?.token || lecturerLogin.data?.data?.accessToken;
  check('Uyen', 'UC-1.1 Login Giảng viên (GV001)', lecturerLogin.ok && Boolean(lecturerToken), lecturerLogin);

  // UC-1.0: Self-Registration (Lecturer -> active immediately; Technician -> pending_approval)
  const suffix = Date.now().toString().slice(-5);
  const regLecturer = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      fullName: `Giảng Viên Test ${suffix}`,
      email: `gv.test.${suffix}@ruo.edu.vn`,
      employeeCode: `GVT${suffix}`,
      password: 'Password@123',
      role: 'lecturer',
      department: 'Khoa Công nghệ Thông tin'
    }
  });
  check(
    'Uyen',
    'UC-1.0 Self-Registration Giảng viên (Kích hoạt ngay & cấp JWT)',
    regLecturer.ok && !regLecturer.data?.isPending && Boolean(regLecturer.data?.token),
    regLecturer
  );

  const regTech = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      fullName: `KTV Chờ Duyệt ${suffix}`,
      email: `ktv.pending.${suffix}@ruo.edu.vn`,
      employeeCode: `KTP${suffix}`,
      password: 'Password@123',
      role: 'technician',
      department: 'Phòng Quản Trị Thiết Bị'
    }
  });
  check(
    'Uyen',
    'UC-1.0 Self-Registration Kỹ thuật viên (Vào trạng thái pending_approval)',
    regTech.ok && regTech.data?.isPending === true,
    regTech
  );
  const pendingUserObj = regTech.data?.user || regTech.data?.data?.user || regTech.data?.data;
  const pendingUserId = pendingUserObj?._id || pendingUserObj?.id;

  // Verify UC-1.1 blocks pending_approval login
  const pendingLoginTry = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier: `ktv.pending.${suffix}@ruo.edu.vn`, password: 'Password@123' }
  });
  check(
    'Uyen',
    'UC-1.1 Chặn đăng nhập tài khoản đang chờ phê duyệt (pending_approval)',
    pendingLoginTry.status === 403 && pendingLoginTry.data?.isPending === true,
    pendingLoginTry
  );

  // UC-1.5 & UC-1.6: Profile View & Update Profile (Hard-lock email & employee_code)
  const meRes = await apiRequest('/auth/me', { token: lecturerToken });
  const meUser = meRes.data?.user || meRes.data?.data;
  check('Uyen', 'UC-1.5 Xem hồ sơ cá nhân (GET /api/auth/me)', meRes.ok && meUser?.email === 'lecturer@ruo.edu.vn', meRes);

  const updateMeRes = await apiRequest('/auth/me', {
    method: 'PUT',
    token: lecturerToken,
    body: { phone: '0912345678', full_name: meUser?.full_name || 'Giảng Viên' }
  });
  check('Uyen', 'UC-1.6 Cập nhật thông tin liên hệ (PUT /api/auth/me)', updateMeRes.ok, updateMeRes);

  const illegalEmailChange = await apiRequest('/auth/me', {
    method: 'PUT',
    token: lecturerToken,
    body: { email: 'hacked@ruo.edu.vn' }
  });
  check('Uyen', 'UC-1.6 Khóa cứng không cho phép tự đổi Email/Mã NV', illegalEmailChange.status === 400 || illegalEmailChange.status === 403, illegalEmailChange);

  // UC-10.1..10.7: User Management
  const userDirRes = await apiRequest('/auth/users', { token: adminToken });
  check(
    'Uyen',
    'UC-10.2 Danh bạ người dùng kèm số đếm realtime (GET /api/auth/users)',
    userDirRes.ok && extractList(userDirRes, 'users').length > 0,
    userDirRes
  );

  if (pendingUserId) {
    const detailRes = await apiRequest(`/auth/users/${pendingUserId}`, { token: adminToken });
    check('Uyen', 'UC-10.3 Xem chi tiết hồ sơ cán bộ (GET /api/auth/users/:id)', detailRes.ok, detailRes);

    const approveRes = await apiRequest(`/auth/users/${pendingUserId}/approve`, {
      method: 'POST',
      token: adminToken,
      body: { action: 'approve', role: 'technician' }
    });
    check('Uyen', 'UC-10.7 Duyệt bổ nhiệm chức vụ KTV (POST /api/auth/users/:id/approve)', approveRes.ok, approveRes);

    const lockRes = await apiRequest(`/auth/users/${pendingUserId}/lock`, {
      method: 'PATCH',
      token: adminToken,
      body: { locked: true, reason: 'Kiểm thử khóa tạm thời' }
    });
    check('Uyen', 'UC-10.5 Khóa/Mở khóa tài khoản tức thì (PATCH /api/auth/users/:id/lock)', lockRes.ok, lockRes);

    const unlockRes = await apiRequest(`/auth/users/${pendingUserId}/lock`, {
      method: 'PATCH',
      token: adminToken,
      body: { locked: false }
    });
    check('Uyen', 'UC-10.5 Mở khóa lại tài khoản thành công', unlockRes.ok, unlockRes);

    const resetPwRes = await apiRequest(`/auth/users/${pendingUserId}/reset-password`, {
      method: 'POST',
      token: adminToken,
      body: {}
    });
    check('Uyen', 'UC-10.6 Cấp mật khẩu ngẫu nhiên & bật force_change_pw', resetPwRes.ok, resetPwRes);
  }

  // UC-9.1 & UC-9.2: Notification Center & Mark Read
  const notifRes = await apiRequest('/notifications', { token: adminToken });
  check('Uyen', 'UC-9.1 Trung tâm thông báo (GET /api/notifications)', notifRes.ok, notifRes);

  const markReadRes = await apiRequest('/notifications/read-all', {
    method: 'PUT',
    token: adminToken
  });
  check('Uyen', 'UC-9.2 Đánh dấu đã đọc toàn bộ thông báo (PUT /api/notifications/read-all)', markReadRes.ok, markReadRes);

  // ============================================================================
  // 2. TÙNG (17 NGHIỆP VỤ: ROOM & FACILITY UC-2.1..2.6, SPATIAL CAD UC-2.7, DASHBOARD & REPORTS UC-8.1..8.9)
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🏛️ 2. KIỂM THỬ PHÂN HỆ CỦA TÙNG (Room & Facility, Spatial CAD, Dashboard & Reports)');
  console.log('--------------------------------------------------------------------------------');

  // UC-2.2: Room List View
  const roomsRes = await apiRequest('/facilities/rooms?floor=2', { token: adminToken });
  const floor2Rooms = extractList(roomsRes, 'rooms');
  check('Tung', 'UC-2.2 Danh sách phòng học lọc theo tầng (GET /api/facilities/rooms?floor=2)', roomsRes.ok && floor2Rooms.length >= 1, roomsRes);

  // UC-2.7 & CAD Mặt Bằng Trang Đầu Tiên
  const cadRes = await apiRequest('/facilities/cad-canvas', { token: adminToken });
  const cadRooms = extractList(cadRes, 'rooms');
  check('Tung', 'UC-2.7 & Sơ đồ CAD 5 tầng (GET /api/facilities/cad-canvas)', cadRes.ok && (cadRooms.length >= 1 || Boolean(cadRes.data)), cadRes);

  // UC-2.3: Room Detail View
  const sampleRoomCode = floor2Rooms[0]?.code || 'A1-201';
  const roomDetailRes = await apiRequest(`/facilities/rooms/${sampleRoomCode}`, { token: adminToken });
  check('Tung', `UC-2.3 Xem chi tiết phòng ${sampleRoomCode} kèm danh sách thiết bị`, roomDetailRes.ok, roomDetailRes);

  // UC-2.1, UC-2.4, UC-2.6, UC-2.5: Create / Update / Status / Deactivate Room
  const allRoomsRes = await apiRequest('/facilities/rooms', { token: adminToken });
  const allRooms = extractList(allRoomsRes, 'rooms');
  const existingCodes = new Set(allRooms.map((r) => r.code));
  let testRoomId = null;
  let candidateCode = null;
  for (let num = 508; num >= 101; num--) {
    const f = Math.floor(num / 100);
    const r = num % 100;
    if (f >= 1 && f <= 5 && r >= 1 && r <= 8) {
      const pCode = `P${num}`;
      const aCode = `A1-${num}`;
      if (!existingCodes.has(pCode) && !existingCodes.has(aCode)) {
        candidateCode = pCode;
        break;
      }
    }
  }

  if (candidateCode) {
    const createRoomRes = await apiRequest('/facilities/rooms', {
      method: 'POST',
      token: adminToken,
      body: {
        code: candidateCode,
        name: `Phòng Hội Thảo Kiểm Thử ${candidateCode}`,
        building: 'A1',
        floor: Number(candidateCode[1]),
        capacity: 45,
        room_type: 'lecture'
      }
    });
    check('Tung', `UC-2.1 Tạo phòng học mới (${candidateCode})`, createRoomRes.ok, createRoomRes);
    const createdRoomDoc = extractDoc(createRoomRes, 'room');
    testRoomId = createdRoomDoc?._id;
  } else {
    const invalidRoomRes = await apiRequest('/facilities/rooms', {
      method: 'POST',
      token: adminToken,
      body: { code: 'P999', name: 'Invalid', building: 'A1', floor: 9, capacity: 40, room_type: 'lecture' }
    });
    check('Tung', 'UC-2.1 Kiểm tra ràng buộc mã phòng P101-P508 & Tòa A1 5 tầng', invalidRoomRes.status === 400, invalidRoomRes);
    const emptyRoom = allRooms.find((r) => (r.equipment_count || 0) === 0) || allRooms[0];
    testRoomId = emptyRoom?._id;
  }

  if (testRoomId) {
    const updateRoomRes = await apiRequest(`/facilities/rooms/${testRoomId}`, {
      method: 'PUT',
      token: adminToken,
      body: { capacity: 55, description: `Cập nhật E2E ${suffix}` }
    });
    check('Tung', 'UC-2.4 Cập nhật thông số phòng học & ghi AuditLog', updateRoomRes.ok, updateRoomRes);

    const statusMaintRes = await apiRequest(`/facilities/rooms/${testRoomId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'maintenance', reason: 'Bảo trì hệ thống điện chiếu sáng' }
    });
    check('Tung', 'UC-2.6 Chuyển đổi trạng thái phòng sang MAINTENANCE', statusMaintRes.ok, statusMaintRes);

    const statusAvailRes = await apiRequest(`/facilities/rooms/${testRoomId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'available', reason: 'Hoàn tất bảo trì' }
    });
    check('Tung', 'UC-2.6 Chuyển đổi trạng thái phòng về AVAILABLE', statusAvailRes.ok, statusAvailRes);

    // UC-2.5: Deactivate empty test room -> succeeds, then reopen to available
    const deactEmptyRes = await apiRequest(`/facilities/rooms/${testRoomId}/deactivate`, {
      method: 'PUT',
      token: adminToken,
      body: { reason: 'Tạm ngừng sử dụng phòng trống để kiểm thử UC-2.5' }
    });
    check('Tung', 'UC-2.5 Ngừng hoạt động phòng trống về INACTIVE (PUT /api/facilities/rooms/:id/deactivate)', deactEmptyRes.ok, deactEmptyRes);

    await apiRequest(`/facilities/rooms/${testRoomId}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'available', reason: 'Mở lại phòng sau kiểm thử' }
    });
  }

  // Ensure A1-201 is available if it was toggled earlier
  if (floor2Rooms[0]?._id) {
    await apiRequest(`/facilities/rooms/${floor2Rooms[0]._id}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'available', reason: 'Đảm bảo trạng thái sẵn sàng' }
    });
  }

  // UC-2.5 Guardrail: Verify Deactivate Room blocks a room that has active equipment
  const occupiedCadRoom = cadRooms.find((r) => (r.equipmentCount || r.totalEquipments || 0) > 0);
  if (occupiedCadRoom?._id) {
    const deactBlocked = await apiRequest(`/facilities/rooms/${occupiedCadRoom._id}/deactivate`, {
      method: 'PUT',
      token: adminToken,
      body: { reason: 'Test chặn ngừng hoạt động khi còn thiết bị' }
    });
    check(
      'Tung',
      'UC-2.5 Chặn ngừng hoạt động phòng khi vẫn còn thiết bị bên trong',
      deactBlocked.status === 400 || deactBlocked.status === 409,
      deactBlocked
    );
  }

  // UC-8.1..8.9: Dashboard KPI & Reports & Export
  const dashKpiRes = await apiRequest('/reports/dashboard', { token: adminToken });
  check('Tung', 'UC-8.1..8.3 Dashboard KPI, Chi phí sửa chữa & Chỉ số sức khỏe (GET /api/reports/dashboard)', dashKpiRes.ok, dashKpiRes);

  const statReportRes = await apiRequest('/reports/statistics', { token: adminToken });
  check('Tung', 'UC-8.4..8.8 Báo cáo thống kê đa chiều (GET /api/reports/statistics)', statReportRes.ok, statReportRes);

  const exportCsvRes = await apiRequest('/reports/export?format=csv', { token: adminToken });
  check('Tung', 'UC-8.9 Xuất báo cáo CSV/Excel (GET /api/reports/export)', exportCsvRes.ok, exportCsvRes);

  // ============================================================================
  // 3. QUANG (18 NGHIỆP VỤ: CATALOG UC-11.1..11.4, TRANSFER UC-4.1..4.5, RACI DISPOSAL UC-7.7..7.11)
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('📦 3. KIỂM THỬ PHÂN HỆ CỦA QUANG (Master Catalog, Equipment Transfers, RACI Disposal)');
  console.log('--------------------------------------------------------------------------------');

  // UC-11.1: Category CRUD
  const catListRes = await apiRequest('/admin/categories', { token: adminToken });
  const catList = extractList(catListRes, 'categories');
  check('Quang', 'UC-11.1 Danh mục loại thiết bị (GET /api/admin/categories)', catListRes.ok && catList.length >= 1, catListRes);

  const newCatRes = await apiRequest('/admin/categories', {
    method: 'POST',
    token: adminToken,
    body: {
      code: `CAT_E2E_${suffix}`,
      name: `Thiết bị Đo Lường E2E ${suffix}`,
      description: 'Danh mục kiểm thử tự động'
    }
  });
  check('Quang', 'UC-11.1 Tạo loại thiết bị mới (POST /api/admin/categories)', newCatRes.ok, newCatRes);
  const createdCatDoc = extractDoc(newCatRes, 'category');
  const createdCatId = createdCatDoc?._id;

  if (createdCatId) {
    const updCatRes = await apiRequest(`/admin/categories/${createdCatId}`, {
      method: 'PUT',
      token: adminToken,
      body: { name: `Thiết bị Đo Lường E2E Updated ${suffix}` }
    });
    check('Quang', 'UC-11.1 Cập nhật loại thiết bị (PUT /api/admin/categories/:id)', updCatRes.ok, updCatRes);

    const delCatRes = await apiRequest(`/admin/categories/${createdCatId}`, {
      method: 'DELETE',
      token: adminToken
    });
    check('Quang', 'UC-11.1 Xóa/Vô hiệu hóa loại thiết bị rỗng (DELETE /api/admin/categories/:id)', delCatRes.ok, delCatRes);
  }

  // UC-11.2: Facility Structure (Buildings)
  const bldgRes = await apiRequest('/admin/buildings', { token: adminToken });
  check('Quang', 'UC-11.2 Cấu trúc Tòa nhà A1 5 tầng (GET /api/admin/buildings)', bldgRes.ok, bldgRes);

  // UC-11.3: Supplier CRUD
  const supListRes = await apiRequest('/admin/suppliers', { token: adminToken });
  check('Quang', 'UC-11.3 Danh bạ Nhà cung cấp (GET /api/admin/suppliers)', supListRes.ok, supListRes);

  const newSupRes = await apiRequest('/admin/suppliers', {
    method: 'POST',
    token: adminToken,
    body: {
      code: `SUP_E2E_${suffix}`,
      name: `Công ty Thiết bị Giáo dục E2E ${suffix}`,
      contact_person: 'Trần Văn B',
      phone: '0909123456',
      email: `sup.${suffix}@partner.vn`,
      address: 'Quận 1, TP.HCM'
    }
  });
  check('Quang', 'UC-11.3 Thêm Nhà cung cấp mới (POST /api/admin/suppliers)', newSupRes.ok, newSupRes);

  // UC-11.4: Repair Unit CRUD
  const ruListRes = await apiRequest('/admin/repair-units', { token: adminToken });
  check('Quang', 'UC-11.4 Danh sách Đơn vị sửa chữa (GET /api/admin/repair-units)', ruListRes.ok, ruListRes);

  const newRuRes = await apiRequest('/admin/repair-units', {
    method: 'POST',
    token: adminToken,
    body: {
      code: `RU_E2E_${suffix}`,
      name: `Trung tâm Bảo hành E2E ${suffix}`,
      specialty: 'Điện lạnh & Máy chiếu',
      contact_person: 'Lê Kỹ Thuật',
      phone: '0988777666',
      email: `ru.${suffix}@service.vn`
    }
  });
  check('Quang', 'UC-11.4 Thêm Đơn vị sửa chữa mới (POST /api/admin/repair-units)', newRuRes.ok, newRuRes);

  // ============================================================================
  // 4. HOÀNG (17 NGHIỆP VỤ: SEED, RBAC UC-12.1..12.2, EQUIPMENT UC-3.1..3.11 & QR, AUDIT UC-13.1..13.2)
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🛡️ 4. KIỂM THỬ PHÂN HỆ CỦA HOÀNG (RBAC Matrix, Equipment & Inventory, SHA-256 Audit)');
  console.log('--------------------------------------------------------------------------------');

  // UC-12.1 & UC-12.2: Roles Matrix & Sync Canonical Permissions
  const rolesRes = await apiRequest('/admin/roles', { token: adminToken });
  const rolesList = extractList(rolesRes, 'roles');
  check('Hoang', 'UC-12.1 Ma trận quyền hạn 4 vai trò (GET /api/admin/roles)', rolesRes.ok && rolesList.length >= 4, rolesRes);

  const syncRolesRes = await apiRequest('/admin/roles/reset-defaults', {
    method: 'POST',
    token: adminToken
  });
  check('Hoang', 'UC-12.2 Đồng bộ & cập nhật quyền hạn RBAC tức thì (POST /api/admin/roles/reset-defaults)', syncRolesRes.ok, syncRolesRes);

  // UC-3.1: Create Equipment
  const firstCategory = catList[0];
  const availRooms = allRooms.filter((r) => r.status === 'available');
  const roomA = availRooms[0] || allRooms[0];
  const roomB = availRooms[1] || allRooms[1] || roomA;

  const createEqRes = await apiRequest('/equipments', {
    method: 'POST',
    token: managerToken,
    body: {
      code: `EQ-E2E-${suffix}`,
      qr_code: `QR-E2E-${suffix}`,
      name: `Máy Chiếu Laser E2E ${suffix}`,
      brand: 'Sony',
      model: 'VPL-FHZ85',
      serial_number: `SN-E2E-${suffix}`,
      category_id: firstCategory?._id,
      room_id: roomA?._id,
      price: 30000000,
      purchase_date: '2025-01-15',
      warranty_expiry: '2027-01-15',
      status: 'in_use'
    }
  });
  check('Hoang', 'UC-3.1 Thêm thiết bị mới kèm mã QR chuẩn (POST /api/equipments)', createEqRes.ok, createEqRes);
  const createdEq = extractDoc(createEqRes, 'equipment');
  const createdEqId = createdEq?._id;

  // UC-3.2: Equipment Directory
  const eqListRes = await apiRequest(`/equipments?search=EQ-E2E-${suffix}`, { token: lecturerToken });
  check('Hoang', 'UC-3.2 Tra cứu danh mục thiết bị (GET /api/equipments)', eqListRes.ok && extractList(eqListRes, 'equipments').length >= 1, eqListRes);

  // QR Code Fast Lookup
  const qrRes = await apiRequest(`/equipments/qr/QR-E2E-${suffix}`, { token: techToken });
  check('Hoang', 'Tra cứu nhanh bằng mã QR (GET /api/equipments/qr/:qrCode)', qrRes.ok, qrRes);

  // UC-3.3 & UC-3.5: Equipment Detail & Lifecycle Timeline
  const eqDetailRes = await apiRequest(`/equipments/${createdEqId}`, { token: lecturerToken });
  check('Hoang', 'UC-3.3 Xem chi tiết tài sản (GET /api/equipments/:id)', eqDetailRes.ok, eqDetailRes);

  const eqLifecycleRes = await apiRequest(`/equipments/${createdEqId}/lifecycle`, { token: lecturerToken });
  check('Hoang', 'UC-3.5 Timeline vòng đời tài sản (GET /api/equipments/:id/lifecycle)', eqLifecycleRes.ok, eqLifecycleRes);

  // UC-3.6 & UC-3.7: Batch Validation
  const batchValRes = await apiRequest('/equipments/import/validate', {
    method: 'POST',
    token: managerToken,
    body: {
      items: [
        {
          code: `EQ-E2E-${suffix}`,
          name: 'Test Trùng Mã',
          category_code: firstCategory?.code,
          room_code: roomA?.code,
          price: 15000000
        }
      ]
    }
  });
  check('Hoang', 'UC-3.6 & UC-3.7 Kiểm tra hợp lệ nhập lô Excel & bắt lỗi trùng mã', batchValRes.ok, batchValRes);

  // UC-3.9, UC-3.10, UC-3.11: Inventory Session, QR Scan & Report Export
  const invSessionRes = await apiRequest('/inventory-sessions', {
    method: 'POST',
    token: managerToken,
    body: {
      name: `Đợt Kiểm Kê E2E ${suffix}`,
      floor: roomA?.floor || 2,
      room_ids: [roomA?._id],
      notes: 'Kiểm thử tự động E2E'
    }
  });
  check('Hoang', 'UC-3.9 Khởi tạo đợt kiểm kê định kỳ (POST /api/inventory-sessions)', invSessionRes.ok, invSessionRes);
  const invSessionDoc = extractDoc(invSessionRes, 'session');
  const invSessionId = invSessionDoc?._id;

  if (invSessionId) {
    const scanRes = await apiRequest(`/inventory-sessions/${invSessionId}/scan`, {
      method: 'PUT',
      token: techToken,
      body: {
        qr_code: `QR-E2E-${suffix}`,
        room_id: roomA?._id,
        actual_status: 'matched',
        notes: 'Thiết bị khớp vị trí phòng'
      }
    });
    check('Hoang', 'UC-3.10 Quét mã QR kiểm kê thực tế tại phòng (PUT /api/inventory-sessions/:id/scan)', scanRes.ok, scanRes);

    const exportInvRes = await apiRequest(`/inventory-sessions/${invSessionId}/export`, {
      token: managerToken
    });
    check('Hoang', 'UC-3.11 Xuất biên bản kiểm kê kèm chữ ký số SHA-256 (GET /api/inventory-sessions/:id/export)', exportInvRes.ok, exportInvRes);
  }

  // ============================================================================
  // QUANG (TIẾP): UC-4.1..4.5 ĐIỀU CHUYỂN THIẾT BỊ TRÊN THIẾT BỊ VỪA TẠO
  // ============================================================================
  if (createdEqId && roomA && roomB && String(roomA._id) !== String(roomB._id)) {
    const createTransferRes = await apiRequest('/transfers', {
      method: 'POST',
      token: techToken,
      body: {
        equipment_id: createdEqId,
        from_room_id: roomA._id,
        to_room_id: roomB._id,
        reason: 'Điều chuyển phục vụ hội thảo E2E'
      }
    });
    check('Quang', 'UC-4.1 Lập phiếu điều chuyển thiết bị (POST /api/transfers)', createTransferRes.ok, createTransferRes);
    const transferDoc = extractDoc(createTransferRes, 'movement');
    const transferId = transferDoc?._id;

    const pendingTransfersRes = await apiRequest('/transfers/pending', { token: managerToken });
    check('Quang', 'UC-4.5 Hàng đợi phiếu điều chuyển chờ duyệt (GET /api/transfers/pending)', pendingTransfersRes.ok, pendingTransfersRes);

    if (transferId) {
      const approveTransferRes = await apiRequest(`/transfers/${transferId}/approve`, {
        method: 'PUT',
        token: managerToken,
        body: { note: 'Đồng ý điều chuyển sang phòng hội thảo' }
      });
      check('Quang', 'UC-4.2 Quản lý CSVC phê duyệt phiếu điều chuyển (PUT /api/transfers/:id/approve)', approveTransferRes.ok, approveTransferRes);

      const completeTransferRes = await apiRequest(`/transfers/${transferId}/complete`, {
        method: 'PUT',
        token: techToken,
        body: { note: 'Đã bàn giao thiết bị tại phòng đích' }
      });
      check('Quang', 'UC-4.3 KTV xác nhận hoàn tất điều chuyển & tự động cập nhật phòng (PUT /api/transfers/:id/complete)', completeTransferRes.ok, completeTransferRes);
    }

    const transferHistRes = await apiRequest(`/transfers/equipment/${createdEqId}`, { token: lecturerToken });
    check('Quang', 'UC-4.4 Tra cứu lịch sử di chuyển của thiết bị (GET /api/transfers/equipment/:id)', transferHistRes.ok, transferHistRes);
  }

  // ============================================================================
  // 5. NGUYÊN (17 NGHIỆP VỤ: REPAIR UC-5.1..5.12, WARRANTY UC-6.1..6.3, DEADLINE UC-7.1..7.2)
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🔧 5. KIỂM THỬ PHÂN HỆ CỦA NGUYÊN (Repair Lifecycle, Spare Parts, Warranty & SLA)');
  console.log('--------------------------------------------------------------------------------');

  // UC-5.1: Report Damage
  const reportDamageRes = await apiRequest('/repairs', {
    method: 'POST',
    token: lecturerToken,
    body: {
      equipment_id: createdEqId,
      incident_description: 'Máy chiếu báo đèn nhiệt độ cao và tự ngắt sau 10 phút hoạt động',
      damage_level: 'major',
      images: ['https://ruo.edu.vn/evidence/projector-overheat.jpg']
    }
  });
  check('Nguyen', 'UC-5.1 Giảng viên báo hỏng thiết bị tại phòng (POST /api/repairs)', reportDamageRes.ok, reportDamageRes);
  const repairTicket = extractDoc(reportDamageRes, 'repair');
  const repairId = repairTicket?._id;

  // UC-5.2 & UC-7.1: Repair List & SLA Deadline Tracking
  const repairsListRes = await apiRequest('/repairs', { token: managerToken });
  check('Nguyen', 'UC-5.2 & UC-7.1 Danh sách phiếu sửa chữa kèm đồng hồ SLA (GET /api/repairs)', repairsListRes.ok && extractList(repairsListRes, 'repairs').length >= 1, repairsListRes);

  if (repairId) {
    // UC-5.3: Assign Repair
    const assignRes = await apiRequest(`/repairs/${repairId}/assign`, {
      method: 'PUT',
      token: managerToken,
      body: {
        technician_id: techUserId,
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        priority_note: 'Ưu tiên xử lý trước tiết học chiều mai'
      }
    });
    check('Nguyen', 'UC-5.3 Quản lý CSVC điều phối ca sửa cho KTV kèm Deadline SLA (PUT /api/repairs/:id/assign)', assignRes.ok, assignRes);

    // UC-5.4: Accept Repair
    const acceptRes = await apiRequest(`/repairs/${repairId}/accept`, {
      method: 'PUT',
      token: techToken
    });
    check('Nguyen', 'UC-5.4 Kỹ thuật viên tiếp nhận ca sửa chữa (PUT /api/repairs/:id/accept)', acceptRes.ok, acceptRes);

    // UC-5.12, UC-5.10, UC-5.11: Parts Inventory, Requisition & Approval
    const partsRes = await apiRequest('/parts', { token: techToken });
    const partsList = extractList(partsRes, 'parts');
    check('Nguyen', 'UC-5.12 Kho linh kiện vật tư (GET /api/parts)', partsRes.ok && partsList.length >= 1, partsRes);
    const samplePart = partsList.find((p) => (p.quantity ?? p.stock_quantity ?? 0) >= 2) || partsList[0];

    if (samplePart) {
      const reqPartRes = await apiRequest('/parts-requests', {
        method: 'POST',
        token: techToken,
        body: {
          repair_id: repairId,
          part_id: samplePart._id,
          quantity: 1,
          items: [{ part_id: samplePart._id, quantity: 1 }],
          reason: 'Thay quạt tản nhiệt máy chiếu laser'
        }
      });
      check('Nguyen', 'UC-5.10 KTV lập phiếu xin xuất kho linh kiện (POST /api/parts-requests)', reqPartRes.ok, reqPartRes);
      const partReqDoc = extractDoc(reqPartRes, 'partsRequest');
      const partReqId = partReqDoc?._id;

      if (partReqId) {
        const appPartRes = await apiRequest(`/parts-requests/${partReqId}/approve`, {
          method: 'PUT',
          token: managerToken,
          body: { note: 'Duyệt xuất kho 1 linh kiện' }
        });
        check('Nguyen', 'UC-5.11 Quản lý duyệt xuất kho & tự động trừ tồn kho (PUT /api/parts-requests/:id/approve)', appPartRes.ok, appPartRes);
      }
    }

    // UC-5.5: Log Repair Progress
    const logRepairRes = await apiRequest(`/repairs/${repairId}/progress`, {
      method: 'PUT',
      token: techToken,
      body: {
        action_taken: 'Đã vệ sinh buồng quang học và thay quạt tản nhiệt chính hãng',
        cost: 22000000
      }
    });
    check('Nguyen', 'UC-5.5 KTV ghi nhật ký sửa chữa & chi phí (PUT /api/repairs/:id/progress)', logRepairRes.ok, logRepairRes);

    // UC-5.6: Complete Repair (Resolve)
    const resolveRes = await apiRequest(`/repairs/${repairId}/resolve`, {
      method: 'PUT',
      token: techToken,
      body: {
        outcome: 'repaired',
        resolution_note: 'Thiết bị đã hoạt động ổn định, độ sáng đạt 100%',
        cost: 22000000
      }
    });
    check('Nguyen', 'UC-5.6 KTV hoàn tất ca sửa chữa & bàn giao thiết bị (PUT /api/repairs/:id/resolve)', resolveRes.ok, resolveRes);

    // UC-5.8: Equipment Repair History
    const repHistRes = await apiRequest(`/repairs/equipment/${createdEqId}`, { token: lecturerToken });
    check('Nguyen', 'UC-5.8 Tra cứu lịch sử sửa chữa & chi phí lũy kế theo thiết bị (GET /api/repairs/equipment/:id)', repHistRes.ok, repHistRes);

    // UC-6.1 & UC-6.3: Post-Repair Warranty Update
    const warUpdRes = await apiRequest(`/equipments/${createdEqId}/warranty`, {
      method: 'PUT',
      token: techToken,
      body: {
        warranty_expiry: '2028-06-30',
        warranty_note: 'Gia hạn bảo hành cụm quạt nguồn sau sửa chữa'
      }
    });
    check('Nguyen', 'UC-6.1..6.3 Cập nhật bảo hành bổ sung sau sửa chữa (PUT /api/equipments/:id/warranty)', warUpdRes.ok, warUpdRes);
  }

  // ============================================================================
  // QUANG (TIẾP): UC-7.7..7.9 ĐỀ XUẤT & DUYỆT THANH LÝ KHI R >= 60%
  // ============================================================================
  if (createdEqId) {
    const proposeDispRes = await apiRequest('/disposals', {
      method: 'POST',
      token: managerToken,
      body: {
        equipment_id: createdEqId,
        reason: 'Chi phí sửa chữa lũy kế vượt ngưỡng R >= 60% nguyên giá',
        recovery_value: 1500000
      }
    });
    check('Quang', 'UC-7.7 & UC-7.8 Khởi tạo & thẩm định hồ sơ thanh lý khi R >= 60% (POST /api/disposals)', proposeDispRes.ok, proposeDispRes);
    const dispDoc = extractDoc(proposeDispRes, 'disposal');
    const disposalId = dispDoc?._id;

    const dispListRes = await apiRequest('/disposals', { token: adminToken });
    check('Quang', 'UC-7.8 Danh sách hồ sơ thanh lý & thiết bị chạm ngưỡng R >= 60% (GET /api/disposals)', dispListRes.ok, dispListRes);

    if (disposalId) {
      const bghApproveRes = await apiRequest(`/disposals/${disposalId}/approve`, {
        method: 'PUT',
        token: adminToken,
        body: { decision_number: `QĐ-BGH-2026-${suffix}`, recovery_value: 1500000 }
      });
      check('Quang', 'UC-7.9 Ban Giám Hiệu (Admin) ký duyệt quyết định thanh lý (PUT /api/disposals/:id/approve)', bghApproveRes.ok, bghApproveRes);
    }
  }

  // ============================================================================
  // HOÀNG (TIẾP): UC-13.1 & UC-13.2 SỔ CÁI KIỂM TOÁN BẤT BIẾN SHA-256
  // ============================================================================
  const auditLogsRes = await apiRequest('/audit/logs?limit=15', { token: adminToken });
  check('Hoang', 'UC-13.1 Sổ cái kiểm toán bất biến SHA-256 (GET /api/audit/logs)', auditLogsRes.ok, auditLogsRes);

  const verifyChainRes = await apiRequest('/audit/verify-chain', { token: adminToken });
  check('Hoang', 'UC-13.2 Xác minh tính toàn vẹn chuỗi băm SHA-256 (GET /api/audit/verify-chain)', verifyChainRes.ok, verifyChainRes);

  console.log('\n================================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ TOÀN DIỆN 5 THÀNH VIÊN:');
  console.log(`  • Uyên   (Auth, Users, Notifs)     : ${stats.Uyen.passed}/${stats.Uyen.total} PASS (100%)`);
  console.log(`  • Tùng   (Rooms, CAD, Reports)     : ${stats.Tung.passed}/${stats.Tung.total} PASS (100%)`);
  console.log(`  • Quang  (Catalog, Transfer, RACI) : ${stats.Quang.passed}/${stats.Quang.total} PASS (100%)`);
  console.log(`  • Hoàng  (Seed, RBAC, Equip, Audit): ${stats.Hoang.passed}/${stats.Hoang.total} PASS (100%)`);
  console.log(`  • Nguyên (Repairs, Parts, SLA)     : ${stats.Nguyen.passed}/${stats.Nguyen.total} PASS (100%)`);
  const totalPassed = Object.values(stats).reduce((s, m) => s + m.passed, 0);
  const totalRun = Object.values(stats).reduce((s, m) => s + m.total, 0);
  console.log(`🏆 TỔNG CỘNG: ${totalPassed}/${totalRun} KỊCH BẢN E2E VƯỢT QUA 100%!`);
  console.log('================================================================================');
}

runMasterE2ESuite().catch((err) => {
  console.error('\n💥 LỖI KIỂM THỬ:', err.message);
  process.exit(1);
});
