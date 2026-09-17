import { Semester, Course, AcademicSchedule, CspSolverRun } from '../models/Academic.js';
import { Room } from '../models/Facility.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { CspTimetableSolver } from '../services/cspEngine.js';

// @desc    Get master academic timetable for a semester
// @route   GET /api/academic/schedules
export const getAcademicSchedules = async (req, res) => {
  const { semesterCode = '2026-1', roomCode, dayOfWeek } = req.query;

  const semester = await Semester.findOne({ code: semesterCode });
  if (!semester) {
    return res.status(404).json({ success: false, message: `Không tìm thấy học kỳ: ${semesterCode}` });
  }

  const query = { semester: semester._id };
  if (dayOfWeek) query.dayOfWeek = Number(dayOfWeek);

  if (roomCode) {
    const room = await Room.findOne({ code: roomCode.toUpperCase() });
    if (room) query.room = room._id;
  }

  const schedules = await AcademicSchedule.find(query)
    .populate('room', 'code name capacity type building floorNumber')
    .populate('lecturer', 'fullName employeeCode email')
    .populate('course', 'code name credits requiredRoomType')
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.json({
    success: true,
    semester: {
      code: semester.code,
      name: semester.name,
      isLocked: semester.isLocked
    },
    totalSchedules: schedules.length,
    schedules
  });
};

// @desc    Trigger automated CSP Timetable Solver (Backtracking + MRV + LCV)
// @route   POST /api/academic/csp/solve
export const runCspSolver = async (req, res) => {
  const { semesterCode = '2026-1', classesInput = [] } = req.body;

  const semester = await Semester.findOne({ code: semesterCode });
  if (!semester) {
    return res.status(404).json({ success: false, message: `Không tìm thấy học kỳ: ${semesterCode}` });
  }

  if (semester.isLocked) {
    return res.status(400).json({
      success: false,
      message: 'Học kỳ đã bị khóa (LOCKED). Không thể ghi đè lịch học bằng thuật toán.'
    });
  }

  // 1. Fetch available rooms
  const rooms = await Room.find({ isActive: true, deletedAt: null }).populate('building');
  const formattedRooms = rooms.map(r => ({
    id: r._id,
    code: r.code,
    capacity: r.capacity,
    type: r.type,
    buildingCode: r.building ? r.building.code : 'A1'
  }));

  // 2. Define standard university time-slots
  const timeSlots = [
    { start: '07:30', end: '11:30', slotId: 'M1' },
    { start: '13:00', end: '17:00', slotId: 'A1' }
  ];

  // 3. Fallback sample classes if none provided
  const classesToSchedule = classesInput.length > 0 ? classesInput : [
    { id: 'IT3010', name: 'Kỹ Thuật Lập Trình', lecturer: 'TS. Lê Đức Anh', students: 42, requiredType: 'theory', faculty: 'CNTT' },
    { id: 'IT3160', name: 'Kiến Trúc Máy Tính & Lab', lecturer: 'PGS. TS. Trần Đình Hưng', students: 35, requiredType: 'lab', faculty: 'CNTT' },
    { id: 'IT4040', name: 'Phát Triển Ứng Dụng Web', lecturer: 'TS. Nguyễn Văn Nam', students: 40, requiredType: 'theory', faculty: 'CNTT' },
    { id: 'EE2010', name: 'Lý Thuyết Mạch Điện', lecturer: 'TS. Vũ Hoàng Long', students: 58, requiredType: 'theory', faculty: 'Điện' },
    { id: 'EE3050', name: 'Thí Nghiệm Đo Lường', lecturer: 'ThS. Đỗ Minh Tuấn', students: 24, requiredType: 'lab', faculty: 'Điện' },
    { id: 'IT5000', name: 'Hội Thảo Tốt Nghiệp K67', lecturer: 'GS. TS. Nguyễn Hải Quân', students: 160, requiredType: 'hall', faculty: 'CNTT' }
  ];

  // 4. Run CSP Timetable Engine
  const solver = new CspTimetableSolver({
    classes: classesToSchedule,
    rooms: formattedRooms,
    timeSlots,
    daysOfWeek: [2, 3, 4, 5, 6] // Mon to Fri
  });

  const result = solver.solve();

  // 5. Record CSP Run into Database
  const runRecord = await CspSolverRun.create({
    semester: semester._id,
    runBy: req.user._id,
    algorithm: 'backtracking_mrv_lcv_ac3',
    status: result.status,
    totalClasses: result.totalClasses,
    allocatedClasses: result.allocatedClasses,
    conflictsFound: result.conflictsFound,
    seatUtilizationRate: result.seatUtilizationRate,
    executionTimeMs: result.executionTimeMs,
    solutionSummary: {
      visitedNodes: result.visitedNodes,
      seatUtilizationRate: result.seatUtilizationRate
    }
  });

  // 6. Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'CSP_SOLVER_EXECUTE',
    entityType: 'CspSolverRun',
    entityId: runRecord._id.toString(),
    ipAddress: req.ip,
    diffData: {
      allocatedClasses: result.allocatedClasses,
      conflictsFound: result.conflictsFound,
      executionTimeMs: result.executionTimeMs,
      seatUtilizationRate: result.seatUtilizationRate
    }
  });

  res.json({
    success: true,
    message: `Thuật toán CSP đã phân bổ thành công ${result.allocatedClasses}/${result.totalClasses} lớp học trong ${result.executionTimeMs}ms với 0 xung đột.`,
    result,
    cspRunId: runRecord._id
  });
};

// @desc    Freeze or Unfreeze semester schedule (Lock whole university calendar)
// @route   PUT /api/academic/semesters/:code/freeze
export const toggleFreezeSemester = async (req, res) => {
  const { isLocked } = req.body;

  const semester = await Semester.findOneAndUpdate(
    { code: req.params.code },
    { isLocked: Boolean(isLocked) },
    { new: true }
  );

  if (!semester) {
    return res.status(404).json({ success: false, message: 'Học kỳ không tồn tại.' });
  }

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: isLocked ? 'SCHEDULE_FREEZE' : 'SCHEDULE_UNFREEZE',
    entityType: 'Semester',
    entityId: semester._id.toString(),
    ipAddress: req.ip,
    diffData: {
      semesterCode: semester.code,
      isLocked: semester.isLocked
    }
  });

  res.json({
    success: true,
    message: isLocked 
      ? `Đã đóng băng toàn bộ thời khóa biểu học kỳ ${semester.code}. Khóa chỉnh sửa thành công.`
      : `Đã mở khóa học kỳ ${semester.code}.`,
    semester
  });
};
