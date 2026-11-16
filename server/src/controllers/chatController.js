import mongoose from 'mongoose';
import {
  ChatMessage,
  Repair,
  RepairLog,
  User,
  SparePart,
  PartsRequest,
  Room,
  Equipment,
  Notification,
  AuditLog
} from '../models/index.js';
import { processAiChatQuery } from '../services/aiChatEngine.js';
import { resolveTechnicianSpecialtyProfile } from '../services/aiService.js';

/**
 * 1. TICKET-SCOPED CHAT (Giảng viên ↔ Kỹ thuật viên)
 */

// @desc    Lấy lịch sử tin nhắn của 1 phiếu báo hỏng (kèm thông tin phiếu)
// @route   GET /api/chat/ticket/:repairId
// @access  Private (Lecturer, Technician, Facility Manager, Admin)
export const getTicketMessages = async (req, res) => {
  try {
    const { repairId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(repairId)) {
      return res.status(400).json({ success: false, message: 'Mã phiếu sửa chữa không hợp lệ.' });
    }

    const ticket = await Repair.findById(repairId)
      .populate('reported_by', 'full_name code email role avatar phone')
      .populate('assigned_to', 'full_name code email role avatar phone department specialty_code specialty_label allowed_categories specialized_tasks')
      .populate('ai_recommended_to', 'full_name code email role avatar phone department specialty_code specialty_label allowed_categories specialized_tasks')
      .populate('assigned_by', 'full_name code email role')
      .populate('equipment_id', 'code name status brand model')
      .populate('room_id', 'code name floor');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const messages = await ChatMessage.find({
      channel_type: 'ticket',
      repair_id: repairId
    }).sort({ created_at: 1 });

    // Mark messages as read by current user
    const unreadIds = messages
      .filter((m) => !m.read_by.some((r) => r.user_id?.toString() === req.user._id.toString()) && m.sender_id?.toString() !== req.user._id.toString())
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      await ChatMessage.updateMany(
        { _id: { $in: unreadIds } },
        { $push: { read_by: { user_id: req.user._id, read_at: new Date() } } }
      );
    }

    res.json({
      success: true,
      ticket: {
        _id: ticket._id,
        ticket_code: ticket.ticket_code,
        status: ticket.status,
        incident_description: ticket.incident_description,
        damage_level: ticket.damage_level,
        deadline: ticket.deadline,
        equipment: ticket.equipment_id,
        room: ticket.room_id,
        reported_by: ticket.reported_by,
        assigned_to: ticket.assigned_to,
        assigned_by: ticket.assigned_by,
        ai_recommended_to: ticket.ai_recommended_to,
        ai_auto_assigned: Boolean(ticket.ai_auto_assigned),
        ai_dispatch_score: ticket.ai_dispatch_score,
        ai_dispatch_reason: ticket.ai_dispatch_reason,
        reassign_requested: Boolean(ticket.reassign_requested),
        reassign_reason: ticket.reassign_reason,
        is_closed: ['resolved', 'closed', 'repaired'].includes(ticket.status)
      },
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn phiếu sửa chữa: ' + error.message });
  }
};

// @desc    Gửi tin nhắn vào phiếu sửa chữa
// @route   POST /api/chat/ticket/:repairId
// @access  Private
export const sendTicketMessage = async (req, res) => {
  try {
    const { repairId } = req.params;
    const { content, attachment_url = '', message_type = 'text' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống.' });
    }

    const ticket = await Repair.findById(repairId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const sender = req.user;
    const isClosed = ['resolved', 'closed', 'repaired'].includes(ticket.status);

    const message = await ChatMessage.create({
      channel_type: 'ticket',
      conversation_id: ticket._id.toString(),
      repair_id: ticket._id,
      sender_id: sender._id,
      sender_name: sender.full_name || sender.name || sender.code || 'Người dùng',
      sender_role: sender.role || 'lecturer',
      sender_avatar: sender.avatar || '',
      message_type: attachment_url ? 'image' : message_type,
      content: content.trim(),
      attachment_url: attachment_url || '',
      read_by: [{ user_id: sender._id, read_at: new Date() }]
    });

    // Notify the other parties (Lecturer <-> Technician <-> Facility Manager)
    const recipientIds = new Set();
    if (sender.role === 'lecturer') {
      if (ticket.assigned_to) recipientIds.add(ticket.assigned_to.toString());
      if (ticket.assigned_by) recipientIds.add(ticket.assigned_by.toString());
    } else if (sender.role === 'technician') {
      if (ticket.reported_by) recipientIds.add(ticket.reported_by.toString());
      if (ticket.assigned_by) {
        recipientIds.add(ticket.assigned_by.toString());
      } else {
        const managers = await User.find({ role: 'facility_manager', status: 'active' }).select('_id').catch(() => []);
        managers.forEach((m) => recipientIds.add(m._id.toString()));
      }
    } else if (sender.role === 'facility_manager' || sender.role === 'admin') {
      if (ticket.assigned_to) recipientIds.add(ticket.assigned_to.toString());
      if (ticket.reported_by) recipientIds.add(ticket.reported_by.toString());
    }

    recipientIds.delete(sender._id.toString());

    for (const rId of recipientIds) {
      await Notification.create({
        user_id: rId,
        type: 'info',
        title: `Tin nhắn mới từ ${sender.full_name} (${ticket.ticket_code})`,
        message: content.trim().slice(0, 150),
        reference_type: 'repair',
        reference_id: ticket._id
      }).catch(() => null);
    }

    res.status(201).json({
      success: true,
      message,
      is_ticket_closed: isClosed
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn: ' + error.message });
  }
};


/**
 * 2. OPERATIONS & KHO CHAT (Kỹ thuật viên ↔ Quản lý CSVC)
 */

// @desc    Lấy lịch sử tin nhắn nội bộ Kỹ thuật & Quản lý
// @route   GET /api/chat/operations
// @access  Private (Technician, Facility Manager, Admin)
export const getOperationsMessages = async (req, res) => {
  try {
    const rawMessages = await ChatMessage.find({
      channel_type: 'operations'
    })
      .sort({ created_at: 1 })
      .limit(150);

    // Tự động đồng bộ và tự chữa lành (Self-healing sync) các thẻ Action Card đang ở trạng thái pending
    // đối chiếu trực tiếp với trạng thái phê duyệt trong PartsRequest
    const messages = [];
    for (const doc of rawMessages) {
      const msg = doc.toObject();
      if (msg.message_type === 'action_card' && msg.action_data && msg.action_data.status === 'pending') {
        const repairId = msg.action_data.repair_id;
        const partId = msg.action_data.part_id;
        const prId = msg.action_data.parts_request_id || msg.action_data.request_id;

        let matchingPR = null;
        if (prId && mongoose.Types.ObjectId.isValid(prId)) {
          matchingPR = await PartsRequest.findOne({
            _id: prId,
            status: { $in: ['approved', 'rejected'] }
          }).populate('approved_by', 'full_name code');
        }
        if (!matchingPR && repairId && mongoose.Types.ObjectId.isValid(repairId)) {
          matchingPR = await PartsRequest.findOne({
            repair_id: repairId,
            status: { $in: ['approved', 'rejected'] }
          }).populate('approved_by', 'full_name code').sort({ updated_at: -1, created_at: -1 });
        }
        if (!matchingPR && partId) {
          const partIdObj = mongoose.Types.ObjectId.isValid(partId) ? new mongoose.Types.ObjectId(partId) : null;
          matchingPR = await PartsRequest.findOne({
            'items.part_id': partIdObj || partId,
            status: { $in: ['approved', 'rejected'] }
          }).populate('approved_by', 'full_name code').sort({ updated_at: -1, created_at: -1 });
        }

        if (matchingPR) {
          msg.action_data.status = matchingPR.status;
          msg.action_data.decided_by = matchingPR.approved_by?.full_name || 'Quản lý CSVC';
          msg.action_data.decided_at = matchingPR.approved_at || matchingPR.updated_at || new Date();
          if (matchingPR.status === 'rejected') {
            msg.action_data.reject_reason = matchingPR.reject_reason || 'Quản lý từ chối';
          }
          await ChatMessage.updateOne(
            { _id: msg._id },
            { $set: { action_data: msg.action_data } }
          );
        }
      }
      messages.push(msg);
    }

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn nội bộ: ' + error.message });
  }
};

// @desc    Gửi tin nhắn hoặc yêu cầu linh kiện khẩn cấp (Action Card)
// @route   POST /api/chat/operations
// @access  Private (Technician, Facility Manager, Admin)
export const sendOperationsMessage = async (req, res) => {
  try {
    const {
      content,
      message_type = 'text',
      attachment_url = '',
      action_data = null
    } = req.body;

    if (!content && !action_data) {
      return res.status(400).json({ success: false, message: 'Tin nhắn hoặc thẻ yêu cầu không được rỗng.' });
    }

    const sender = req.user;
    let enrichedActionData = null;

    // If sending a Spare Part Action Card
    if (message_type === 'action_card' && action_data) {
      const { part_id, quantity = 1, repair_id = null, reason = '' } = action_data;
      if (!part_id) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn linh kiện hợp lệ.' });
      }

      const part = await SparePart.findById(part_id);
      if (!part) {
        return res.status(404).json({ success: false, message: 'Linh kiện không tồn tại trong kho.' });
      }

      let ticketCode = '';
      if (repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
        const rep = await Repair.findById(repair_id);
        if (rep) ticketCode = rep.ticket_code;
      }

      enrichedActionData = {
        card_type: 'spare_part_request',
        request_id: `PRQ-${Date.now().toString(36).toUpperCase()}`,
        part_id: part._id.toString(),
        part_code: part.code,
        part_name: part.name,
        unit: part.unit || 'Cái',
        unit_price: part.price || 0,
        current_stock: part.stock,
        quantity: Number(quantity) || 1,
        repair_id: repair_id || null,
        ticket_code: ticketCode,
        reason: reason || 'Thay thế linh kiện hỏng tại hiện trường',
        status: 'pending',
        requested_by_id: sender._id,
        requested_by_name: sender.full_name,
        decided_by: null,
        decided_at: null
      };

      // Tự động tạo PartsRequest song song trong CSDL để bảng Kho Linh Kiện hiển thị tức thì
      try {
        const pr = await PartsRequest.create({
          repair_id: repair_id && mongoose.Types.ObjectId.isValid(repair_id) ? repair_id : null,
          requested_by: sender._id,
          items: [{
            part_id: part._id,
            qty: Number(quantity) || 1,
            unit_price: part.price || 0
          }],
          status: 'pending'
        });
        if (pr) {
          enrichedActionData.parts_request_id = pr._id.toString();
        }
      } catch (prErr) {
        console.warn('Lỗi tạo PartsRequest từ chat action card:', prErr.message);
      }
    }

    const message = await ChatMessage.create({
      channel_type: 'operations',
      conversation_id: 'ops_tech_desk',
      sender_id: sender._id,
      sender_name: sender.full_name || sender.name || sender.code,
      sender_role: sender.role,
      sender_avatar: sender.avatar || '',
      message_type: enrichedActionData ? 'action_card' : (attachment_url ? 'image' : message_type),
      content: content ? content.trim() : `Yêu cầu xuất kho vật tư: ${enrichedActionData?.part_name}`,
      attachment_url: attachment_url || '',
      action_data: enrichedActionData,
      read_by: [{ user_id: sender._id, read_at: new Date() }]
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn tác nghiệp: ' + error.message });
  }
};

// @desc    Phê duyệt / Từ chối Thẻ Yêu Cầu Linh Kiện (Action Card) ngay trong Chat
// @route   PUT /api/chat/action-card/:messageId/decide
// @access  Private (Facility Manager, Admin)
export const decideActionCard = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { decision, reason = '' } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Quyết định phải là approve hoặc reject.' });
    }

    const chatMsg = await ChatMessage.findById(messageId);
    if (!chatMsg || chatMsg.message_type !== 'action_card' || !chatMsg.action_data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ yêu cầu hợp lệ.' });
    }

    if (chatMsg.action_data.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Thẻ yêu cầu này đã được xử lý trước đó (${chatMsg.action_data.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}).`
      });
    }

    const { part_id, quantity, part_name, ticket_code, repair_id, card_type } = chatMsg.action_data;
    const deciderName = req.user.full_name || req.user.code;

    // Handle Technician Reassignment Request Card (Manager <-> Technician Chat)
    if (card_type === 'reassign_request') {
      const targetTechId = req.body.new_technician_id || chatMsg.action_data.suggested_technician_id;
      const repair = repair_id && mongoose.Types.ObjectId.isValid(repair_id)
        ? await Repair.findById(repair_id)
        : null;

      if (decision === 'approve') {
        if (!targetTechId || !mongoose.Types.ObjectId.isValid(targetTechId)) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy Kỹ thuật viên thay thế hợp lệ để điều phối lại.'
          });
        }

        const newTech = await User.findById(targetTechId).select('full_name code department specialty_code specialty_label allowed_categories');
        if (!newTech) {
          return res.status(404).json({ success: false, message: 'Kỹ thuật viên được chọn không tồn tại.' });
        }
        const techProfile = resolveTechnicianSpecialtyProfile(newTech);

        if (repair) {
          repair.assigned_to = newTech._id;
          repair.assigned_by = req.user._id;
          repair.status = 'assigned';
          repair.reassign_requested = false;
          repair.reassign_reason = '';
          await repair.save();

          await RepairLog.create({
            repair_id: repair._id,
            action: 'assigned',
            performed_by: req.user._id,
            description: `Quản lý ${deciderName} đã duyệt đổi người qua Chat → Giao cho ${newTech.full_name} (${techProfile.short_label})`
          }).catch(() => null);

          await Notification.create({
            user_id: newTech._id,
            type: 'repair_assigned',
            title: `Nhiệm vụ điều phối đúng chuyên môn (${repair.ticket_code})`,
            message: `Quản lý ${deciderName} đã chuyển giao phiếu ${repair.ticket_code} cho bạn theo chuyên môn [${techProfile.short_label}].`,
            reference_type: 'repair',
            reference_id: repair._id
          }).catch(() => null);

          await ChatMessage.create({
            channel_type: 'ticket',
            conversation_id: repair._id.toString(),
            repair_id: repair._id,
            sender_id: req.user._id,
            sender_name: deciderName,
            sender_role: req.user.role,
            message_type: 'system_event',
            content: `[ĐÃ ĐIỀU PHỐI LẠI] Quản lý ${deciderName} đã duyệt yêu cầu đổi KTV và phân công phiếu ${repair.ticket_code} sang cho ${newTech.full_name} (${techProfile.short_label}).`
          }).catch(() => null);
        }

        chatMsg.action_data = {
          ...chatMsg.action_data,
          status: 'approved',
          new_technician_id: newTech._id.toString(),
          new_technician_name: newTech.full_name,
          new_technician_specialty: techProfile.short_label,
          decided_by: deciderName,
          decided_at: new Date()
        };
        chatMsg.markModified('action_data');
        await chatMsg.save();

        const confirmReassignMsg = await ChatMessage.create({
          channel_type: 'operations',
          conversation_id: 'ops_tech_desk',
          sender_id: null,
          sender_name: 'Hệ Thống Điều Phối AI',
          sender_role: 'system',
          message_type: 'system_event',
          content: `[ĐÃ CHUYỂN GIAO] Quản lý ${deciderName} đã duyệt đổi KTV cho phiếu ${ticket_code || ''} → Chuyển sang cho ${newTech.full_name} (${newTech.code} • ${techProfile.short_label}).`
        });

        return res.json({
          success: true,
          message: `Đã chuyển giao phiếu ${ticket_code || ''} sang cho ${newTech.full_name} (${techProfile.short_label})!`,
          updated_card: chatMsg,
          system_message: confirmReassignMsg
        });
      } else {
        if (repair) {
          repair.reassign_requested = false;
          await repair.save();
        }
        chatMsg.action_data = {
          ...chatMsg.action_data,
          status: 'rejected',
          reject_reason: reason || 'Quản lý yêu cầu KTV hiện tại tiếp tục xử lý',
          decided_by: deciderName,
          decided_at: new Date()
        };
        chatMsg.markModified('action_data');
        await chatMsg.save();

        const rejectReassignMsg = await ChatMessage.create({
          channel_type: 'operations',
          conversation_id: 'ops_tech_desk',
          sender_id: null,
          sender_name: 'Hệ Thống Điều Phối AI',
          sender_role: 'system',
          message_type: 'system_event',
          content: `[GIỮ PHÂN CÔNG] Quản lý ${deciderName} đã từ chối đổi KTV cho phiếu ${ticket_code || ''}. Ghi chú: ${reason || 'Đề nghị KTV hiện tại tiếp tục kiểm tra tại chỗ'}.`
        });

        return res.json({
          success: true,
          message: 'Đã từ chối yêu cầu đổi KTV.',
          updated_card: chatMsg,
          system_message: rejectReassignMsg
        });
      }
    }

    if (decision === 'approve') {
      // Check if there is already an approved PartsRequest to avoid double deduction
      let existingApprovedPR = null;
      if (repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
        existingApprovedPR = await PartsRequest.findOne({
          repair_id,
          status: 'approved'
        });
      }

      let updatedPart = null;
      if (!existingApprovedPR) {
        // Atomic inventory deduction
        updatedPart = await SparePart.findOneAndUpdate(
          { _id: part_id, stock: { $gte: Number(quantity) } },
          { $inc: { stock: -Number(quantity) } },
          { new: true }
        );

        if (!updatedPart) {
          return res.status(400).json({
            success: false,
            message: `Không thể xuất kho: Số lượng tồn kho hiện tại không đủ đáp ứng (${quantity} cái).`
          });
        }
      } else {
        updatedPart = await SparePart.findById(part_id);
      }

      // Synchronize with PartsRequest in DB
      let prQuery = null;
      if (chatMsg.action_data?.parts_request_id && mongoose.Types.ObjectId.isValid(chatMsg.action_data.parts_request_id)) {
        prQuery = { _id: chatMsg.action_data.parts_request_id, status: 'pending' };
      } else if (repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
        prQuery = { repair_id, status: 'pending' };
      } else if (part_id) {
        const pIdObj = mongoose.Types.ObjectId.isValid(part_id) ? new mongoose.Types.ObjectId(part_id) : part_id;
        prQuery = { 'items.part_id': pIdObj, status: 'pending' };
      }

      if (prQuery) {
        const existingPendingPR = await PartsRequest.findOne(prQuery);
        if (existingPendingPR) {
          existingPendingPR.status = 'approved';
          existingPendingPR.approved_by = req.user._id;
          existingPendingPR.approved_at = new Date();
          await existingPendingPR.save();
        } else if (!existingApprovedPR && repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
          await PartsRequest.create({
            repair_id,
            requested_by: chatMsg.action_data.requested_by_id,
            approved_by: req.user._id,
            status: 'approved',
            approved_at: new Date(),
            items: [{
              part_id,
              qty: Number(quantity),
              quantity: Number(quantity),
              unit_price: chatMsg.action_data.unit_price || 0
            }]
          }).catch(() => null);
        }
      }

      if (repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
        // Add to repair total_cost
        const costToAdd = (chatMsg.action_data.unit_price || 0) * Number(quantity);
        if (costToAdd > 0) {
          await Repair.findByIdAndUpdate(repair_id, { $inc: { total_cost: costToAdd } });
        }
      }

      chatMsg.action_data = {
        ...chatMsg.action_data,
        status: 'approved',
        current_stock: updatedPart ? updatedPart.stock : chatMsg.action_data.current_stock,
        decided_by: deciderName,
        decided_at: new Date()
      };
      chatMsg.markModified('action_data');
      await chatMsg.save();

      // Post confirmation system message in chat
      const confirmBotMsg = await ChatMessage.create({
        channel_type: 'operations',
        conversation_id: 'ops_tech_desk',
        sender_id: null,
        sender_name: 'Hệ Thống Kho KHO-01',
        sender_role: 'system',
        message_type: 'system_event',
        content: `[ĐÃ DUYỆT] Quản lý ${deciderName} đã DUYỆT xuất kho ${quantity} x [${part_name}]${ticket_code ? ` cho phiếu ${ticket_code}` : ''}. Tồn kho còn lại: ${updatedPart.stock}.`
      });

      return res.json({
        success: true,
        message: 'Đã duyệt xuất kho vật tư thành công.',
        updated_card: chatMsg,
        system_message: confirmBotMsg
      });
    } else {
      // Rejected
      let rejectPrQuery = null;
      if (chatMsg.action_data?.parts_request_id && mongoose.Types.ObjectId.isValid(chatMsg.action_data.parts_request_id)) {
        rejectPrQuery = { _id: chatMsg.action_data.parts_request_id, status: 'pending' };
      } else if (repair_id && mongoose.Types.ObjectId.isValid(repair_id)) {
        rejectPrQuery = { repair_id, status: 'pending' };
      } else if (part_id) {
        const pIdObj = mongoose.Types.ObjectId.isValid(part_id) ? new mongoose.Types.ObjectId(part_id) : part_id;
        rejectPrQuery = { 'items.part_id': pIdObj, status: 'pending' };
      }

      if (rejectPrQuery) {
        await PartsRequest.updateMany(
          rejectPrQuery,
          { $set: { status: 'rejected', reject_reason: reason || 'Quản lý từ chối yêu cầu', approved_by: req.user._id } }
        ).catch(() => null);
      }

      chatMsg.action_data = {
        ...chatMsg.action_data,
        status: 'rejected',
        reject_reason: reason || 'Quản lý từ chối yêu cầu',
        decided_by: deciderName,
        decided_at: new Date()
      };
      chatMsg.markModified('action_data');
      await chatMsg.save();

      const rejectBotMsg = await ChatMessage.create({
        channel_type: 'operations',
        conversation_id: 'ops_tech_desk',
        sender_id: null,
        sender_name: 'Hệ Thống Kho KHO-01',
        sender_role: 'system',
        message_type: 'system_event',
        content: `[TỪ CHỐI] Quản lý ${deciderName} đã TỪ CHỐI xuất kho linh kiện [${part_name}]. Lý do: ${reason || 'Không đủ căn cứ xuất kho'}.`
      });

      return res.json({
        success: true,
        message: 'Đã từ chối yêu cầu xuất kho.',
        updated_card: chatMsg,
        system_message: rejectBotMsg
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý duyệt yêu cầu: ' + error.message });
  }
};


/**
 * 3. AI FACILITY COPILOT CHAT (Cán bộ ↔ Ruo Cortex AI)
 * 100% Persisted in MongoDB: chat_messages collection
 */

// @desc    Lấy lịch sử hội thoại với AI của người dùng
// @route   GET /api/chat/ai
// @access  Private
export const getAiMessages = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const messages = await ChatMessage.find({
      channel_type: 'ai_copilot',
      conversation_id: userId
    })
      .sort({ created_at: 1 })
      .limit(60);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử AI: ' + error.message });
  }
};

// @desc    Gửi câu hỏi tới Ruo Cortex AI & Nhận câu trả lời truy vấn trực tiếp từ MongoDB
// @route   POST /api/chat/ai
// @access  Private
export const sendAiMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi cho AI Copilot.' });
    }

    const sender = req.user;
    const userId = sender._id.toString();
    const questionText = content.trim();

    // 1. Lưu câu hỏi của người dùng vào MongoDB
    const userMessage = await ChatMessage.create({
      channel_type: 'ai_copilot',
      conversation_id: userId,
      sender_id: sender._id,
      sender_name: sender.full_name || sender.name || sender.code,
      sender_role: sender.role,
      sender_avatar: sender.avatar || '',
      message_type: 'text',
      content: questionText,
      read_by: [{ user_id: sender._id, read_at: new Date() }]
    });

    // Lấy lịch sử hội thoại gần nhất để duy trì ngữ cảnh trò chuyện (Multi-turn Context)
    const recentHistory = await ChatMessage.find({
      channel_type: 'ai_copilot',
      conversation_id: userId,
      _id: { $ne: userMessage._id }
    })
      .sort({ created_at: -1 })
      .limit(6);
    const chatHistory = recentHistory.reverse();

    // 2. Xử lý tri thức sâu với Ruo Cortex AI Chat Engine
    const { responseText, cardData } = await processAiChatQuery({
      content: questionText,
      user: sender,
      chatHistory
    });

    // 3. Lưu câu trả lời của AI vào MongoDB
    const aiMessage = await ChatMessage.create({
      channel_type: 'ai_copilot',
      conversation_id: userId,
      sender_id: null,
      sender_name: 'Ruo Cortex AI',
      sender_role: 'ai',
      message_type: cardData ? 'ai_card' : 'text',
      content: responseText,
      action_data: cardData,
      read_by: [{ user_id: sender._id, read_at: new Date() }]
    });

    res.status(201).json({
      success: true,
      user_message: userMessage,
      ai_message: aiMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý câu hỏi AI: ' + error.message });
  }
};

// @desc    Lấy tổng số tin nhắn chưa đọc cho huy hiệu thông báo
// @route   GET /api/chat/unread-summary
// @access  Private
export const getUnreadSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Count ticket messages unread where user is involved
    const userTickets = await Repair.find({
      $or: [{ reported_by: userId }, { assigned_to: userId }]
    }).select('_id');

    const ticketIds = userTickets.map((t) => t._id);

    const unreadTicketCount = await ChatMessage.countDocuments({
      channel_type: 'ticket',
      repair_id: { $in: ticketIds },
      sender_id: { $ne: userId },
      'read_by.user_id': { $ne: userId }
    });

    const unreadOpsCount = ['technician', 'facility_manager', 'admin'].includes(req.user.role)
      ? await ChatMessage.countDocuments({
        channel_type: 'operations',
        sender_id: { $ne: userId },
        'read_by.user_id': { $ne: userId }
      })
      : 0;

    res.json({
      success: true,
      unread_ticket_count: unreadTicketCount,
      unread_ops_count: unreadOpsCount,
      total_unread: unreadTicketCount + unreadOpsCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đếm tin chưa đọc: ' + error.message });
  }
};
