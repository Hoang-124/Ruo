import mongoose from 'mongoose';
import { REPAIR_STATUSES, REPAIR_PRIORITIES, SLA_STATES } from '../config/constants.js';

// Repair Schema (Module 4: Incident & Repair Management)
const repairSchema = new mongoose.Schema({
  ticket_code: { 
    type: String, 
    unique: true, 
    uppercase: true, 
    sparse: true,
    index: true 
  },
  equipment_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    required: true, 
    index: true 
  },
  reported_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  incident_description: { 
    type: String, 
    required: true 
  },
  incident_images: [{ type: String }],
  reported_at: { 
    type: Date, 
    default: Date.now 
  },
  
  // Technical Handling
  assigned_to: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null, 
    index: true 
  },
  repair_unit_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RepairUnit', 
    default: null 
  },
  damage_level: { 
    type: String, 
    enum: Object.values(REPAIR_PRIORITIES), 
    default: REPAIR_PRIORITIES.MINOR 
  },
  description: { 
    type: String, 
    default: '' 
  },
  images: [{ type: String }],
  repair_location: { 
    type: String, 
    enum: ['on_site', 'external'], 
    default: 'on_site' 
  },
  carried_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  returned_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  return_room_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    default: null 
  },
  post_repair_warranty: { 
    type: Date, 
    default: null 
  },
  total_cost: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  deadline: { 
    type: Date, 
    default: null 
  },
  deadline_status: { 
    type: String, 
    enum: Object.values(SLA_STATES), 
    default: SLA_STATES.ON_TRACK 
  },
  status: { 
    type: String, 
    enum: Object.values(REPAIR_STATUSES), 
    default: REPAIR_STATUSES.REPORTED,
    index: true 
  },
  resolved_at: { 
    type: Date, 
    default: null 
  },
  closed_at: { 
    type: Date, 
    default: null 
  },
  closed_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Auto-generate ticket code if not provided
repairSchema.pre('save', function (next) {
  if (!this.ticket_code) {
    this.ticket_code = `REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  }
  next();
});

// Compound indexes
repairSchema.index({ status: 1, deadline: 1 });
repairSchema.index({ reported_by: 1, status: 1 });
repairSchema.index({ assigned_to: 1, status: 1 });

export const Repair = mongoose.model('Repair', repairSchema);
export default Repair;
