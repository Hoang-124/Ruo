import mongoose from 'mongoose';

// MaintenanceLog Schema (Module 5: Maintenance & Inventory)
const maintenanceLogSchema = new mongoose.Schema({
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenancePlan', required: true, index: true },
  equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  checked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  check_date: { type: Date, default: Date.now },
  checklist_results: [{
    item: { type: String, required: true },
    passed: { type: Boolean, default: true },
    note: { type: String, default: '' }
  }],
  status: { 
    type: String, 
    enum: ['passed', 'failed', 'needs_repair'], 
    default: 'passed',
    index: true 
  },
  auto_repair_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', default: null },
  notes: { type: String, default: '' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);
export default MaintenanceLog;
