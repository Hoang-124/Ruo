import mongoose from 'mongoose';

// Department Schema (Module 2: Organization / Master Data)
// Conforming to normalized dbdiagram.dbml: departments table
const departmentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
export default Department;
