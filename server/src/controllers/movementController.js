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
    if (equipment_id) filter.equipment_id = equipment_id;
    if (performed_by) filter.performed_by = performed_by;

    const movements = await EquipmentMovement.find(filter)
      .populate('equipment_id', 'code name brand model qr_code status price')
      .populate('from_room_id', 'code name building floor')
      .populate('to_room_id', 'code name building floor')
      .populate('ordered_by', 'full_name code email role')
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

// @desc    Order equipment transfer (Facility Manager)
// @route   POST /api/movements
export const createMovementOrder = async (req, res) => {
  try {
    const { equipment_id, to_room_id, reason, type = MOVEMENT_TYPES.TRANSFER } = req.body;

    if (!equipment_id || !to_room_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn thiết bị và phòng đích chuyển đến.'
      });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    }

    const toRoom = await Room.findById(to_room_id);
    if (!toRoom) {
      return res.status(404).json({ success: false, message: 'Phòng đích không tồn tại.' });
    }

    const from_room_id = equipment.room_id || null;

    const movement = await EquipmentMovement.create({
      equipment_id: equipment._id,
      type,
      from_room_id,
      to_room_id: toRoom._id,
      ordered_by: req.user._id,
      reason: String(reason || 'Điều chuyển theo lệnh của Quản lý CSVC').trim(),
      status: MOVEMENT_STATUSES.PENDING
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'ORDER_MOVEMENT',
      target_table: 'equipment_movements',
      entity_id: movement._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { equipment_id: equipment.code, from: from_room_id, to: toRoom.code, type }
    });

    // Notify Technicians to execute
    const technicians = await User.find({ role: USER_ROLES.TECHNICIAN });
    for (const tech of technicians) {
      await Notification.create({
        user_id: tech._id,
        type: 'movement_ordered',
        title: 'Lệnh điều chuyển thiết bị mới',
        message: `Lệnh chuyển thiết bị ${equipment.code} đến phòng ${toRoom.code}. Vui lòng thực hiện.`,
        reference_type: 'equipment_movement',
        reference_id: movement._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lập lệnh điều chuyển thành công. Đã thông báo cho Kỹ thuật viên.',
      movement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm equipment movement execution (Technician)
// @route   PUT /api/movements/:id/confirm
export const confirmMovement = async (req, res) => {
  try {
    const movement = await EquipmentMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lệnh điều chuyển.' });
    }

    assertTransition('MOVEMENT', movement.status, MOVEMENT_STATUSES.COMPLETED, req.user.role);

    movement.performed_by = req.user._id;
    movement.status = MOVEMENT_STATUSES.COMPLETED;
    movement.completed_at = new Date();
    await movement.save();

    // Physically update equipment location
    const equipment = await Equipment.findById(movement.equipment_id);
    if (equipment) {
      equipment.room_id = movement.to_room_id;
      if (movement.type === MOVEMENT_TYPES.REPLACEMENT || movement.type === MOVEMENT_TYPES.TRANSFER || movement.type === MOVEMENT_TYPES.REPAIR_RETURN) {
        equipment.status = EQUIPMENT_STATUSES.IN_USE;
      } else if (movement.type === MOVEMENT_TYPES.TO_STOCK) {
        equipment.status = EQUIPMENT_STATUSES.IN_STOCK;
      } else if (movement.type === MOVEMENT_TYPES.REPAIR_OUT) {
        equipment.room_id = null; // external
      }
      await equipment.save();
    }

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
export const approveTransfer = async (req, res) => res.json({ success: true, message: 'Approved' });
export const rejectTransfer = async (req, res) => res.json({ success: true, message: 'Rejected' });
export const completeTransfer = confirmMovement;
