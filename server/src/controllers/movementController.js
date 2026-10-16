import mongoose from 'mongoose';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Equipment } from '../models/Equipment.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { assertTransition } from '../domain/stateMachines.js';
import { 
  USER_ROLES, 
  MOVEMENT_TYPES, 
  MOVEMENT_STATUSES, 
  EQUIPMENT_STATUSES 
} from '../config/constants.js';

// @desc    Get all movements (View movement history / orders)
// @route   GET /api/movements
export const getMovements = async (req, res) => {
  try {
    const { status, type, equipment_id, performed_by } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (equipment_id) {
      if (!mongoose.isValidObjectId(equipment_id)) {
        return res.status(400).json({ success: false, message: 'ID thiết bị không đúng định dạng.' });
      }
      filter.equipment_id = equipment_id;
    }
    if (performed_by) filter.performed_by = performed_by;

    const movements = await EquipmentMovement.find(filter)
      .populate('equipment_id', 'code name brand model qr_code status price')
      .populate('from_room_id', 'code name building floor')
      .populate('to_room_id', 'code name building floor')
      .populate('ordered_by', 'full_name code email role')
      .populate('assigned_to', 'full_name code email role')
      .populate('approved_by', 'full_name code email role')
      .populate('performed_by', 'full_name code email role')
      .populate('repair_id', 'ticket_code damage_level status')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      total: movements.length,
      movements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingTransfers = async (req, res) => {
  try {
    const movements = await EquipmentMovement.find({ status: MOVEMENT_STATUSES.AWAITING_APPROVAL })
      .populate('equipment_id', 'code name brand model status')
      .populate('from_room_id', 'code name building floor')
      .populate('to_room_id', 'code name building floor')
      .populate('ordered_by', 'full_name code email role')
      .populate('assigned_to', 'full_name code email role')
      .sort({ created_at: 1 });

    res.json({ success: true, total: movements.length, movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEquipmentTransfers = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID thiết bị không đúng định dạng.' });
    }
    const equipment = await Equipment.findById(req.params.id).select('code name');
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    }

    const movements = await EquipmentMovement.find({ equipment_id: equipment._id })
      .populate('equipment_id', 'code name brand model status')
      .populate('from_room_id', 'code name building floor')
      .populate('to_room_id', 'code name building floor')
      .populate('ordered_by', 'full_name code role')
      .populate('assigned_to', 'full_name code role')
      .populate('approved_by', 'full_name code role')
      .populate('performed_by', 'full_name code role')
      .sort({ created_at: -1 });

    res.json({ success: true, equipment, total: movements.length, movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Order equipment transfer (Facility Manager)
// @route   POST /api/movements
export const createMovementOrder = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phiếu điều chuyển không hợp lệ.' });
    }
    const { equipment_id, to_room_id, assigned_to, reason, type = MOVEMENT_TYPES.TRANSFER } = req.body;

    if (!mongoose.isValidObjectId(equipment_id) || !mongoose.isValidObjectId(to_room_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID thiết bị hoặc phòng đích không đúng định dạng.'
      });
    }
    if (!Object.values(MOVEMENT_TYPES).includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại điều chuyển không hợp lệ.' });
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Lý do điều chuyển phải có từ 3 đến 500 ký tự.' });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    }

    const toRoom = await Room.findById(to_room_id);
    if (!toRoom) {
      return res.status(404).json({ success: false, message: 'Phòng đích không tồn tại.' });
    }
    if (equipment.room_id?.toString() === toRoom._id.toString()) {
      return res.status(400).json({ success: false, message: 'Phòng đích phải khác phòng hiện tại của thiết bị.' });
    }
    if ([EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST].includes(equipment.status)) {
      return res.status(409).json({ success: false, message: 'Không thể điều chuyển thiết bị đã thanh lý hoặc thất lạc.' });
    }

    const activeMovement = await EquipmentMovement.findOne({
      equipment_id: equipment._id,
      status: { $in: [MOVEMENT_STATUSES.AWAITING_APPROVAL, MOVEMENT_STATUSES.APPROVED, MOVEMENT_STATUSES.PENDING] }
    });
    if (activeMovement) {
      return res.status(409).json({ success: false, message: 'Thiết bị đã có phiếu điều chuyển đang xử lý.' });
    }

    let assignedTechnician = null;
    if (assigned_to) {
      if (!mongoose.isValidObjectId(assigned_to)) {
        return res.status(400).json({ success: false, message: 'ID kỹ thuật viên không đúng định dạng.' });
      }
      assignedTechnician = await User.findOne({ _id: assigned_to, role: USER_ROLES.TECHNICIAN, status: 'active' });
      if (!assignedTechnician) {
        return res.status(400).json({ success: false, message: 'Người phụ trách phải là tài khoản Kỹ thuật viên.' });
      }
    }

    const from_room_id = equipment.room_id || null;

    const movement = await EquipmentMovement.create({
      equipment_id: equipment._id,
      type,
      from_room_id,
      to_room_id: toRoom._id,
      ordered_by: req.user._id,
      assigned_to: assignedTechnician?._id || (req.user.role === USER_ROLES.TECHNICIAN ? req.user._id : null),
      reason: reason.trim(),
      status: MOVEMENT_STATUSES.AWAITING_APPROVAL
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'ORDER_MOVEMENT',
      target_table: 'equipment_movements',
      entity_id: movement._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { equipment_id: equipment.code, from: from_room_id, to: toRoom.code, type, status: movement.status }
    });

    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: 'active' });
    for (const manager of managers) {
      await Notification.create({
        user_id: manager._id,
        type: 'movement_ordered',
        title: 'Phiếu điều chuyển cần phê duyệt',
        message: `Yêu cầu chuyển thiết bị ${equipment.code} đến phòng ${toRoom.code} đang chờ phê duyệt.`,
        reference_type: 'equipment_movement',
        reference_id: movement._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đã gửi phiếu điều chuyển, đang chờ Quản lý CSVC phê duyệt.',
      movement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTransfer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID phiếu điều chuyển không đúng định dạng.' });
    }
    const movement = await EquipmentMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu điều chuyển.' });
    }
    assertTransition('TRANSFER', movement.status, MOVEMENT_STATUSES.APPROVED, req.user.role);
    if (movement.ordered_by.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Người tạo phiếu không được tự phê duyệt phiếu của mình.' });
    }

    movement.status = MOVEMENT_STATUSES.APPROVED;
    movement.approved_by = req.user._id;
    movement.approved_at = new Date();
    movement.reject_reason = '';
    await movement.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'APPROVE_TRANSFER',
      target_table: 'equipment_movements',
      entity_id: movement._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: movement.status }
    });

    const technicians = movement.assigned_to
      ? [await User.findById(movement.assigned_to)]
      : await User.find({ role: USER_ROLES.TECHNICIAN, status: 'active' });
    for (const technician of technicians.filter(Boolean)) {
      await Notification.create({
        user_id: technician._id,
        type: 'movement_ordered',
        title: 'Phiếu điều chuyển đã được duyệt',
        message: 'Có phiếu điều chuyển thiết bị mới được duyệt và sẵn sàng thực hiện.',
        reference_type: 'equipment_movement',
        reference_id: movement._id
      });
    }

    res.json({ success: true, message: 'Đã phê duyệt phiếu điều chuyển.', movement });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const rejectTransfer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID phiếu điều chuyển không đúng định dạng.' });
    }
    const rejectReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (rejectReason.length < 3 || rejectReason.length > 500) {
      return res.status(400).json({ success: false, message: 'Lý do từ chối phải có từ 3 đến 500 ký tự.' });
    }
    const movement = await EquipmentMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu điều chuyển.' });
    }
    assertTransition('TRANSFER', movement.status, MOVEMENT_STATUSES.REJECTED, req.user.role);
    if (movement.ordered_by.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Người tạo phiếu không được tự từ chối phiếu của mình.' });
    }

    movement.status = MOVEMENT_STATUSES.REJECTED;
    movement.approved_by = req.user._id;
    movement.approved_at = new Date();
    movement.reject_reason = rejectReason;
    await movement.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'REJECT_TRANSFER',
      target_table: 'equipment_movements',
      entity_id: movement._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: movement.status, reason: rejectReason }
    });

    await Notification.create({
      user_id: movement.ordered_by,
      type: 'movement_ordered',
      title: 'Phiếu điều chuyển đã bị từ chối',
      message: `Lý do: ${rejectReason}`,
      reference_type: 'equipment_movement',
      reference_id: movement._id
    });

    res.json({ success: true, message: 'Đã từ chối phiếu điều chuyển.', movement });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Confirm equipment movement execution (Technician)
// @route   PUT /api/transfers/:id/complete
export const confirmMovement = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID phiếu điều chuyển không đúng định dạng.' });
    }
    const movement = await EquipmentMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lệnh điều chuyển.' });
    }

    assertTransition('TRANSFER', movement.status, MOVEMENT_STATUSES.COMPLETED, req.user.role);
    if (movement.assigned_to && movement.assigned_to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Phiếu này được giao cho Kỹ thuật viên khác.' });
    }
    const equipment = await Equipment.findById(movement.equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Thiết bị không còn tồn tại.' });
    }

    movement.performed_by = req.user._id;
    movement.status = MOVEMENT_STATUSES.COMPLETED;
    movement.completed_at = new Date();
    movement.completion_notes = String(req.body?.notes || '').trim().slice(0, 500);
    await movement.save();

    // Physically update equipment location
    equipment.room_id = movement.to_room_id;
    if (movement.type === MOVEMENT_TYPES.REPLACEMENT || movement.type === MOVEMENT_TYPES.TRANSFER || movement.type === MOVEMENT_TYPES.REPAIR_RETURN) {
      equipment.status = EQUIPMENT_STATUSES.IN_USE;
    } else if (movement.type === MOVEMENT_TYPES.TO_STOCK) {
      equipment.status = EQUIPMENT_STATUSES.IN_STOCK;
    } else if (movement.type === MOVEMENT_TYPES.REPAIR_OUT) {
      equipment.room_id = null; // external
    }
    await equipment.save();

    await movement.populate([
      { path: 'equipment_id', select: 'code name brand model status' },
      { path: 'from_room_id', select: 'code name building floor' },
      { path: 'to_room_id', select: 'code name building floor' },
      { path: 'performed_by', select: 'full_name code role' }
    ]);

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'CONFIRM_MOVEMENT',
      target_table: 'equipment_movements',
      entity_id: movement._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'completed', performed_by: req.user.code }
    });

    res.json({
      success: true,
      message: 'Xác nhận điều chuyển thiết bị thành công. Vị trí thiết bị đã được cập nhật.',
      movement
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// Backward compatibility exports for old transfer tests
export const getTransfers = getMovements;
export const createTransfer = createMovementOrder;
export const completeTransfer = confirmMovement;
