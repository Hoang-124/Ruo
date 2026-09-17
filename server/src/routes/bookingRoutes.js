import express from 'express';
import { 
  createBooking, 
  getMyBookings, 
  getPendingApprovals, 
  processApproval, 
  checkInQR 
} from '../controllers/bookingController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All booking routes require authentication

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.post('/check-in', checkInQR);

// Management routes (Facility Staff, Academic Affairs, Admin)
router.get('/pending', requireRole('facility_staff', 'academic_affairs', 'admin'), getPendingApprovals);
router.put('/:id/approval', requireRole('facility_staff', 'academic_affairs', 'admin'), processApproval);

export default router;
