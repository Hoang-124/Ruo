import { RoomBooking } from '../models/Booking.js';
import { Room } from '../models/Facility.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { sweepExpiredCheckIns } from '../services/bookingSweeper.js';
import { BOOKING_STATUSES, CHECK_IN_GRACE_PERIOD_MINUTES } from '../config/constants.js';

// @desc    Create room booking request
// @route   POST /api/bookings
export const createBooking = async (req, res) => {
  const { roomCode, startTime, endTime, purpose, participantsCount = 1, isRecurring = false, recurringRule = null } = req.body;

  const room = await Room.findOne({ code: roomCode.toUpperCase(), isActive: true });
  if (!room) {
    return res.status(404).json({ success: false, message: `Phòng ${roomCode} không tồn tại hoặc đã ngừng hoạt động.` });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    return res.status(400).json({ success: false, message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.' });
  }

  // 1. Double-Booking Prevention: Concurrency Conflict Check
  const conflict = await RoomBooking.checkConflict(room._id, start, end);
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: `Phòng ${room.code} đã có đơn mượn trùng lịch từ ${conflict.startTime.toLocaleTimeString('vi-VN')} đến ${conflict.endTime.toLocaleTimeString('vi-VN')} (${conflict.purpose}).`,
      conflictWith: conflict.bookingCode
    });
  }

  // 2. Multi-tier Escalation Rules Check
  let isEscalated = false;
  let escalationReason = null;

  const startHour = start.getHours();
  const endHour = end.getHours();
  const isSunday = start.getDay() === 0;

  if (startHour < 7 || endHour >= 21 || (endHour === 21 && end.getMinutes() > 0)) {
    isEscalated = true;
    escalationReason = 'Sử dụng ngoài giờ hành chính sau 21h hoặc trước 7h sáng (RULE_OFF_HOURS)';
  } else if (isSunday) {
    isEscalated = true;
    escalationReason = 'Sử dụng vào ngày Chủ Nhật ngoài giờ làm việc (RULE_WEEKEND)';
  } else if (participantsCount > 150 || room.capacity > 150) {
    isEscalated = true;
    escalationReason = 'Tổ chức sự kiện quy mô lớn trên 150 người tại Hội trường (RULE_LARGE_CAPACITY)';
  }

  // 3. Generate Booking Code & Check-in deadline (start_time + 15 mins)
  const bookingCode = `BK-${Date.now().toString().slice(-6)}`;
  const checkInDeadline = new Date(start.getTime() + CHECK_IN_GRACE_PERIOD_MINUTES * 60 * 1000);
  const checkInQrCode = `RUO_QR_${room.code}_${bookingCode}`;

  const booking = await RoomBooking.create({
    bookingCode,
    user: req.user._id,
    room: room._id,
    startTime: start,
    endTime: end,
    purpose,
    participantsCount,
    isRecurring,
    recurringRule,
    status: BOOKING_STATUSES.PENDING,
    checkInQrCode,
    checkInDeadline,
    isEscalated,
    escalationReason
  });

  // 4. Record Immutable Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'BOOKING_CREATE',
    entityType: 'RoomBooking',
    entityId: booking._id.toString(),
    ipAddress: req.ip,
    diffData: {
      bookingCode,
      roomCode: room.code,
      timeSlot: `${start.toLocaleTimeString('vi-VN')} - ${end.toLocaleTimeString('vi-VN')}`,
      isEscalated,
      escalationReason
    }
  });

  res.status(201).json({
    success: true,
    message: isEscalated 
      ? 'Đơn đặt phòng đã được tạo và tự động chuyển cấp lên Ban Giám Hiệu do yêu cầu đặc thù.'
      : 'Đã gửi yêu cầu đặt phòng thành công. Vui lòng chờ bộ phận CSVC phê duyệt.',
    booking
  });
};

// @desc    Get user's own bookings
// @route   GET /api/bookings/my
export const getMyBookings = async (req, res) => {
  // Trigger sweeper check to catch any expired check-ins
  await sweepExpiredCheckIns();

  const bookings = await RoomBooking.find({ user: req.user._id, deletedAt: null })
    .populate('room')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    total: bookings.length,
    bookings
  });
};

// @desc    Get pending approvals queue (Facility Staff, Academic Affairs, Admin)
// @route   GET /api/bookings/pending
export const getPendingApprovals = async (req, res) => {
  const query = { status: BOOKING_STATUSES.PENDING, deletedAt: null };

  const requests = await RoomBooking.find(query)
    .populate('user', 'fullName email employeeCode reputeScore role')
    .populate('room', 'code name capacity building floorNumber')
    .sort({ isEscalated: -1, createdAt: 1 });

  res.json({
    success: true,
    total: requests.length,
    requests
  });
};

// @desc    Approve or Reject a booking
// @route   PUT /api/bookings/:id/approval
export const processApproval = async (req, res) => {
  const { status, rejectionReason } = req.body; // status: 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái xét duyệt không hợp lệ.' });
  }

  const booking = await RoomBooking.findById(req.params.id).populate('room user');
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Đơn đặt phòng không tồn tại.' });
  }

  booking.status = status;
  booking.approvedBy = req.user._id;
  booking.approvedAt = new Date();
  if (status === 'rejected') {
    booking.rejectionReason = rejectionReason || 'Không đáp ứng tiêu chuẩn mượn phòng học';
  }

  await booking.save();

  // Send Notification
  await Notification.create({
    user: booking.user._id,
    title: status === 'approved' ? 'Đơn đặt phòng đã được phê duyệt' : 'Đơn đặt phòng bị từ chối',
    message: status === 'approved' 
      ? `Yêu cầu mượn phòng ${booking.room.code} ngày ${booking.startTime.toLocaleDateString('vi-VN')} đã được duyệt. Vui lòng check-in QR trong 15 phút đầu.`
      : `Yêu cầu mượn phòng ${booking.room.code} bị từ chối. Lý do: ${booking.rejectionReason}`,
    type: status === 'approved' ? 'success' : 'error',
    relatedEntityType: 'RoomBooking',
    relatedEntityId: booking._id.toString()
  });

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: status === 'approved' ? 'BOOKING_APPROVE' : 'BOOKING_REJECT',
    entityType: 'RoomBooking',
    entityId: booking._id.toString(),
    ipAddress: req.ip,
    diffData: {
      bookingCode: booking.bookingCode,
      status,
      rejectionReason: booking.rejectionReason
    }
  });

  res.json({
    success: true,
    message: status === 'approved' ? 'Phê duyệt đơn mượn phòng thành công!' : 'Đã từ chối đơn mượn phòng.',
    booking
  });
};

// @desc    Validate QR Check-in (15-Minute Grace Period)
// @route   POST /api/bookings/check-in
export const checkInQR = async (req, res) => {
  const { bookingId, scannedQr } = req.body;

  const booking = await RoomBooking.findById(bookingId).populate('room user');
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Đơn mượn phòng không tồn tại.' });
  }

  try {
    await booking.validateAndCheckIn(scannedQr);

    // Audit Log Check-In
    await AuditLog.logAction({
      user: req.user._id,
      userDisplay: req.user.fullName,
      action: 'BOOKING_QR_CHECK_IN',
      entityType: 'RoomBooking',
      entityId: booking._id.toString(),
      ipAddress: req.ip,
      diffData: {
        bookingCode: booking.bookingCode,
        roomCode: booking.room.code,
        checkInTime: booking.checkInTime
      }
    });

    res.json({
      success: true,
      message: `Check-in thành công tại phòng ${booking.room.code}! Chúc bạn có buổi học tập hiệu quả.`,
      booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
