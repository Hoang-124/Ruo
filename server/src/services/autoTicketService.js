import mongoose from 'mongoose';
import {
  Repair,
  RepairLog,
  Equipment,
  Room,
  Notification,
  AuditLog,
  ChatMessage
} from '../models/index.js';
import {
  REPAIR_STATUSES,
  EQUIPMENT_STATUSES,
  DAMAGE_LEVELS,
  REPAIR_SOURCES
} from '../config/constants.js';
import { computeDeadline } from './slaReactor.js';
import { evaluateTicketAiSpecialtyDispatch } from '../controllers/repairController.js';

/**
 * Service executeAutoTicketCreation
 * Core unified engine for automated repair ticket creation (1-Click & Conversational AI).
 */
export async function executeAutoTicketCreation({
  user,
  roomId = null,
  equipmentId,
  incidentDescription = '',
  damageLevel = 'minor',
  ipAddress = '127.0.0.1',
  createChatMessage = false
}) {
  if (!equipmentId) {
    return {
      success: false,
      message: 'Vui lòng cung cấp mã ID thiết bị cần báo hỏng.'
    };
  }

  const equipment = await Equipment.findById(equipmentId).populate('category_id', 'code name');
  if (!equipment) {
    return {
      success: false,
      message: 'Thiết bị không tồn tại trên hệ thống.'
    };
  }

  const room = roomId
    ? await Room.findById(roomId)
    : (equipment.room_id ? await Room.findById(equipment.room_id) : null);

  // Check for open existing repair ticket to prevent duplicate submissions
  const existingTicket = await Repair.findOne({
    equipment_id: equipment._id,
    status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
  }).populate('assigned_to', 'full_name code phone email');

  if (existingTicket) {
    const ktvName = existingTicket.assigned_to?.full_name || 'chuyên môn';
    const ktvPhone = existingTicket.assigned_to?.phone || '0987654321';
    return {
      success: false,
      isDuplicate: true,
      message: `Thiết bị [${equipment.name}] đã có phiếu sửa chữa [${existingTicket.ticket_code}] đang được KTV ${ktvName} (SĐT: ${ktvPhone}) tiếp nhận xử lý. Bạn không cần tạo thêm phiếu trùng lặp.`,
      repair: existingTicket
    };
  }

  const validLevels = Object.values(DAMAGE_LEVELS);
  const finalLevel = validLevels.includes(damageLevel) ? damageLevel : DAMAGE_LEVELS.MINOR;
  const cleanDescription = String(incidentDescription).trim() ||
    `Phản ánh sự cố thiết bị [${equipment.name}] qua Ruo Cortex AI Copilot`;

  // Compute SLA resolution deadline
  const resolutionDeadline = computeDeadline(finalLevel, new Date());

  // Evaluate AI Specialty Dispatch
  const { bestTechnician, effectiveCategory } = await evaluateTicketAiSpecialtyDispatch({
    equipment,
    description: cleanDescription,
    damageLevel: finalLevel
  });

  const shouldAutoAssign = Boolean(bestTechnician && bestTechnician.is_qualified);

  const specialtyReason = bestTechnician
    ? `AI khớp chuyên môn [${effectiveCategory}] → ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty || bestTechnician.department})`
    : 'Đang chờ điều phối KTV';

  // Create official repair ticket
  const repair = await Repair.create({
    equipment_id: equipment._id,
    room_id: room ? room._id : null,
    source: REPAIR_SOURCES.LECTURER_REPORT,
    reported_by: user._id,
    incident_description: cleanDescription,
    damage_level: finalLevel,
    deadline: resolutionDeadline,
    status: shouldAutoAssign ? REPAIR_STATUSES.ASSIGNED : REPAIR_STATUSES.REPORTED,
    assigned_to: shouldAutoAssign ? bestTechnician._id : null,
    ai_recommended_to: bestTechnician ? bestTechnician._id : null,
    ai_auto_assigned: shouldAutoAssign,
    ai_dispatch_score: bestTechnician ? bestTechnician.score : null,
    ai_dispatch_reason: specialtyReason
  });

  // Update equipment status to BROKEN
  equipment.status = EQUIPMENT_STATUSES.BROKEN;
  equipment.repair_count = (equipment.repair_count || 0) + 1;
  await equipment.save();

  // Record RepairLog
  await RepairLog.create({
    repair_id: repair._id,
    action: 'reported',
    performed_by: user._id,
    description: `Báo sự cố qua Ruo Cortex AI Copilot: ${cleanDescription}`
  });

  if (shouldAutoAssign && bestTechnician) {
    await RepairLog.create({
      repair_id: repair._id,
      action: 'assigned',
      performed_by: user._id,
      description: `[AI AUTO-DISPATCH] Tự động giao cho ${bestTechnician.full_name} (${bestTechnician.code}) theo đúng chuyên môn ${bestTechnician.short_specialty} (Điểm: ${bestTechnician.score}/100).`
    });

    // Notify assigned technician
    await Notification.create({
      user_id: bestTechnician._id,
      title: `Phân công sự cố mới [${repair.ticket_code}]`,
      message: `Ruo Cortex AI đã tự động phân công bạn xử lý sự cố [${equipment.name}] tại phòng ${room?.code || ''} (Hạn SLA: ${new Date(resolutionDeadline).toLocaleTimeString('vi-VN')}).`,
      type: 'repair_assigned',
      entity_id: repair._id.toString(),
      entity_model: 'Repair'
    }).catch((err) => console.warn('Lỗi gửi notification KTV:', err.message));
  }

  // AuditLog
  await AuditLog.logAction({
    user_id: user._id,
    user_display: `${user.full_name || user.name || user.code} (${user.code || 'USER'})`,
    action: 'REPAIR_TICKET_AI_AUTO_CREATED',
    target_table: 'repairs',
    entity_id: repair._id.toString(),
    ip_address: ipAddress,
    new_value: {
      ticket_code: repair.ticket_code,
      equipment_code: equipment.code,
      room_code: room?.code,
      assigned_to: bestTechnician?.code,
      deadline: resolutionDeadline
    }
  });

  const deadlineFormatted = new Date(resolutionDeadline).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const confirmContent = `**[ĐÃ TỰ ĐỘNG LẬP PHIẾU BÁO HỎNG THÀNH CÔNG]**\n\n` +
    `Ruo Cortex AI đã hoàn tất thủ tục lập phiếu kỹ thuật và kích hoạt điều động KTV:\n` +
    `- **Mã phiếu sửa chữa:** \`[${repair.ticket_code}]\`\n` +
    `- **Tài sản báo hỏng:** [${equipment.code}] ${equipment.name}\n` +
    `- **Vị trí phòng học:** ${room ? `${room.code} - ${room.name}` : 'Tòa nhà A1'}\n` +
    `- **Kỹ thuật viên phụ trách:** **${bestTechnician ? `${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty || bestTechnician.department})` : 'Đang chờ phân công KTV'}**\n` +
    `- **Cam kết thời hạn SLA:** **${deadlineFormatted}**\n` +
    `- **Trạng thái:** **${shouldAutoAssign ? 'Đã phân công KTV tiếp nhận' : 'Đã ghi nhận, chờ duyệt'}**\n\n` +
    `Thầy/Cô không cần điền thêm đơn hay thao tác gì nữa. Kỹ thuật viên đã nhận lệnh điều động và sẽ có mặt kiểm tra tại phòng đúng cam kết SLA!`;

  let aiConfirmMsg = null;
  if (createChatMessage) {
    aiConfirmMsg = await ChatMessage.create({
      channel_type: 'ai_copilot',
      conversation_id: user._id.toString(),
      sender_id: null,
      sender_name: 'Ruo Cortex AI',
      sender_role: 'ai',
      message_type: 'ai_card',
      content: confirmContent,
      action_data: {
        type: 'ticket_created_success',
        ticket_code: repair.ticket_code,
        repair_id: repair._id.toString(),
        room_code: room?.code,
        equipment_code: equipment.code,
        quick_action: {
          label: `Theo Dõi Tiến Độ Phiếu [${repair.ticket_code}]`,
          tab: 'my_tickets'
        }
      },
      read_by: [{ user_id: user._id, read_at: new Date() }]
    });
  }

  return {
    success: true,
    repair,
    room,
    equipment,
    bestTechnician,
    resolutionDeadline,
    confirmContent,
    aiConfirmMsg
  };
}

export default {
  executeAutoTicketCreation
};
