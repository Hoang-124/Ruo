import express from 'express';
import {
  getTicketMessages,
  sendTicketMessage,
  getOperationsMessages,
  sendOperationsMessage,
  decideActionCard,
  getAiMessages,
  sendAiMessage,
  getUnreadSummary
} from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả các kênh chat đều yêu cầu xác thực JWT (protect)
router.use(protect);

// 1. Kênh Ticket-Scoped Chat (Giảng viên ↔ Kỹ thuật viên)
router.route('/ticket/:repairId')
  .get(getTicketMessages)
  .post(sendTicketMessage);

// 2. Kênh Tác Nghiệp Kỹ Thuật & Kho (Kỹ thuật viên ↔ Quản lý CSVC)
router.route('/operations')
  .get(getOperationsMessages)
  .post(sendOperationsMessage);

// Phê duyệt / Từ chối thẻ yêu cầu linh kiện (Action Card) trong chat tác nghiệp
router.route('/action-card/:messageId/decide')
  .put(decideActionCard);

// 3. Kênh Trợ Lý AI Ruo Cortex Copilot (Mọi user ↔ AI)
router.route('/ai')
  .get(getAiMessages)
  .post(sendAiMessage);

// Huy hiệu đếm tin nhắn chưa đọc
router.route('/unread-summary')
  .get(getUnreadSummary);

export default router;
