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
    const { name, scope_type = 'building', scope_floor = null, scope_ids = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên đợt kiểm kê.' });
    }

    let resolvedScopeIds = Array.isArray(scope_ids) ? scope_ids : [];
    let resolvedFloor = null;

    if (scope_type === 'floor') {
      const floorNum = Number(scope_floor);
      if (!Number.isInteger(floorNum) || floorNum < 1 || floorNum > 5) {
        return res.status(400).json({
          success: false,
          message: 'Tầng kiểm kê trong Tòa nhà A1 phải từ Tầng 1 đến Tầng 5.'
        });
      }
      resolvedFloor = floorNum;
      if (resolvedScopeIds.length === 0) {
        const floorRooms = await Room.find({ building: 'A1', floor: floorNum }).select('_id');
        resolvedScopeIds = floorRooms.map((r) => r._id);
      }
    }

    const session = await InventorySession.create({
      name,
      scope_type,
      scope_floor: resolvedFloor,
      scope_ids: resolvedScopeIds,
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
    const session = await InventorySession.findById(req.params.id)
      .populate('created_by', 'full_name code')
      .populate('scope_ids', 'code name floor');
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
      const cleanQr = String(qr_code).trim();
      targetEquipment = await Equipment.findOne({
        $or: [{ qr_code: cleanQr }, { code: cleanQr.toUpperCase() }]
      });
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
      log,
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

    // Resolve all rooms in Building A1 covered by this session's scope
    let roomIds = Array.isArray(session.scope_ids) && session.scope_ids.length > 0
      ? session.scope_ids
      : [];

    if (roomIds.length === 0) {
      const roomFilter = { building: 'A1' };
      if (session.scope_type === 'floor' && session.scope_floor) {
        roomFilter.floor = session.scope_floor;
      }
      const scopedRooms = await Room.find(roomFilter).select('_id');
      roomIds = scopedRooms.map((r) => r._id);
    }

    // Find all active equipment stationed in the scoped rooms of Building A1
    const expectedEquipments = roomIds.length > 0
      ? await Equipment.find({
          room_id: { $in: roomIds },
          status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] }
        }).select('_id room_id')
      : [];

    const existingLogs = await InventoryLog.find({ session_id: session._id });
    const scannedEqIds = new Set(existingLogs.map((l) => l.equipment_id.toString()));

    // Automatically log un-scanned equipment in scope as MISSING
    const missingEquipments = expectedEquipments.filter(
      (eq) => eq.room_id && !scannedEqIds.has(eq._id.toString())
    );

    for (const eq of missingEquipments) {
      await InventoryLog.findOneAndUpdate(
        { session_id: session._id, equipment_id: eq._id },
        {
          scanned_room_id: eq.room_id,
          scanned_by: req.user._id,
          scanned_at: new Date(),
          status: INVENTORY_LOG_STATUSES.MISSING,
          note: 'Chưa được quét QR khi chốt đối soát — đánh dấu vắng mặt/thất lạc'
        },
        { upsert: true, new: true }
      );
    }

    const finalLogs = await InventoryLog.find({ session_id: session._id }).select('status');
    const summary = {
      matched: finalLogs.filter((l) => l.status === INVENTORY_LOG_STATUSES.MATCHED).length,
      wrong_location: finalLogs.filter((l) => l.status === INVENTORY_LOG_STATUSES.WRONG_LOCATION).length,
      damaged: finalLogs.filter((l) => l.status === INVENTORY_LOG_STATUSES.DAMAGED).length,
      missing: finalLogs.filter((l) => l.status === INVENTORY_LOG_STATUSES.MISSING).length
    };

    session.summary = summary;
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
      new_value: { status: 'reconciled', completed_at: session.completed_at, summary }
    });

    res.json({
      success: true,
      message: `Đối soát thành công: ${summary.matched} khớp, ${summary.wrong_location} lệch phòng, ${summary.damaged} hỏng, ${summary.missing} chưa quét/thất lạc.`,
      data: session,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
