import mongoose from 'mongoose';

// ImportSession Schema (Module 3: Equipment Management)
const importSessionSchema = new mongoose.Schema({
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  file_name: { type: String, required: true },
  total_rows: { type: Number, default: 0 },
  success_count: { type: Number, default: 0 },
  error_count: { type: Number, default: 0 },
  errors: [{
    row: { type: Number },
    field: { type: String },
    message: { type: String }
  }],
  status: { 
    type: String, 
    enum: ['validating', 'validated', 'importing', 'completed', 'failed'], 
    default: 'validating',
    index: true 
  },
  completed_at: { type: Date, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  suppressReservedKeysWarning: true
});

export const ImportSession = mongoose.model('ImportSession', importSessionSchema);
export default ImportSession;
