import mongoose from 'mongoose';
import { 
  TICKET_PRIORITIES, 
  TICKET_STATUSES, 
  SLA_STATES 
} from '../config/constants.js';

// SLA Configuration Schema
const slaConfigSchema = new mongoose.Schema({
  priority: { 
    type: String, 
    required: true, 
    unique: true, 
    enum: Object.values(TICKET_PRIORITIES) 
  },
  responseTimeMinutes: { type: Number, required: true }, // Max minutes to accept
  resolutionTimeMinutes: { type: Number, required: true }, // Max minutes to resolve
  businessHoursOnly: { type: Boolean, default: true },
  autoEscalateAfterMinutes: { type: Number, default: 120 }
}, { timestamps: true });

export const SlaConfig = mongoose.model('SlaConfig', slaConfigSchema);

// SLA Tracking Sub-Schema
const slaTrackingSchema = new mongoose.Schema({
  slaStartTime: { type: Date, default: Date.now },
  responseDeadline: { type: Date, required: true },
  resolutionDeadline: { type: Date, required: true },
  actualResponseTime: { type: Date, default: null },
  actualResolutionTime: { type: Date, default: null },
  state: { 
    type: String, 
    enum: Object.values(SLA_STATES), 
    default: SLA_STATES.ON_TRACK,
    index: true 
  },
  remainingMinutes: { type: Number, default: 0 },
  isEscalated: { type: Boolean, default: false },
  escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  escalatedAt: { type: Date, default: null }
}, { _id: false });

// Incident Schema
const incidentSchema = new mongoose.Schema({
  ticketCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    index: true 
  },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: { 
    type: String, 
    enum: Object.values(TICKET_PRIORITIES), 
    default: TICKET_PRIORITIES.MEDIUM,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(TICKET_STATUSES), 
    default: TICKET_STATUSES.OPEN,
    index: true 
  },
  images: [{ type: String }],
  slaTracking: { type: slaTrackingSchema, required: true },
  
  evaluationScore: { type: Number, min: 1, max: 5, default: null },
  evaluationComment: { type: String, default: null },
  
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

incidentSchema.index({ status: 1, priority: 1 });

export const Incident = mongoose.model('Incident', incidentSchema);

// Incident Comment Schema (Two-way communication)
const incidentCommentSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  attachments: [{ type: String }]
}, { timestamps: true });

export const IncidentComment = mongoose.model('IncidentComment', incidentCommentSchema);

// Maintenance Ticket Schema
const maintenanceTicketSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, unique: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['reactive', 'preventive'], default: 'reactive' },
  status: { 
    type: String, 
    enum: Object.values(TICKET_STATUSES), 
    default: TICKET_STATUSES.ASSIGNED 
  },
  rootCause: { type: String, default: '' },
  resolution: { type: String, default: '' },
  partsUsed: [{
    partName: String,
    quantity: Number,
    unitPrice: Number
  }],
  laborCost: { type: Number, default: 0 },
  materialCost: { type: Number, default: 0 },
  totalRepairCost: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

export const MaintenanceTicket = mongoose.model('MaintenanceTicket', maintenanceTicketSchema);
