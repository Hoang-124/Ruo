import { RoomBooking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Room } from '../models/Facility.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { BOOKING_STATUSES, NO_SHOW_PENALTY_SCORE, ROOM_STATUSES } from '../config/constants.js';

/**
 * Automated No-Show Sweeper Service
 * Detects expired check-in windows, frees rooms, and applies repute score penalties.
 */
export async function sweepExpiredCheckIns() {
  const now = new Date();

  // Find all approved bookings where check-in deadline has passed
  const expiredBookings = await RoomBooking.find({
    status: BOOKING_STATUSES.APPROVED,
    checkInDeadline: { $lt: now }
  }).populate('user room');

  const processed = [];

  for (const booking of expiredBookings) {
    // 1. Mark booking as NO_SHOW
    booking.status = BOOKING_STATUSES.NO_SHOW;
    booking.noShowMarkedAt = now;
    await booking.save();

    // 2. Free the room if it was occupied
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room._id, { status: ROOM_STATUSES.AVAILABLE });
    }

    // 3. Deduct repute score from user
    if (booking.user) {
      const user = await User.findById(booking.user._id);
      if (user) {
        await user.deductReputeScore(NO_SHOW_PENALTY_SCORE, 'NO_SHOW_PENALTY');

        // 4. Send penalty notification
        await Notification.create({
          user: user._id,
          title: 'Cảnh báo vi phạm: Không Check-in phòng học (No-Show)',
          message: `Đơn mượn phòng ${booking.room ? booking.room.code : ''} vào lúc ${booking.startTime.toLocaleTimeString('vi-VN')} đã bị hủy do quá 15 phút không check-in. Bạn bị trừ ${NO_SHOW_PENALTY_SCORE} điểm uy tín. Điểm hiện tại: ${user.reputeScore}.`,
          type: 'error',
          relatedEntityType: 'RoomBooking',
          relatedEntityId: booking._id.toString()
        });

        // 5. Write immutable SHA-256 Audit Log
        await AuditLog.logAction({
          user: null,
          userDisplay: 'Hệ Thống SLA No-Show Tự Động',
          action: 'BOOKING_AUTO_NO_SHOW',
          entityType: 'RoomBooking',
          entityId: booking._id.toString(),
          diffData: {
            bookingCode: booking.bookingCode,
            userId: user._id.toString(),
            userName: user.fullName,
            scoreDeducted: NO_SHOW_PENALTY_SCORE,
            newScore: user.reputeScore
          }
        });
      }
    }

    processed.push({
      bookingCode: booking.bookingCode,
      roomCode: booking.room ? booking.room.code : 'N/A',
      user: booking.user ? booking.user.fullName : 'N/A'
    });
  }

  return processed;
}
