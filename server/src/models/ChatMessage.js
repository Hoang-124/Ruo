import mongoose from 'mongoose';

// ChatMessage Schema (Module: Operational & Contextual Messaging)
// 100% Persisted in MongoDB: chat_messages collection
const chatMessageSchema = new mongoose.Schema({
  channel_type: {
    type: String,
    enum: ['ticket', 'operations', 'ai_copilot'],
    required: true,
    index: true
  },
  conversation_id: {
    type: String,
    required: true,
    index: true
  },
  repair_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repair',
    default: null,
    index: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  sender_name: {
    type: String,
    required: true,
    trim: true
  },
  sender_role: {
    type: String,
    enum: ['lecturer', 'technician', 'facility_manager', 'admin', 'system', 'ai'],
    required: true
  },
  sender_avatar: {
    type: String,
    default: ''
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  message_type: {
    type: String,
    enum: ['text', 'image', 'system_event', 'action_card', 'ai_card'],
    default: 'text'
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachment_url: {
    type: String,
    default: ''
  },
  action_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  read_by: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    read_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

chatMessageSchema.index({ channel_type: 1, conversation_id: 1, created_at: 1 });
chatMessageSchema.index({ repair_id: 1, created_at: 1 });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
