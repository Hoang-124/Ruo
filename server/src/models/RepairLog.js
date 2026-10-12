import mongoose from 'mongoose';

// RepairLog Schema (Module 4: Incident & Repair Management)
const repairLogSchema = new mongoose.Schema({
  repair_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, index: true },
  action: { 
    type: String, 
    enum: ['reported', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated'], 
    required: true 
  },
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  cost: { type: Number, default: 0, min: 0 },
  parts_used: [{
    part_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart' },
    quantity: { type: Number, default: 1 }
  }],
  images: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: false } 
});

repairLogSchema.index({ repair_id: 1, timestamp: -1 });

export const RepairLog = mongoose.model('RepairLog', repairLogSchema);
export default RepairLog;
