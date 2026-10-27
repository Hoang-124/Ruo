import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['repairs', 'approvals', 'deadlines', 'auth', 'disposals', 'general'],
      default: 'general'
    },
    subject: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    badge_text: {
      type: String,
      default: 'THÔNG BÁO'
    },
    badge_color: {
      type: String,
      default: '#2563EB'
    },
    badge_bg: {
      type: String,
      default: '#EFF6FF'
    },
    is_customized: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;
