import mongoose from 'mongoose';

// Notification Schema (Module 6: System & Governance)
const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: [
      'incident_reported', 'repair_assigned', 'repair_resolved', 'repair_closed', 
      'transfer_approval', 'warranty_expiring', 'deadline_overdue', 'parts_approved', 
      'disposal_step', 'feedback_requested', 'info', 'warning', 'success', 'error'
    ], 
    default: 'info',
    index: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  reference_type: { 
    type: String, 
    enum: ['repair', 'transfer', 'disposal', 'equipment', 'parts_request', 'room', null], 
    default: null 
  },
  reference_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  is_read: { type: Boolean, default: false, index: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

// Backwards compatibility virtuals
notificationSchema.virtual('user').get(function() { return this.user_id; }).set(function(v) { this.user_id = v; });
notificationSchema.virtual('isRead').get(function() { return this.is_read; }).set(function(v) { this.is_read = v; });
notificationSchema.virtual('relatedEntityType').get(function() { return this.reference_type; }).set(function(v) { this.reference_type = v; });
notificationSchema.virtual('relatedEntityId').get(function() { return this.reference_id; }).set(function(v) { this.reference_id = v; });

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
