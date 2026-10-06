import mongoose from 'mongoose';
import { USER_ROLES } from '../config/constants.js';

// Role Schema (Module 1: Authentication & Authorization)
const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    enum: Object.values(USER_ROLES)
  },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  permissions: [{ type: String, trim: true }]
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const Role = mongoose.model('Role', roleSchema);
export default Role;
