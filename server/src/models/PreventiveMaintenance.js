import mongoose from 'mongoose';

// Inspection records created from recurring maintenance plans.
const preventiveMaintenanceSchema = new mongoose.Schema({
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenancePlan',
    default: null,
    index: true
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  equipment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    default: null,
    index: true
  },
  cycle_start: { type: Date, default: null, index: true },
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
  },
  checklist_results: [{
    item: { type: String, required: true },
    passed: { type: Boolean, required: true },
    notes: { type: String, default: '' }
  }],
  repair_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repair',
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

preventiveMaintenanceSchema.index(
  { plan_id: 1, equipment_id: 1, cycle_start: 1 },
  { unique: true, partialFilterExpression: { plan_id: { $type: 'objectId' }, cycle_start: { $type: 'date' } } }
);
preventiveMaintenanceSchema.index({ room_id: 1, check_date: -1 });

export const PreventiveMaintenance = mongoose.models.PreventiveMaintenance || mongoose.model('PreventiveMaintenance', preventiveMaintenanceSchema);
export default PreventiveMaintenance;
