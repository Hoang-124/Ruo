import mongoose from 'mongoose';
import { MOVEMENT_TYPES, MOVEMENT_STATUSES } from '../config/constants.js';

// EquipmentMovement Schema (Module 3: Equipment, Movement & Disposal)
// Conforming to dbdiagram.dbml: equipment_movements collection
const equipmentMovementSchema = new mongoose.Schema({
  equipment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(MOVEMENT_TYPES),
    required: true,
    index: true
  },
  from_room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  to_room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  repair_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repair',
    default: null,
    index: true
  },
  ordered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: Object.values(MOVEMENT_STATUSES),
    default: MOVEMENT_STATUSES.PENDING,
    index: true
  },
  completed_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

equipmentMovementSchema.index({ equipment_id: 1, status: 1 });
equipmentMovementSchema.index({ ordered_by: 1, created_at: -1 });

export const EquipmentMovement = mongoose.models.EquipmentMovement || mongoose.model('EquipmentMovement', equipmentMovementSchema);

// Backward compatibility alias for Transfer if imported by legacy code
export const Transfer = EquipmentMovement;

export default EquipmentMovement;
