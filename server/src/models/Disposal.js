import mongoose from 'mongoose';
import { DISPOSAL_STATUSES } from '../config/constants.js';

// Step progress sub-schema
const disposalStepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true, min: 1, max: 5 },
  stepName: { type: String, required: true },
  responsibleRole: { type: String, required: true }, // e.g., 'facility_staff', 'maintenance', 'academic_affairs', 'admin'
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'rejected', 'skipped'], 
    default: 'pending' 
  },
  notes: { type: String, default: '' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completedAt: { type: Date, default: null }
}, { _id: false });

// Committee Vote sub-schema
const committeeVoteSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true }, // 'chair', 'technical_expert', 'finance_officer', 'secretary'
  vote: { type: String, enum: ['pending', 'approve', 'reject', 'abstain'], default: 'pending' },
  comment: { type: String, default: '' },
  votedAt: { type: Date, default: null }
}, { _id: false });

// Disposal Proposal Schema
const disposalProposalSchema = new mongoose.Schema({
  proposalCode: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    index: true 
  },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  repairCost: { type: Number, required: true },
  remainingValue: { type: Number, required: true },
  rRatio: { type: Number, required: true, index: true }, // R = (repairCost / remainingValue) * 100
  
  currentStep: { type: Number, default: 1, min: 1, max: 5 },
  status: { 
    type: String, 
    enum: Object.values(DISPOSAL_STATUSES), 
    default: DISPOSAL_STATUSES.DRAFT,
    index: true 
  },
  
  reason: { type: String, required: true },
  steps: [disposalStepSchema],
  committeeVotes: [committeeVoteSchema],
  
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  finalDecisionDate: { type: Date, default: null },
  scrapProceeds: { type: Number, default: 0 },
  
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const DisposalProposal = mongoose.model('DisposalProposal', disposalProposalSchema);
