import mongoose from 'mongoose';

// RepairUnit Schema (Module 2: Master Data)
const repairUnitSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  specialty: { type: String, default: 'Điện tử & Thiết bị viễn thông' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const RepairUnit = mongoose.model('RepairUnit', repairUnitSchema);
export default RepairUnit;
