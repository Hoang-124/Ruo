import mongoose from 'mongoose';
import { ROOM_TYPES, ROOM_STATUSES } from '../config/constants.js';

// Building Schema
const buildingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  campusZone: { type: String, default: 'Khu A' },
  totalFloors: { type: Number, default: 5 },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Building = mongoose.model('Building', buildingSchema);

// Floor Schema
const floorSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floorNumber: { type: Number, required: true },
  name: { type: String, required: true },
  floorPlanSvg: { type: String, default: '' } // Raw SVG / Path geometry for CAD 2.5D
}, { timestamps: true });

floorSchema.index({ building: 1, floorNumber: 1 }, { unique: true });

export const Floor = mongoose.model('Floor', floorSchema);

// Room Sensor Sub-Schema
const roomSensorSchema = new mongoose.Schema({
  sensorCode: { type: String, required: true },
  sensorType: { 
    type: String, 
    required: true, 
    enum: ['temperature', 'humidity', 'occupancy_counter', 'power_meter'] 
  },
  currentValue: { type: Number, required: true },
  unit: { type: String, required: true },
  batteryLevel: { type: Number, default: 100 },
  lastPingAt: { type: Date, default: Date.now }
}, { _id: false });

// Room Schema (Spatial Digital Twin Unit)
const roomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  floorNumber: { type: Number, required: true, index: true }, // Denormalized for fast filtering
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  type: { 
    type: String, 
    enum: Object.values(ROOM_TYPES), 
    default: ROOM_TYPES.THEORY,
    index: true 
  },
  capacity: { type: Number, required: true, min: 1, index: true },
  areaSqm: { type: Number, default: 60 },
  status: { 
    type: String, 
    enum: Object.values(ROOM_STATUSES), 
    default: ROOM_STATUSES.AVAILABLE,
    index: true 
  },
  powerKw: { type: Number, default: 0 },
  cadCoordinates: {
    gridX: { type: Number, default: 0 },
    gridY: { type: Number, default: 0 },
    spanCols: { type: Number, default: 1 },
    spanRows: { type: Number, default: 1 },
    svgPath: { type: String, default: '' }
  },
  sensors: [roomSensorSchema],
  imageUrl: { type: String, default: '' },
  bookingRules: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

roomSchema.index({ building: 1, floorNumber: 1, status: 1 });
roomSchema.index({ type: 1, capacity: 1 });

export const Room = mongoose.model('Room', roomSchema);
