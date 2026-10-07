import mongoose from 'mongoose';
import { 
  REPAIR_STATUSES, 
  DAMAGE_LEVELS, 
  REPAIR_SOURCES, 
  REPAIR_OUTCOMES 
} from '../config/constants.js';

// Repair Schema (Module 4: Incident & Repair Management)
// Conforming to dbdiagram.dbml: repairs collection
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
  source: {
    type: String,
    enum: Object.values(REPAIR_SOURCES),
    default: REPAIR_SOURCES.LECTURER_REPORT,
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
  
  // Assignment & Technical Handling
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assigned_to: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null, 
    index: true 
  },
  replacement_equipment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    default: null
  },
  repair_unit_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RepairUnit', 
    default: null 
  },
  damage_level: { 
    type: String, 
    enum: Object.values(DAMAGE_LEVELS), 
    default: DAMAGE_LEVELS.MINOR 
  },
  description: { 
    type: String, 
    default: '' 
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
  outcome: {
    type: String,
    enum: Object.values(REPAIR_OUTCOMES),
    default: null
  },
  destination_room_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    default: null 
  },
  status: { 
    type: String, 
    enum: Object.values(REPAIR_STATUSES), 
    default: REPAIR_STATUSES.REPORTED,
    index: true 
  },
  
  // Lecturer Post-Repair Feedback (1-5 stars)
  feedback_rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback_comment: {
    type: String,
    default: ''
  },
  feedback_at: {
    type: Date,
    default: null
  },

  resolved_at: { 
    type: Date, 
    default: null 
  },
  closed_at: { 
    type: Date, 
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

export const Repair = mongoose.models.Repair || mongoose.model('Repair', repairSchema);
export default Repair;
