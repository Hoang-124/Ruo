import mongoose from 'mongoose';

// MaintenancePlan Schema (Module 5: Maintenance & Inventory)
const maintenancePlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  target_type: { 
    type: String, 
    enum: ['room', 'equipment', 'category'], 
    default: 'category',
    required: true 
  },
  target_ids: [{ type: mongoose.Schema.Types.ObjectId }],
  frequency: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'yearly'], 
    default: 'monthly',
    required: true 
  },
  checklist: [{
    item: { type: String, required: true },
    required: { type: Boolean, default: true }
  }],
  next_due: { type: Date, required: true, index: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['active', 'paused'], 
    default: 'active',
    index: true 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

maintenancePlanSchema.index({ status: 1, next_due: 1 });

export const MaintenancePlan = mongoose.model('MaintenancePlan', maintenancePlanSchema);
export default MaintenancePlan;
