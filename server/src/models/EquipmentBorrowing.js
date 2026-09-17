import mongoose from 'mongoose';
import { EQUIPMENT_CONDITIONS } from '../config/constants.js';

const equipmentBorrowingSchema = new mongoose.Schema({
  borrowCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    index: true 
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  roomBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomBooking', default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  returnTime: { type: Date, default: null },
  purpose: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'borrowed', 'returned', 'rejected', 'extended', 'overdue'],
    default: 'pending',
    index: true 
  },
  
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  
  conditionBefore: { 
    type: String, 
    enum: Object.values(EQUIPMENT_CONDITIONS), 
    default: EQUIPMENT_CONDITIONS.GOOD 
  },
  conditionAfter: { 
    type: String, 
    enum: Object.values(EQUIPMENT_CONDITIONS), 
    default: null 
  },
  
  handoverNotes: { type: String, default: '' },
  isEscalated: { type: Boolean, default: false },
  escalationReason: { type: String, default: null },
  
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

equipmentBorrowingSchema.index({ equipment: 1, startTime: 1, endTime: 1 });

export const EquipmentBorrowing = mongoose.model('EquipmentBorrowing', equipmentBorrowingSchema);
