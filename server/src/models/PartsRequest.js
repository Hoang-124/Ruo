import mongoose from 'mongoose';

// PartsRequest Schema (Module 4: Incident & Repair Management)
const partsRequestSchema = new mongoose.Schema({
  repair_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, index: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [{
    part_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, default: 0 }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true 
  },
  reject_reason: { type: String, default: '' },
  approved_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const PartsRequest = mongoose.model('PartsRequest', partsRequestSchema);
export default PartsRequest;
