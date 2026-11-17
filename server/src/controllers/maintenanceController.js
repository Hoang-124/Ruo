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
import { rankTechniciansBySpecialty, resolveTechnicianSpecialtyProfile } from '../services/aiService.js';

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

export const getPlanSchedule = (plan, now = new Date()) => {
  const start = new Date(plan.start_date);
  const months = plan.frequency === 'quarterly' ? 3 : 1;
  const monthDifference = (now.getUTCFullYear() - start.getUTCFullYear()) * 12
    + now.getUTCMonth() - start.getUTCMonth();
  let cycleIndex = Math.max(0, Math.floor(monthDifference / months));
  if (cycleIndex > 0 && getMonthOffset(start, cycleIndex * months) > now) cycleIndex -= 1;
  const currentCycle = getMonthOffset(start, cycleIndex * months);
  const isStarted = start <= now;
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

const notifyMaintenanceUsers = async ({ roles = [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN], type = 'info', title, message, reference_type = 'maintenance', reference_id = null }) => {
  try {
    if (User.db?.readyState !== 1 && User.find?.name === 'find') return;
    const recipients = await User.find({
      role: { $in: roles },
      status: USER_STATUSES.ACTIVE
    }).select('_id');
    if (!Array.isArray(recipients) || !recipients.length) return;
    await Notification.insertMany(
      recipients.map((u) => ({
        user_id: u._id,
        type,
        title,
        message,
        reference_type,
        reference_id
      }))
    );
  } catch (err) {
    console.warn('[Maintenance Notification Warning]:', err?.message || err);
  }
};

const validatePlanPayload = async (body = {}) => {
  const { title, building, floor, room_ids, category_ids, frequency, start_date, checklist } = body;
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
    errors.checklist = 'Checklist phải có từ 1 đến 20 mục, mỗi mục dài 2–160 ký tự (không trùng lặp).';
  }
  if (room_ids !== undefined && (!Array.isArray(room_ids) || room_ids.some((id) => !mongoose.isValidObjectId(id)))) {
    errors.room_ids = 'Danh sách phòng không hợp lệ.';
  }
  if (category_ids !== undefined && (!Array.isArray(category_ids) || category_ids.some((id) => !mongoose.isValidObjectId(id)))) {
    errors.category_ids = 'Danh sách loại thiết bị không hợp lệ.';
  }
  if (Object.keys(errors).length) {
    return { errorStatus: 400, errorBody: { success: false, message: 'Thông tin kế hoạch chưa hợp lệ.', errors } };
  }

  if (category_ids?.length) {
    const categories = await Category.countDocuments({ _id: { $in: category_ids } });
    if (categories !== new Set(category_ids.map(String)).size) {
      return { errorStatus: 400, errorBody: { success: false, message: 'Một hoặc nhiều loại thiết bị không tồn tại.' } };
    }
  }

  const roomFilter = room_ids?.length
    ? { _id: { $in: room_ids }, building: normalizedBuilding, floor: numericFloor }
    : { building: normalizedBuilding, floor: numericFloor };
  const rooms = await Room.find({ ...roomFilter, status: { $ne: 'inactive' } }).select('_id');
  if (!rooms.length || (room_ids?.length && rooms.length !== new Set(room_ids.map(String)).size)) {
    return {
      errorStatus: 400,
      errorBody: {
        success: false,
        message: 'Không tìm thấy phòng phù hợp trong tòa và tầng đã chọn.'
      }
    };
  }

  return {
    cleaned: {
      title: title.trim(),
      building: normalizedBuilding,
      floor: numericFloor,
      room_ids: rooms.map((room) => room._id),
      category_ids: category_ids || [],
      frequency,
      start_date: parsedStartDate,
      checklist: (checklist?.length ? checklist : DEFAULT_CHECKLIST).map((item) => item.trim())
    }
  };
};

export const getMaintenancePlans = async (req, res) => {
  try {
    const plans = await MaintenancePlan.find({ is_active: true })
      .populate('room_ids', 'code name building floor')
      .populate('category_ids', 'code name')
      .populate('created_by', 'full_name code')
      .sort({ start_date: 1, created_at: -1 });
    const roomIds = [...new Set(plans.flatMap((plan) => plan.room_ids.map((room) => (room?._id || room).toString())))];
    const equipment = roomIds.length
      ? await Equipment.find({ room_id: { $in: roomIds }, status: { $ne: EQUIPMENT_STATUSES.DISPOSED } })
        .populate('room_id', 'code name building floor')
        .populate('category_id', 'name code')
        .sort({ room_id: 1, code: 1 })
      : [];

    let records = [];
    try {
      if (PreventiveMaintenance.db?.readyState === 1 || PreventiveMaintenance.find?.name !== 'find') {
        const planIds = plans.map((p) => p._id);
        const query = planIds.length ? { $or: [{ plan_id: { $in: planIds } }, { room_id: { $in: roomIds } }] } : {};
        records = await PreventiveMaintenance.find(query)
          .populate('plan_id', 'title building floor frequency')
          .populate('room_id', 'code name building floor')
          .populate('equipment_id', 'code name brand model status')
          .populate('checked_by', 'full_name code role specialty_code specialty_label')
          .populate('repair_id', 'ticket_code status assigned_to damage_level')
          .sort({ check_date: -1 })
          .limit(100);
      }
    } catch {
      records = [];
    }

    res.json({
      success: true,
      plans: plans.map((plan) => ({
        ...(typeof plan.toObject === 'function' ? plan.toObject() : plan),
        schedule: getPlanSchedule(plan)
      })),
      equipment,
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể tải lịch bảo dưỡng: ${error.message}` });
  }
};

export const createMaintenancePlan = async (req, res) => {
  try {
    const validation = await validatePlanPayload(req.body || {});
    if (validation.errorBody) {
      return res.status(validation.errorStatus).json(validation.errorBody);
    }

    const plan = await MaintenancePlan.create({
      ...validation.cleaned,
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

    await notifyMaintenanceUsers({
      roles: [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN],
      type: 'info',
      title: 'Lịch bảo dưỡng định kỳ mới',
      message: `${req.user.full_name} vừa ban hành lịch bảo dưỡng "${plan.title}" tại Tòa ${plan.building} • Tầng ${plan.floor} (${plan.room_ids.length} phòng).`,
      reference_type: 'maintenance',
      reference_id: plan._id
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo kế hoạch bảo dưỡng định kỳ và gửi thông báo cho Kỹ thuật viên.',
      plan: { ...(typeof plan.toObject === 'function' ? plan.toObject() : plan), schedule: getPlanSchedule(plan) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể tạo kế hoạch bảo dưỡng: ${error.message}` });
  }
};

export const updateMaintenancePlan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Mã kế hoạch không hợp lệ.' });
    }
    const plan = await MaintenancePlan.findOne({ _id: id, is_active: true });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch bảo dưỡng.' });
    }

    const validation = await validatePlanPayload(req.body || {});
    if (validation.errorBody) {
      return res.status(validation.errorStatus).json(validation.errorBody);
    }

    Object.assign(plan, validation.cleaned);
    await plan.save();

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: 'MAINTENANCE_PLAN_UPDATED',
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

    await notifyMaintenanceUsers({
      roles: [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN],
      type: 'info',
      title: 'Cập nhật lịch bảo dưỡng định kỳ',
      message: `${req.user.full_name} vừa cập nhật lịch bảo dưỡng "${plan.title}" (Tòa ${plan.building} • Tầng ${plan.floor}).`,
      reference_type: 'maintenance',
      reference_id: plan._id
    });

    res.json({
      success: true,
      message: 'Đã cập nhật kế hoạch bảo dưỡng định kỳ và thông báo tới Kỹ thuật viên.',
      plan: { ...(typeof plan.toObject === 'function' ? plan.toObject() : plan), schedule: getPlanSchedule(plan) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể cập nhật kế hoạch bảo dưỡng: ${error.message}` });
  }
};

export const deleteMaintenancePlan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Mã kế hoạch không hợp lệ.' });
    }
    const plan = await MaintenancePlan.findOne({ _id: id, is_active: true });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch bảo dưỡng.' });
    }

    plan.is_active = false;
    await plan.save();

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: 'MAINTENANCE_PLAN_DELETED',
      target_table: 'maintenance_plans',
      entity_id: plan._id.toString(),
      new_value: { title: plan.title, is_active: false }
    });

    await notifyMaintenanceUsers({
      roles: [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN],
      type: 'warning',
      title: 'Đã hủy lịch bảo dưỡng định kỳ',
      message: `${req.user.full_name} đã xóa kế hoạch bảo dưỡng "${plan.title}" (Tòa ${plan.building} • Tầng ${plan.floor}).`,
      reference_type: 'maintenance',
      reference_id: plan._id
    });

    res.json({
      success: true,
      message: `Đã xóa kế hoạch bảo dưỡng "${plan.title}".`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể xóa kế hoạch bảo dưỡng: ${error.message}` });
  }
};

export const logMaintenanceResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Mã kế hoạch không hợp lệ.' });
    }
    const { equipment_id, checklist_results, notes = '', record_id } = req.body || {};
    if (!mongoose.isValidObjectId(equipment_id)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thiết bị cần kiểm tra.' });
    }
    if (typeof notes !== 'string' || notes.length > 2000) {
      return res.status(400).json({ success: false, message: 'Ghi chú tối đa 2.000 ký tự.' });
    }
    const plan = await MaintenancePlan.findOne({ _id: id, is_active: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch đang hoạt động.' });
    const equipment = await Equipment.findById(equipment_id);
    if (!equipment || !equipment.room_id || !plan.room_ids.some((roomId) => (roomId?.equals ? roomId.equals(equipment.room_id) : String(roomId) === String(equipment.room_id)))) {
      return res.status(400).json({ success: false, message: 'Thiết bị không thuộc phòng trong kế hoạch bảo dưỡng.' });
    }
    if (equipment.status === EQUIPMENT_STATUSES.DISPOSED
      || (plan.category_ids.length && !plan.category_ids.some((categoryId) => (categoryId?.equals ? categoryId.equals(equipment.category_id) : String(categoryId) === String(equipment.category_id))))) {
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
    const existingLog = await PreventiveMaintenance.findOne(
      record_id && mongoose.isValidObjectId(record_id)
        ? { _id: record_id }
        : {
            plan_id: plan._id,
            equipment_id: equipment._id,
            cycle_start: cycleStart
          }
    );

    let repair = null;
    if (failedItems.length) {
      const activeRepair = await Repair.findOne({
        equipment_id: equipment._id,
        status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
      }).select('ticket_code _id status assigned_to');
      if (activeRepair && !existingLog) {
        return res.status(409).json({
          success: false,
          message: `Thiết bị đang có phiếu sửa chữa ${activeRepair.ticket_code}; xử lý phiếu hiện tại trước khi tạo phiếu mới.`
        });
      }
      if (activeRepair && existingLog) {
        repair = activeRepair;
      } else {
        const incidentDescription = `Phát hiện qua bảo dưỡng định kỳ "${plan.title}": ${failedItems
          .map((item) => `${item.item} — ${item.notes}`).join('; ')}`;

        // Try AI specialty auto-dispatch if technicians exist in DB
        let assignedTechId = null;
        let requiredSpecialtyCode = null;
        let aiAutoAssigned = false;
        try {
          if (User.db?.readyState === 1) {
            const categoryDoc = equipment.category_id ? await Category.findById(equipment.category_id).select('code name') : null;
            const roomDoc = equipment.room_id ? await Room.findById(equipment.room_id).select('code name building floor') : null;
            const technicians = await User.find({ role: USER_ROLES.TECHNICIAN, status: USER_STATUSES.ACTIVE });
            if (technicians.length > 0) {
              const ranking = rankTechniciansBySpecialty({
                equipment: { ...equipment.toObject(), category_id: categoryDoc },
                category: categoryDoc,
                room: roomDoc,
                incidentDescription,
                damageLevel: DAMAGE_LEVELS.MINOR,
                technicians,
                openRepairsByTech: {}
              });
              requiredSpecialtyCode = ranking?.requiredSpecialtyCode || null;
              const bestCandidate = ranking?.recommendations?.find((c) => c.isQualified) || ranking?.recommendations?.[0];
              if (bestCandidate?.technicianId) {
                assignedTechId = bestCandidate.technicianId;
                aiAutoAssigned = true;
              }
            }
          }
        } catch {
          // Fallback to reported if AI ranking is unavailable in mock tests
        }

        repair = await Repair.create({
          equipment_id: equipment._id,
          room_id: equipment.room_id,
          source: REPAIR_SOURCES.INVENTORY_CHECK,
          reported_by: req.user._id,
          assigned_to: assignedTechId,
          required_specialty_code: requiredSpecialtyCode,
          ai_auto_assigned: aiAutoAssigned,
          incident_description: incidentDescription,
          damage_level: DAMAGE_LEVELS.MINOR,
          deadline: computeDeadline(DAMAGE_LEVELS.MINOR, new Date()),
          status: assignedTechId ? REPAIR_STATUSES.ASSIGNED : REPAIR_STATUSES.REPORTED
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
    } else if (existingLog && equipment.status === EQUIPMENT_STATUSES.BROKEN) {
      equipment.status = EQUIPMENT_STATUSES.IN_USE;
      await equipment.save();
    }

    let record;
    if (existingLog && typeof existingLog.save === 'function') {
      existingLog.checked_by = req.user._id;
      existingLog.check_date = new Date();
      existingLog.status = failedItems.length ? 'failed' : 'passed';
      existingLog.notes = notes.trim();
      existingLog.checklist_results = normalizedResults;
      if (repair?._id) existingLog.repair_id = repair._id;
      record = await existingLog.save();
    } else {
      record = await PreventiveMaintenance.create({
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
    }

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: existingLog ? 'PREVENTIVE_MAINTENANCE_UPDATED' : 'PREVENTIVE_MAINTENANCE_LOGGED',
      target_table: 'preventive_maintenance',
      entity_id: record._id.toString(),
      new_value: {
        plan_id: plan._id.toString(),
        equipment_id: equipment._id.toString(),
        status: record.status,
        repair_id: repair?._id?.toString() || null
      }
    });

    if (repair) {
      const managers = await User.find({
        role: { $in: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN] },
        status: USER_STATUSES.ACTIVE
      }).select('_id');
      if (Array.isArray(managers) && managers.length) {
        await Notification.insertMany(managers.map((manager) => ({
          user_id: manager._id,
          type: 'incident_reported',
          title: 'Phát hiện hư hỏng khi bảo dưỡng',
          message: `KTV ${req.user.full_name} kiểm tra bảo dưỡng "${plan.title}": Thiết bị ${equipment.code} có ${failedItems.length} mục KHÔNG ĐẠT. Phiếu sửa chữa ${repair.ticket_code} đã được gửi tới Manager & KTV.`,
          reference_type: 'repair',
          reference_id: repair._id
        })));
      }
    } else {
      await notifyMaintenanceUsers({
        roles: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN],
        type: 'success',
        title: `Kết quả bảo dưỡng ĐẠT: ${equipment.code}`,
        message: `${req.user.full_name} đã hoàn tất kiểm tra bảo dưỡng "${plan.title}" cho thiết bị ${equipment.code} (${equipment.name}) — Đạt ${normalizedResults.length}/${normalizedResults.length} hạng mục.`,
        reference_type: 'maintenance',
        reference_id: record._id
      });
    }

    res.status(201).json({
      success: true,
      message: repair
        ? `Đã lưu kết quả bảo dưỡng, tạo phiếu sửa chữa ${repair.ticket_code} và gửi kết quả cho Manager & KTV.`
        : 'Đã lưu kết quả bảo dưỡng ĐẠT và gửi kết quả qua cho Facility Manager & KTV.',
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

export const deleteMaintenanceRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    if (!mongoose.isValidObjectId(recordId)) {
      return res.status(400).json({ success: false, message: 'Mã biên bản bảo dưỡng không hợp lệ.' });
    }
    const record = await PreventiveMaintenance.findById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biên bản kết quả bảo dưỡng.' });
    }
    await PreventiveMaintenance.findByIdAndDelete(recordId);

    await AuditLog.logAction({
      ...getManagerActor(req),
      action: 'PREVENTIVE_MAINTENANCE_DELETED',
      target_table: 'preventive_maintenance',
      entity_id: recordId,
      new_value: { deleted: true }
    });

    res.json({
      success: true,
      message: 'Đã xóa biên bản kết quả bảo dưỡng.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Không thể xóa biên bản bảo dưỡng: ${error.message}` });
  }
};
