import express from 'express';
import { 
  getEquipments, 
  getEquipmentByQR, 
  requestBorrowEquipment 
} from '../controllers/equipmentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getEquipments);
router.get('/qr/:qrCode', getEquipmentByQR);
router.post('/borrow', protect, requestBorrowEquipment);

export default router;
