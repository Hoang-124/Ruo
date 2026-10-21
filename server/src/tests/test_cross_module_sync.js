import mongoose from 'mongoose';
import assert from 'assert';
import { Equipment } from '../models/Equipment.js';
import { Room } from '../models/Room.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Repair } from '../models/Repair.js';
import { SparePart } from '../models/SparePart.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { USER_ROLES, DAMAGE_LEVELS, REPAIR_STATUSES, PARTS_REQUEST_STATUSES } from '../config/constants.js';

import { createMovementOrder, approveTransfer, confirmMovement, getMovements, getEquipmentTransfers } from '../controllers/movementController.js';
import { createRepairReport, assignRepairTask, acceptRepairTask, getSlaComplianceStats } from '../controllers/repairController.js';
import { requestSpareParts, approvePartsRequest } from '../controllers/sparePartController.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';

const createMockRes = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
};

async function runTargetedCouplingSuite() {
  console.log('========================================================================');
  console.log('  KIỂM THỬ TÍCH HỢP LIÊN PHÂN HỆ — TARGETED COUPLING SUITE (IDEMPOTENT)');
  console.log('========================================================================');

  await mongoose.connect(MONGO_URI);

  try {
    // 0. Chuẩn bị người dùng & dữ liệu nền tảng
    const adminUser = await User.findOne({ role: USER_ROLES.ADMIN }) || { _id: new mongoose.Types.ObjectId(), role: USER_ROLES.ADMIN, full_name: 'Admin' };
    const fmUser = await User.findOne({ role: USER_ROLES.FACILITY_MANAGER }) || { _id: new mongoose.Types.ObjectId(), role: USER_ROLES.FACILITY_MANAGER, full_name: 'Quản Lý CSVC' };
    const techUser = await User.findOne({ role: USER_ROLES.TECHNICIAN }) || { _id: new mongoose.Types.ObjectId(), role: USER_ROLES.TECHNICIAN, full_name: 'Kỹ Thuật Viên' };
    const lecturerUser = await User.findOne({ role: USER_ROLES.LECTURER }) || { _id: new mongoose.Types.ObjectId(), role: USER_ROLES.LECTURER, full_name: 'Giảng Viên' };

    const rooms = await Room.find().limit(2);
    if (rooms.length < 2) {
      throw new Error('Cần ít nhất 2 phòng học trong CSDL để chạy kiểm thử điều chuyển liên phân hệ.');
    }
    const [roomA, roomB] = rooms;
    const category = await Category.findOne();
    const supplier = await Supplier.findOne();

    // Dọn dẹp dữ liệu thử nghiệm trước nếu có
    await Equipment.deleteMany({ code: 'EQ-SYNC-TEST-01' });
    await SparePart.deleteMany({ code: 'PART-SYNC-RAM' });

    // ========================================================================
    // ĐIỂM ĐỒNG BỘ 1: Đổi phòng thiết bị ⇄ Lịch sử di chuyển (Equipment ⇄ Movement)
    // ========================================================================
    console.log('\n▶ [ĐIỂM ĐỒNG BỘ 1] Thiết bị ⇄ Lịch sử điều chuyển phòng học');

    // 1.1 Khởi tạo thiết bị thử nghiệm tại phòng A
    const testEq = await Equipment.create({
      code: 'EQ-SYNC-TEST-01',
      name: 'Màn Hình Cảm Ứng Thử Nghiệm Đồng Bộ',
      category_id: category?._id,
      room_id: roomA._id,
      supplier_id: supplier?._id,
      price: 35000000,
      depreciation_rate: 15,
      qr_code: `QR-SYNC-${Date.now()}`
    });
    assert.strictEqual(testEq.room_id.toString(), roomA._id.toString(), 'Thiết bị ban đầu phải ở Phòng A');
    console.log(`  ✔ 1.1 Khởi tạo thiết bị ${testEq.code} tại phòng ${roomA.code}`);

    // 1.2 Lập lệnh điều chuyển từ phòng A sang phòng B
    const reqOrder = {
      user: fmUser,
      body: {
        equipment_id: testEq._id.toString(),
        from_room_id: roomA._id.toString(),
        to_room_id: roomB._id.toString(),
        reason: 'Điều chuyển phòng phục vụ kỳ thi học kỳ theo kế hoạch đào tạo'
      }
    };
    const resOrder = createMockRes();
    await createMovementOrder(reqOrder, resOrder);
    assert.strictEqual(resOrder.statusCode, 201, 'Tạo lệnh điều chuyển phải trả về 201');
    const movementId = resOrder.jsonData.movement._id;
    console.log(`  ✔ 1.2 Quản lý CSVC lập lệnh điều chuyển sang phòng ${roomB.code} (ID: ${movementId})`);

    // 1.3 Phê duyệt lệnh điều chuyển
    const reqApprove = {
      user: fmUser,
      params: { id: movementId }
    };
    const resApprove = createMockRes();
    await approveTransfer(reqApprove, resApprove);
    assert.strictEqual(resApprove.statusCode, 200, 'Phê duyệt điều chuyển phải trả về 200');
    console.log('  ✔ 1.3 Quản lý CSVC phê duyệt lệnh điều chuyển');

    // 1.4 Kỹ thuật viên xác nhận hoàn tất di chuyển thiết bị thực địa
    const reqConfirm = {
      user: techUser,
      params: { id: movementId },
      body: { notes: 'Đã di dời và cắm điện kiểm tra hoạt động ổn định tại phòng mới' }
    };
    const resConfirm = createMockRes();
    await confirmMovement(reqConfirm, resConfirm);
    assert.strictEqual(resConfirm.statusCode, 200, 'Xác nhận hoàn tất phải trả về 200');

    // 1.5 Xác minh tính đồng bộ dữ liệu: Thiết bị đã được tự động cập nhật sang phòng B
    const updatedEq = await Equipment.findById(testEq._id);
    assert.strictEqual(updatedEq.room_id.toString(), roomB._id.toString(), 'Vị trí thiết bị phải tự động đồng bộ sang Phòng B');
    console.log(`  ✔ 1.4 Xác nhận hoàn tất thực địa: Vị trí thiết bị đã tự động cập nhật sang ${roomB.code}`);

    // 1.6 Kiểm tra quyền truy cập lịch sử điều chuyển của Quản lý CSVC (Multi-Permission Guard)
    const reqHistory = {
      user: fmUser,
      userPermissions: ['movement:order', 'movement:confirm', 'equipment:read'],
      query: {}
    };
    const resHistory = createMockRes();
    await getMovements(reqHistory, resHistory);
    assert.strictEqual(resHistory.statusCode, 200, 'Quản lý CSVC phải truy cập được lịch sử điều chuyển');
    assert.ok(Array.isArray(resHistory.jsonData.movements), 'Danh sách điều chuyển phải là một mảng');
    console.log('  ✔ 1.5 Quản lý CSVC truy cập Lịch sử điều chuyển thành công (Zero 403 Lockout)');

    // ========================================================================
    // ĐIỂM ĐỒNG BỘ 2: Điều phối Kanban ⇄ KTV Task SLA countdown
    // ========================================================================
    console.log('\n▶ [ĐIỂM ĐỒNG BỘ 2] Điều phối Kanban ⇄ Nhiệm vụ KTV ⇄ SLA Countdown');

    // 2.1 Giảng viên báo hỏng thiết bị
    const reqReport = {
      user: lecturerUser,
      body: {
        equipment_id: testEq._id.toString(),
        room_id: roomB._id.toString(),
        damage_level: DAMAGE_LEVELS.MAJOR,
        incident_description: 'Màn hình bị sọc ngang và mất cảm ứng một góc'
      }
    };
    const resReport = createMockRes();
    await createRepairReport(reqReport, resReport);
    assert.strictEqual(resReport.statusCode, 201, 'Báo hỏng phải trả về 201');
    const repairTicket = resReport.jsonData.repair || resReport.jsonData.data;
    assert.strictEqual(repairTicket.status, REPAIR_STATUSES.REPORTED, 'Trạng thái ban đầu phải là reported');
    console.log(`  ✔ 2.1 Giảng viên tạo phiếu báo hỏng ${repairTicket.ticket_code} (Trạng thái: reported)`);

    // 2.2 Quản lý điều phối ca sửa cho KTV với Deadline 4 giờ tới
    const fourHoursLater = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const reqAssign = {
      user: fmUser,
      params: { id: repairTicket._id.toString() },
      body: {
        technician_id: techUser._id.toString(),
        assigned_to: techUser._id.toString(),
        deadline: fourHoursLater,
        notes: 'Ưu tiên khắc phục trước giờ học chiều'
      }
    };
    const resAssign = createMockRes();
    await assignRepairTask(reqAssign, resAssign);
    assert.strictEqual(resAssign.statusCode, 200, 'Điều phối ca sửa phải trả về 200');
    const assignedTicket = resAssign.jsonData.repair || resAssign.jsonData.data;
    assert.strictEqual(assignedTicket.status, REPAIR_STATUSES.ASSIGNED);
    assert.strictEqual(assignedTicket.assigned_to.toString(), techUser._id.toString());
    console.log(`  ✔ 2.2 Quản lý điều phối ca sửa cho KTV ${techUser.full_name} với deadline 4 giờ`);

    // 2.3 Kiểm tra đồng bộ số liệu SLA Stats
    const reqSla = { user: fmUser, query: {} };
    const resSla = createMockRes();
    await getSlaComplianceStats(reqSla, resSla);
    assert.strictEqual(resSla.statusCode, 200, 'Lấy thống kê SLA phải trả về 200');
    const slaData = resSla.jsonData.data || resSla.jsonData.sla_stats;
    assert.ok(slaData.total_with_deadline >= 1, 'Số ca có deadline phải >= 1');
    assert.ok(slaData.currently_on_track >= 1, 'Ca vừa gán hạn 4 giờ phải được tính vào on_track');
    console.log(`  ✔ 2.3 Thống kê SLA Kanban đồng bộ thời gian thực (On Track: ${slaData.currently_on_track}, MTTR: ${slaData.avg_resolution_hours}h)`);

    // 2.4 KTV tiếp nhận nhiệm vụ sửa chữa
    const reqAccept = {
      user: techUser,
      params: { id: repairTicket._id.toString() }
    };
    const resAccept = createMockRes();
    await acceptRepairTask(reqAccept, resAccept);
    assert.strictEqual(resAccept.statusCode, 200, 'Tiếp nhận ca sửa phải trả về 200');
    const acceptedTicket = resAccept.jsonData.repair || resAccept.jsonData.data;
    assert.strictEqual(acceptedTicket.status, REPAIR_STATUSES.IN_PROGRESS);
    console.log(`  ✔ 2.4 KTV tiếp nhận ca sửa chữa: Chuyển trạng thái sang in_progress thành công`);

    // ========================================================================
    // ĐIỂM ĐỒNG BỘ 3: Lập phiếu linh kiện ⇄ Trừ tồn kho tức thời (PartsRequest ⇄ SparePart)
    // ========================================================================
    console.log('\n▶ [ĐIỂM ĐỒNG BỘ 3] Lập phiếu linh kiện ⇄ Trừ tồn kho tức thời & Chống xuất âm kho');

    // 3.1 Khởi tạo linh kiện thử nghiệm với tồn kho ban đầu = 20 cái
    const testPart = await SparePart.create({
      code: 'PART-SYNC-RAM',
      name: 'Thanh RAM DDR4 16GB Kingston Thử Nghiệm',
      stock: 20,
      min_stock: 5,
      price: 850000,
      unit: 'Thanh'
    });
    console.log(`  ✔ 3.1 Khởi tạo linh kiện ${testPart.code}: Tồn kho ban đầu = ${testPart.stock} ${testPart.unit}`);

    // 3.2 KTV lập phiếu xin xuất 3 thanh RAM để thay thế
    const reqPartsReq = {
      user: techUser,
      body: {
        repair_id: repairTicket._id.toString(),
        items: [{
          part_id: testPart._id.toString(),
          qty: 3,
          unit_price: 850000
        }]
      }
    };
    const resPartsReq = createMockRes();
    await requestSpareParts(reqPartsReq, resPartsReq);
    assert.strictEqual(resPartsReq.statusCode, 201, 'Lập phiếu xin linh kiện phải trả về 201');
    const partsRequestId = resPartsReq.jsonData.partsRequest._id;
    console.log(`  ✔ 3.2 KTV gửi phiếu xin cấp 3 ${testPart.unit} linh kiện (ID: ${partsRequestId})`);

    // 3.3 Quản lý CSVC phê duyệt xuất kho linh kiện
    const reqApproveParts = {
      user: fmUser,
      params: { id: partsRequestId.toString() }
    };
    const resApproveParts = createMockRes();
    await approvePartsRequest(reqApproveParts, resApproveParts);
    assert.strictEqual(resApproveParts.statusCode, 200, 'Duyệt xuất kho linh kiện phải trả về 200');

    // 3.4 Xác minh tính đồng bộ trừ tồn kho tức thời: 20 - 3 = 17
    const postDeductPart = await SparePart.findById(testPart._id);
    assert.strictEqual(postDeductPart.stock, 17, 'Tồn kho phải giảm chính xác từ 20 xuống 17');
    console.log(`  ✔ 3.3 Quản lý duyệt xuất kho: Tồn kho giảm tức thì từ 20 -> ${postDeductPart.stock} (Khớp 100%)`);

    // 3.5 Kiểm thử Edge Case chống xuất âm kho: Yêu cầu 25 cái khi tồn kho chỉ còn 17
    const reqOverdraft = {
      user: techUser,
      body: {
        repair_id: repairTicket._id.toString(),
        items: [{
          part_id: testPart._id.toString(),
          qty: 25,
          unit_price: 850000
        }]
      }
    };
    const resOverdraft = createMockRes();
    await requestSpareParts(reqOverdraft, resOverdraft);
    const overdraftRequestId = resOverdraft.jsonData.partsRequest._id;

    const reqApproveOverdraft = {
      user: fmUser,
      params: { id: overdraftRequestId.toString() }
    };
    const resApproveOverdraft = createMockRes();
    await approvePartsRequest(reqApproveOverdraft, resApproveOverdraft);
    assert.strictEqual(resApproveOverdraft.statusCode, 400, 'Phải chặn duyệt xuất vượt quá tồn kho (HTTP 400)');
    assert.ok(resApproveOverdraft.jsonData.message.includes('Tồn kho không đủ'), 'Thông báo phải nêu rõ tồn kho không đủ');

    // Xác minh tồn kho vẫn an toàn ở mức 17
    const untouchedPart = await SparePart.findById(testPart._id);
    assert.strictEqual(untouchedPart.stock, 17, 'Tồn kho phải giữ nguyên 17, không bị trừ âm');
    console.log('  ✔ 3.4 Chống xuất âm kho thành công: Chặn yêu cầu 25 > 17 cái, bảo toàn tính toàn vẹn tồn kho.');

    // ========================================================================
    // DỌN DẸP DỮ LIỆU THỬ NGHIỆM (CLEANUP - IDEMPOTENCY)
    // ========================================================================
    console.log('\n▶ [DỌN DẸP] Dọn dẹp dữ liệu thử nghiệm liên phân hệ:');
    await Equipment.deleteOne({ _id: testEq._id });
    await EquipmentMovement.deleteMany({ equipment_id: testEq._id });
    await Repair.deleteOne({ _id: repairTicket._id });
    await SparePart.deleteOne({ _id: testPart._id });
    await PartsRequest.deleteMany({ _id: { $in: [partsRequestId, overdraftRequestId] } });
    console.log('  ✔ Đã dọn dẹp sạch sẽ tài sản, lệnh điều chuyển, ca sửa và phiếu linh kiện thử nghiệm.');

    console.log('\n=== TOÀN BỘ 3/3 ĐIỂM ĐỒNG BỘ LIÊN PHÂN HỆ ĐÃ ĐẠT 100% THÀNH CÔNG ===');
  } finally {
    await mongoose.disconnect();
  }
}

runTargetedCouplingSuite().catch(err => {
  console.error('❌ KIỂM THỬ TÍCH HỢP LIÊN PHÂN HỆ THẤT BẠI:', err);
  process.exit(1);
});
