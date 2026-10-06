import mongoose from 'mongoose';
import { DISPOSAL_STATUSES } from '../config/constants.js';

// Disposal Schema (Module 3: RACI 5-Step Asset Disposal Flow)
const disposalSchema = new mongoose.Schema({
  equipment_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    required: true, 
    index: true 
  },
  proposed_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  manager_approved_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  admin_approved_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  received_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  current_step: { 
    type: Number, 
    default: 1, 
    min: 1, 
    max: 5 
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
  procurement_plan: { 
    type: String, 
    default: '' 
  },
  replacement_equipment_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    default: null 
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
  manager_approved_at: { 
    type: Date, 
    default: null 
  },
  admin_approved_at: { 
    type: Date, 
    default: null 
  },
  received_at: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

disposalSchema.index({ status: 1, proposed_at: -1 });

export const Disposal = mongoose.model('Disposal', disposalSchema);
export default Disposal;
