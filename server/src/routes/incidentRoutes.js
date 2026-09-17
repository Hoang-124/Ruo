import express from 'express';
import { 
  reportIncident, 
  getKanbanTickets, 
  assignTicket, 
  resolveTicket 
} from '../controllers/incidentController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', reportIncident);
router.get('/kanban', getKanbanTickets);
router.put('/:id/assign', requireRole('facility_staff', 'admin'), assignTicket);
router.put('/:id/resolve', requireRole('maintenance', 'facility_staff', 'admin'), resolveTicket);

export default router;
