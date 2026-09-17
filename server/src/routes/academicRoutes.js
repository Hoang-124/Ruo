import express from 'express';
import { 
  getAcademicSchedules, 
  runCspSolver, 
  toggleFreezeSemester 
} from '../controllers/academicController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/schedules', getAcademicSchedules);
router.post('/csp/solve', protect, requireRole('academic_affairs', 'admin'), runCspSolver);
router.put('/semesters/:code/freeze', protect, requireRole('academic_affairs', 'admin'), toggleFreezeSemester);

export default router;
