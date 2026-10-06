import { InventorySession, InventoryLog, Equipment, Room, AuditLog } from '../models/index.js';

// @desc    Get all inventory sessions (UC: Conduct inventory session)
// @route   GET /api/inventory/sessions
export const getSessions = async (req, res) => {
  try {
    const sessions = await InventorySession.find()
      .populate('created_by', 'full_name code email')
      .sort({ date: -1 });

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new inventory session
// @route   POST /api/inventory/sessions
export const createSession = async (req, res) => {
  try {
    const { name, scope_type = 'room', scope_ids = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên đợt kiểm kê' });
    }

    const session = await InventorySession.create({
      name,
      scope_type,
      scope_ids,
      created_by: req.user._id,
      date: new Date(),
      status: 'in_progress'
    });

    res.status(201).json({ success: true, message: 'Đã khởi tạo đợt kiểm kê thực tế', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get session details with logs
// @route   GET /api/inventory/sessions/:id
export const getSessionById = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id).populate('created_by', 'full_name code');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê' });
    }

    const logs = await InventoryLog.find({ session_id: session._id })
      .populate('equipment_id', 'code name brand model qr_code room_id')
      .populate('scanned_room_id', 'code name building floor')
      .populate('scanned_by', 'full_name code')
      .sort({ scanned_at: -1 });

    res.json({ success: true, data: { ...session.toJSON(), logs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan QR in room (UC: Scan equipment QR code during inventory)
// @route   POST /api/inventory/sessions/:id/scan
export const scanEquipmentInRoom = async (req, res) => {
  try {
    const { qr_code, equipment_id, scanned_room_id, note = '' } = req.body;

    let targetEquipment = null;
    if (equipment_id) {
      targetEquipment = await Equipment.findById(equipment_id);
    } else if (qr_code) {
      targetEquipment = await Equipment.findOne({ qr_code });
    }

    if (!targetEquipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị với mã QR này' });
    }

    // Determine status: matched if room matches current room_id, otherwise wrong_location
    let status = 'matched';
    if (targetEquipment.room_id && scanned_room_id && targetEquipment.room_id.toString() !== scanned_room_id.toString()) {
      status = 'wrong_location';
    }

    const log = await InventoryLog.findOneAndUpdate(
      { session_id: req.params.id, equipment_id: targetEquipment._id },
      {
        scanned_room_id,
        scanned_by: req.user._id,
        scanned_at: new Date(),
        status,
        note
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: status === 'matched' ? 'Khớp vị trí tài sản thực tế' : 'Cảnh báo: Thiết bị lệch vị trí phòng quy định',
      data: log 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reconcile inventory session (UC: Reconcile inventory result)
// @route   PUT /api/inventory/sessions/:id/reconcile
export const reconcileSession = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê' });
    }

    session.status = 'reconciled';
    session.completed_at = new Date();
    await session.save();

    // SHA-256 Audit Log
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'INVENTORY_RECONCILE',
      target_table: 'inventory_sessions',
      entity_id: session._id.toString(),
      ip_address: req.ip,
      new_value: { status: 'reconciled', completed_at: session.completed_at }
    });

    res.json({ success: true, message: 'Đối soát và chốt số liệu kiểm kê thành công', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
