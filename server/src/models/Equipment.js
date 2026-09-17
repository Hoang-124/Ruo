import mongoose from 'mongoose';
import { 
  EQUIPMENT_CONDITIONS, 
  EQUIPMENT_STATUSES, 
  DISPOSAL_R_RATIO_THRESHOLD 
} from '../config/constants.js';

// Equipment Category Schema
const equipmentCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  depreciationYears: { type: Number, default: 5 },
  description: { type: String, default: '' }
}, { timestamps: true });

export const EquipmentCategory = mongoose.model('EquipmentCategory', equipmentCategorySchema);

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  taxCode: { type: String, default: '' },
  contactName: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' }
}, { timestamps: true });

export const Supplier = mongoose.model('Supplier', supplierSchema);

// Equipment Schema (Asset with QR and Life-Cycle Economics)
const equipmentSchema = new mongoose.Schema({
  assetCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  qrCodeData: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  serialNumber: { type: String, default: '' },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentCategory', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  
  // Financial & Valuation
  originalPrice: { type: Number, required: true, min: 0 },
  remainingValue: { type: Number, required: true, min: 0 },
  purchaseDate: { type: Date, required: true },
  warrantyExpiry: { type: Date, default: null },
  
  condition: { 
    type: String, 
    enum: Object.values(EQUIPMENT_CONDITIONS), 
    default: EQUIPMENT_CONDITIONS.GOOD,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(EQUIPMENT_STATUSES), 
    default: EQUIPMENT_STATUSES.AVAILABLE,
    index: true 
  },
  repairCount: { type: Number, default: 0 },
  estimatedRepairCost: { type: Number, default: 0, min: 0 },
  
  imageUrl: { type: String, default: '' },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Virtual for R-Ratio: R = (estimatedRepairCost / remainingValue) * 100
equipmentSchema.virtual('rRatio').get(function () {
  if (!this.remainingValue || this.remainingValue <= 0) return 100;
  return Number(((this.estimatedRepairCost / this.remainingValue) * 100).toFixed(2));
});

// Automatic status safeguard: Freeze to pending_disposal when R >= 60%
equipmentSchema.pre('save', function (next) {
  if (this.remainingValue > 0 && this.estimatedRepairCost > 0) {
    const ratio = (this.estimatedRepairCost / this.remainingValue) * 100;
    if (ratio >= DISPOSAL_R_RATIO_THRESHOLD && this.status !== EQUIPMENT_STATUSES.PENDING_DISPOSAL && this.condition !== EQUIPMENT_CONDITIONS.DISPOSED) {
      this.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
      this.condition = EQUIPMENT_CONDITIONS.DAMAGED;
    }
  }
  next();
});

equipmentSchema.set('toJSON', { virtuals: true });
equipmentSchema.set('toObject', { virtuals: true });

export const Equipment = mongoose.model('Equipment', equipmentSchema);
