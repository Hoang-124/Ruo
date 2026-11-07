import mongoose from 'mongoose';
import {
  Repair,
  RepairLog,
  Equipment,
  Room,
  SparePart,
  User,
  InventorySession,
  InventoryLog,
  AuditLog
} from '../models/index.js';
import {
  USER_ROLES,
  USER_STATUSES,
  EQUIPMENT_STATUSES,
  REPAIR_STATUSES
} from '../config/constants.js';
import {
  buildIncidentTriage,
  buildRepairCopilot,
  buildInventoryDiscrepancyAnalysis,
  buildAuditAnomalyAnalysis
} from '../services/aiService.js';

const isDocumentId = (value) => typeof value === 'string' && mongoose.isObjectIdOrHexString(value);

// @desc    AI Incident Triage & Duplicate Detector for Lecturer Report Issue (Feature #1A)
// @route   POST /api/repairs/ai-triage
export const triageIncidentReport = async (req, res) => {
  try {
    const {
      room_id,
      equipment_id,
      incident_description,
      incident_images = [],
      room_equipments = []
    } = req.body || {};

    const cleanDesc = typeof incident_description === 'string' ? incident_description.trim() : '';
    if (!cleanDesc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mô tả hiện tượng sự cố trước khi chạy AI Phân loại.'
      });
    }
    if (cleanDesc.length > 10_000) {
      return res.status(400).json({ success: false, message: 'Mô tả sự cố không được vượt quá 10.000 ký tự.' });
    }

    if ([room_id, equipment_id].some((id) => id !== undefined && id !== null && id !== '' && !isDocumentId(id))) {
      return res.status(400).json({ success: false, message: 'Mã phòng hoặc thiết bị không hợp lệ.' });
    }
    if (typeof incident_images !== 'string' && (!Array.isArray(incident_images) || incident_images.some((image) => typeof image !== 'string'))) {
      return res.status(400).json({ success: false, message: 'Ảnh hiện trường phải là danh sách đường dẫn.' });
    }

    let equipment = null;
    if (equipment_id) {
      equipment = await Equipment.findById(equipment_id).populate('category_id', 'code name');
      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị để phân tích AI.' });
      }
    }

    let room = null;
    const resolvedRoomId = room_id || equipment?.room_id;
    if (resolvedRoomId) {
      room = await Room.findById(resolvedRoomId).select('code name building floor room_type');
      if (!room) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phòng để phân tích AI.' });
      }
    }
    if (equipment && room_id && String(equipment.room_id?._id || equipment.room_id || '') !== String(room._id)) {
      return res.status(400).json({ success: false, message: 'Thiết bị không thuộc phòng đã chọn. Vui lòng tải lại danh sách thiết bị.' });
    }

    const findOpenRepairs = (filter) => Repair.find({
      status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] },
      ...filter
    })
      .select('ticket_code equipment_id room_id status damage_level incident_description')
      .populate('equipment_id', 'code name')
      .populate('room_id', 'code name')
      .sort({ created_at: -1 })
      .limit(10);
    // Keep exact equipment matches ahead of room-level context even in a busy room.
    const [exactRepairs, roomRepairs] = await Promise.all([
      equipment ? findOpenRepairs({ equipment_id: equipment._id }) : [],
      room ? findOpenRepairs({ room_id: room._id, ...(equipment ? { equipment_id: { $ne: equipment._id } } : {}) }) : []
    ]);
    const openRepairs = [...new Map([...exactRepairs, ...roomRepairs].map((repair) => [String(repair._id), repair])).values()].slice(0, 10);

    // Sanitize room_equipments passed from client or load from live MongoDB when connected
    let roomEquipments = [];
    if (Array.isArray(room_equipments) && room_equipments.length > 0) {
      roomEquipments = room_equipments
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .slice(0, 100)
        .map((item) => ({
          _id: typeof item._id === 'string' && isDocumentId(item._id) ? item._id : '',
          code: typeof item.code === 'string' ? item.code.slice(0, 80) : '',
          name: typeof item.name === 'string' ? item.name.slice(0, 160) : '',
          brand: typeof item.brand === 'string' ? item.brand.slice(0, 80) : '',
          model: typeof item.model === 'string' ? item.model.slice(0, 80) : '',
          category_id: item.category_id && typeof item.category_id === 'object'
            ? {
                code: typeof item.category_id.code === 'string' ? item.category_id.code.slice(0, 40) : '',
                name: typeof item.category_id.name === 'string' ? item.category_id.name.slice(0, 100) : ''
              }
            : null
        }));
    } else if (room && mongoose.connection?.readyState === 1) {
      roomEquipments = await Equipment.find({
        room_id: room._id,
        status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] }
      })
        .select('code name brand model category_id status')
        .populate('category_id', 'code name')
        .limit(100);
    }

    const normalizedImages = Array.isArray(incident_images)
      ? incident_images.filter(Boolean)
      : String(incident_images || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

    const triage = await buildIncidentTriage({
      description: cleanDesc,
      images: normalizedImages,
      equipment,
      room,
      openRepairs,
      roomEquipments
    });

    return res.json({
      success: true,
      triage
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Repair Dispatch & Technician Diagnosis Copilot (Feature #1B)
// @route   POST /api/repairs/:id/ai-copilot
export const getRepairAiCopilot = async (req, res) => {
  try {
    if (!isDocumentId(req.params?.id)) {
      return res.status(400).json({ success: false, message: 'Mã phiếu sửa chữa không hợp lệ.' });
    }
    const repair = await Repair.findById(req.params.id)
      .populate({
        path: 'equipment_id',
        select: 'code name brand model price purchase_date depreciation_rate remaining_value estimated_repair_cost repair_count category_id room_id status warranty_status',
        populate: { path: 'category_id', select: 'code name' }
      })
      .populate('room_id', 'code name building floor')
      .populate('assigned_to', 'full_name code email role department');

    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu sửa chữa để phân tích AI Copilot.'
      });
    }

    // Strict RBAC row-level isolation: Technicians may only access tickets assigned to themselves
    if (req.user?.role === USER_ROLES.TECHNICIAN) {
      const assignedId = repair.assigned_to?._id
        ? String(repair.assigned_to._id)
        : (repair.assigned_to ? String(repair.assigned_to) : '');
      if (!assignedId || assignedId !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Kỹ thuật viên chỉ được truy cập AI Copilot đối với nhiệm vụ sửa chữa được phân công cho mình.'
        });
      }
    }

    const eqId = repair.equipment_id?._id || repair.equipment_id;
    const categoryId = repair.equipment_id?.category_id?._id || repair.equipment_id?.category_id;

    const [
      equipmentHistory,
      logs,
      spareParts,
      spareEquipments,
      technicians,
      openRepairs,
      resolvedRepairs
    ] = await Promise.all([
      eqId
        ? Repair.find({ equipment_id: eqId, _id: { $ne: repair._id } }).sort({ created_at: -1 }).limit(10)
        : Promise.resolve([]),
      RepairLog.find({ repair_id: repair._id }).sort({ created_at: -1 }).limit(20),
      SparePart.find().limit(100),
      categoryId
        ? Equipment.find({ status: EQUIPMENT_STATUSES.IN_STOCK, category_id: categoryId, _id: { $ne: eqId } }).limit(50)
        : Promise.resolve([]),
      User.find({ role: USER_ROLES.TECHNICIAN, status: USER_STATUSES.ACTIVE }).select('full_name code email department role status'),
      Repair.find({
        status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
      }).select('assigned_to status deadline'),
      Repair.find({
        status: { $in: [REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED] }
      })
        .populate({
          path: 'equipment_id',
          select: 'code name category_id',
          populate: { path: 'category_id', select: 'code name' }
        })
        .sort({ resolved_at: -1, created_at: -1 })
        .limit(200)
    ]);

    const copilot = await buildRepairCopilot({
      repair,
      equipmentHistory,
      logs,
      spareParts,
      spareEquipments,
      technicians,
      openRepairs,
      resolvedRepairs
    });

    return res.json({
      success: true,
      copilot
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Inventory Discrepancy & Zombie Asset Analyst (Feature #4A)
// @route   POST /api/inventory/sessions/:id/ai-analyze & POST /api/inventory-sessions/:id/ai-analyze
export const analyzeInventoryDiscrepancies = async (req, res) => {
  try {
    if (!isDocumentId(req.params?.id)) {
      return res.status(400).json({ success: false, message: 'Mã đợt kiểm kê không hợp lệ.' });
    }
    const session = await InventorySession.findById(req.params.id).populate('scope_ids', 'code name floor');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đợt kiểm kê để phân tích AI.'
      });
    }

    const logs = await InventoryLog.find({ session_id: session._id })
      .populate({
        path: 'equipment_id',
        select: 'code name brand model qr_code room_id price status category_id',
        populate: [
          { path: 'room_id', select: 'code name floor' },
          { path: 'category_id', select: 'code name' }
        ]
      })
      .populate('scanned_room_id', 'code name building floor')
      .sort({ scanned_at: -1 });

    let unscannedEquipments = [];
    let expectedCount = logs.length;

    if (!['completed', 'reconciled'].includes(session.status)) {
      const rawScopeIds = Array.isArray(session.scope_ids) ? session.scope_ids : [];
      let roomIds = rawScopeIds.map((r) => (r && r._id ? r._id : r)).filter(Boolean);

      if (roomIds.length === 0 && session.scope_type !== 'room') {
        const roomFilter = { building: 'A1' };
        if (session.scope_type === 'floor') {
          if (!Number.isInteger(session.scope_floor) || session.scope_floor < 1 || session.scope_floor > 5) {
            return res.status(400).json({ success: false, message: 'Đợt kiểm kê thiếu tầng hợp lệ để xác định phạm vi.' });
          }
          roomFilter.floor = Number(session.scope_floor);
        }
        const scopedRooms = await Room.find(roomFilter).select('_id');
        roomIds = Array.isArray(scopedRooms) ? scopedRooms.map((r) => r._id) : [];
      }

      if (roomIds.length > 0) {
        const rawExpected = await Equipment.find({
          room_id: { $in: roomIds },
          status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] }
        }).populate('room_id', 'code name floor');

        if (Array.isArray(rawExpected)) {
          expectedCount = rawExpected.length;
          const scannedIds = new Set(
            logs
              .filter((l) => l.equipment_id)
              .map((l) => String(l.equipment_id._id || l.equipment_id))
          );
          unscannedEquipments = rawExpected.filter((eq) => !scannedIds.has(String(eq._id)));
        }
      }
    }

    const analysis = await buildInventoryDiscrepancyAnalysis({
      session,
      logs,
      unscannedEquipments,
      expectedCount
    });

    return res.json({
      success: true,
      analysis
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Cryptographic SHA-256 Audit Ledger Anomaly Analyst (Feature #4B)
// @route   POST /api/audit/ai-analyze
export const analyzeAuditAnomalies = async (req, res) => {
  try {
    const rawLimit = Number(req.body?.limit || req.query?.limit || 150);
    const limit = Math.max(10, Math.min(500, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 150));
    const targetTable = req.body?.target_table || req.query?.target_table;

    const filter = {};
    if (targetTable && targetTable !== 'ALL') {
      filter.target_table = String(targetTable);
    }

    const [verification, logs] = await Promise.all([
      AuditLog.verifyIntegrity(),
      AuditLog.find(filter)
        .sort({ seq: -1 })
        .limit(limit)
        .populate('user_id', 'full_name code role email')
    ]);

    const analysis = await buildAuditAnomalyAnalysis({
      verification,
      logs
    });

    return res.json({
      success: true,
      analysis
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  triageIncidentReport,
  getRepairAiCopilot,
  analyzeInventoryDiscrepancies,
  analyzeAuditAnomalies
};
