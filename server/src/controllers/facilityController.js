import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { ROOM_STATUSES } from '../config/constants.js';

// @desc    Get all buildings and their floors
// @route   GET /api/facilities/buildings
export const getBuildings = async (req, res) => {
  const buildings = await Building.find({ isActive: true });
  res.json({
    success: true,
    buildings
  });
};

// @desc    Get rooms by building and floor for CAD Canvas
// @route   GET /api/facilities/cad-canvas
export const getCadCanvasRooms = async (req, res) => {
  const { buildingCode = 'A1', floorNumber = 3 } = req.query;

  const building = await Building.findOne({ code: buildingCode.toUpperCase() });
  
  const query = {
    floorNumber: Number(floorNumber),
    isActive: true,
    deletedAt: null
  };
  if (building) query.building = building._id;

  const rooms = await Room.find(query).populate('department');
  const roomIds = rooms.map(r => r._id);

  // Group equipments count by room
  const equipments = await Equipment.find({ 
    room_id: { $in: roomIds }, 
    status: { $ne: 'disposed' } 
  }).select('code name status room_id');

  const eqMap = new Map();
  equipments.forEach(eq => {
    const rId = eq.room_id ? eq.room_id.toString() : '';
    if (!eqMap.has(rId)) eqMap.set(rId, []);
    eqMap.get(rId).push(eq);
  });

  const enrichedRooms = rooms.map(room => {
    const roomEqs = eqMap.get(room._id.toString()) || [];
    const hasRepairing = roomEqs.some(e => e.status === 'repairing');
    
    return {
      ...room.toObject(),
      effectiveStatus: hasRepairing ? ROOM_STATUSES.MAINTENANCE : room.status,
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
};

// @desc    Get single room details with equipment list (UC: Check room equipment)
// @route   GET /api/facilities/rooms/:code
export const getRoomByCode = async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() })
    .populate('building')
    .populate('floor')
    .populate('department');

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
};
