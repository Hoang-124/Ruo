import { Building, Floor, Room } from '../models/Facility.js';
import { RoomBooking } from '../models/Booking.js';
import { BOOKING_STATUSES, ROOM_STATUSES, ROOM_TYPES } from '../config/constants.js';

// ─────────────────────────────────────────────────────────────────────
// EXISTING ENDPOINTS (preserved)
// ─────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────
// UC-3.1: CREATE ROOM
// @desc    Add a new room to the system
// @route   POST /api/facilities/rooms
// @access  Facility Staff, Admin
// ─────────────────────────────────────────────────────────────────────
export const createRoom = async (req, res) => {
  try {
    const {
      code,
      name,
      buildingCode,
      floorNumber,
      capacity,
      type,
      areaSqm,
      powerKw,
      imageUrl,
      bookingRules,
      cadCoordinates
    } = req.body;

    // Validate required fields
    if (!code || !name || !buildingCode || floorNumber == null || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: mã phòng (code), tên phòng (name), mã tòa nhà (buildingCode), tầng (floorNumber), sức chứa (capacity).'
      });
    }

    if (capacity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Sức chứa phòng phải lớn hơn 0.'
      });
    }

    // Validate room type if provided
    if (type && !Object.values(ROOM_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Loại phòng không hợp lệ. Các giá trị hợp lệ: ${Object.values(ROOM_TYPES).join(', ')}`
      });
    }

    // Find building
    const building = await Building.findOne({ code: buildingCode.toUpperCase() });
    if (!building) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy tòa nhà với mã: ${buildingCode}`
      });
    }

    // Find or create floor
    let floor = await Floor.findOne({ building: building._id, floorNumber: Number(floorNumber) });
    if (!floor) {
      floor = await Floor.create({
        building: building._id,
        floorNumber: Number(floorNumber),
        name: `Tầng ${floorNumber} - ${building.name}`
      });
    }

    // Check duplicate room code
    const existing = await Room.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Mã phòng "${code.toUpperCase()}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`
      });
    }

    const room = await Room.create({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      building: building._id,
      floor: floor._id,
      floorNumber: Number(floorNumber),
      capacity: Number(capacity),
      type: type || ROOM_TYPES.THEORY,
      areaSqm: areaSqm ? Number(areaSqm) : 60,
      powerKw: powerKw ? Number(powerKw) : 0,
      imageUrl: imageUrl || '',
      bookingRules: bookingRules || '',
      cadCoordinates: cadCoordinates || {},
      status: ROOM_STATUSES.AVAILABLE,
      isActive: true
    });

    const populated = await Room.findById(room._id)
      .populate('building')
      .populate('floor');

    res.status(201).json({
      success: true,
      message: `Phòng học ${room.code} đã được tạo thành công.`,
      room: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Mã phòng đã tồn tại. Vui lòng chọn mã khác.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// UC-3.2: ROOM LIST VIEW (with multi-filters & pagination)
// @desc    Browse room directory with filters
// @route   GET /api/facilities/rooms
// @access  Facility Staff, Admin
// ─────────────────────────────────────────────────────────────────────
export const getRooms = async (req, res) => {
  try {
    const {
      buildingCode,
      floorNumber,
      type,
      status,
      minCapacity,
      maxCapacity,
      search,
      page = 1,
      limit = 20,
      sortBy = 'code',
      sortOrder = 'asc'
    } = req.query;

    const filter = { deletedAt: null };

    // Building filter
    if (buildingCode) {
      const building = await Building.findOne({ code: buildingCode.toUpperCase() });
      if (building) {
        filter.building = building._id;
      } else {
        return res.json({ success: true, rooms: [], total: 0, page: 1, totalPages: 0 });
      }
    }

    // Floor filter
    if (floorNumber) {
      filter.floorNumber = Number(floorNumber);
    }

    // Room type filter
    if (type && type !== 'all') {
      filter.type = type;
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Capacity range filter
    if (minCapacity) {
      filter.capacity = { ...filter.capacity, $gte: Number(minCapacity) };
    }
    if (maxCapacity) {
      filter.capacity = { ...filter.capacity, $lte: Number(maxCapacity) };
    }

    // Text search (code or name)
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex }
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('building', 'code name')
        .populate('floor', 'floorNumber name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Room.countDocuments(filter)
    ]);

    res.json({
      success: true,
      rooms,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// UC-3.3: ROOM DETAIL VIEW
// @desc    Get single room details with equipment list, upcoming bookings
//          and usage statistics
// @route   GET /api/facilities/rooms/:code
// @access  Facility Staff, Admin (and read-only for other roles)
// ─────────────────────────────────────────────────────────────────────
export const getRoomByCode = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })
      .populate('building')
      .populate('floor')
      .populate('department');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại.' });
    }

    // Next 10 upcoming bookings
    const upcomingBookings = await RoomBooking.find({
      room: room._id,
      status: { $in: [BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.PENDING] },
      endTime: { $gte: new Date() }
    }).sort({ startTime: 1 }).limit(10).populate('user', 'fullName email employeeCode');

    // Usage statistics for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyBookings = await RoomBooking.countDocuments({
      room: room._id,
      status: { $in: [BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.CHECKED_IN, BOOKING_STATUSES.COMPLETED] },
      startTime: { $gte: startOfMonth },
      endTime: { $lte: endOfMonth }
    });

    // Total completed bookings (all time)
    const totalCompletedBookings = await RoomBooking.countDocuments({
      room: room._id,
      status: BOOKING_STATUSES.COMPLETED
    });

    res.json({
      success: true,
      room,
      upcomingBookings,
      stats: {
        monthlyBookings,
        totalCompletedBookings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// UC-3.4: UPDATE ROOM INFO
// @desc    Update room specifications (name, type, capacity, etc.)
// @route   PUT /api/facilities/rooms/:id
// @access  Facility Staff, Admin
// ─────────────────────────────────────────────────────────────────────
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học.' });
    }

    const { name, type, capacity, areaSqm, powerKw, imageUrl, bookingRules, cadCoordinates } = req.body;

    // Pre-update hook: warn if new capacity is lower than future approved bookings
    const warnings = [];
    if (capacity != null && Number(capacity) < room.capacity) {
      const futureApproved = await RoomBooking.find({
        room: room._id,
        status: { $in: [BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.PENDING] },
        startTime: { $gte: new Date() }
      });

      const conflicting = futureApproved.filter(b => b.participantsCount > Number(capacity));
      if (conflicting.length > 0) {
        warnings.push(
          `Cảnh báo: Sức chứa mới (${capacity}) thấp hơn số người tham gia trong ${conflicting.length} đơn mượn tương lai đã được duyệt/chờ duyệt. Các mã booking bị ảnh hưởng: ${conflicting.map(b => b.bookingCode).join(', ')}.`
        );
      }
    }

    // Validate room type if provided
    if (type && !Object.values(ROOM_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Loại phòng không hợp lệ. Các giá trị hợp lệ: ${Object.values(ROOM_TYPES).join(', ')}`
      });
    }

    // Apply updates
    if (name != null) room.name = name.trim();
    if (type != null) room.type = type;
    if (capacity != null) room.capacity = Number(capacity);
    if (areaSqm != null) room.areaSqm = Number(areaSqm);
    if (powerKw != null) room.powerKw = Number(powerKw);
    if (imageUrl != null) room.imageUrl = imageUrl;
    if (bookingRules != null) room.bookingRules = bookingRules;
    if (cadCoordinates != null) {
      room.cadCoordinates = { ...room.cadCoordinates.toObject?.() || room.cadCoordinates, ...cadCoordinates };
    }

    await room.save();

    const updated = await Room.findById(room._id)
      .populate('building', 'code name')
      .populate('floor', 'floorNumber name');

    res.json({
      success: true,
      message: `Phòng ${room.code} đã được cập nhật thành công.`,
      room: updated,
      warnings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// UC-3.5: DEACTIVATE ROOM (Soft Delete)
// @desc    Deactivate an unused room (status → INACTIVE)
// @route   PUT /api/facilities/rooms/:id/deactivate
// @access  Facility Staff, Admin
// ─────────────────────────────────────────────────────────────────────
export const deactivateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học.' });
    }

    if (room.status === ROOM_STATUSES.INACTIVE) {
      return res.status(400).json({
        success: false,
        message: `Phòng ${room.code} đã ở trạng thái INACTIVE.`
      });
    }

    // Check for future bookings that need to be cancelled/transferred first
    const futureBookings = await RoomBooking.find({
      room: room._id,
      status: { $in: [BOOKING_STATUSES.PENDING, BOOKING_STATUSES.APPROVED] },
      startTime: { $gte: new Date() }
    }).populate('user', 'fullName email');

    if (futureBookings.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Không thể ngừng kích hoạt phòng ${room.code}. Hiện tại có ${futureBookings.length} đơn mượn tương lai chưa được hủy hoặc chuyển sang phòng khác. Vui lòng xử lý các đơn mượn trước khi ngừng kích hoạt.`,
        affectedBookings: futureBookings.map(b => ({
          bookingCode: b.bookingCode,
          user: b.user?.fullName,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status
        }))
      });
    }

    room.status = ROOM_STATUSES.INACTIVE;
    room.isActive = false;
    await room.save();

    res.json({
      success: true,
      message: `Phòng ${room.code} đã được chuyển sang trạng thái INACTIVE thành công.`,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// UC-3.6: UPDATE ROOM STATUS
// @desc    Toggle room operational status (AVAILABLE ↔ MAINTENANCE ↔ INACTIVE)
// @route   PUT /api/facilities/rooms/:id/status
// @access  Facility Staff, Admin
// ─────────────────────────────────────────────────────────────────────
export const updateRoomStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học.' });
    }

    const { status } = req.body;

    // Validate allowed statuses for this operation
    const allowedStatuses = [ROOM_STATUSES.AVAILABLE, ROOM_STATUSES.MAINTENANCE, ROOM_STATUSES.INACTIVE];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Các giá trị cho phép: ${allowedStatuses.join(', ')}`
      });
    }

    if (room.status === status) {
      return res.status(400).json({
        success: false,
        message: `Phòng ${room.code} đã ở trạng thái "${status}".`
      });
    }

    // Collect affected bookings for notification
    const affectedBookings = [];
    if (status === ROOM_STATUSES.MAINTENANCE || status === ROOM_STATUSES.INACTIVE) {
      const futureBookings = await RoomBooking.find({
        room: room._id,
        status: { $in: [BOOKING_STATUSES.PENDING, BOOKING_STATUSES.APPROVED] },
        startTime: { $gte: new Date() }
      }).populate('user', 'fullName email');

      affectedBookings.push(...futureBookings.map(b => ({
        bookingCode: b.bookingCode,
        user: b.user?.fullName,
        email: b.user?.email,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status
      })));
    }

    const previousStatus = room.status;
    room.status = status;

    // If reactivating from INACTIVE, restore isActive flag
    if (status === ROOM_STATUSES.AVAILABLE) {
      room.isActive = true;
    } else if (status === ROOM_STATUSES.INACTIVE) {
      room.isActive = false;
    }

    await room.save();

    res.json({
      success: true,
      message: `Phòng ${room.code} đã chuyển trạng thái từ "${previousStatus}" sang "${status}" thành công.`,
      room,
      previousStatus,
      newStatus: status,
      affectedBookings,
      notificationSent: affectedBookings.length > 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
