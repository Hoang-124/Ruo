import mongoose from 'mongoose';

// Category Schema (Module 2: Master Data)
const categorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 2, maxlength: 32, match: /^[A-Z0-9][A-Z0-9_-]{1,31}$/, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  depreciation_rate: { type: Number, default: 20, min: 0, max: 100 },
  depreciationYears: { type: Number, default: 5 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const Category = mongoose.model('Category', categorySchema);
export const EquipmentCategory = Category;
export default Category;
