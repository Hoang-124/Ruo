import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { Equipment } from '../models/Equipment.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Room } from '../models/Room.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { computeDeadline, evaluateSlaStatus } from '../services/slaReactor.js';
import { assertTransition } from '../domain/stateMachines.js';
import { 
  USER_ROLES, 
  USER_STATUSES, 
  EQUIPMENT_STATUSES, 
  DAMAGE_LEVELS,
  REPAIR_STATUSES,
  REPAIR_SOURCES,
  REPAIR_OUTCOMES,
  MOVEMENT_TYPES,
  MOVEMENT_STATUSES,
  ROOM_TYPES
} from '../config/constants.js';

// @desc    Get all repairs with SLA evaluation & filtering
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
      .populate('replacement_equipment_id', 'code name brand model qr_code')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('assigned_by', 'full_name code')
      .populate('repair_unit_id', 'code name specialty phone')
      .populate('destination_room_id', 'code name building floor')
      .sort({ created_at: -1 });

    const enriched = repairs.map(rep => {
      const repObj = rep.toObject();
      if (rep.deadline && rep.status !== REPAIR_STATUSES.CLOSED && rep.status !== REPAIR_STATUSES.RESOLVED) {
        const sla = evaluateSlaStatus(rep.deadline);
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

// @desc    Get single repair detail with timeline logs, movements, and parts requests
// @route   GET /api/repairs/:id
export const getRepairById = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id)
      .populate('equipment_id')
      .populate('replacement_equipment_id')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('assigned_by', 'full_name code')
      .populate('repair_unit_id')
      .populate('destination_room_id');

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const logs = await RepairLog.find({ repair_id: repair._id })
      .populate('performed_by', 'full_name code email role')
      .sort({ created_at: 1 });

    const partsRequests = await PartsRequest.find({ repair_id: repair._id })
      .populate('requested_by', 'full_name code')
      .populate('approved_by', 'full_name code')
      .populate('items.part_id', 'code name unit price');

    const movements = await EquipmentMovement.find({ repair_id: repair._id })
      .populate('equipment_id', 'code name')
      .populate('from_room_id', 'code name')
      .populate('to_room_id', 'code name')
      .populate('performed_by', 'full_name code');

    res.json({ 
      success: true, 
      data: { 
        ...repair.toJSON(), 
        logs, 
        partsRequests,
        movements 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report equipment malfunction (Lecturer or Technician during inventory)
// @route   POST /api/repairs
export const createRepairReport = async (req, res) => {
  try {
    const { 
      equipment_id, 
      incident_description, 
      incident_images = [], 
      damage_level = DAMAGE_LEVELS.MINOR,
      source = REPAIR_SOURCES.LECTURER_REPORT 
    } = req.body;

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

    const validLevels = Object.values(DAMAGE_LEVELS);
    const finalLevel = validLevels.includes(damage_level) ? damage_level : DAMAGE_LEVELS.MINOR;

    // SLA calculation respecting university business hours
    const resolutionDeadline = computeDeadline(finalLevel, new Date());

    const repair = await Repair.create({
      equipment_id,
      source,
      reported_by: req.user._id,
      incident_description: String(incident_description).trim(),
      incident_images,
      damage_level: finalLevel,
      deadline: resolutionDeadline,
      status: REPAIR_STATUSES.REPORTED
    });

    // Update equipment status to BROKEN
    equipment.status = EQUIPMENT_STATUSES.BROKEN;
    equipment.repair_count = (equipment.repair_count || 0) + 1;
    await equipment.save();

    // Create initial timeline log
    await RepairLog.create({
      repair_id: repair._id,
      action: 'reported',
      performed_by: req.user._id,
      description: `Báo cáo sự cố [${source}]: ${incident_description}`,
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

    // Notify Facility Managers
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: 'incident_reported',
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

// @desc    Assign repair task to technician & optionally assign spare replacement equipment (Facility Manager)
// @route   PUT /api/repairs/:id/assign
export const assignRepairTask = async (req, res) => {
  try {
    const { 
      assigned_to, 
      repair_unit_id, 
      deadline, 
      replacement_equipment_id,
      damage_level 
    } = req.body;

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.ASSIGNED, req.user.role);

    repair.assigned_by = req.user._id;
    repair.assigned_to = assigned_to || null;
    if (repair_unit_id) repair.repair_unit_id = repair_unit_id;
    if (damage_level) repair.damage_level = damage_level;
    if (deadline) repair.deadline = new Date(deadline);

    // If replacement equipment is selected from warehouse
    if (replacement_equipment_id) {
      const spareEq = await Equipment.findById(replacement_equipment_id);
      if (spareEq && spareEq.status === EQUIPMENT_STATUSES.IN_STOCK) {
        repair.replacement_equipment_id = spareEq._id;

        // Find the broken equipment's room
        const brokenEq = await Equipment.findById(repair.equipment_id);
        const targetRoomId = brokenEq ? brokenEq.room_id : null;

        // Create replacement movement order (pending confirmation by technician)
        await EquipmentMovement.create({
          equipment_id: spareEq._id,
          type: MOVEMENT_TYPES.REPLACEMENT,
          from_room_id: spareEq.room_id,
          to_room_id: targetRoomId,
          repair_id: repair._id,
          ordered_by: req.user._id,
          reason: `Thay thế thiết bị dự phòng cho thiết bị hỏng ${brokenEq ? brokenEq.code : ''}`,
          status: MOVEMENT_STATUSES.PENDING
        });
      }
    }

    repair.status = REPAIR_STATUSES.ASSIGNED;
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'assigned',
      performed_by: req.user._id,
      description: `Facility Manager phân công kỹ thuật viên xử lý`
    });

    // Notify assigned Technician
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

// @desc    Accept repair task (Technician)
// @route   PUT /api/repairs/:id/accept
export const acceptRepairTask = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.IN_PROGRESS, req.user.role);

    repair.status = REPAIR_STATUSES.IN_PROGRESS;
    await repair.save();

    // Update equipment status to REPAIRING
    const equipment = await Equipment.findById(repair.equipment_id);
    if (equipment) {
      equipment.status = EQUIPMENT_STATUSES.REPAIRING;
      await equipment.save();
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: 'in_progress',
      performed_by: req.user._id,
      description: `Kỹ thuật viên đã tiếp nhận và bắt đầu sửa chữa.`
    });

    res.json({ success: true, message: 'Đã tiếp nhận nhiệm vụ sửa chữa.', data: repair });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Log repair progress (Technician)
// @route   POST /api/repairs/:id/logs
export const addRepairLog = async (req, res) => {
  try {
    const { action = 'in_progress', description, cost = 0, images = [] } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    if (repair.status === REPAIR_STATUSES.ASSIGNED) {
      assertTransition('REPAIR', repair.status, REPAIR_STATUSES.IN_PROGRESS, req.user.role);
      repair.status = REPAIR_STATUSES.IN_PROGRESS;
    }

    const numCost = Number(cost) || 0;

    const log = await RepairLog.create({
      repair_id: repair._id,
      action,
      performed_by: req.user._id,
      description: String(description || 'Cập nhật tiến độ xử lý kỹ thuật').trim(),
      cost: numCost,
      images
    });

    if (numCost > 0) {
      repair.total_cost = (repair.total_cost || 0) + numCost;
      await repair.save();

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

// @desc    Report repair outcome (Technician): repaired or unrepairable
// @route   PUT /api/repairs/:id/outcome
export const reportRepairOutcome = async (req, res) => {
  try {
    const { outcome, notes = '' } = req.body;
    if (![REPAIR_OUTCOMES.REPAIRED, REPAIR_OUTCOMES.UNREPAIRABLE].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Kết luận phải là repaired hoặc unrepairable.' });
    }

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const targetStatus = outcome === REPAIR_OUTCOMES.REPAIRED ? REPAIR_STATUSES.RESOLVED : REPAIR_STATUSES.UNREPAIRABLE;
    assertTransition('REPAIR', repair.status, targetStatus, req.user.role);

    repair.status = targetStatus;
    repair.outcome = outcome;
    if (outcome === REPAIR_OUTCOMES.REPAIRED) {
      repair.resolved_at = new Date();
    }
    await repair.save();

    const equipment = await Equipment.findById(repair.equipment_id);
    if (equipment) {
      if (outcome === REPAIR_OUTCOMES.UNREPAIRABLE) {
        // Equipment is pending disposal
        equipment.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
      }
      await equipment.save();
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: targetStatus,
      performed_by: req.user._id,
      description: `Kỹ thuật viên báo cáo kết quả: [${outcome.toUpperCase()}]. ${notes}`.trim()
    });

    // Notify Facility Managers
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: outcome === REPAIR_OUTCOMES.REPAIRED ? 'repair_resolved' : 'repair_unrepairable',
        title: outcome === REPAIR_OUTCOMES.REPAIRED ? 'Thiết bị đã sửa xong' : 'Thiết bị không thể sửa chữa',
        message: `Phiếu ${repair.ticket_code} đã có kết quả: [${outcome.toUpperCase()}]. Vui lòng xử lý tiếp.`,
        reference_type: 'repair',
        reference_id: repair._id
      });
    }

    res.json({
      success: true,
      message: `Đã cập nhật kết luận sửa chữa [${outcome}].`,
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Close repair ticket & assign post-repair location (Facility Manager)
// @route   PUT /api/repairs/:id/close
export const closeRepairTicket = async (req, res) => {
  try {
    const { destination_room_id, close_notes = '' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.CLOSED, req.user.role);

    const equipment = await Equipment.findById(repair.equipment_id);
    let destinationRoom = null;

    if (repair.outcome === REPAIR_OUTCOMES.REPAIRED) {
      if (destination_room_id) {
        destinationRoom = await Room.findById(destination_room_id);
      }
      
      // If no destination specified, check if warehouses exist, default to warehouse
      if (!destinationRoom) {
        destinationRoom = await Room.findOne({ room_type: ROOM_TYPES.WAREHOUSE });
      }

      repair.destination_room_id = destinationRoom ? destinationRoom._id : null;

      // Create return movement
      const isWarehouse = destinationRoom && destinationRoom.room_type === ROOM_TYPES.WAREHOUSE;
      const movementType = isWarehouse ? MOVEMENT_TYPES.TO_STOCK : MOVEMENT_TYPES.REPAIR_RETURN;

      await EquipmentMovement.create({
        equipment_id: equipment._id,
        type: movementType,
        from_room_id: equipment.room_id,
        to_room_id: destinationRoom ? destinationRoom._id : null,
        repair_id: repair._id,
        ordered_by: req.user._id,
        reason: isWarehouse ? 'Sửa xong nhập kho dự phòng' : 'Sửa xong chuyển trả phòng học',
        status: MOVEMENT_STATUSES.PENDING
      });

      // Update equipment status accordingly
      if (isWarehouse) {
        equipment.status = EQUIPMENT_STATUSES.IN_STOCK;
      } else {
        equipment.status = EQUIPMENT_STATUSES.IN_USE;
      }
      if (destinationRoom) equipment.room_id = destinationRoom._id;
      await equipment.save();
    }

    repair.status = REPAIR_STATUSES.CLOSED;
    repair.closed_at = new Date();
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'closed',
      performed_by: req.user._id,
      description: `Facility Manager đã nghiệm thu và đóng phiếu. ${close_notes}`.trim()
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
      message: 'Đóng phiếu sửa chữa thành công.',
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Evaluate repair quality (Lecturer)
// @route   POST /api/repairs/:id/evaluate
export const evaluateRepairQuality = async (req, res) => {
  try {
    const { feedback_rating, feedback_comment = '' } = req.body;
    const numRating = Number(feedback_rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao.' });
    }

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    repair.feedback_rating = numRating;
    repair.feedback_comment = String(feedback_comment).trim();
    repair.feedback_at = new Date();
    await repair.save();

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá chất lượng sửa chữa.',
      data: {
        id: repair._id,
        feedback_rating: repair.feedback_rating,
        feedback_comment: repair.feedback_comment,
        feedback_at: repair.feedback_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compatibility exports
export const resolveRepair = reportRepairOutcome;
export const closeRepair = closeRepairTicket;
