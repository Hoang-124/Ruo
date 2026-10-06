import mongoose from 'mongoose';

// Building Schema
const buildingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  campusZone: { type: String, default: 'Khu A' },
  totalFloors: { type: Number, default: 5 },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Building = mongoose.model('Building', buildingSchema);

// Floor Schema
const floorSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floorNumber: { type: Number, required: true },
  name: { type: String, required: true },
  floorPlanSvg: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

floorSchema.index({ building: 1, floorNumber: 1 }, { unique: true });
export const Floor = mongoose.model('Floor', floorSchema);

// Room Schema (Module 2: Master Data & Spatial Digital Twin Unit)
const roomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  building: { type: String, default: 'A1', index: true },
  floor: { type: Number, default: 1, index: true },
  room_type: { 
    type: String, 
    enum: ['lecture', 'lab', 'office', 'storage', 'theory', 'practice'], 
    default: 'lecture',
    index: true 
  },
  capacity: { type: Number, required: true, min: 1, default: 50 },
  area: { type: Number, default: 60 },
  layout_image: { type: String, default: '' },
  department: { type: String, default: 'Khoa Công Nghệ Thông Tin' },
  status: { 
    type: String, 
    enum: ['available', 'maintenance', 'inactive'], 
    default: 'available',
    index: true 
  },
  cadCoordinates: {
    gridX: { type: Number, default: 0 },
    gridY: { type: Number, default: 0 },
    spanCols: { type: Number, default: 1 },
    spanRows: { type: Number, default: 1 },
    svgPath: { type: String, default: '' }
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

roomSchema.index({ building: 1, floor: 1, status: 1 });
roomSchema.index({ name: 'text', code: 'text' });

export const Room = mongoose.model('Room', roomSchema);
export default Room;
