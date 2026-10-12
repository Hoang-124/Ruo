import { InventorySession, InventoryLog, Equipment, Room, Repair, AuditLog } from '../models/index.js';
import { 
  USER_ROLES, 
  INVENTORY_STATUSES, 
  INVENTORY_LOG_STATUSES, 
  EQUIPMENT_STATUSES, 
  REPAIR_SOURCES,
  REPAIR_STATUSES,
  DAMAGE_LEVELS
} from '../config/constants.js';

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

// @desc    Create new inventory session (Facility Manager)
// @route   POST /api/inventory/sessions
export const createSession = async (req, res) => {
  try {
    const { name, scope_type = 'room', scope_ids = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên đợt kiểm kê.' });
    }

    const session = await InventorySession.create({
      name,
      scope_type,
      scope_ids,
      created_by: req.user._id,
      date: new Date(),
      status: INVENTORY_STATUSES.IN_PROGRESS
    });

    res.status(201).json({ success: true, message: 'Đã khởi tạo đợt kiểm kê thực tế.', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get session details with logs (UC: View inventory result)
// @route   GET /api/inventory/sessions/:id
export const getSessionById = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id).populate('created_by', 'full_name code');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê.' });
    }

    const logs = await InventoryLog.find({ session_id: session._id })
      .populate('equipment_id', 'code name brand model qr_code room_id')
      .populate('scanned_room_id', 'code name building floor')
      .populate('scanned_by', 'full_name code')
      .populate('repair_id', 'ticket_code damage_level status')
      .sort({ scanned_at: -1 });

    res.json({ success: true, data: { ...session.toJSON(), logs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan QR in room (UC: Scan equipment QR code - Technician)
// @route   POST /api/inventory/sessions/:id/scan
export const scanEquipmentInRoom = async (req, res) => {
  try {
    const { qr_code, equipment_id, scanned_room_id, is_damaged = false, damage_note = '', note = '' } = req.body;

    let targetEquipment = null;
    if (equipment_id) {
      targetEquipment = await Equipment.findById(equipment_id);
    } else if (qr_code) {
      targetEquipment = await Equipment.findOne({ qr_code });
    }

    if (!targetEquipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị với mã QR này.' });
    }

    let status = INVENTORY_LOG_STATUSES.MATCHED;
    if (is_damaged) {
      status = INVENTORY_LOG_STATUSES.DAMAGED;
    } else if (targetEquipment.room_id && scanned_room_id && targetEquipment.room_id.toString() !== scanned_room_id.toString()) {
      status = INVENTORY_LOG_STATUSES.WRONG_LOCATION;
    }

    // Auto-create repair ticket if equipment is found DAMAGED during field inventory
    let autoRepair = null;
    if (status === INVENTORY_LOG_STATUSES.DAMAGED) {
      targetEquipment.status = EQUIPMENT_STATUSES.BROKEN;
      await targetEquipment.save();

      autoRepair = await Repair.create({
        equipment_id: targetEquipment._id,
        source: REPAIR_SOURCES.INVENTORY_CHECK,
        reported_by: req.user._id,
        incident_description: String(damage_note || note || 'Phát hiện hư hỏng trong quá trình kiểm kê thực địa').trim(),
        damage_level: DAMAGE_LEVELS.MINOR,
        status: REPAIR_STATUSES.REPORTED
      });
    }

    const log = await InventoryLog.findOneAndUpdate(
      { session_id: req.params.id, equipment_id: targetEquipment._id },
      {
        scanned_room_id,
        scanned_by: req.user._id,
        scanned_at: new Date(),
        status,
        repair_id: autoRepair ? autoRepair._id : null,
        note: String(note || damage_note).trim()
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: status === INVENTORY_LOG_STATUSES.MATCHED 
        ? 'Khớp vị trí tài sản thực tế.' 
        : status === INVENTORY_LOG_STATUSES.DAMAGED
          ? 'Đã ghi nhận hỏng và tự động tạo phiếu sửa chữa kỹ thuật.'
          : 'Cảnh báo: Thiết bị lệch vị trí phòng quy định.',
      data: log,
      autoRepair
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reconcile inventory session (UC: Reconcile inventory result - Facility Manager)
// @route   PUT /api/inventory/sessions/:id/reconcile
export const reconcileSession = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê.' });
    }

    session.status = INVENTORY_STATUSES.RECONCILED;
    session.completed_at = new Date();
    await session.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.code,
      action: 'INVENTORY_RECONCILE',
      target_table: 'inventory_sessions',
      entity_id: session._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'reconciled', completed_at: session.completed_at }
    });

    res.json({ success: true, message: 'Đối soát và chốt số liệu kiểm kê thành công.', data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
