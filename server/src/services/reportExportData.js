import { Equipment } from '../models/Equipment.js';
import { InventorySession } from '../models/InventorySession.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Room } from '../models/Room.js';
import '../models/Category.js';
import '../models/User.js';
import { ACTIVE_EQUIPMENT_FILTER, REPORT_TIMEZONE } from './dashboardAnalytics.js';
import { EQUIPMENT_STATUS_LABELS, INVENTORY_STATUS_LABELS } from './reportExport.js';

const date = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: REPORT_TIMEZONE }) : '';
const datetime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: REPORT_TIMEZONE }) : '';
const roomName = room => room ? `${room.code} · ${room.name}` : 'Chưa gán phòng';

export const loadExportReport = async (query, user, now = new Date()) => {
  const base = { institution: process.env.REPORT_INSTITUTION_NAME || 'TRƯỜNG ĐẠI HỌC · RUO',
    metadata: [`Ngày lập: ${datetime(now)} (giờ Việt Nam)`, `Người lập: ${user?.full_name || user?.code || 'Quản lý'}`] };
  if (query.type === 'equipment') {
    const equipment = await Equipment.find().select('code name serial_number category_id room_id status price warranty_expiry')
      .populate('category_id', 'name').populate('room_id', 'code name').sort({ code: 1 }).lean();
    return { ...base, title: 'BÁO CÁO TÀI SẢN',
      metadata: [...base.metadata, `Tổng tài sản: ${equipment.length} · Tổng nguyên giá: ${equipment.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('vi-VN')} VNĐ`,
        'Phạm vi: toàn bộ tài sản, bao gồm đã thanh lý và thất lạc. Giá trị là nguyên giá theo danh mục.'],
      columns: ['Mã tài sản', 'Tên thiết bị', 'Số serial', 'Loại thiết bị', 'Phòng', 'Trạng thái', 'Nguyên giá (VNĐ)', 'Hạn bảo hành'],
      rows: equipment.map(item => [item.code, item.name, item.serial_number, item.category_id?.name || '', roomName(item.room_id),
        EQUIPMENT_STATUS_LABELS[item.status] || item.status, item.price || 0, date(item.warranty_expiry)]) };
  }

  const session = await InventorySession.findById(query.sessionId).lean();
  if (!session) return null;
  let roomIds = session.scope_ids || [];
  if (!roomIds.length && session.scope_type !== 'room') {
    const filter = { building: 'A1', ...(session.scope_type === 'floor' ? { floor: session.scope_floor } : {}) };
    roomIds = (await Room.find(filter).select('_id').lean()).map(room => room._id);
  }
  const [logs, expected] = await Promise.all([
    InventoryLog.find({ session_id: session._id })
      .populate({ path: 'equipment_id', select: 'code name price room_id', populate: { path: 'room_id', select: 'code name' } })
      .populate('scanned_room_id', 'code name').populate('scanned_by', 'full_name')
      .sort({ scanned_at: 1, _id: 1 }).lean(),
    Equipment.find({ ...ACTIVE_EQUIPMENT_FILTER, room_id: { $in: roomIds } }).select('code name price room_id')
      .populate('room_id', 'code name').sort({ code: 1 }).lean()
  ]);
  const scanned = new Set(logs.filter(log => log.equipment_id).map(log => String(log.equipment_id._id)));
  const unscanned = expected.filter(item => !scanned.has(String(item._id)));
  const rows = logs.map(log => [log.equipment_id?.code || 'Đã xóa', log.equipment_id?.name || 'Thiết bị không còn tồn tại',
    roomName(log.equipment_id?.room_id), roomName(log.scanned_room_id), INVENTORY_STATUS_LABELS[log.status] || log.status,
    log.equipment_id?.price ?? '', log.scanned_by?.full_name || '', datetime(log.scanned_at), log.note || '']);
  rows.push(...unscanned.map(item => [item.code, item.name, roomName(item.room_id), '', 'Chưa kiểm tra', item.price || 0, '', '', 'Chưa có kết quả kiểm kê']));
  const statuses = { draft: 'Nháp', in_progress: 'Đang kiểm kê', completed: 'Hoàn tất', reconciled: 'Đã đối soát' };
  return { ...base, title: 'BÁO CÁO KIỂM KÊ TÀI SẢN',
    metadata: [...base.metadata, `Đợt: ${session.name} · Ngày: ${date(session.date)} · Trạng thái: ${statuses[session.status] || session.status}`,
      `Đã ghi nhận: ${logs.length} · Chưa kiểm tra: ${unscanned.length}`,
      'Phòng theo danh mục và nguyên giá phản ánh dữ liệu hiện tại. Thiết bị chưa kiểm tra không được tự coi là thiếu.'],
    columns: ['Mã tài sản', 'Tên thiết bị', 'Phòng theo danh mục', 'Phòng ghi nhận', 'Kết quả', 'Nguyên giá (VNĐ)', 'Người kiểm tra', 'Thời gian ghi nhận', 'Ghi chú'], rows };
};
