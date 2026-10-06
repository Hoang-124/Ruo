import mongoose from 'mongoose';

// Disposal Schema (Module 3: Equipment Management)
const disposalSchema = new mongoose.Schema({
  equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  proposed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  staff_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  admin_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  current_step: { type: Number, default: 1, min: 1, max: 5 },
  reason: { type: String, required: true },
  decision_number: { type: String, default: '' },
  recovery_value: { type: Number, default: 0, min: 0 },
  procurement_plan: { type: String, default: '' },
  replacement_equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
  status: { 
    type: String, 
    enum: ['proposed', 'staff_reviewing', 'admin_reviewing', 'procuring', 'completed'], 
    default: 'proposed',
    index: true 
  },
  proposed_at: { type: Date, default: Date.now },
  staff_approved_at: { type: Date, default: null },
  admin_approved_at: { type: Date, default: null },
  completed_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

disposalSchema.index({ status: 1, proposed_at: -1 });

export const Disposal = mongoose.model('Disposal', disposalSchema);
export const DisposalProposal = Disposal;
export default Disposal;
