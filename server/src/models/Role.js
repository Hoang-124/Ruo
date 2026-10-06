import mongoose from 'mongoose';

// Role Schema (Module 1: Authentication & Authorization)
const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    enum: ['lecturer', 'maintenance_staff', 'admin'] 
  },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  permissions: [{ type: String, trim: true }]
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const Role = mongoose.model('Role', roleSchema);
export default Role;
