import mongoose from 'mongoose';
import { BOOKING_STATUSES, CHECK_IN_GRACE_PERIOD_MINUTES } from '../config/constants.js';

// Recurring Rule Sub-Schema (RFC-5545 alignment)
const recurringRuleSchema = new mongoose.Schema({
  recurrencePattern: { type: String, enum: ['WEEKLY', 'BIWEEKLY'], default: 'WEEKLY' },
  dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // 1 = Mon ... 7 = Sun
  repeatWeeksCount: { type: Number, default: 15 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
}, { _id: false });

// Escalation Rule Schema
const escalationRuleSchema = new mongoose.Schema({
  ruleCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  conditionType: { 
    type: String, 
    enum: ['OFF_HOURS', 'HIGH_VALUE', 'LARGE_CAPACITY', 'WEEKEND'], 
    required: true 
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const EscalationRule = mongoose.model('EscalationRule', escalationRuleSchema);

// Room Booking Schema
const roomBookingSchema = new mongoose.Schema({
  bookingCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    index: true 
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true, index: true },
  purpose: { type: String, required: true, trim: true },
  participantsCount: { type: Number, default: 1 },
  isRecurring: { type: Boolean, default: false },
  recurringRule: { type: recurringRuleSchema, default: null },
  
  status: { 
    type: String, 
    enum: Object.values(BOOKING_STATUSES), 
    default: BOOKING_STATUSES.PENDING,
    index: true 
  },
  
  // Check-In Security (15-Minute Window via QR Code)
  checkInQrCode: { type: String, default: '' },
  checkInDeadline: { type: Date, required: true },
  checkInTime: { type: Date, default: null },
  noShowMarkedAt: { type: Date, default: null },
  
  // Approvals & Escalations
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  isEscalated: { type: Boolean, default: false },
  escalationReason: { type: String, default: null },
  
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Compound indexes for lightning-fast conflict checks & calendar queries
roomBookingSchema.index({ room: 1, startTime: 1, endTime: 1, status: 1 });
roomBookingSchema.index({ user: 1, status: 1 });
roomBookingSchema.index({ status: 1, checkInDeadline: 1 });

// Static Helper: Check if slot conflicts with existing active bookings
roomBookingSchema.statics.checkConflict = async function (roomId, startTime, endTime, excludeId = null) {
  const activeStatuses = [
    BOOKING_STATUSES.PENDING,
    BOOKING_STATUSES.APPROVED,
    BOOKING_STATUSES.CHECKED_IN
  ];

  const query = {
    room: roomId,
    status: { $in: activeStatuses },
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflicting = await this.findOne(query).populate('user', 'fullName employeeCode email');
  return conflicting;
};

// Method to verify QR Check-In
roomBookingSchema.methods.validateAndCheckIn = async function (scannedQr) {
  const now = new Date();
  
  if (this.status !== BOOKING_STATUSES.APPROVED) {
    throw new Error('Đơn đặt phòng chưa được phê duyệt hoặc đã hết hiệu lực.');
  }

  if (now > this.checkInDeadline) {
    this.status = BOOKING_STATUSES.NO_SHOW;
    this.noShowMarkedAt = now;
    await this.save();
    throw new Error('Đã quá thời hạn check-in 15 phút. Đơn mượn phòng đã bị chuyển sang trạng thái NO-SHOW.');
  }

  if (this.checkInQrCode && scannedQr && this.checkInQrCode !== scannedQr) {
    throw new Error('Mã QR check-in không khớp với phòng học đã duyệt.');
  }

  this.status = BOOKING_STATUSES.CHECKED_IN;
  this.checkInTime = now;
  return await this.save();
};

export const RoomBooking = mongoose.model('RoomBooking', roomBookingSchema);
