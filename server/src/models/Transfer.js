import mongoose from 'mongoose';

// Transfer Schema (Module 3: Equipment Management)
const transferSchema = new mongoose.Schema({
  equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  from_room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  to_room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, required: true },
  reject_reason: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'completed'], 
    default: 'pending',
    index: true 
  },
  approved_at: { type: Date, default: null },
  completed_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

transferSchema.index({ status: 1, created_at: -1 });

export const Transfer = mongoose.model('Transfer', transferSchema);
export default Transfer;
