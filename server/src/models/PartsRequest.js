import mongoose from 'mongoose';
import { PARTS_REQUEST_STATUSES } from '../config/constants.js';

// PartsRequest Schema (Module 4: Incident & Repair Management)
// Conforming to dbdiagram.dbml: parts_requests collection
const partsRequestSchema = new mongoose.Schema({
  repair_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Repair', 
    required: true, 
    index: true 
  },
  requested_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  approved_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  items: [{
    part_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'SparePart', 
      required: true 
    },
    qty: { 
      type: Number, 
      min: 1,
      default: 1 
    },
    quantity: { 
      type: Number, 
      min: 1,
      default: 1 
    },
    unit_price: { 
      type: Number, 
      default: 0 
    }
  }],
  status: { 
    type: String, 
    enum: Object.values(PARTS_REQUEST_STATUSES), 
    default: PARTS_REQUEST_STATUSES.PENDING,
    index: true 
  },
  reject_reason: { 
    type: String, 
    default: '' 
  },
  approved_at: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const PartsRequest = mongoose.models.PartsRequest || mongoose.model('PartsRequest', partsRequestSchema);
export default PartsRequest;
