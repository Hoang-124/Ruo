import mongoose from 'mongoose';

// RepairUnit Schema (Module 2: Master Data)
const repairUnitSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 2, maxlength: 32, match: /^[A-Z0-9][A-Z0-9_-]{1,31}$/, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
  specialty: { type: String, default: 'Điện tử & Thiết bị viễn thông', maxlength: 250 },
  contact_person: { type: String, default: '', maxlength: 120 },
  phone: { type: String, default: '', maxlength: 20, match: /^(?:\+?[0-9][0-9\s().-]{5,18}[0-9])?$/ },
  email: { type: String, default: '', maxlength: 254, match: /^(?:[^\s@]+@[^\s@]+\.[^\s@]+)?$/ },
  address: { type: String, default: '', maxlength: 250 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const RepairUnit = mongoose.model('RepairUnit', repairUnitSchema);
export default RepairUnit;
