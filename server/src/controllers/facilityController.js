import { Building, Floor, Room } from '../models/Facility.js';
import { RoomBooking } from '../models/Booking.js';
import { BOOKING_STATUSES, ROOM_STATUSES } from '../config/constants.js';

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
  const { buildingCode = 'A1', floorNumber = 3, time } = req.query;

  const building = await Building.findOne({ code: buildingCode.toUpperCase() });
  if (!building) {
    return res.status(404).json({ success: false, message: `Không tìm thấy tòa nhà: ${buildingCode}` });
  }

  const query = {
    building: building._id,
    floorNumber: Number(floorNumber),
    isActive: true,
    deletedAt: null
  };

  const rooms = await Room.find(query).populate('department');

  // Query active bookings for real-time status overlay
  const now = time ? new Date(time) : new Date();
  const roomIds = rooms.map(r => r._id);

  const activeBookings = await RoomBooking.find({
    room: { $in: roomIds },
    status: { $in: [BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.CHECKED_IN] },
    startTime: { $lte: now },
    endTime: { $gte: now }
  }).populate('user', 'fullName employeeCode');

  const bookingMap = new Map();
  activeBookings.forEach(b => {
    bookingMap.set(b.room.toString(), b);
  });

  const enrichedRooms = rooms.map(room => {
    const currentBooking = bookingMap.get(room._id.toString());
    let currentStatus = room.status;

    if (currentBooking) {
      currentStatus = ROOM_STATUSES.OCCUPIED;
    }

    return {
      ...room.toObject(),
      effectiveStatus: currentStatus,
      currentSlot: currentBooking ? {
        bookingCode: currentBooking.bookingCode,
        purpose: currentBooking.purpose,
        user: currentBooking.user.fullName,
        startTime: currentBooking.startTime,
        endTime: currentBooking.endTime
      } : null
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

// @desc    Get single room details with equipment list and upcoming bookings
// @route   GET /api/facilities/rooms/:code
export const getRoomByCode = async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() })
    .populate('building')
    .populate('floor')
    .populate('department');

  if (!room) {
    return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
  }

  // Next 5 upcoming bookings
  const upcomingBookings = await RoomBooking.find({
    room: room._id,
    status: { $in: [BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.PENDING] },
    endTime: { $gte: new Date() }
  }).sort({ startTime: 1 }).limit(5).populate('user', 'fullName email');

  res.json({
    success: true,
    room,
    upcomingBookings
  });
};
