import mongoose from 'mongoose';

// InventorySession Schema (Module 5: Maintenance & Inventory)
const inventorySessionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  scope_type: { 
    type: String, 
    enum: ['building', 'floor', 'room', 'all'], 
    default: 'building',
    required: true 
  },
  scope_floor: { type: Number, min: 1, max: 5, default: null },
  scope_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['draft', 'in_progress', 'completed', 'reconciled'], 
    default: 'draft',
    index: true 
  },
  summary: {
    matched: { type: Number, default: 0 },
    wrong_location: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    missing: { type: Number, default: 0 }
  },
  completed_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const InventorySession = mongoose.model('InventorySession', inventorySessionSchema);
export default InventorySession;
