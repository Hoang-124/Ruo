import mongoose from 'mongoose';

// SparePart Schema (Module 2: Master Data)
const sparePartSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, default: 0, min: 0 },
  min_stock: { type: Number, required: true, default: 5, min: 0 },
  price: { type: Number, required: true, default: 0, min: 0 },
  unit: { type: String, default: 'Cái' },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

sparePartSchema.index({ name: 'text', code: 'text' });

export const SparePart = mongoose.model('SparePart', sparePartSchema);
export default SparePart;
