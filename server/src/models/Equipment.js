import mongoose from 'mongoose';
import { DISPOSAL_R_RATIO_THRESHOLD } from '../config/constants.js';

// Equipment Schema (Module 3: Equipment Management)
const equipmentSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  qr_code: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  serial_number: { type: String, default: '' },
  name: { type: String, required: true, trim: true },
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  
  price: { type: Number, required: true, min: 0, default: 0 },
  purchase_date: { type: Date, required: true, default: Date.now },
  warranty_expiry: { type: Date, default: null },
  warranty_status: { 
    type: String, 
    enum: ['active', 'expired', 'extended'], 
    default: 'active',
    index: true 
  },
  images: [{ type: String }],
  depreciation_rate: { type: Number, default: 20 }, // 20% / year
  
  status: { 
    type: String, 
    enum: ['active', 'repairing', 'disposed', 'transferring', 'lost'], 
    default: 'active',
    index: true 
  },
  
  // Repair economics
  repair_count: { type: Number, default: 0 },
  estimated_repair_cost: { type: Number, default: 0, min: 0 },
  remaining_value: { type: Number, default: 0, min: 0 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Compound indexes
equipmentSchema.index({ room_id: 1, status: 1 });
equipmentSchema.index({ warranty_status: 1, warranty_expiry: 1 });
equipmentSchema.index({ name: 'text', code: 'text', serial_number: 'text' });

// Backwards compatibility virtuals
equipmentSchema.virtual('assetCode').get(function() { return this.code; }).set(function(v) { this.code = v; });
equipmentSchema.virtual('qrCodeData').get(function() { return this.qr_code; }).set(function(v) { this.qr_code = v; });
equipmentSchema.virtual('category').get(function() { return this.category_id; }).set(function(v) { this.category_id = v; });
equipmentSchema.virtual('room').get(function() { return this.room_id; }).set(function(v) { this.room_id = v; });
equipmentSchema.virtual('supplier').get(function() { return this.supplier_id; }).set(function(v) { this.supplier_id = v; });
equipmentSchema.virtual('originalPrice').get(function() { return this.price; }).set(function(v) { this.price = v; });
equipmentSchema.virtual('remainingValue').get(function() { 
  if (this.remaining_value) return this.remaining_value;
  // Calculate default straight-line depreciation
  const yearsPassed = (Date.now() - new Date(this.purchase_date).getTime()) / (365.25 * 24 * 3600 * 1000);
  const depFraction = Math.min(1, Math.max(0, (yearsPassed * (this.depreciation_rate || 20)) / 100));
  return Math.round(this.price * (1 - depFraction));
}).set(function(v) { this.remaining_value = v; });

// Virtual for R-Ratio: R = (estimatedRepairCost / remainingValue) * 100
equipmentSchema.virtual('rRatio').get(function () {
  const rem = this.remainingValue || this.remaining_value;
  const rep = this.estimated_repair_cost;
  if (!rem || rem <= 0) return 100;
  return Number(((rep / rem) * 100).toFixed(2));
});

equipmentSchema.set('toJSON', { virtuals: true });
equipmentSchema.set('toObject', { virtuals: true });

export const Equipment = mongoose.model('Equipment', equipmentSchema);

// Backwards compatibility re-exports
export { Category, EquipmentCategory } from './Category.js';
export { Supplier } from './Supplier.js';

export default Equipment;
