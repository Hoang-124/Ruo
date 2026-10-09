import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROOM_STATUSES, ROOM_TYPES, EQUIPMENT_STATUSES } from '../config/constants.js';
import { normalizeRoomCode, parseRoomListQuery, validateCreateRoomPayload } from '../services/roomValidation.js';
import { HISTORY_LIMIT, summarizeRoomEquipment } from '../services/roomDetail.js';

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

    const existing = await Room.findOne({ code: value.code });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Mã phòng ${value.code} đã tồn tại trong hệ thống.`,
        errors: { code: `Mã phòng ${value.code} đã tồn tại trong hệ thống.` }
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

// @desc    Get rooms by building and floor for CAD Canvas
// @route   GET /api/facilities/cad-canvas
export const getCadCanvasRooms = async (req, res) => {
  try {
    const { buildingCode = 'A1', floorNumber = 3 } = req.query;

    const building = await Building.findOne({ code: buildingCode.toUpperCase() });
    
    const query = {
      building: buildingCode.toUpperCase(),
      floor: Number(floorNumber)
    };

    const rooms = await Room.find(query);
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

    const enrichedRooms = rooms.map(room => {
      const roomEqs = eqMap.get(room._id.toString()) || [];
      const hasBrokenOrRepairing = roomEqs.some(e => e.status === EQUIPMENT_STATUSES.BROKEN || e.status === EQUIPMENT_STATUSES.REPAIRING);
      
      return {
        ...room.toObject(),
        effectiveStatus: hasBrokenOrRepairing ? ROOM_STATUSES.MAINTENANCE : room.status,
        equipmentCount: roomEqs.length,
        equipments: roomEqs
      };
    });

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
    const room = await Room.findOne({ code })
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
      summary: summarizeRoomEquipment(equipments, maintenanceHistory)
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
