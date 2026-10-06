import mongoose from 'mongoose';

// Category Schema (Module 2: Master Data)
const categorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  depreciationYears: { type: Number, default: 5 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const Category = mongoose.model('Category', categorySchema);
export const EquipmentCategory = Category;
export default Category;
