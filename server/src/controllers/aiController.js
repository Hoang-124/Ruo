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

const canCallModel = (Model, methodName) => {
  if (!Model || typeof Model[methodName] !== 'function') return false;
  if (mongoose.connection.readyState === 1) return true;
  return Model[methodName] !== mongoose.Model[methodName];
};

// @desc    AI Incident Triage & Duplicate Detector for Lecturer Report Issue (Feature #1A)
// @route   POST /api/repairs/ai-triage
export const triageIncidentReport = async (req, res) => {
  try {
    const {
      room_id,
      equipment_id,
      incident_description,
      incident_images = []
    } = req.body || {};

    const cleanDesc = String(incident_description || '').trim();
    if (!cleanDesc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mô tả hiện tượng sự cố trước khi chạy AI Phân loại.'
      });
    }

    let equipment = null;
    if (equipment_id && canCallModel(Equipment, 'findById')) {
      try {
        equipment = await Equipment.findById(equipment_id).populate('category_id', 'code name');
      } catch (_) {
        equipment = null;
      }
    }

    let room = null;
    if (room_id && canCallModel(Room, 'findById')) {
      try {
        room = await Room.findById(room_id).select('code name building floor room_type');
      } catch (_) {
        room = null;
      }
    }

    let openRepairs = [];
    if (canCallModel(Repair, 'find')) {
      const orClauses = [];
      if (equipment_id) orClauses.push({ equipment_id });
      if (room_id) orClauses.push({ room_id });

      if (orClauses.length > 0) {
        try {
          openRepairs = await Repair.find({
            status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] },
            $or: orClauses
          })
            .populate('equipment_id', 'code name')
            .populate('room_id', 'code name')
            .sort({ created_at: -1 })
            .limit(10);
        } catch (_) {
          openRepairs = [];
        }
      }
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
      openRepairs
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
    const repair = await Repair.findById(req.params.id)
      .populate({
        path: 'equipment_id',
        select: 'code name brand model price remaining_value estimated_repair_cost repair_count category_id room_id status warranty_status',
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

    const [
      equipmentHistory,
      logs,
      spareParts,
      spareEquipments,
      technicians,
      openRepairs,
      resolvedRepairs
    ] = await Promise.all([
      eqId && canCallModel(Repair, 'find')
        ? Repair.find({ equipment_id: eqId, _id: { $ne: repair._id } }).sort({ created_at: -1 }).limit(10)
        : Promise.resolve([]),
      canCallModel(RepairLog, 'find')
        ? RepairLog.find({ repair_id: repair._id }).sort({ created_at: -1 }).limit(20)
        : Promise.resolve([]),
      canCallModel(SparePart, 'find')
        ? SparePart.find().limit(100)
        : Promise.resolve([]),
      canCallModel(Equipment, 'find')
        ? Equipment.find({ status: EQUIPMENT_STATUSES.IN_STOCK }).limit(50)
        : Promise.resolve([]),
      canCallModel(User, 'find')
        ? User.find({ role: USER_ROLES.TECHNICIAN, status: USER_STATUSES.ACTIVE }).select('full_name code email department role status')
        : Promise.resolve([]),
      canCallModel(Repair, 'find')
        ? Repair.find({
            status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
          }).select('assigned_to status deadline')
        : Promise.resolve([]),
      canCallModel(Repair, 'find')
        ? Repair.find({
            status: { $in: [REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED] }
          })
            .populate('equipment_id', 'category_id')
            .limit(200)
        : Promise.resolve([])
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

    try {
      const rawScopeIds = Array.isArray(session.scope_ids) ? session.scope_ids : [];
      let roomIds = rawScopeIds.map((r) => (r && r._id ? r._id : r));

      if (roomIds.length === 0 && canCallModel(Room, 'find')) {
        const roomFilter = { building: 'A1' };
        if (session.scope_type === 'floor' && session.scope_floor) {
          roomFilter.floor = Number(session.scope_floor);
        }
        const scopedRooms = await Room.find(roomFilter).select('_id');
        roomIds = Array.isArray(scopedRooms) ? scopedRooms.map((r) => r._id) : [];
      }

      if (roomIds.length > 0 && canCallModel(Equipment, 'find')) {
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
    } catch (_) {
      unscannedEquipments = [];
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
    const limit = Math.max(10, Math.min(500, Number.isFinite(rawLimit) ? rawLimit : 150));
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
