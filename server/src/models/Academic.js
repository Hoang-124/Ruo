import mongoose from 'mongoose';
import { ROOM_TYPES } from '../config/constants.js';

// Semester Schema
const semesterSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // '2026-1'
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isLocked: { type: Boolean, default: false, note: 'LOCKED: Đóng băng lịch toàn trường' }
}, { timestamps: true });

export const Semester = mongoose.model('Semester', semesterSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // 'IT3010'
  name: { type: String, required: true },
  credits: { type: Number, default: 3 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  requiredRoomType: { 
    type: String, 
    enum: Object.values(ROOM_TYPES), 
    default: ROOM_TYPES.THEORY 
  }
}, { timestamps: true });

export const Course = mongoose.model('Course', courseSchema);

// CSP Solver Run Schema
const cspSolverRunSchema = new mongoose.Schema({
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
  runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  algorithm: { type: String, default: 'backtracking_mrv_lcv_ac3' },
  status: { 
    type: String, 
    enum: ['running', 'completed', 'optimal', 'partial_solution', 'failed'], 
    default: 'running' 
  },
  totalClasses: { type: Number, required: true },
  allocatedClasses: { type: Number, default: 0 },
  conflictsFound: { type: Number, default: 0 },
  seatUtilizationRate: { type: Number, default: 0 },
  executionTimeMs: { type: Number, default: 0 },
  solutionSummary: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export const CspSolverRun = mongoose.model('CspSolverRun', cspSolverRunSchema);

// Academic Schedule Schema (Master Timetable)
const academicScheduleSchema = new mongoose.Schema({
  cspRun: { type: mongoose.Schema.Types.ObjectId, ref: 'CspSolverRun', default: null },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  classSectionCode: { type: String, required: true }, // e.g., 'IT3010-01'
  studentCount: { type: Number, required: true },
  dayOfWeek: { type: Number, required: true, min: 2, max: 7 }, // 2 = Mon ... 7 = Sat
  startTime: { type: String, required: true }, // '07:30'
  endTime: { type: String, required: true },   // '11:30'
  startWeek: { type: Number, default: 1 },
  endWeek: { type: Number, default: 15 },
  isFrozen: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent double booking at database level: One room cannot host two classes at same day & time
academicScheduleSchema.index({ semester: 1, room: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });
// Prevent lecturer conflict: One lecturer cannot teach two classes at same day & time
academicScheduleSchema.index({ semester: 1, lecturer: 1, dayOfWeek: 1, startTime: 1 });

export const AcademicSchedule = mongoose.model('AcademicSchedule', academicScheduleSchema);
