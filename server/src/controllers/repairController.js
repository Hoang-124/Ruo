import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { Equipment } from '../models/Equipment.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { computeSlaDeadlines, evaluateSlaStatus } from '../services/slaReactor.js';
import { assertTransition } from '../domain/stateMachines.js';
import { USER_ROLES, USER_STATUSES, EQUIPMENT_STATUSES, REPAIR_PRIORITIES } from '../config/constants.js';

// @desc    Get all repairs with SLA evaluation
// @route   GET /api/repairs
export const getRepairs = async (req, res) => {
  try {
    const { status, reported_by, assigned_to, damage_level } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (reported_by) filter.reported_by = reported_by;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (damage_level) filter.damage_level = damage_level;

    const repairs = await Repair.find(filter)
      .populate('equipment_id', 'code name brand model qr_code room_id price remaining_value estimated_repair_cost')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('repair_unit_id', 'code name specialty phone')
      .populate('return_room_id', 'code name building floor')
      .sort({ created_at: -1 });

    const enriched = repairs.map(rep => {
      const repObj = rep.toObject();
      if (rep.deadline && rep.status !== 'closed' && rep.status !== 'resolved') {
        const sla = evaluateSlaStatus({ resolutionDeadline: rep.deadline });
        repObj.deadline_status = sla.state;
        repObj.remaining_minutes = sla.remainingMinutes;
      }
      return repObj;
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single repair detail with timeline logs and parts requests
// @route   GET /api/repairs/:id
export const getRepairById = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id)
      .populate('equipment_id')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('repair_unit_id')
      .populate('return_room_id');

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const logs = await RepairLog.find({ repair_id: repair._id })
      .populate('performed_by', 'full_name code email role')
      .populate('parts_used.part_id', 'code name unit price')
      .sort({ created_at: 1 });

    const partsRequests = await PartsRequest.find({ repair_id: repair._id })
      .populate('requested_by', 'full_name code')
      .populate('approved_by', 'full_name code')
      .populate('items.part_id', 'code name unit price');

    res.json({ success: true, data: { ...repair.toJSON(), logs, partsRequests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report equipment malfunction (Staff, Manager, Admin)
// @route   POST /api/repairs
export const createRepairReport = async (req, res) => {
  try {
    const { equipment_id, incident_description, incident_images = [], damage_level = 'minor' } = req.body;

    if (!equipment_id || !incident_description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã thiết bị và mô tả sự cố kỹ thuật.'
      });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
    }

    const validLevels = Object.values(REPAIR_PRIORITIES);
    const finalLevel = validLevels.includes(damage_level) ? damage_level : REPAIR_PRIORITIES.MINOR;

    // SLA calculation respecting university business hours
    const { resolutionDeadline } = computeSlaDeadlines(finalLevel, new Date());

    const repair = await Repair.create({
      equipment_id,
      reported_by: req.user._id,
      incident_description: String(incident_description).trim(),
      incident_images,
      damage_level: finalLevel,
      deadline: resolutionDeadline,
      status: 'reported'
    });

    // Update equipment status
    equipment.status = EQUIPMENT_STATUSES.REPAIRING;
    equipment.repair_count = (equipment.repair_count || 0) + 1;
    await equipment.save();

    // Create initial timeline log
    await RepairLog.create({
      repair_id: repair._id,
      action: 'reported',
      performed_by: req.user._id,
      description: `Báo cáo sự cố: ${incident_description}`,
      images: incident_images
    });

    // SHA-256 Audit Log
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'INCIDENT_REPORT',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { equipment_id, incident_description, damage_level: finalLevel, deadline: resolutionDeadline }
    });

    // Notify Managers
    const managers = await User.find({ role: USER_ROLES.MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: 'repair_reported',
        title: 'Sự cố thiết bị mới cần phân công',
        message: `Thiết bị ${equipment.code} - ${equipment.name} được báo hỏng mức độ [${finalLevel.toUpperCase()}].`,
        reference_type: 'repair',
        reference_id: repair._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Ghi nhận báo cáo sự cố thành công.',
      data: repair
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign repair task to technician (Manager, Admin)
// @route   PUT /api/repairs/:id/assign
export const assignRepairTask = async (req, res) => {
  try {
    const { assigned_to, repair_unit_id, deadline, repair_location = 'on_site' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, 'assigned', req.user.role);

    repair.assigned_to = assigned_to || req.user._id;
    if (repair_unit_id) repair.repair_unit_id = repair_unit_id;
    if (deadline) repair.deadline = new Date(deadline);
    repair.repair_location = repair_location;
    repair.status = 'assigned';
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'assigned',
      performed_by: req.user._id,
      description: `Phân công kỹ thuật viên xử lý`
    });

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'REPAIR_ASSIGN',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { assigned_to: repair.assigned_to, repair_location }
    });

    // Notify assigned staff
    if (repair.assigned_to) {
      await Notification.create({
        user_id: repair.assigned_to,
        type: 'repair_assigned',
        title: 'Nhiệm vụ sửa chữa mới được giao',
        message: `Bạn được phân công xử lý sự cố thiết bị mã phiếu ${repair.ticket_code}.`,
        reference_type: 'repair',
        reference_id: repair._id
      });
    }

    res.json({ success: true, message: 'Phân công nhiệm vụ thành công.', data: repair });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Log repair progress and update equipment R% economic indicator (Staff, Admin)
// @route   POST /api/repairs/:id/logs
export const addRepairLog = async (req, res) => {
  try {
    const { action = 'in_progress', description, cost = 0, parts_used = [], images = [] } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    if (repair.status === 'assigned') {
      assertTransition('REPAIR', repair.status, 'in_progress', req.user.role);
      repair.status = 'in_progress';
    }

    const numCost = Number(cost) || 0;

    const log = await RepairLog.create({
      repair_id: repair._id,
      action,
      performed_by: req.user._id,
      description: String(description || 'Cập nhật tiến độ xử lý kỹ thuật').trim(),
      cost: numCost,
      parts_used,
      images
    });

    if (numCost > 0) {
      repair.total_cost = (repair.total_cost || 0) + numCost;
      await repair.save();

      // Crucial: Update equipment's estimated repair cost so R% (rRatio) is live!
      const equipment = await Equipment.findById(repair.equipment_id);
      if (equipment) {
        equipment.estimated_repair_cost = (equipment.estimated_repair_cost || 0) + numCost;
        await equipment.save();
      }
    } else {
      await repair.save();
    }

    res.status(201).json({
      success: true,
      message: 'Cập nhật tiến độ sửa chữa thành công.',
      data: log
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Mark repair resolved (Staff, Admin)
// @route   PUT /api/repairs/:id/resolve
export const resolveRepair = async (req, res) => {
  try {
    const { post_repair_warranty, return_room_id, notes = '' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, 'resolved', req.user.role);

    repair.status = 'resolved';
    repair.resolved_at = new Date();
    if (post_repair_warranty) repair.post_repair_warranty = new Date(post_repair_warranty);
    if (return_room_id) repair.return_room_id = return_room_id;
    await repair.save();

    // Restore equipment back to active status
    const equipment = await Equipment.findById(repair.equipment_id);
    if (equipment) {
      equipment.status = EQUIPMENT_STATUSES.ACTIVE;
      if (return_room_id) equipment.room_id = return_room_id;
      if (post_repair_warranty) {
        equipment.warranty_expiry = new Date(post_repair_warranty);
        equipment.warranty_status = 'extended';
      }
      await equipment.save();
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: 'resolved',
      performed_by: req.user._id,
      description: `Đã hoàn thành sửa chữa kỹ thuật. ${notes}`.trim()
    });

    // Notify Managers for final sign-off / closure
    const managers = await User.find({ role: USER_ROLES.MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: 'repair_resolved',
        title: 'Thiết bị đã xử lý xong - Chờ nghiệm thu',
        message: `Kỹ thuật viên đã hoàn tất sửa chữa phiếu ${repair.ticket_code}. Quản lý vui lòng nghiệm thu và đóng phiếu.`,
        reference_type: 'repair',
        reference_id: repair._id
      });
    }

    res.json({
      success: true,
      message: 'Hoàn tất xử lý kỹ thuật, gửi thông báo nghiệm thu cho Quản lý.',
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Close repair ticket after verification (Manager, Admin)
// @route   PUT /api/repairs/:id/close
export const closeRepair = async (req, res) => {
  try {
    const { close_notes = '' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, 'closed', req.user.role);

    repair.status = 'closed';
    repair.closed_at = new Date();
    repair.closed_by = req.user._id;
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'closed',
      performed_by: req.user._id,
      description: `Quản lý đã nghiệm thu đạt chất lượng và đóng phiếu sửa chữa. ${close_notes}`.trim()
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'REPAIR_CLOSE',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'closed', closed_at: repair.closed_at }
    });

    res.json({
      success: true,
      message: 'Nghiệm thu và đóng phiếu sửa chữa thành công.',
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
