import mongoose from 'mongoose';

// RepairPart Schema (Module 4: Incident & Repair Management)
const repairPartSchema = new mongoose.Schema({
  repair_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, index: true },
  part_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true, index: true },
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PartsRequest', default: null },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const RepairPart = mongoose.model('RepairPart', repairPartSchema);
export default RepairPart;
