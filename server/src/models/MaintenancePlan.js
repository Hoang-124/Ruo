import mongoose from 'mongoose';

const maintenancePlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  building: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  floor: { type: Number, required: true, min: 1, max: 100, validate: Number.isInteger },
  room_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }],
  category_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  frequency: { type: String, enum: ['monthly', 'quarterly'], required: true },
  start_date: { type: Date, required: true },
  checklist: [{ type: String, trim: true, minlength: 2, maxlength: 160 }],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  is_active: { type: Boolean, default: true, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

maintenancePlanSchema.index({ building: 1, floor: 1, is_active: 1 });

export const MaintenancePlan = mongoose.models.MaintenancePlan || mongoose.model('MaintenancePlan', maintenancePlanSchema);
export default MaintenancePlan;
