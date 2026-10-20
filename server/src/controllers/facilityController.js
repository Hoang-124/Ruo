import mongoose from 'mongoose';
import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROOM_STATUSES, ROOM_TYPES, EQUIPMENT_STATUSES, MOVEMENT_STATUSES } from '../config/constants.js';
import {
  getRoomCodeVariants,
  normalizeRoomCode,
  parseRoomListQuery,
  validateCreateRoomPayload,
  validateUpdateRoomPayload
} from '../services/roomValidation.js';
import { HISTORY_LIMIT, summarizeRoomEquipment } from '../services/roomDetail.js';
import { evaluateDeactivation, ROOM_STATUS_LABELS, evaluateStatusChange, validateDeactivationPayload } from '../services/roomStatus.js';
import { parseCadCanvasQuery, summarizeCadRoom } from '../services/cadCanvas.js';
import { OPEN_REPAIR_STATUSES } from '../services/dashboardAnalytics.js';

const attachPendingMovements = async (equipments = []) => {
  if (!equipments.length) return [];
  const eqIds = equipments.map((e) => e._id).filter(Boolean);
  const pendingMoves = eqIds.length
    ? await EquipmentMovement.find({
        equipment_id: { $in: eqIds },
        status: { $in: [MOVEMENT_STATUSES.PENDING, MOVEMENT_STATUSES.AWAITING_APPROVAL, MOVEMENT_STATUSES.APPROVED] }
      }).populate('to_room_id', 'code name')
    : [];
  const pendingByEqId = new Map(
    pendingMoves.map((m) => [
      m.equipment_id.toString(),
      { movementId: m._id, toRoomCode: m.to_room_id?.code || 'Kho/Phòng đích' }
    ])
  );
  return equipments.map((eq) => {
    const plain = typeof eq.toObject === 'function' ? eq.toObject() : { ...eq };
    const pending = plain._id ? pendingByEqId.get(plain._id.toString()) : null;
    return pending ? { ...plain, pendingMovement: pending } : plain;
  });
};

// @desc    Get all buildings and their floors
// @route   GET /api/facilities/buildings
export const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find({ isActive: true });
    res.json({
      success: true,
      buildings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách tòa nhà.' });
  }
};

// @desc    Get all rooms (View room list) — UC-2.2
// @route   GET /api/facilities/rooms?floor=&room_type=&status=&q=&page=&limit=
export const getAllRooms = async (req, res) => {
  try {
    const { valid, errors, filter, page, limit, paginated } = parseRoomListQuery(req.query);
    if (!valid) {
      return res.status(400).json({ success: false, message: Object.values(errors)[0], errors });
    }

    const total = await Room.countDocuments(filter);

    let cursor = Room.find(filter)
      .populate('required_equipment.category_id', 'code name')
      .sort({ code: 1 });
    if (paginated) cursor = cursor.skip((page - 1) * limit).limit(limit);
    const rooms = await cursor;

    res.json({
      success: true,
      total,
      page,
      limit: paginated ? limit : total,
      totalPages: paginated ? Math.max(1, Math.ceil(total / limit)) : 1,
      rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách phòng.' });
  }
};

// Builds the audit-log actor context from the authenticated request
const getAuditActor = (req) => ({
  user_id: req.user?._id || null,
  user_display: req.user ? `${req.user.full_name} (${req.user.code})` : 'Hệ Thống',
  ip_address: req.ip || '127.0.0.1'
});

// @desc    Create new room (Register room - Admin Only) — UC-2.1
// @route   POST /api/facilities/rooms
export const createRoom = async (req, res) => {
  try {
    const { valid, errors, value } = validateCreateRoomPayload(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: Object.values(errors)[0],
        errors
      });
    }

    const existing = await Room.findOne({ code: { $in: getRoomCodeVariants(value.code) } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Mã phòng ${value.code} (${existing.code}) đã tồn tại trong Tòa nhà A1.`,
        errors: { code: `Mã phòng ${value.code} (${existing.code}) đã tồn tại trong Tòa nhà A1.` }
      });
    }

    const room = await Room.create(value);

    await AuditLog.logAction({
      ...getAuditActor(req),
      action: 'ROOM_CREATED',
      target_table: 'rooms',
      entity_id: room._id.toString(),
      new_value: {
        code: room.code,
        name: room.name,
        building: room.building,
        floor: room.floor,
        room_type: room.room_type,
        capacity: room.capacity
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã thêm phòng ${room.code} thành công.`,
      room
    });
  } catch (error) {
    // Race condition on the unique index: another request created the same code first
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Mã phòng đã tồn tại trong hệ thống.', errors: { code: 'Mã phòng đã tồn tại trong hệ thống.' } });
    }
    res.status(500).json({ success: false, message: 'Không thể đăng ký phòng mới.' });
  }
};

// @desc    Update room info (Admin only) — UC-2.4
// @route   PUT /api/facilities/rooms/:id
export const updateRoom = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Mã định danh phòng không hợp lệ.' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
    }

    const { valid, errors, changes, previous } = validateUpdateRoomPayload(req.body, room.toObject());
    if (!valid) {
      return res.status(400).json({ success: false, message: Object.values(errors)[0], errors });
    }

    if (Object.keys(changes).length === 0) {
      return res.json({
        success: true,
        changed: false,
        message: `Phòng ${room.code} không có thay đổi nào.`,
        room
      });
    }

    room.set(changes);
    await room.save();

    await AuditLog.logAction({
      ...getAuditActor(req),
      action: 'ROOM_UPDATED',
      target_table: 'rooms',
      entity_id: room._id.toString(),
      old_value: { code: room.code, ...previous },
      new_value: { code: room.code, ...changes }
    });

    res.json({
      success: true,
      changed: true,
      changedFields: Object.keys(changes),
      message: `Đã cập nhật phòng ${room.code} thành công.`,
      room
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Không thể cập nhật thông tin phòng.' });
  }
};

// @desc    Deactivate room (soft delete -> INACTIVE, Admin only) — UC-2.5
// @route   PUT /api/facilities/rooms/:id/deactivate
// All equipment must be moved out of the room first; the room record itself is never deleted.
export const deactivateRoom = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Mã định danh phòng không hợp lệ.' });
    }

    const payload = validateDeactivationPayload(req.body);
    if (!payload.valid) {
      return res.status(400).json({ success: false, message: Object.values(payload.errors)[0], errors: payload.errors });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
    }

    const rawEquipments = await Equipment.find({ room_id: room._id }).select('code name status');
    const equipments = await attachPendingMovements(rawEquipments);
    const decision = evaluateDeactivation(room, equipments);
    if (!decision.allowed) {
      return res.status(409).json({
        success: false,
        code: decision.reason,
        message: decision.message,
        equipments: decision.blockers
      });
    }

    const previousStatus = room.status;
    room.status = ROOM_STATUSES.INACTIVE;
    await room.save();

    await AuditLog.logAction({
      ...getAuditActor(req),
      action: 'ROOM_DEACTIVATED',
      target_table: 'rooms',
      entity_id: room._id.toString(),
      old_value: { code: room.code, status: previousStatus },
      new_value: { code: room.code, status: room.status, ...(payload.reason ? { reason: payload.reason } : {}) }
    });

    res.json({
      success: true,
      message: `Đã ngừng sử dụng phòng ${room.code}.`,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể ngừng sử dụng phòng.' });
  }
};

// @desc    Change room status AVAILABLE <-> MAINTENANCE <-> INACTIVE (Admin only) — UC-2.6
// @route   PUT /api/facilities/rooms/:id/status
export const updateRoomStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Mã định danh phòng không hợp lệ.' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
    }

    // Equipment is only needed for the INACTIVE guard, so skip the query for other targets.
    const targetStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
    const rawEquipments = targetStatus === ROOM_STATUSES.INACTIVE
      ? await Equipment.find({ room_id: room._id }).select('code name status')
      : [];
    const equipments = await attachPendingMovements(rawEquipments);

    const decision = evaluateStatusChange(req.body, room, equipments);
    if (!decision.ok) {
      return res.status(decision.httpStatus).json({
        success: false,
        code: decision.code,
        message: decision.message,
        errors: decision.errors,
        ...(decision.blockers.length ? { equipments: decision.blockers } : {})
      });
    }

    const previousStatus = room.status;
    room.status = decision.target;
    await room.save();

    await AuditLog.logAction({
      ...getAuditActor(req),
      action: 'ROOM_STATUS_CHANGED',
      target_table: 'rooms',
      entity_id: room._id.toString(),
      old_value: { code: room.code, status: previousStatus },
      new_value: { code: room.code, status: room.status, ...(decision.reason ? { reason: decision.reason } : {}) }
    });

    res.json({
      success: true,
      message: `Đã chuyển phòng ${room.code} sang trạng thái "${ROOM_STATUS_LABELS[room.status]}".`,
      previousStatus,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái phòng.' });
  }
};

// @desc    Get rooms by building and floor for CAD Canvas
// @route   GET /api/facilities/cad-canvas
export const getCadCanvasRooms = async (req, res) => {
  try {
    const query = parseCadCanvasQuery(req.query);
    if (!query.valid) {
      return res.status(400).json({ success: false, message: Object.values(query.errors)[0], errors: query.errors });
    }
    const { buildingCode, floorNumber } = query;

    const rooms = await Room.find({ building: buildingCode, floor: floorNumber });
    const roomIds = rooms.map(r => r._id);

    // Group equipments count by room
    const equipments = await Equipment.find({ 
      room_id: { $in: roomIds }, 
      status: { $ne: EQUIPMENT_STATUSES.DISPOSED } 
    }).select('code name status room_id');

    const eqMap = new Map();
    equipments.forEach(eq => {
      const rId = eq.room_id ? eq.room_id.toString() : '';
      if (!eqMap.has(rId)) eqMap.set(rId, []);
      eqMap.get(rId).push(eq);
    });

    const enrichedRooms = rooms.map(room => ({
      ...room.toObject(),
      ...summarizeCadRoom(room, eqMap.get(room._id.toString()) || [])
    }));

    res.json({
      success: true,
      buildingCode,
      floorNumber: Number(floorNumber),
      totalRooms: enrichedRooms.length,
      rooms: enrichedRooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải dữ liệu CAD mặt bằng phòng.' });
  }
};

// @desc    Get single room details with equipment, maintenance & movement history — UC-2.3
// @route   GET /api/facilities/rooms/:code
export const getRoomByCode = async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    const room = await Room.findOne({ code: { $in: getRoomCodeVariants(code) } })
      .populate('required_equipment.category_id', 'code name');

    if (!room) {
      return res.status(404).json({ success: false, message: `Phòng ${code} không tồn tại.` });
    }

    // Equipment stationed in this room (serial number & QR code come with the document)
    const equipments = await Equipment.find({ room_id: room._id })
      .populate('category_id', 'code name')
      .populate('supplier_id', 'code name')
      .sort({ code: 1 });
    const equipmentIds = equipments.map((eq) => eq._id);
    const openRepairs = equipmentIds.length ? await Repair.countDocuments({
      equipment_id: { $in: equipmentIds }, status: { $in: OPEN_REPAIR_STATUSES }
    }) : 0;

    // Maintenance history: repair tickets of the equipment currently in the room
    const maintenanceHistory = equipmentIds.length === 0 ? [] : await Repair.find({ equipment_id: { $in: equipmentIds } })
      .sort({ reported_at: -1 })
      .limit(HISTORY_LIMIT)
      .populate('equipment_id', 'code name serial_number')
      .populate('assigned_to', 'full_name code');

    // Movement history: every transfer / replacement / repair move into or out of this room
    const movementHistory = await EquipmentMovement.find({
      $or: [{ from_room_id: room._id }, { to_room_id: room._id }]
    })
      .sort({ created_at: -1 })
      .limit(HISTORY_LIMIT)
      .populate('equipment_id', 'code name serial_number')
      .populate('from_room_id', 'code name')
      .populate('to_room_id', 'code name')
      .populate('ordered_by', 'full_name code');

    res.json({
      success: true,
      room,
      equipments,
      maintenanceHistory,
      movementHistory,
      historyLimit: HISTORY_LIMIT,
      summary: { ...summarizeRoomEquipment(equipments, maintenanceHistory), openRepairs }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin chi tiết phòng.' });
  }
};

// @desc    Check Room Shortage compared to required_equipment quota (UC: View room shortage)
// @route   GET /api/facilities/rooms/:id/shortage
export const getRoomShortage = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('required_equipment.category_id', 'code name');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại.' });
    }

    // Equipment in room currently in_use
    const currentEquipments = await Equipment.find({
      room_id: room._id,
      status: EQUIPMENT_STATUSES.IN_USE
    });

    // Count equipment by category
    const countByCategory = {};
    currentEquipments.forEach(eq => {
      const catId = eq.category_id.toString();
      countByCategory[catId] = (countByCategory[catId] || 0) + 1;
    });

    const shortages = (room.required_equipment || []).map(reqItem => {
      const catId = reqItem.category_id ? reqItem.category_id._id.toString() : '';
      const actualCount = countByCategory[catId] || 0;
      const requiredCount = reqItem.quantity || 1;
      const missingCount = Math.max(0, requiredCount - actualCount);
      return {
        category: reqItem.category_id,
        requiredCount,
        actualCount,
        missingCount,
        isSufficient: missingCount === 0
      };
    });

    const isFullySufficient = shortages.every(s => s.isSufficient);

    res.json({
      success: true,
      room: {
        id: room._id,
        code: room.code,
        name: room.name,
        room_type: room.room_type
      },
      isFullySufficient,
      shortages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi đối soát định mức phòng.' });
  }
};

// @desc    Get Warehouse Stock (UC: View warehouse stock)
// @route   GET /api/facilities/warehouse/stock
export const getWarehouseStock = async (req, res) => {
  try {
    // Find rooms designated as warehouse
    const warehouses = await Room.find({ room_type: ROOM_TYPES.WAREHOUSE });
    const warehouseIds = warehouses.map(w => w._id);

    // Find equipment that is in_stock
    const stockItems = await Equipment.find({
      $or: [
        { status: EQUIPMENT_STATUSES.IN_STOCK },
        { room_id: { $in: warehouseIds }, status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] } }
      ]
    }).populate('category_id', 'code name').populate('room_id', 'code name');

    res.json({
      success: true,
      total: stockItems.length,
      warehouses,
      stockItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải dữ liệu kho dự phòng.' });
  }
};

// @desc    Create Building (Admin Only - Master Data)
// @route   POST /api/facilities/buildings hoặc POST /api/admin/buildings
export const createBuilding = async (req, res) => {
  try {
    const { code, name, campusZone, totalFloors, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã và tên tòa nhà.' });
    }

    const existing = await Building.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã tòa nhà [${code.toUpperCase()}] đã tồn tại trong hệ thống.` });
    }

    const building = await Building.create({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      campusZone: campusZone || 'Khu A',
      totalFloors: totalFloors ? Number(totalFloors) : 5,
      description: description || '',
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: `Khởi tạo tòa nhà ${building.name} (${building.code}) thành công!`,
      building
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tạo tòa nhà: ' + error.message });
  }
};

// @desc    Update Building (Admin Only - Master Data)
// @route   PUT /api/facilities/buildings/:id hoặc PUT /api/admin/buildings/:id
export const updateBuilding = async (req, res) => {
  try {
    const { name, campusZone, totalFloors, description, isActive } = req.body;
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tòa nhà.' });
    }

    if (name) building.name = name.trim();
    if (campusZone) building.campusZone = campusZone.trim();
    if (totalFloors !== undefined) building.totalFloors = Number(totalFloors);
    if (description !== undefined) building.description = description;
    if (isActive !== undefined) building.isActive = Boolean(isActive);

    await building.save();

    res.json({
      success: true,
      message: `Cập nhật thông tin tòa nhà ${building.name} (${building.code}) thành công!`,
      building
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tòa nhà: ' + error.message });
  }
};

// @desc    Delete / Deactivate Building (Admin Only - Master Data)
// @route   DELETE /api/facilities/buildings/:id hoặc DELETE /api/admin/buildings/:id
export const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tòa nhà.' });
    }

    // Soft delete: toggle isActive to false
    building.isActive = false;
    await building.save();

    res.json({
      success: true,
      message: `Đã vô hiệu hóa tòa nhà ${building.name} (${building.code}) thành công!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa tòa nhà: ' + error.message });
  }
};
