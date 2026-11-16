import mongoose from 'mongoose';
import {
  Repair,
  RepairLog,
  Equipment,
  Room,
  Notification,
  AuditLog,
  ChatMessage,
  User
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
 * Follows university standard operating procedure (SOP):
 * 1. Lecturer submits report -> Status is REPORTED (Chờ Quản lý CSVC tiếp nhận & phân công).
 * 2. AI calculates SLA & recommends the best qualified domain specialist to the Facility Manager.
 * 3. Facility Manager receives real-time notification to review and officially assign the Technician.
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
    const isAssigned = ['assigned', 'in_progress'].includes(existingTicket.status);
    const ktvName = existingTicket.assigned_to?.full_name || 'chuyên môn';
    const ktvPhone = existingTicket.assigned_to?.phone || '0987654321';
    const statusText = isAssigned
      ? `đang được KTV ${ktvName} (SĐT: ${ktvPhone}) tiếp nhận xử lý`
      : 'đang chờ Quản lý CSVC tiếp nhận và phân công Kỹ thuật viên';

    return {
      success: false,
      isDuplicate: true,
      message: `Thiết bị [${equipment.name}] đã có yêu cầu báo hỏng [${existingTicket.ticket_code}] ${statusText}. Thầy/Cô không cần tạo thêm yêu cầu trùng lặp.`,
      repair: existingTicket
    };
  }

  const validLevels = Object.values(DAMAGE_LEVELS);
  const finalLevel = validLevels.includes(damageLevel) ? damageLevel : DAMAGE_LEVELS.MINOR;
  const cleanDescription = String(incidentDescription).trim() ||
    `Phản ánh sự cố thiết bị [${equipment.name}] qua Ruo Cortex AI Copilot`;

  // Compute SLA resolution deadline
  const resolutionDeadline = computeDeadline(finalLevel, new Date());

  // Evaluate AI Specialty Dispatch recommendation for Facility Manager
  const { bestTechnician, effectiveCategory } = await evaluateTicketAiSpecialtyDispatch({
    equipment,
    description: cleanDescription,
    damageLevel: finalLevel
  });

  const specialtyReason = bestTechnician
    ? `AI đề xuất KTV chuyên môn [${effectiveCategory}] → ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty || bestTechnician.department})`
    : 'Chờ Quản lý CSVC phân công KTV';

  // Create official repair ticket with status REPORTED (Chờ Quản lý CSVC tiếp nhận & phân công)
  const repair = await Repair.create({
    equipment_id: equipment._id,
    room_id: room ? room._id : null,
    source: REPAIR_SOURCES.LECTURER_REPORT,
    reported_by: user._id,
    incident_description: cleanDescription,
    damage_level: finalLevel,
    deadline: resolutionDeadline,
    status: REPAIR_STATUSES.REPORTED,
    assigned_to: null,
    ai_recommended_to: bestTechnician ? bestTechnician._id : null,
    ai_auto_assigned: false,
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
    description: `Giảng viên gửi yêu cầu báo sự cố qua Ruo Cortex AI Copilot: ${cleanDescription}`
  });

  // Gửi thông báo đến Quản lý CSVC (Facility Managers) để tiếp nhận & phân công KTV trên Kanban
  const rawManagers = await User.find({ role: 'facility_manager', status: 'active' }).select('_id full_name code');
  const managers = Array.isArray(rawManagers) ? rawManagers : [];
  if (managers.length > 0) {
    await Notification.insertMany(
      managers.map((mgr) => ({
        user_id: mgr._id,
        type: 'incident_reported',
        title: `Yêu cầu báo hỏng mới [${repair.ticket_code}]`,
        message: `Giảng viên ${user.full_name || user.name || user.code} vừa gửi yêu cầu báo hỏng [${equipment.name}] tại phòng ${room?.code || ''}.${bestTechnician ? ` AI đề xuất KTV: ${bestTechnician.full_name} (${bestTechnician.short_specialty}).` : ''} Vui lòng tiếp nhận và phân công KTV.`,
        reference_type: 'repair',
        reference_id: repair._id,
        entity_id: repair._id.toString(),
        entity_model: 'Repair'
      }))
    ).catch((err) => console.warn('Lỗi gửi thông báo cho Quản lý CSVC:', err.message));
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
      ai_recommended_to: bestTechnician?.code,
      deadline: resolutionDeadline,
      status: 'reported'
    }
  });

  const deadlineFormatted = new Date(resolutionDeadline).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const confirmContent = `**[ĐÃ GỬI YÊU CẦU BÁO HỎNG ĐẾN QUẢN LÝ CSVC]**\n\n` +
    `Ruo Cortex AI đã chuyển tiếp yêu cầu kỹ thuật của Thầy/Cô đến Ban Quản lý CSVC:\n` +
    `- **Mã yêu cầu:** \`[${repair.ticket_code}]\`\n` +
    `- **Tài sản báo hỏng:** [${equipment.code}] ${equipment.name}\n` +
    `- **Vị trí phòng học:** ${room ? `${room.code} - ${room.name}` : 'Tòa nhà A1'}\n` +
    `- **Trạng thái:** **Chờ Quản lý CSVC tiếp nhận & phân công KTV**\n` +
    (bestTechnician ? `- **KTV đề xuất (AI Gợi ý):** ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty || bestTechnician.department})\n` : '') +
    `- **Cam kết thời hạn SLA:** **${deadlineFormatted}**\n\n` +
    `Yêu cầu của Thầy/Cô đã được chuyển trực tiếp đến Ban Quản lý CSVC. Quản lý sẽ tiếp nhận và giao việc cho Kỹ thuật viên xuống kiểm tra theo đúng quy trình vận hành!`;

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
          label: `Theo Dõi Tiến Độ Yêu Cầu [${repair.ticket_code}]`,
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
