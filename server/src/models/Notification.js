import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['success', 'warning', 'info', 'error'], 
    default: 'info' 
  },
  isRead: { type: Boolean, default: false },
  relatedEntityType: { type: String, default: null }, // 'RoomBooking', 'Incident', 'DisposalProposal'
  relatedEntityId: { type: String, default: null }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
