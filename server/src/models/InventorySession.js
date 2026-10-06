import mongoose from 'mongoose';

// InventorySession Schema (Module 5: Maintenance & Inventory)
const inventorySessionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  scope_type: { 
    type: String, 
    enum: ['building', 'floor', 'room', 'all'], 
    default: 'room',
    required: true 
  },
  scope_ids: [{ type: mongoose.Schema.Types.ObjectId }],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['draft', 'in_progress', 'completed', 'reconciled'], 
    default: 'draft',
    index: true 
  },
  completed_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const InventorySession = mongoose.model('InventorySession', inventorySessionSchema);
export default InventorySession;
