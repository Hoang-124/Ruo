import mongoose from 'mongoose';

// Supplier Schema (Module 2: Master Data)
const supplierSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  contact: { type: String, default: '' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
