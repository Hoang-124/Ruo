import express from 'express';
import { login, getMe, getAllUsers } from '../controllers/authController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, getAllUsers);

export default router;
