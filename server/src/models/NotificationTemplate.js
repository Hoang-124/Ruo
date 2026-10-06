import mongoose from 'mongoose';

// NotificationTemplate Schema (Module 6: System & Governance)
const notificationTemplateSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    enum: [
      'incident_reported', 'repair_assigned', 'repair_resolved', 'repair_closed',
      'feedback_requested', 'transfer_approval', 'warranty_alert', 'deadline_warning', 'disposal_step'
    ] 
  },
  subject: { type: String, required: true },
  body_html: { type: String, required: true },
  placeholders: [{ type: String }],
  is_active: { type: Boolean, default: true },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export default NotificationTemplate;
