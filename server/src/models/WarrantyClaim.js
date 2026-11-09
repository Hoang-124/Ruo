import mongoose from 'mongoose';

const warrantyClaimSchema = new mongoose.Schema({
  equipment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  issue_description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
    default: 'OPEN',
    index: true
  },
  supplier_email_status: {
    type: String,
    enum: ['sent', 'queued'],
    default: 'queued'
  },
  supplier_email_message_id: {
    type: String,
    default: ''
  },
  status_history: [{
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
      required: true
    },
    note: {
      type: String,
      default: '',
      maxlength: 1000
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

warrantyClaimSchema.index({ equipment_id: 1, status: 1, created_at: -1 });

export const WarrantyClaim = mongoose.models.WarrantyClaim
  || mongoose.model('WarrantyClaim', warrantyClaimSchema);
export default WarrantyClaim;
