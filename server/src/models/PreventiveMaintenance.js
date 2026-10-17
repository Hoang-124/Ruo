import mongoose from 'mongoose';

// PreventiveMaintenance Schema (Module 11: Preventive Maintenance)
// Conforming to normalized dbdiagram.dbml: preventive_maintenance table
const preventiveMaintenanceSchema = new mongoose.Schema({
  equipment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  checked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  check_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['passed', 'failed'],
    default: 'passed',
    index: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

export const PreventiveMaintenance = mongoose.models.PreventiveMaintenance || mongoose.model('PreventiveMaintenance', preventiveMaintenanceSchema);
export default PreventiveMaintenance;
