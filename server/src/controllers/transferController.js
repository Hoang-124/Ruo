import { Transfer } from '../models/Transfer.js';
import { Equipment } from '../models/Equipment.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { assertTransition } from '../domain/stateMachines.js';
import { USER_ROLES, USER_STATUSES, EQUIPMENT_STATUSES } from '../config/constants.js';

// @desc    Get all transfers
// @route   GET /api/transfers
export const getTransfers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const transfers = await Transfer.find(filter)
      .populate('equipment_id', 'code name brand model qr_code status room_id')
      .populate('from_room_id', 'code name building floor')
      .populate('to_room_id', 'code name building floor')
      .populate('requested_by', 'full_name code email role')
      .populate('approved_by', 'full_name code email role')
      .populate('completed_by', 'full_name code email role')
      .sort({ created_at: -1 });

    res.json({ success: true, count: transfers.length, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate equipment transfer proposal (Staff, Admin)
// @route   POST /api/transfers
export const createTransfer = async (req, res) => {
  try {
    const { equipment_id, to_room_id, reason } = req.body;

    if (!equipment_id || !to_room_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin thiết bị, phòng đích hoặc lý do điều chuyển.'
      });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
    }

    if (equipment.status !== EQUIPMENT_STATUSES.ACTIVE) {
      return res.status(409).json({
        success: false,
        message: `Thiết bị đang ở trạng thái '${equipment.status}', không thể điều chuyển lúc này.`
      });
    }

    // Check if equipment has any pending or approved transfer
    const activeTransfer = await Transfer.findOne({
      equipment_id,
      status: { $in: ['pending', 'approved'] }
    });
    if (activeTransfer) {
      return res.status(409).json({
        success: false,
        message: 'Thiết bị này đang có một phiếu điều chuyển chưa hoàn tất.'
      });
    }

    const sourceRoomId = equipment.room_id;
    if (!sourceRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Thiết bị chưa được phân bổ vào phòng nguồn cụ thể.'
      });
    }

    if (sourceRoomId.toString() === to_room_id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Phòng đích phải khác phòng hiện tại của thiết bị.'
      });
    }

    const destRoom = await Room.findById(to_room_id);
    if (!destRoom) {
      return res.status(404).json({ success: false, message: 'Phòng đích không tồn tại.' });
    }

    const transfer = await Transfer.create({
      equipment_id,
      from_room_id: sourceRoomId,
      to_room_id,
      requested_by: req.user._id,
      reason: String(reason).trim(),
      status: 'pending'
    });

    // Mark equipment as transferring
    equipment.status = EQUIPMENT_STATUSES.TRANSFERRING;
    await equipment.save();

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'TRANSFER_PROPOSE',
      target_table: 'transfers',
      entity_id: transfer._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { equipment_id, from_room_id: sourceRoomId, to_room_id, reason }
    });

    // Notify all Managers
    const managers = await User.find({ role: USER_ROLES.MANAGER, status: USER_STATUSES.ACTIVE });
    for (const manager of managers) {
      await Notification.create({
        user_id: manager._id,
        type: 'transfer_approval',
        title: 'Phiếu điều chuyển mới chờ duyệt',
        message: `Nhân viên ${req.user.full_name} đã đề xuất điều chuyển thiết bị ${equipment.code} - ${equipment.name} sang phòng ${destRoom.code}.`,
        reference_type: 'transfer',
        reference_id: transfer._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo đề xuất điều chuyển thành công. Phiếu đã chuyển sang Quản lý duyệt.',
      data: transfer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve equipment transfer (Manager, Admin)
// @route   PUT /api/transfers/:id/approve
export const approveTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển.' });
    }

    assertTransition('TRANSFER', transfer.status, 'approved', req.user.role);

    transfer.status = 'approved';
    transfer.approved_by = req.user._id;
    transfer.approved_at = new Date();
    await transfer.save();

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'TRANSFER_APPROVE',
      target_table: 'transfers',
      entity_id: transfer._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { approved_by: req.user._id, approved_at: transfer.approved_at }
    });

    // Notify the requester (Staff)
    await Notification.create({
      user_id: transfer.requested_by,
      type: 'transfer_approved',
      title: 'Đơn điều chuyển đã được phê duyệt',
      message: `Đơn điều chuyển thiết bị đã được duyệt. Bạn có thể tiến hành bàn giao thực địa.`,
      reference_type: 'transfer',
      reference_id: transfer._id
    });

    res.json({
      success: true,
      message: 'Đã phê duyệt đề xuất điều chuyển.',
      data: transfer
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Reject equipment transfer (Manager, Admin)
// @route   PUT /api/transfers/:id/reject
export const rejectTransfer = async (req, res) => {
  try {
    const { reject_reason } = req.body;
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển.' });
    }

    assertTransition('TRANSFER', transfer.status, 'rejected', req.user.role);

    transfer.status = 'rejected';
    transfer.reject_reason = reject_reason || 'Không được phê duyệt';
    await transfer.save();

    // Restore equipment status to active
    await Equipment.findByIdAndUpdate(transfer.equipment_id, { status: EQUIPMENT_STATUSES.ACTIVE });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'TRANSFER_REJECT',
      target_table: 'transfers',
      entity_id: transfer._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { reject_reason: transfer.reject_reason }
    });

    // Notify requester
    await Notification.create({
      user_id: transfer.requested_by,
      type: 'transfer_rejected',
      title: 'Đơn điều chuyển bị từ chối',
      message: `Đơn điều chuyển thiết bị đã bị từ chối. Lý do: ${transfer.reject_reason}`,
      reference_type: 'transfer',
      reference_id: transfer._id
    });

    res.json({
      success: true,
      message: 'Đã từ chối đề xuất điều chuyển.',
      data: transfer
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Complete equipment transfer handover (Staff, Admin)
// @route   PUT /api/transfers/:id/complete
export const completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển.' });
    }

    assertTransition('TRANSFER', transfer.status, 'completed', req.user.role);

    transfer.status = 'completed';
    transfer.completed_by = req.user._id;
    transfer.completed_at = new Date();
    await transfer.save();

    // Update equipment location and status back to active
    const equipment = await Equipment.findById(transfer.equipment_id);
    if (equipment) {
      const oldRoomId = equipment.room_id;
      equipment.room_id = transfer.to_room_id;
      equipment.status = EQUIPMENT_STATUSES.ACTIVE;
      await equipment.save();

      // Audit Log SHA-256
      await AuditLog.logAction({
        user_id: req.user._id,
        user_display: `${req.user.full_name} (${req.user.code})`,
        action: 'TRANSFER_COMPLETE',
        target_table: 'equipments',
        entity_id: equipment._id.toString(),
        ip_address: req.ip || '127.0.0.1',
        old_value: { room_id: oldRoomId },
        new_value: { room_id: transfer.to_room_id, status: EQUIPMENT_STATUSES.ACTIVE, transfer_id: transfer._id }
      });
    }

    res.json({
      success: true,
      message: 'Hoàn tất bàn giao điều chuyển thiết bị vào phòng mới.',
      data: transfer
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
