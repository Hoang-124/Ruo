import mongoose from 'mongoose';
import { DISPOSAL_STATUSES } from '../config/constants.js';

// Disposal Schema (Module 3: Equipment, Movement & Disposal)
// Conforming to dbdiagram.dbml: disposals collection (4 canonical states: proposed | approved | rejected | completed)
const disposalSchema = new mongoose.Schema({
  equipment_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    required: true, 
    index: true 
  },
  repair_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repair',
    default: null,
    index: true
  },
  proposed_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  approved_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  reason: { 
    type: String, 
    required: true 
  },
  reject_reason: { 
    type: String, 
    default: '' 
  },
  decision_number: { 
    type: String, 
    default: '' 
  },
  recovery_value: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  status: { 
    type: String, 
    enum: Object.values(DISPOSAL_STATUSES), 
    default: DISPOSAL_STATUSES.PROPOSED,
    index: true 
  },
  proposed_at: { 
    type: Date, 
    default: Date.now 
  },
  approved_at: { 
    type: Date, 
    default: null 
  },
  completed_at: {
    type: Date,
    default: null
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Backward compatibility virtuals
disposalSchema.virtual('admin_approved_by').get(function() { return this.approved_by; }).set(function(v) { this.approved_by = v; });
disposalSchema.virtual('admin_approved_at').get(function() { return this.approved_at; }).set(function(v) { this.approved_at = v; });

disposalSchema.set('toJSON', { virtuals: true });
disposalSchema.set('toObject', { virtuals: true });

disposalSchema.index({ status: 1, proposed_at: -1 });

export const Disposal = mongoose.models.Disposal || mongoose.model('Disposal', disposalSchema);
export default Disposal;
