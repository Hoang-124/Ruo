import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { Category } from '../models/Category.js';
import { Equipment } from '../models/Equipment.js';
import { MaintenancePlan } from '../models/MaintenancePlan.js';
import { Notification } from '../models/Notification.js';
import { PreventiveMaintenance } from '../models/PreventiveMaintenance.js';
import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import {
  DAMAGE_LEVELS,
  EQUIPMENT_STATUSES,
  REPAIR_SOURCES,
  REPAIR_STATUSES,
  USER_ROLES,
  USER_STATUSES
} from '../config/constants.js';
import { computeDeadline } from '../services/slaReactor.js';

const DEFAULT_CHECKLIST = [
  'Kiểm tra nguồn điện và dây kết nối',
  'Kiểm tra hoạt động và chất lượng vận hành',
  'Vệ sinh thiết bị và khu vực lắp đặt',
  'Kiểm tra dấu hiệu hư hỏng, tiếng ồn hoặc quá nhiệt'
];

const getMonthOffset = (date, months) => {
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day));
};

const getPlanSchedule = (plan, now = new Date()) => {
  const start = new Date(plan.start_date);
  const months = plan.frequency === 'quarterly' ? 3 : 1;
  const monthDifference = (now.getUTCFullYear() - start.getUTCFullYear()) * 12
    + now.getUTCMonth() - start.getUTCMonth();
  const cycleIndex = Math.max(0, Math.floor(monthDifference / months));
  const currentCycle = getMonthOffset(start, cycleIndex * months);
  const isStarted = currentCycle <= now;
  return {
    current_cycle_start: (isStarted ? currentCycle : start).toISOString(),
    next_due_at: getMonthOffset(start, (cycleIndex + (isStarted ? 1 : 0)) * months).toISOString(),
    current_cycle_is_due: isStarted
  };
};

const getManagerActor = (req) => ({
  user_id: req.user._id,
  user_display: `${req.user.full_name} (${req.user.code})`,
  ip_address: req.ip || '127.0.0.1'
});

export const getMaintenancePlans = async (req, res) => {
  try {
    const plans = await MaintenancePlan.find({ is_active: true })
      .populate('room_ids', 'code name building floor')
      .populate('category_ids', 'code name')
      .populate('created_by', 'full_name code')
      .sort({ start_date: 1, created_at: -1 });
    const roomIds = [...new Set(plans.flatMap((plan) => plan.room_ids.map((room) => room._id.toString())))];
    const equipment = roomIds.length
      ? await Equipment.find({ room_id: { $in: roomIds }, status: { $ne: EQUIPMENT_STATUSES.DISPOSED } })
        .populate('room_id', 'code name building floor')
        .populate('category_id', 'name code')
        .sort({ room_id: 1, code: 1 })
      : [];

    res.json({
      success: true,
      plans: plans.map((plan) => ({
        ...plan.toObject(),
        schedule: getPlanSchedule(plan)
      })),
      equipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể tải lịch bảo dưỡng: ${error.message}` });
  }
};

export const createMaintenancePlan = async (req, res) => {
  try {
    const { title, building, floor, room_ids, category_ids, frequency, start_date, checklist } = req.body || {};
    const normalizedBuilding = String(building || '').trim().toUpperCase();
    const numericFloor = Number(floor);
    const parsedStartDate = new Date(start_date);
    const errors = {};
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 160) {
      errors.title = 'Tên kế hoạch phải có từ 3 đến 160 ký tự.';
    }
    if (!normalizedBuilding || normalizedBuilding.length > 32) errors.building = 'Vui lòng chọn tòa nhà hợp lệ.';
    if (!Number.isInteger(numericFloor) || numericFloor < 1 || numericFloor > 100) errors.floor = 'Tầng phải là số nguyên hợp lệ.';
    if (!['monthly', 'quarterly'].includes(frequency)) errors.frequency = 'Chu kỳ chỉ nhận monthly hoặc quarterly.';
    if (!start_date || Number.isNaN(parsedStartDate.getTime())) errors.start_date = 'Ngày bắt đầu không hợp lệ.';
    if (checklist !== undefined && (!Array.isArray(checklist) || checklist.length < 1 || checklist.length > 20
      || checklist.some((item) => typeof item !== 'string' || item.trim().length < 2 || item.trim().length > 160)
      || new Set(checklist.map((item) => item.trim().toLocaleLowerCase())).size !== checklist.length)) {
      errors.checklist = 'Checklist phải có từ 1 đến 20 mục, mỗi mục dài 2–160 ký tự.';
    }
    if (room_ids !== undefined && (!Array.isArray(room_ids) || room_ids.some((id) => !mongoose.isValidObjectId(id)))) {
      errors.room_ids = 'Danh sách phòng không hợp lệ.';
    }
    if (category_ids !== undefined && (!Array.isArray(category_ids) || category_ids.some((id) => !mongoose.isValidObjectId(id)))) {
      errors.category_ids = 'Danh sách loại thiết bị không hợp lệ.';
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: 'Thông tin kế hoạch chưa hợp lệ.', errors });
    }

    if (category_ids?.length) {
      const categories = await Category.countDocuments({ _id: { $in: category_ids } });
      if (categories !== new Set(category_ids.map(String)).size) {
        return res.status(400).json({ success: false, message: 'Một hoặc nhiều loại thiết bị không tồn tại.' });
      }
    }

    const roomFilter = room_ids?.length
      ? { _id: { $in: room_ids }, building: normalizedBuilding, floor: numericFloor }
      : { building: normalizedBuilding, floor: numericFloor };
    const rooms = await Room.find({ ...roomFilter, status: { $ne: 'inactive' } }).select('_id');
    if (!rooms.length || (room_ids?.length && rooms.length !== new Set(room_ids.map(String)).size)) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy phòng phù hợp trong tòa và tầng đã chọn.'
      });
    }

    const plan = await MaintenancePlan.create({
      title: title.trim(),
      building: normalizedBuilding,
      floor: numericFloor,
      room_ids: rooms.map((room) => room._id),
      category_ids: category_ids || [],
      frequency,
      start_date: parsedStartDate,
      checklist: (checklist?.length ? checklist : DEFAULT_CHECKLIST).map((item) => item.trim()),
      created_by: req.user._id
    });

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: 'MAINTENANCE_PLAN_CREATED',
      target_table: 'maintenance_plans',
      entity_id: plan._id.toString(),
      new_value: {
        title: plan.title,
        building: plan.building,
        floor: plan.floor,
        room_ids: plan.room_ids.map(String),
        category_ids: plan.category_ids.map(String),
        frequency: plan.frequency,
        start_date: plan.start_date
      }
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo kế hoạch bảo dưỡng định kỳ.',
      plan: { ...plan.toObject(), schedule: getPlanSchedule(plan) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể tạo kế hoạch bảo dưỡng: ${error.message}` });
  }
};

export const logMaintenanceResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Mã kế hoạch không hợp lệ.' });
    }
    const { equipment_id, checklist_results, notes = '' } = req.body || {};
    if (!mongoose.isValidObjectId(equipment_id)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thiết bị cần kiểm tra.' });
    }
    if (typeof notes !== 'string' || notes.length > 2000) {
      return res.status(400).json({ success: false, message: 'Ghi chú tối đa 2.000 ký tự.' });
    }
    const plan = await MaintenancePlan.findOne({ _id: id, is_active: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch đang hoạt động.' });
    const equipment = await Equipment.findById(equipment_id);
    if (!equipment || !equipment.room_id || !plan.room_ids.some((roomId) => roomId.equals(equipment.room_id))) {
      return res.status(400).json({ success: false, message: 'Thiết bị không thuộc phòng trong kế hoạch bảo dưỡng.' });
    }
    if (equipment.status === EQUIPMENT_STATUSES.DISPOSED
      || (plan.category_ids.length && !plan.category_ids.some((categoryId) => categoryId.equals(equipment.category_id)))) {
      return res.status(400).json({ success: false, message: 'Thiết bị không thuộc phạm vi loại thiết bị của kế hoạch.' });
    }
    const schedule = getPlanSchedule(plan);
    if (!schedule.current_cycle_is_due) {
      return res.status(409).json({ success: false, message: 'Kế hoạch chưa đến ngày bắt đầu.' });
    }

    const validChecklist = Array.isArray(checklist_results)
      && checklist_results.length === plan.checklist.length
      && plan.checklist.every((item) => checklist_results.some((result) => result?.item === item && typeof result.passed === 'boolean'));
    if (!validChecklist) {
      return res.status(400).json({
        success: false,
        message: 'Cần gửi kết quả đạt/không đạt cho toàn bộ checklist của kế hoạch.'
      });
    }
    const normalizedResults = plan.checklist.map((item) => {
      const result = checklist_results.find((entry) => entry.item === item);
      return {
        item,
        passed: result.passed,
        notes: typeof result.notes === 'string' ? result.notes.trim().slice(0, 500) : ''
      };
    });
    const failedItems = normalizedResults.filter((item) => !item.passed);
    if (failedItems.some((item) => !item.notes)) {
      return res.status(400).json({
        success: false,
        message: 'Mỗi hạng mục không đạt cần ghi rõ dấu hiệu hư hỏng.'
      });
    }
    const cycleStart = new Date(schedule.current_cycle_start);
    const existingLog = await PreventiveMaintenance.findOne({
      plan_id: plan._id,
      equipment_id: equipment._id,
      cycle_start: cycleStart
    }).select('_id');
    if (existingLog) {
      return res.status(409).json({ success: false, message: 'Thiết bị này đã được ghi nhận trong kỳ bảo dưỡng hiện tại.' });
    }

    let repair = null;
    if (failedItems.length) {
      const activeRepair = await Repair.findOne({
        equipment_id: equipment._id,
        status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
      }).select('ticket_code');
      if (activeRepair) {
        return res.status(409).json({
          success: false,
          message: `Thiết bị đang có phiếu sửa chữa ${activeRepair.ticket_code}; xử lý phiếu hiện tại trước khi tạo phiếu mới.`
        });
      }
      const incidentDescription = `Phát hiện qua bảo dưỡng định kỳ "${plan.title}": ${failedItems
        .map((item) => `${item.item} — ${item.notes}`).join('; ')}`;
      repair = await Repair.create({
        equipment_id: equipment._id,
        room_id: equipment.room_id,
        source: REPAIR_SOURCES.INVENTORY_CHECK,
        reported_by: req.user._id,
        incident_description: incidentDescription,
        damage_level: DAMAGE_LEVELS.MINOR,
        deadline: computeDeadline(DAMAGE_LEVELS.MINOR, new Date()),
        status: REPAIR_STATUSES.REPORTED
      });
      await RepairLog.create({
        repair_id: repair._id,
        action: 'reported',
        performed_by: req.user._id,
        description: incidentDescription
      });
      equipment.status = EQUIPMENT_STATUSES.BROKEN;
      equipment.repair_count = (equipment.repair_count || 0) + 1;
      await equipment.save();
    }

    const record = await PreventiveMaintenance.create({
      plan_id: plan._id,
      room_id: equipment.room_id,
      equipment_id: equipment._id,
      checked_by: req.user._id,
      check_date: new Date(),
      cycle_start: cycleStart,
      status: failedItems.length ? 'failed' : 'passed',
      notes: notes.trim(),
      checklist_results: normalizedResults,
      repair_id: repair?._id || null
    });

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: 'PREVENTIVE_MAINTENANCE_LOGGED',
      target_table: 'preventive_maintenance',
      entity_id: record._id.toString(),
      new_value: {
        plan_id: plan._id.toString(),
        equipment_id: equipment._id.toString(),
        status: record.status,
        repair_id: repair?._id.toString() || null
      }
    });

    if (repair) {
      const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE }).select('_id');
      await Notification.insertMany(managers.map((manager) => ({
        user_id: manager._id,
        type: 'incident_reported',
        title: 'Phát hiện hư hỏng khi bảo dưỡng',
        message: `Thiết bị ${equipment.code} cần sửa chữa. Phiếu ${repair.ticket_code} đã được tạo.`,
        reference_type: 'repair',
        reference_id: repair._id
      })));
    }

    res.status(201).json({
      success: true,
      message: repair
        ? `Đã lưu kết quả bảo dưỡng và tự tạo phiếu sửa chữa ${repair.ticket_code}.`
        : 'Đã lưu kết quả bảo dưỡng.',
      record,
      repair
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Thiết bị này đã được ghi nhận trong kỳ bảo dưỡng hiện tại.' });
    }
    res.status(500).json({ success: false, message: `Không thể lưu kết quả bảo dưỡng: ${error.message}` });
  }
};
