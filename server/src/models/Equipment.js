import mongoose from 'mongoose';
import { EQUIPMENT_STATUSES } from '../config/constants.js';

// Equipment Schema (Module 3: Equipment Management)
// Conforming to dbdiagram.dbml: equipment collection
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
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  serial_number: { 
    type: String, 
    default: '' 
  },
  brand: { 
    type: String, 
    default: '' 
  },
  model: { 
    type: String, 
    default: '' 
  },
  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true, 
    index: true 
  },
  room_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    default: null, 
    index: true 
  },
  supplier_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier', 
    default: null 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  purchase_date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  warranty_expiry: { 
    type: Date, 
    default: null 
  },
  warranty_status: { 
    type: String, 
    enum: ['active', 'expired', 'extended'], 
    default: 'active',
    index: true 
  },
  images: [{ type: String }],
  depreciation_rate: { 
    type: Number, 
    default: 20 // 20% per year
  },
  status: { 
    type: String, 
    enum: Object.values(EQUIPMENT_STATUSES), 
    default: EQUIPMENT_STATUSES.IN_STOCK,
    index: true 
  },
  specs: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  repair_count: { 
    type: Number, 
    default: 0 
  },
  estimated_repair_cost: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  remaining_value: { 
    type: Number, 
    default: 0, 
    min: 0 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Compound indexes
equipmentSchema.index({ room_id: 1, status: 1 });
equipmentSchema.index({ warranty_status: 1, warranty_expiry: 1 });
equipmentSchema.index({ name: 'text', code: 'text', serial_number: 'text' });

// Virtual for dynamic remaining value based on straight-line depreciation
equipmentSchema.virtual('computed_remaining_value').get(function () {
  if (this.remaining_value && this.remaining_value > 0) {
    return this.remaining_value;
  }
  const yearsPassed = (Date.now() - new Date(this.purchase_date).getTime()) / (365.25 * 24 * 3600 * 1000);
  const depFraction = Math.min(1, Math.max(0, (yearsPassed * (this.depreciation_rate || 20)) / 100));
  return Math.round(this.price * (1 - depFraction));
});

// Virtual for R-Ratio: R = (estimated_repair_cost / remaining_value) * 100
equipmentSchema.virtual('rRatio').get(function () {
  const rem = this.remaining_value || this.computed_remaining_value;
  const rep = this.estimated_repair_cost || 0;
  if (!rem || rem <= 0) return rep > 0 ? 100 : 0;
  return Number(((rep / rem) * 100).toFixed(2));
});

// Virtual aliases for compatibility with legacy callers
equipmentSchema.virtual('assetCode').get(function () {
  return this.code;
}).set(function (val) {
  this.code = val;
});

equipmentSchema.virtual('qrCodeData').get(function () {
  return this.qr_code;
}).set(function (val) {
  this.qr_code = val;
});

equipmentSchema.set('toJSON', { virtuals: true });
equipmentSchema.set('toObject', { virtuals: true });

export const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', equipmentSchema);
export default Equipment;
