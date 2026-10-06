import mongoose from 'mongoose';
import { Repair } from './Repair.js';

export { Repair, Repair as Incident };

// Incident Comment compatibility model (Module 4)
const incidentCommentSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  attachments: [{ type: String }]
}, { timestamps: true });

export const IncidentComment = mongoose.models.IncidentComment || mongoose.model('IncidentComment', incidentCommentSchema);

// Maintenance Ticket compatibility model (Module 4)
const maintenanceTicketSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, unique: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['reactive', 'preventive'], default: 'reactive' },
  status: { type: String, default: 'assigned' },
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

export const MaintenanceTicket = mongoose.models.MaintenanceTicket || mongoose.model('MaintenanceTicket', maintenanceTicketSchema);

export default Repair;
