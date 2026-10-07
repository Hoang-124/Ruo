import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { ROOM_STATUSES, ROOM_TYPES, EQUIPMENT_STATUSES } from '../config/constants.js';

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

// @desc    Get all rooms (View room list)
// @route   GET /api/facilities/rooms
export const getAllRooms = async (req, res) => {
  try {
    const { building, room_type, status } = req.query;
    const query = {};
    if (building) query.building = building;
    if (room_type) query.room_type = room_type;
    if (status) query.status = status;

    const rooms = await Room.find(query).populate('required_equipment.category_id', 'code name');
    res.json({
      success: true,
      total: rooms.length,
      rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách phòng.' });
  }
};

// @desc    Create new room (Register room - Admin Only)
// @route   POST /api/facilities/rooms
export const createRoom = async (req, res) => {
  try {
    const { code, name, building, floor, room_type, capacity, area, department, required_equipment } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã phòng và tên phòng.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await Room.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Mã phòng đã tồn tại trong hệ thống.' });
    }

    const room = await Room.create({
      code: cleanCode,
      name: String(name).trim(),
      building: building || 'A1',
      floor: Number(floor) || 1,
      room_type: room_type || ROOM_TYPES.LECTURE,
      capacity: Number(capacity) || 50,
      area: Number(area) || 60,
      department: department || 'Khoa Công Nghệ Thông Tin',
      required_equipment: required_equipment || []
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký phòng học thành công.',
      room
    });
  } catch (error) {
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

// @desc    Get single room details with equipment list (UC: View room equipment)
// @route   GET /api/facilities/rooms/:code
export const getRoomByCode = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })
      .populate('required_equipment.category_id', 'code name');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
    }

    // Equipment stationed in this room
    const equipments = await Equipment.find({ room_id: room._id })
      .populate('category_id', 'code name')
      .populate('supplier_id', 'code name');

    res.json({
      success: true,
      room,
      equipments
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
