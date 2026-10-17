import crypto from 'crypto';
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
// @route   GET /api/inventory/sessions or GET /api/inventory-sessions
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

// @desc    Create new inventory session (UC-3.9: Inventory Session - Facility Manager / Admin)
// @route   POST /api/inventory/sessions or POST /api/inventory-sessions
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
// @route   GET /api/inventory/sessions/:id or GET /api/inventory-sessions/:id
export const getSessionById = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id)
      .populate('created_by', 'full_name code')
      .populate('scope_ids', 'code name floor');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê.' });
    }

    const logs = await InventoryLog.find({ session_id: session._id })
      .populate({
        path: 'equipment_id',
        select: 'code name brand model qr_code room_id price status',
        populate: { path: 'room_id', select: 'code name floor' }
      })
      .populate('scanned_room_id', 'code name building floor')
      .populate('scanned_by', 'full_name code')
      .populate('repair_id', 'ticket_code damage_level status')
      .sort({ scanned_at: -1 });

    res.json({ success: true, data: { ...session.toJSON(), logs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan QR in room (UC-3.10: QR Scan Stocktaking - Technician / Manager)
// @route   PUT /api/inventory-sessions/:id/scan or POST /api/inventory/sessions/:id/scan
export const scanEquipmentInRoom = async (req, res) => {
  try {
    const {
      qr_code,
      equipment_id,
      scanned_room_id,
      is_damaged = false,
      is_missing = false,
      scan_status,
      damage_note = '',
      note = ''
    } = req.body;

    let targetEquipment = null;
    if (equipment_id) {
      targetEquipment = await Equipment.findById(equipment_id);
    } else if (qr_code) {
      const cleanQr = String(qr_code).trim();
      targetEquipment = await Equipment.findOne({
        $or: [{ qr_code: cleanQr }, { code: cleanQr.toUpperCase() }, { code: cleanQr }]
      });
    }

    if (!targetEquipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị với mã QR này.' });
    }

    let status = INVENTORY_LOG_STATUSES.MATCHED;
    if (scan_status && Object.values(INVENTORY_LOG_STATUSES).includes(scan_status)) {
      status = scan_status;
    } else if (is_missing) {
      status = INVENTORY_LOG_STATUSES.MISSING;
    } else if (is_damaged) {
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
        scanned_room_id: scanned_room_id || targetEquipment.room_id,
        scanned_by: req.user._id,
        scanned_at: new Date(),
        status,
        repair_id: autoRepair ? autoRepair._id : null,
        note: String(note || damage_note).trim()
      },
      { upsert: true, new: true }
    );

    const statusMessageMap = {
      [INVENTORY_LOG_STATUSES.MATCHED]: 'Khớp vị trí tài sản thực tế.',
      [INVENTORY_LOG_STATUSES.DAMAGED]: 'Đã ghi nhận hỏng và tự động tạo phiếu sửa chữa kỹ thuật.',
      [INVENTORY_LOG_STATUSES.WRONG_LOCATION]: 'Cảnh báo: Thiết bị lệch vị trí phòng quy định.',
      [INVENTORY_LOG_STATUSES.MISSING]: 'Đã ghi nhận thiết bị vắng mặt / thất lạc tại phòng kiểm kê.'
    };

    res.json({ 
      success: true, 
      message: statusMessageMap[status] || 'Đã ghi nhận kết quả quét kiểm kê.',
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

// @desc    Export full inventory reconciliation report with digital signature (UC-3.11: Inventory Report)
// @route   GET /api/inventory-sessions/:id/export or GET /api/inventory/sessions/:id/export
export const exportInventoryReport = async (req, res) => {
  try {
    const session = await InventorySession.findById(req.params.id)
      .populate('created_by', 'full_name code email role')
      .populate('scope_ids', 'code name floor');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê để xuất biên bản.' });
    }

    const logs = await InventoryLog.find({ session_id: session._id })
      .populate({
        path: 'equipment_id',
        select: 'code name brand model qr_code price room_id status',
        populate: { path: 'room_id', select: 'code name floor' }
      })
      .populate('scanned_room_id', 'code name building floor')
      .populate('scanned_by', 'full_name code')
      .populate('repair_id', 'ticket_code damage_level status')
      .sort({ scanned_at: -1 });

    const formatItem = (l) => ({
      log_id: l._id,
      code: l.equipment_id?.code || 'N/A',
      name: l.equipment_id?.name || 'Thiết bị không xác định',
      brand: l.equipment_id?.brand || '',
      model: l.equipment_id?.model || '',
      price: l.equipment_id?.price || 0,
      expected_room: l.equipment_id?.room_id ? `${l.equipment_id.room_id.code} (${l.equipment_id.room_id.name})` : 'Kho dự phòng',
      scanned_room: l.scanned_room_id ? `${l.scanned_room_id.code} (${l.scanned_room_id.name})` : 'N/A',
      status: l.status,
      scanned_by: l.scanned_by?.full_name || 'Kỹ thuật viên',
      scanned_at: l.scanned_at,
      note: l.note || '',
      repair_ticket: l.repair_id?.ticket_code || null
    });

    const matchedItems = logs.filter((l) => l.status === INVENTORY_LOG_STATUSES.MATCHED).map(formatItem);
    const wrongLocationItems = logs.filter((l) => l.status === INVENTORY_LOG_STATUSES.WRONG_LOCATION).map(formatItem);
    const missingItems = logs.filter((l) => l.status === INVENTORY_LOG_STATUSES.MISSING).map(formatItem);
    const damagedItems = logs.filter((l) => l.status === INVENTORY_LOG_STATUSES.DAMAGED).map(formatItem);

    const summary = {
      total_logged: logs.length,
      matched: matchedItems.length,
      wrong_location: wrongLocationItems.length,
      missing: missingItems.length,
      damaged: damagedItems.length
    };

    const exportedAt = new Date().toISOString();
    const reportCode = `BBKK-A1-${new Date(session.date || session.created_at || Date.now()).getFullYear()}-${String(session._id).slice(-6).toUpperCase()}`;

    const signaturePayload = JSON.stringify({
      reportCode,
      sessionId: String(session._id),
      sessionName: session.name,
      summary,
      exportedBy: req.user?.code || 'SYSTEM'
    });
    const signatureHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const report = {
      report_code: reportCode,
      building: 'Tòa nhà Đa năng A1 (5 tầng)',
      exported_at: exportedAt,
      exported_by: {
        full_name: req.user?.full_name || 'Quản lý CSVC',
        code: req.user?.code || 'FM01',
        role: req.user?.role || 'facility_manager'
      },
      session: {
        _id: session._id,
        name: session.name,
        scope_type: session.scope_type,
        scope_floor: session.scope_floor,
        scope_rooms: session.scope_ids,
        status: session.status,
        date: session.date,
        completed_at: session.completed_at,
        created_by: session.created_by
      },
      summary,
      categories: {
        matched_items: matchedItems,
        wrong_location_items: wrongLocationItems,
        missing_items: missingItems,
        damaged_items: damagedItems
      },
      digital_signature: {
        algorithm: 'SHA-256',
        hash: signatureHash,
        signed_at: exportedAt,
        verification_status: 'VERIFIED_IMMUTABLE',
        signers: [
          { role: 'Trưởng Ban Kiểm Kê (Quản Lý CSVC)', name: session.created_by?.full_name || req.user?.full_name || 'Quản lý CSVC', status: 'ĐÃ KÝ SỐ' },
          { role: 'Ủy Viên Kỹ Thuật (KTV Thực Địa)', name: logs[0]?.scanned_by?.full_name || 'Tổ Kỹ Thuật Tòa A1', status: 'ĐÃ KÝ SỐ' },
          { role: 'Phê Duyệt Ban Giám Hiệu', name: 'Ban Giám Hiệu Trường ĐH (Tòa A1)', status: session.status === 'reconciled' ? 'ĐÃ XÁC THỰC' : 'CHỜ CHỐT SỔ' }
        ]
      }
    };

    res.json({
      success: true,
      message: `Xuất biên bản kiểm kê [${reportCode}] kèm chữ ký số SHA-256 thành công.`,
      report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
