import mongoose from 'mongoose';

// Repair Schema (Module 4: Incident & Repair Management)
const repairSchema = new mongoose.Schema({
  ticket_code: { 
    type: String, 
    unique: true, 
    uppercase: true, 
    sparse: true,
    index: true 
  },
  equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  
  // Incident report from Lecturer
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  incident_description: { type: String, required: true },
  incident_images: [{ type: String }],
  reported_at: { type: Date, default: Date.now },
  
  // Technical handling by Maintenance Staff
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  repair_unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairUnit', default: null },
  damage_level: { 
    type: String, 
    enum: ['minor', 'major', 'critical'], 
    default: 'minor' 
  },
  description: { type: String, default: '' },
  images: [{ type: String }],
  repair_location: { 
    type: String, 
    enum: ['on_site', 'external'], 
    default: 'on_site' 
  },
  carried_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  returned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  return_room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  post_repair_warranty: { type: Date, default: null },
  total_cost: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, default: null },
  deadline_status: { 
    type: String, 
    enum: ['on_track', 'at_risk', 'overdue'], 
    default: 'on_track' 
  },
  status: { 
    type: String, 
    enum: ['reported', 'assigned', 'in_progress', 'resolved', 'closed'], 
    default: 'reported',
    index: true 
  },
  
  // Lecturer feedback after resolution
  feedback_rating: { type: Number, min: 1, max: 5, default: null },
  feedback_comment: { type: String, default: null },
  feedback_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  feedback_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Auto generate ticket code if empty
repairSchema.pre('save', function(next) {
  if (!this.ticket_code) {
    this.ticket_code = `REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  }
  next();
});

// Compound indexes
repairSchema.index({ status: 1, deadline: 1 });
repairSchema.index({ reported_by: 1, status: 1 });
repairSchema.index({ assigned_to: 1, status: 1 });
repairSchema.index({ status: 1, feedback_rating: 1 });

// Backwards compatibility virtuals
repairSchema.virtual('reporter').get(function() { return this.reported_by; }).set(function(v) { this.reported_by = v; });
repairSchema.virtual('equipment').get(function() { return this.equipment_id; }).set(function(v) { this.equipment_id = v; });
repairSchema.virtual('title').get(function() { return this.incident_description; }).set(function(v) { this.incident_description = v; });
repairSchema.virtual('ticketCode').get(function() { return this.ticket_code; }).set(function(v) { this.ticket_code = v; });

repairSchema.set('toJSON', { virtuals: true });
repairSchema.set('toObject', { virtuals: true });

export const Repair = mongoose.model('Repair', repairSchema);
export default Repair;
