import { Transfer, Equipment, Room, AuditLog, Notification } from '../models/index.js';

// @desc    Get all transfers
// @route   GET /api/transfers
export const getTransfers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const transfers = await Transfer.find(filter)
      .populate('equipment_id', 'code name brand model qr_code status')
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

// @desc    Initiate equipment transfer proposal (UC: Initiate equipment transfer)
// @route   POST /api/transfers
export const createTransfer = async (req, res) => {
  try {
    const { equipment_id, from_room_id, to_room_id, reason } = req.body;

    if (!equipment_id || !to_room_id || !reason) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin thiết bị, phòng đích hoặc lý do điều chuyển' });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị' });
    }

    const sourceRoomId = from_room_id || equipment.room_id;
    if (!sourceRoomId) {
      return res.status(400).json({ success: false, message: 'Thiết bị chưa được gán phòng nguồn' });
    }

    if (sourceRoomId.toString() === to_room_id.toString()) {
      return res.status(400).json({ success: false, message: 'Phòng đích phải khác phòng hiện tại' });
    }

    const transfer = await Transfer.create({
      equipment_id,
      from_room_id: sourceRoomId,
      to_room_id,
      requested_by: req.user._id,
      reason,
      status: 'pending'
    });

    // Mark equipment as transferring
    equipment.status = 'transferring';
    await equipment.save();

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'TRANSFER_PROPOSE',
      target_table: 'transfers',
      entity_id: transfer._id.toString(),
      ip_address: req.ip,
      new_value: { equipment_id, from_room_id: sourceRoomId, to_room_id, reason }
    });

    // Notify maintenance staff
    await Notification.create({
      user_id: req.user._id,
      type: 'transfer_approval',
      title: 'Đề xuất điều chuyển thiết bị',
      message: `Đã tạo đề xuất điều chuyển thiết bị ${equipment.code} - ${equipment.name}`,
      reference_type: 'transfer',
      reference_id: transfer._id
    });

    res.status(201).json({ success: true, message: 'Tạo đề xuất điều chuyển thành công', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve equipment transfer (UC: Approve transfer request)
// @route   PUT /api/transfers/:id/approve
export const approveTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id).populate('equipment_id');
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể duyệt đơn đang chờ xử lý' });
    }

    transfer.status = 'approved';
    transfer.approved_by = req.user._id;
    transfer.approved_at = new Date();
    await transfer.save();

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'TRANSFER_APPROVE',
      target_table: 'transfers',
      entity_id: transfer._id.toString(),
      ip_address: req.ip,
      new_value: { approved_by: req.user._id, approved_at: transfer.approved_at }
    });

    res.json({ success: true, message: 'Đã phê duyệt đề xuất điều chuyển', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject equipment transfer
// @route   PUT /api/transfers/:id/reject
export const rejectTransfer = async (req, res) => {
  try {
    const { reject_reason } = req.body;
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển' });
    }

    transfer.status = 'rejected';
    transfer.reject_reason = reject_reason || 'Không được phê duyệt';
    await transfer.save();

    // Restore equipment status to active
    await Equipment.findByIdAndUpdate(transfer.equipment_id, { status: 'active' });

    res.json({ success: true, message: 'Đã từ chối đề xuất điều chuyển', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete equipment transfer handover (UC: Complete equipment transfer)
// @route   PUT /api/transfers/:id/complete
export const completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn điều chuyển' });
    }

    if (transfer.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Chỉ hoàn tất được đơn đã được phê duyệt' });
    }

    transfer.status = 'completed';
    transfer.completed_by = req.user._id;
    transfer.completed_at = new Date();
    await transfer.save();

    // Update equipment location and status
    const equipment = await Equipment.findById(transfer.equipment_id);
    if (equipment) {
      const oldRoomId = equipment.room_id;
      equipment.room_id = transfer.to_room_id;
      equipment.status = 'active';
      await equipment.save();

      // Audit Log SHA-256
      await AuditLog.logAction({
        user_id: req.user._id,
        user_display: req.user.full_name || req.user.fullName,
        action: 'TRANSFER_COMPLETE',
        target_table: 'equipment',
        entity_id: equipment._id.toString(),
        ip_address: req.ip,
        old_value: { room_id: oldRoomId },
        new_value: { room_id: transfer.to_room_id, status: 'active', transfer_id: transfer._id }
      });
    }

    res.json({ success: true, message: 'Hoàn tất bàn giao điều chuyển thiết bị vào phòng mới', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
