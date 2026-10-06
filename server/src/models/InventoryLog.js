import mongoose from 'mongoose';

// InventoryLog Schema (Module 5: Maintenance & Inventory)
const inventoryLogSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySession', required: true, index: true },
  equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  scanned_room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  scanned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scanned_at: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['matched', 'missing', 'damaged', 'wrong_location'], 
    default: 'matched',
    index: true 
  },
  note: { type: String, default: '' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: false } 
});

inventoryLogSchema.index({ session_id: 1, equipment_id: 1 }, { unique: true });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
export default InventoryLog;
