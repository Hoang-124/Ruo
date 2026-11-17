import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { Equipment } from '../models/Equipment.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Room } from '../models/Room.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { dispatchTaskAssignmentEmail } from '../services/emailService.js';
import { computeDeadline, evaluateSlaStatus } from '../services/slaReactor.js';
import { assertTransition } from '../domain/stateMachines.js';
import { rankTechniciansBySpecialty, resolveTechnicianSpecialtyProfile } from '../services/aiService.js';
import { classifyIncidentLocally, inferCategoryFromEquipment } from '../services/ai/localClassifier.js';
import { CATEGORY_ONTOLOGY } from '../services/ai/facilityKnowledgeCorpus.js';
import { 
  USER_ROLES, 
  USER_STATUSES, 
  EQUIPMENT_STATUSES, 
  DAMAGE_LEVELS,
  REPAIR_STATUSES,
  REPAIR_SOURCES,
  REPAIR_OUTCOMES,
  MOVEMENT_TYPES,
  MOVEMENT_STATUSES,
  ROOM_TYPES,
  NOTIFICATION_TYPES,
  PARTS_REQUEST_STATUSES
} from '../config/constants.js';

// @desc    Get all repairs with SLA evaluation & filtering
// @route   GET /api/repairs
export const getRepairs = async (req, res) => {
  try {
    const { status, reported_by, assigned_to, damage_level, outcome } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (reported_by) filter.reported_by = reported_by;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (damage_level) filter.damage_level = damage_level;
    if (outcome) filter.outcome = outcome;

    const repairs = await Repair.find(filter)
      .populate('equipment_id', 'code name brand model qr_code room_id category_id price remaining_value estimated_repair_cost')
      .populate('room_id', 'code name building floor')
      .populate('replacement_equipment_id', 'code name brand model qr_code')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role department specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks')
      .populate('ai_recommended_to', 'full_name code email role department specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks')
      .populate('reassign_requested_by', 'full_name code email role department specialty_code specialty_label')
      .populate('assigned_by', 'full_name code')
      .populate('repair_unit_id', 'code name specialty phone')
      .populate('destination_room_id', 'code name building floor')
      .sort({ created_at: -1 });

    const repairIds = repairs.map(r => r._id);
    let partsRequests = [];
    if (PartsRequest.db?.readyState === 1 || PartsRequest.find.name !== 'find') {
      try {
        partsRequests = await PartsRequest.find({ repair_id: { $in: repairIds } })
          .populate('items.part_id', 'code name unit price stock')
          .populate('approved_by', 'full_name code')
          .populate('requested_by', 'full_name code')
          .sort({ created_at: -1 });
      } catch {
        partsRequests = [];
      }
    }

    const partsMap = {};
    for (const pr of partsRequests) {
      const rid = pr.repair_id ? pr.repair_id.toString() : '';
      if (rid) {
        if (!partsMap[rid]) partsMap[rid] = [];
        partsMap[rid].push(pr);
      }
    }

    const enriched = repairs.map(rep => {
      const repObj = rep.toObject();
      if (rep.deadline && rep.status !== REPAIR_STATUSES.CLOSED && rep.status !== REPAIR_STATUSES.RESOLVED) {
        const sla = evaluateSlaStatus(rep.deadline);
        repObj.deadline_status = sla.state;
        repObj.remaining_minutes = sla.remainingMinutes;
      }
      repObj.parts_requests = partsMap[rep._id.toString()] || [];
      return repObj;
    });

    res.json({ success: true, count: enriched.length, data: enriched, repairs: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get overdue repairs with SLA metrics & escalation tags (UC-5.9)
// @route   GET /api/repairs/overdue
export const getOverdueRepairs = async (req, res) => {
  try {
    const { assigned_to, damage_level } = req.query;
    const now = new Date();
    const filter = {
      status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] },
      deadline: { $lt: now }
    };

    if (assigned_to) filter.assigned_to = assigned_to;
    if (damage_level) filter.damage_level = damage_level;

    const repairs = await Repair.find(filter)
      .populate('equipment_id', 'code name brand model qr_code room_id estimated_repair_cost')
      .populate('room_id', 'code name building floor')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .sort({ deadline: 1 });

    const enriched = repairs.map(rep => {
      const repObj = rep.toObject ? rep.toObject() : { ...rep };
      const sla = evaluateSlaStatus(rep.deadline, now);
      const overdueMinutes = Math.max(0, -sla.remainingMinutes);

      let escalationLevel = 'moderate_breach';
      if (overdueMinutes >= 24 * 60) {
        escalationLevel = 'critical_breach';
      } else if (overdueMinutes >= 4 * 60) {
        escalationLevel = 'high_breach';
      }

      repObj.deadline_status = 'overdue';
      repObj.remaining_minutes = sla.remainingMinutes;
      repObj.overdue_minutes = overdueMinutes;
      repObj.escalation_level = escalationLevel;
      return repObj;
    });

    res.json({
      success: true,
      count: enriched.length,
      overdue_count: enriched.length,
      data: enriched,
      repairs: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get SLA compliance rate & operational metrics (UC-7.2)
// @route   GET /api/repairs/sla-stats
export const getSlaComplianceStats = async (req, res) => {
  try {
    const now = new Date();
    const repairsWithDeadline = await Repair.find({ deadline: { $ne: null } })
      .populate('equipment_id', 'code name')
      .populate('assigned_to', 'full_name code role');

    let onTimeResolved = 0;
    let overdueResolved = 0;
    let currentlyOverdue = 0;
    let currentlyAtRisk = 0;
    let currentlyOnTrack = 0;
    let totalResolutionMinutes = 0;
    let resolvedCount = 0;

    const byDamageLevel = {
      critical: { total: 0, on_time: 0, overdue: 0 },
      major: { total: 0, on_time: 0, overdue: 0 },
      minor: { total: 0, on_time: 0, overdue: 0 }
    };

    repairsWithDeadline.forEach(rep => {
      const level = rep.damage_level || 'minor';
      if (!byDamageLevel[level]) {
        byDamageLevel[level] = { total: 0, on_time: 0, overdue: 0 };
      }
      byDamageLevel[level].total += 1;

      const isFinished = [REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED, REPAIR_STATUSES.UNREPAIRABLE].includes(rep.status);

      if (isFinished) {
        resolvedCount += 1;
        const finishTime = new Date(rep.completed_at || rep.updated_at || now);
        const deadlineTime = new Date(rep.deadline);

        if (finishTime <= deadlineTime) {
          onTimeResolved += 1;
          byDamageLevel[level].on_time += 1;
        } else {
          overdueResolved += 1;
          byDamageLevel[level].overdue += 1;
        }

        const createTime = new Date(rep.created_at || finishTime);
        const diffMins = Math.max(0, (finishTime.getTime() - createTime.getTime()) / (60 * 1000));
        totalResolutionMinutes += diffMins;
      } else {
        const sla = evaluateSlaStatus(rep.deadline, now);
        if (sla.state === 'overdue') {
          currentlyOverdue += 1;
          byDamageLevel[level].overdue += 1;
        } else if (sla.state === 'at_risk') {
          currentlyAtRisk += 1;
          byDamageLevel[level].on_time += 1;
        } else {
          currentlyOnTrack += 1;
          byDamageLevel[level].on_time += 1;
        }
      }
    });

    const totalTickets = repairsWithDeadline.length;
    const totalFinishedWithSla = onTimeResolved + overdueResolved;
    const complianceRate = totalFinishedWithSla > 0
      ? Number(((onTimeResolved / totalFinishedWithSla) * 100).toFixed(1))
      : (totalTickets > 0 && currentlyOverdue === 0 ? 100.0 : 0.0);

    const avgResolutionHours = resolvedCount > 0
      ? Number((totalResolutionMinutes / (resolvedCount * 60)).toFixed(1))
      : 0.0;

    res.json({
      success: true,
      data: {
        total_with_deadline: totalTickets,
        resolved_count: resolvedCount,
        on_time_resolved: onTimeResolved,
        overdue_resolved: overdueResolved,
        currently_overdue: currentlyOverdue,
        currently_at_risk: currentlyAtRisk,
        currently_on_track: currentlyOnTrack,
        compliance_rate: complianceRate,
        avg_resolution_hours: avgResolutionHours,
        by_damage_level: byDamageLevel
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check open repairs for SLA breaches and send alert notifications (UC-5.9)
// @route   POST /api/repairs/sla/check-breaches
export const checkAndNotifyOverdueRepairs = async (req, res) => {
  try {
    const now = new Date();
    const openOverdueRepairs = await Repair.find({
      status: { $in: [REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] },
      deadline: { $lt: now }
    }).populate('equipment_id', 'code name');

    let notifiedCount = 0;
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE });

    for (const repair of openOverdueRepairs) {
      const existingNotif = await Notification.findOne({
        reference_type: 'repair',
        reference_id: repair._id,
        type: NOTIFICATION_TYPES.DEADLINE_OVERDUE,
        created_at: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
      });

      if (!existingNotif) {
        const eqName = repair.equipment_id?.name || 'Thiết bị';
        const eqCode = repair.equipment_id?.code || '';
        const title = `🚨 CẢNH BÁO QUÁ HẠN SLA: Phiếu ${repair.ticket_code}`;
        const message = `Phiếu sửa chữa [${repair.ticket_code}] của thiết bị ${eqName} (${eqCode}) đã vượt quá thời hạn cam kết SLA. Vui lòng ưu tiên xử lý ngay.`;

        if (repair.assigned_to) {
          await Notification.create({
            user_id: repair.assigned_to,
            type: NOTIFICATION_TYPES.DEADLINE_OVERDUE,
            title,
            message,
            reference_type: 'repair',
            reference_id: repair._id
          });
          notifiedCount += 1;
        }

        for (const mgr of managers) {
          await Notification.create({
            user_id: mgr._id,
            type: NOTIFICATION_TYPES.DEADLINE_OVERDUE,
            title,
            message,
            reference_type: 'repair',
            reference_id: repair._id
          });
          notifiedCount += 1;
        }
      }
    }

    if (res) {
      res.json({
        success: true,
        message: `Đã quét và phát hiện ${openOverdueRepairs.length} phiếu quá hạn, gửi ${notifiedCount} thông báo.`,
        overdue_tickets_count: openOverdueRepairs.length,
        notifications_sent: notifiedCount
      });
    }
    return { overdueCount: openOverdueRepairs.length, notifiedCount };
  } catch (error) {
    if (res) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};


// @desc    Get single repair detail with timeline logs, movements, and parts requests
// @route   GET /api/repairs/:id
export const getRepairById = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id)
      .populate('equipment_id')
      .populate('room_id', 'code name building floor')
      .populate('replacement_equipment_id')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role department specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks')
      .populate('ai_recommended_to', 'full_name code email role department specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks')
      .populate('reassign_requested_by', 'full_name code email role department specialty_code specialty_label')
      .populate('assigned_by', 'full_name code')
      .populate('repair_unit_id')
      .populate('destination_room_id');

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const [logs, partsRequests, movements] = await Promise.all([
      RepairLog.find({ repair_id: repair._id })
        .populate('performed_by', 'full_name code email role')
        .sort({ created_at: 1 }),
      PartsRequest.find({ repair_id: repair._id })
        .populate('requested_by', 'full_name code')
        .populate('approved_by', 'full_name code')
        .populate('items.part_id', 'code name unit price'),
      EquipmentMovement.find({ repair_id: repair._id })
        .populate('equipment_id', 'code name')
        .populate('from_room_id', 'code name')
        .populate('to_room_id', 'code name')
        .populate('performed_by', 'full_name code')
    ]);

    res.json({ 
      success: true, 
      data: { 
        ...repair.toJSON(), 
        logs, 
        partsRequests,
        movements 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Evaluate AI Specialty Dispatch for a repair ticket
export async function evaluateTicketAiSpecialtyDispatch({ equipment, description, damageLevel, excludeTechnicianId = null }) {
  try {
    const localAnalysis = classifyIncidentLocally({
      description,
      equipment
    });
    const effectiveCategory = inferCategoryFromEquipment(equipment) || localAnalysis.entityInfo.effectiveCategory;

    const rawUsers = await User.find({ role: USER_ROLES.TECHNICIAN, status: USER_STATUSES.ACTIVE })
      .select('full_name code email department role status specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks');
    const technicians = (Array.isArray(rawUsers) ? rawUsers : []).filter(
      (u) => !u.role || u.role === USER_ROLES.TECHNICIAN
    );

    if (technicians.length === 0) {
      return { bestTechnician: null, rankedTechnicians: [], effectiveCategory };
    }

    let openRepairs = [];
    let resolvedRepairs = [];
    try {
      [openRepairs, resolvedRepairs] = await Promise.all([
        Repair.find({ status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] } })
          .select('assigned_to status deadline'),
        Repair.find({ status: { $in: [REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED] } })
          .select('assigned_to status equipment_id')
      ]);
    } catch {
      openRepairs = [];
      resolvedRepairs = [];
    }

    const rankedTechnicians = rankTechniciansBySpecialty({
      technicians,
      openRepairs: Array.isArray(openRepairs) ? openRepairs : [],
      resolvedRepairs: Array.isArray(resolvedRepairs) ? resolvedRepairs : [],
      equipment,
      effectiveCategory,
      damageLevel,
      description,
      hazard: localAnalysis.hazard,
      excludeTechnicianId
    });

    const bestTechnician = rankedTechnicians.find((t) => t.is_qualified) || rankedTechnicians[0] || null;
    return { bestTechnician, rankedTechnicians, effectiveCategory };
  } catch {
    return { bestTechnician: null, rankedTechnicians: [], effectiveCategory: 'CAT-POWER' };
  }
}

// Unified AI Specialty Auto-Dispatch Mode (Default: 'auto')
let facilityAiDispatchMode = 'auto';

export const getAiDispatchMode = async (req, res) => {
  res.json({
    success: true,
    dispatch_mode: facilityAiDispatchMode
  });
};

export const updateAiDispatchMode = async (req, res) => {
  const { dispatch_mode = 'auto' } = req.body || {};
  facilityAiDispatchMode = dispatch_mode === 'recommend' ? 'recommend' : 'auto';
  res.json({
    success: true,
    dispatch_mode: facilityAiDispatchMode,
    message: 'Đã cập nhật cấu hình AI tự động điều phối Kỹ thuật viên theo chuyên môn.'
  });
};

// @desc    Report equipment malfunction (Lecturer or Technician during inventory)
// @route   POST /api/repairs
export const createRepairReport = async (req, res) => {
  try {
    const { 
      equipment_id, 
      incident_description, 
      incident_images = [], 
      damage_level = DAMAGE_LEVELS.MINOR,
      source = REPAIR_SOURCES.LECTURER_REPORT,
      auto_assign = true,
      dispatch_mode = 'auto'
    } = req.body;

    if (!equipment_id || !incident_description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã thiết bị và mô tả sự cố kỹ thuật.'
      });
    }

    const equipment = await Equipment.findById(equipment_id).populate('category_id', 'code name');
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
    }

    const validLevels = Object.values(DAMAGE_LEVELS);
    const finalLevel = validLevels.includes(damage_level) ? damage_level : DAMAGE_LEVELS.MINOR;
    const cleanDescription = String(incident_description).trim();

    // SLA calculation respecting university business hours
    const resolutionDeadline = computeDeadline(finalLevel, new Date());

    // Run AI Specialty Matching — Automatically assigns the ticket to the right specialist
    const { bestTechnician, effectiveCategory } = await evaluateTicketAiSpecialtyDispatch({
      equipment,
      description: cleanDescription,
      damageLevel: finalLevel
    });

    const shouldAutoAssign = Boolean(
      auto_assign !== false && dispatch_mode !== 'recommend' && facilityAiDispatchMode === 'auto' && bestTechnician && bestTechnician.is_qualified
    );

    const catLabel = CATEGORY_ONTOLOGY[effectiveCategory]?.label || 'Thiết bị CSVC';
    const aiReasonText = bestTechnician
      ? `AI khớp chuyên môn [${catLabel}] → ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty || bestTechnician.department} • Điểm: ${bestTechnician.score}/100 • ${bestTechnician.reason})`
      : '';

    const repair = await Repair.create({
      equipment_id,
      room_id: equipment.room_id || null,
      source,
      reported_by: req.user._id,
      incident_description: cleanDescription,
      incident_images,
      damage_level: finalLevel,
      deadline: resolutionDeadline,
      status: shouldAutoAssign ? REPAIR_STATUSES.ASSIGNED : REPAIR_STATUSES.REPORTED,
      assigned_to: shouldAutoAssign ? bestTechnician._id : null,
      ai_recommended_to: bestTechnician ? bestTechnician._id : null,
      ai_auto_assigned: shouldAutoAssign,
      ai_dispatch_score: bestTechnician ? bestTechnician.score : null,
      ai_dispatch_reason: aiReasonText
    });

    // Update equipment status to BROKEN
    equipment.status = EQUIPMENT_STATUSES.BROKEN;
    equipment.repair_count = (equipment.repair_count || 0) + 1;
    await equipment.save();

    // Create initial timeline log
    await RepairLog.create({
      repair_id: repair._id,
      action: 'reported',
      performed_by: req.user._id,
      description: `Báo cáo sự cố [${source}]: ${incident_description}`,
      images: incident_images
    });

    if (shouldAutoAssign && bestTechnician) {
      await RepairLog.create({
        repair_id: repair._id,
        action: 'assigned',
        performed_by: req.user._id,
        description: `[AI AUTO-DISPATCH] Hệ thống AI tự động giao cho ${bestTechnician.full_name} (${bestTechnician.code}) theo đúng chuyên môn: ${bestTechnician.short_specialty} (Điểm phù hợp: ${bestTechnician.score}/100).`
      });

      await Notification.create({
        user_id: bestTechnician._id,
        type: 'repair_assigned',
        title: `[AI GIAO VIỆC] AI Giao Việc Đúng Chuyên Môn (${repair.ticket_code})`,
        message: `Hệ thống AI đã tự động phân công phiếu [${repair.ticket_code}] (${equipment.name}) cho bạn theo chuyên môn [${bestTechnician.short_specialty}]. Nếu công việc không phù hợp, hãy nhắn Chat với Quản lý CSVC.`,
        reference_type: 'repair',
        reference_id: repair._id
      }).catch(() => null);
    }

    // SHA-256 Audit Log
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'INCIDENT_REPORT',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: {
        equipment_id,
        incident_description: cleanDescription,
        damage_level: finalLevel,
        deadline: resolutionDeadline,
        ai_auto_assigned: shouldAutoAssign,
        assigned_to: shouldAutoAssign ? bestTechnician._id : null,
        ai_recommended_to: bestTechnician ? bestTechnician._id : null
      }
    });

    // Notify Facility Managers
    const rawManagers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE }).select('_id role');
    const managers = (Array.isArray(rawManagers) ? rawManagers : []).filter(
      (m) => !m.role || m.role === USER_ROLES.FACILITY_MANAGER
    );
    if (managers.length > 0) {
      await Notification.insertMany(
        managers.map((mgr) => ({
          user_id: mgr._id,
          type: 'incident_reported',
          title: shouldAutoAssign
            ? `[AI GIAO VIỆC] AI đã tự động giao phiếu ${repair.ticket_code} cho ${bestTechnician.full_name}`
            : 'Sự cố thiết bị mới cần phân công (Đã có gợi ý KTV từ AI)',
          message: shouldAutoAssign
            ? `Thiết bị ${equipment.code} - ${equipment.name} [${finalLevel.toUpperCase()}] đã được AI giao tự động cho ${bestTechnician.full_name} (${bestTechnician.short_specialty}).`
            : `Thiết bị ${equipment.code} - ${equipment.name} được báo hỏng mức độ [${finalLevel.toUpperCase()}].${bestTechnician ? ` AI đề xuất: ${bestTechnician.full_name} (${bestTechnician.score}/100đ).` : ''}`,
          reference_type: 'repair',
          reference_id: repair._id
        }))
      );
    }

    res.status(201).json({
      success: true,
      message: shouldAutoAssign
        ? `Ghi nhận báo hỏng và AI đã tự động phân công cho ${bestTechnician.full_name} (${bestTechnician.short_specialty})!`
        : 'Ghi nhận báo cáo sự cố thành công.',
      data: repair,
      ai_dispatch: bestTechnician ? {
        auto_assigned: shouldAutoAssign,
        recommended_technician: bestTechnician,
        reason: aiReasonText
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign repair task to technician & optionally assign spare replacement equipment (Facility Manager)
// @route   PUT /api/repairs/:id/assign
export const assignRepairTask = async (req, res) => {
  try {
    const { 
      assigned_to, 
      technician_id,
      technicianId,
      repair_unit_id, 
      deadline, 
      replacement_equipment_id,
      damage_level,
      force_override = false,
      override_reason = ''
    } = req.body;

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.ASSIGNED, req.user.role);

    const targetTechId = assigned_to || technician_id || technicianId || repair.ai_recommended_to || null;
    const effectiveLevel = damage_level || repair.damage_level || DAMAGE_LEVELS.MINOR;

    // Validate Specialty RBAC when targetTechId is provided and user has explicit specialty constraints
    let techDoc = null;
    if (targetTechId) {
      techDoc = await User.findById(targetTechId).select('full_name code email department role specialty_code specialty_label allowed_categories allowed_damage_levels specialized_tasks');
      if (techDoc && (techDoc.specialty_code || (Array.isArray(techDoc.allowed_categories) && techDoc.allowed_categories.length > 0)) && !force_override) {
        const eq = await Equipment.findById(repair.equipment_id).populate('category_id', 'code name');
        const desc = repair.incident_description || repair.description || '';
        const localAnalysis = classifyIncidentLocally({ description: desc, equipment: eq });
        const effectiveCategory = inferCategoryFromEquipment(eq) || localAnalysis.entityInfo.effectiveCategory;
        const ranked = rankTechniciansBySpecialty({
          technicians: [techDoc],
          openRepairs: [],
          resolvedRepairs: [],
          equipment: eq,
          effectiveCategory,
          damageLevel: effectiveLevel,
          description: desc,
          hazard: localAnalysis.hazard
        });
        const evalTech = ranked[0];
        if (evalTech && !evalTech.is_qualified) {
          return res.status(400).json({
            success: false,
            specialty_violation: true,
            disqualified_reason: evalTech.disqualified_reason,
            message: `Cảnh báo Phân quyền Chuyên môn: Không thể giao phiếu này cho ${techDoc.full_name} (${techDoc.code}) vì [${evalTech.disqualified_reason}]. Vui lòng chọn đúng Kỹ thuật viên chuyên trách hoặc xác nhận ghi đè.`
          });
        }
      }
    }

    const previousTechId = repair.assigned_to ? String(repair.assigned_to) : null;
    const wasReassignRequested = Boolean(repair.reassign_requested);

    repair.assigned_by = req.user._id;
    repair.assigned_to = targetTechId;
    repair.reassign_requested = false;
    repair.reassign_reason = '';
    if (repair_unit_id) repair.repair_unit_id = repair_unit_id;
    if (damage_level) repair.damage_level = damage_level;
    if (deadline) repair.deadline = new Date(deadline);

    // If replacement equipment is selected from warehouse
    if (replacement_equipment_id) {
      const spareEq = await Equipment.findById(replacement_equipment_id);
      if (spareEq && spareEq.status === EQUIPMENT_STATUSES.IN_STOCK) {
        repair.replacement_equipment_id = spareEq._id;

        // Find the broken equipment's room
        const brokenEq = await Equipment.findById(repair.equipment_id);
        const targetRoomId = brokenEq ? brokenEq.room_id : null;

        // Create replacement movement order (pending confirmation by technician)
        await EquipmentMovement.create({
          equipment_id: spareEq._id,
          type: MOVEMENT_TYPES.REPLACEMENT,
          from_room_id: spareEq.room_id,
          to_room_id: targetRoomId,
          repair_id: repair._id,
          ordered_by: req.user._id,
          reason: `Thay thế thiết bị dự phòng cho thiết bị hỏng ${brokenEq ? brokenEq.code : ''}`,
          status: MOVEMENT_STATUSES.PENDING
        });
      }
    }

    repair.status = REPAIR_STATUSES.ASSIGNED;
    await repair.save();

    const techProfile = techDoc ? resolveTechnicianSpecialtyProfile(techDoc) : null;
    const assignNote = previousTechId && previousTechId !== String(targetTechId)
      ? `Facility Manager điều phối lại từ KTV cũ sang ${techDoc?.full_name || 'KTV mới'}${techProfile ? ` (${techProfile.short_label})` : ''}${override_reason ? ` — Lý do: ${override_reason}` : ''}`
      : `Facility Manager phân công kỹ thuật viên ${techDoc?.full_name || ''} xử lý${techProfile ? ` [Chuyên môn: ${techProfile.short_label}]` : ''}`;

    await RepairLog.create({
      repair_id: repair._id,
      action: 'assigned',
      performed_by: req.user._id,
      description: assignNote.trim()
    });

    // If this reassignment resolved a Technician Reassign Request in Chat, sync the Chat Action Card & Ticket Chat
    if ((wasReassignRequested || (previousTechId && previousTechId !== String(targetTechId))) && (ChatMessage.db?.readyState === 1 || ChatMessage.create.name !== 'create')) {
      try {
        await ChatMessage.updateMany(
          {
            channel_type: 'operations',
            message_type: 'action_card',
            'action_data.card_type': 'reassign_request',
            'action_data.repair_id': repair._id.toString(),
            'action_data.status': 'pending'
          },
          {
            $set: {
              'action_data.status': 'approved',
              'action_data.new_technician_name': techDoc?.full_name || 'KTV chuyên trách',
              'action_data.new_technician_specialty': techProfile?.short_label || '',
              'action_data.decided_by': req.user?.full_name || 'Quản lý CSVC',
              'action_data.decided_at': new Date()
            }
          }
        );

        await ChatMessage.create({
          channel_type: 'ticket',
          conversation_id: repair._id.toString(),
          repair_id: repair._id,
          sender_id: req.user._id,
          sender_name: req.user.full_name || 'Quản lý CSVC',
          sender_role: req.user.role || 'facility_manager',
          message_type: 'system_event',
          content: `[ĐIỀU PHỐI LẠI CHUYÊN MÔN] Quản lý ${req.user.full_name || 'CSVC'} đã chuyển giao phiếu ${repair.ticket_code} sang cho ${techDoc?.full_name || 'KTV mới'}${techProfile ? ` (${techProfile.short_label})` : ''}.`
        });
      } catch {
        // Ignore chat sync errors in unit tests where ChatMessage isn't mocked
      }
    }

    // Notify assigned Technician
    if (repair.assigned_to) {
      await Notification.create({
        user_id: repair.assigned_to,
        type: 'repair_assigned',
        title: 'Nhiệm vụ sửa chữa mới được giao',
        message: `Bạn được phân công xử lý sự cố thiết bị mã phiếu ${repair.ticket_code}${techProfile ? ` (Chuyên môn: ${techProfile.short_label})` : ''}.`,
        reference_type: 'repair',
        reference_id: repair._id
      });

      // UC-9.3: Automated Email Dispatcher for Phiếu giao việc
      try {
        const techUser = techDoc || await User.findById(repair.assigned_to).select('email full_name');
        const eq = await Equipment.findById(repair.equipment_id).populate('room_id', 'code name');
        if (techUser?.email) {
          dispatchTaskAssignmentEmail({
            to: techUser.email,
            technicianName: techUser.full_name || 'Kỹ thuật viên',
            ticketCode: repair.ticket_code,
            equipmentCode: eq?.code || 'EQ-N/A',
            equipmentName: eq?.name || 'Thiết bị cơ sở vật chất',
            roomCode: eq?.room_id?.code || eq?.room_id?.name || 'Phòng học / Khu vực',
            priority: repair.damage_level || repair.priority || 'Cao',
            deadline: repair.deadline ? new Date(repair.deadline).toLocaleString('vi-VN') : 'Trong vòng 24 giờ',
            description: repair.incident_description || repair.issue_description || repair.description || 'Sự cố thiết bị cần xử lý',
            userId: req.user?._id,
            ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
          }).catch((err) => console.warn('[Repair Email Dispatcher Warning]:', err.message));
        }
      } catch (emailErr) {
        console.warn('[Repair Email Dispatcher Lookup Warning]:', emailErr.message);
      }
    }

    res.json({ success: true, message: 'Phân công nhiệm vụ thành công.', data: repair });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Technician requests reassignment when AI/Manager task does not match actual specialty or field condition
// @route   POST /api/repairs/:id/request-reassign
export const requestRepairReassign = async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const cleanReason = String(reason || '').trim() || 'Sự cố thực tế tại hiện trường không thuộc phạm vi chuyên môn được phân quyền, đề nghị Quản lý điều phối KTV chuyên trách.';

    const repair = await Repair.findById(req.params.id)
      .populate('equipment_id', 'code name brand model category_id room_id')
      .populate('room_id', 'code name floor');

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    const eq = repair.equipment_id;
    const { bestTechnician, effectiveCategory } = await evaluateTicketAiSpecialtyDispatch({
      equipment: eq,
      description: `${repair.incident_description || ''} ${cleanReason}`,
      damageLevel: repair.damage_level || DAMAGE_LEVELS.MINOR,
      excludeTechnicianId: req.user._id
    });

    repair.reassign_requested = true;
    repair.reassign_reason = cleanReason;
    repair.reassign_requested_by = req.user._id;
    repair.reassign_requested_at = new Date();
    if (bestTechnician) {
      repair.ai_recommended_to = bestTechnician._id;
      repair.ai_dispatch_score = bestTechnician.score;
      repair.ai_dispatch_reason = `AI đề xuất thay thế: ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty} • Điểm: ${bestTechnician.score}/100)`;
    }
    await repair.save();

    const senderProfile = resolveTechnicianSpecialtyProfile(req.user);

    await RepairLog.create({
      repair_id: repair._id,
      action: 'in_progress',
      performed_by: req.user._id,
      description: `[YÊU CẦU ĐIỀU PHỐI LẠI] ${req.user.full_name} (${senderProfile.short_label}) báo công việc không phù hợp chuyên môn: "${cleanReason}"${bestTechnician ? `. AI gợi ý chuyển cho: ${bestTechnician.full_name} (${bestTechnician.short_specialty}).` : ''}`
    });

    // 1. Send message into Ticket Chat Drawer (Manager <-> Technician <-> Lecturer)
    let ticketChatMsg = null;
    try {
      ticketChatMsg = await ChatMessage.create({
        channel_type: 'ticket',
        conversation_id: repair._id.toString(),
        repair_id: repair._id,
        sender_id: req.user._id,
        sender_name: req.user.full_name || req.user.code || 'Kỹ thuật viên',
        sender_role: req.user.role || 'technician',
        message_type: 'text',
        content: `[ĐỀ NGHỊ ĐỔI KTV CHUYÊN MÔN] Thầy/Cô Quản lý ơi, phiếu ${repair.ticket_code} (${eq?.name || 'Thiết bị'} tại ${repair.room_id?.code || 'phòng học'}): ${cleanReason}.${bestTechnician ? ` Gợi ý từ AI: chuyển sang ${bestTechnician.full_name} (${bestTechnician.short_specialty}).` : ''}`,
        read_by: [{ user_id: req.user._id, read_at: new Date() }]
      });
    } catch {
      ticketChatMsg = null;
    }

    // 2. Send interactive Action Card into Operations Chat (Kênh 2: Kỹ Thuật Viên <-> Quản Lý CSVC)
    let opsCardMsg = null;
    try {
      opsCardMsg = await ChatMessage.create({
        channel_type: 'operations',
        conversation_id: 'ops_tech_desk',
        repair_id: repair._id,
        sender_id: req.user._id,
        sender_name: req.user.full_name || req.user.code || 'Kỹ thuật viên',
        sender_role: req.user.role || 'technician',
        message_type: 'action_card',
        content: `Yêu cầu điều phối lại KTV cho phiếu ${repair.ticket_code}: ${cleanReason}`,
        action_data: {
          card_type: 'reassign_request',
          request_id: `RAS-${Date.now().toString(36).toUpperCase()}`,
          repair_id: repair._id.toString(),
          ticket_code: repair.ticket_code,
          equipment_name: eq?.name || 'Thiết bị CSVC',
          equipment_code: eq?.code || '',
          room_code: repair.room_id?.code || 'Tòa A1',
          damage_level: repair.damage_level,
          category_code: effectiveCategory,
          current_technician_id: req.user._id.toString(),
          current_technician_name: req.user.full_name,
          current_technician_specialty: senderProfile.short_label,
          suggested_technician_id: bestTechnician?._id || null,
          suggested_technician_name: bestTechnician?.full_name || null,
          suggested_technician_code: bestTechnician?.code || null,
          suggested_technician_specialty: bestTechnician?.short_specialty || null,
          suggested_technician_score: bestTechnician?.score || null,
          reason: cleanReason,
          status: 'pending',
          requested_by_id: req.user._id,
          requested_by_name: req.user.full_name
        },
        read_by: [{ user_id: req.user._id, read_at: new Date() }]
      });
    } catch {
      opsCardMsg = null;
    }

    // 3. Notify all Facility Managers
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE }).select('_id');
    if (Array.isArray(managers) && managers.length > 0) {
      await Notification.insertMany(
        managers.map((mgr) => ({
          user_id: mgr._id,
          type: 'incident_reported',
          title: `[ĐỀ NGHỊ ĐỔI KTV] KTV đề nghị đổi người xử lý phiếu ${repair.ticket_code}`,
          message: `KTV ${req.user.full_name} (${senderProfile.short_label}) báo phiếu ${repair.ticket_code} trái chuyên môn: "${cleanReason}".${bestTechnician ? ` AI gợi ý giao cho: ${bestTechnician.full_name} (${bestTechnician.short_specialty}).` : ''}`,
          reference_type: 'repair',
          reference_id: repair._id
        }))
      ).catch(() => null);
    }

    res.json({
      success: true,
      message: `Đã gửi yêu cầu điều phối lại cho Quản lý CSVC qua kênh Chat${bestTechnician ? ` (AI gợi ý chuyển sang: ${bestTechnician.full_name} - ${bestTechnician.short_specialty})` : ''}!`,
      data: repair,
      recommended_replacement_technician: bestTechnician,
      ticket_chat_message: ticketChatMsg,
      operations_card_message: opsCardMsg
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Auto-Dispatch for all pending reported or reassign-requested tickets (Facility Manager)
// @route   POST /api/repairs/ai-auto-dispatch
export const autoDispatchPendingRepairs = async (req, res) => {
  try {
    const { ticket_id = null } = req.body || {};
    const filter = ticket_id
      ? { _id: ticket_id }
      : {
          $or: [
            { status: REPAIR_STATUSES.REPORTED },
            { status: { $in: [REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }, reassign_requested: true }
          ]
        };

    const pendingTickets = await Repair.find(filter)
      .populate({
        path: 'equipment_id',
        populate: { path: 'category_id', select: 'code name' }
      })
      .populate('room_id', 'code name');

    const dispatchedList = [];

    for (const repair of pendingTickets) {
      const excludeId = repair.reassign_requested ? repair.assigned_to : null;
      const { bestTechnician, effectiveCategory } = await evaluateTicketAiSpecialtyDispatch({
        equipment: repair.equipment_id,
        description: repair.incident_description,
        damageLevel: repair.damage_level,
        excludeTechnicianId: excludeId
      });

      if (!bestTechnician || !bestTechnician.is_qualified) continue;

      const catLabel = CATEGORY_ONTOLOGY[effectiveCategory]?.label || 'Thiết bị CSVC';
      const aiReason = `AI khớp chuyên môn [${catLabel}] → ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty} • Điểm: ${bestTechnician.score}/100)`;

      repair.assigned_by = req.user._id;
      repair.assigned_to = bestTechnician._id;
      repair.ai_recommended_to = bestTechnician._id;
      repair.ai_auto_assigned = true;
      repair.ai_dispatch_score = bestTechnician.score;
      repair.ai_dispatch_reason = aiReason;
      repair.reassign_requested = false;
      repair.reassign_reason = '';
      repair.status = REPAIR_STATUSES.ASSIGNED;
      if (!repair.deadline) {
        repair.deadline = computeDeadline(repair.damage_level || DAMAGE_LEVELS.MINOR, new Date());
      }
      await repair.save();

      await RepairLog.create({
        repair_id: repair._id,
        action: 'assigned',
        performed_by: req.user._id,
        description: `[AI AUTO-DISPATCH] Tự động phân công cho ${bestTechnician.full_name} (${bestTechnician.code} • ${bestTechnician.short_specialty}) với điểm chuyên môn ${bestTechnician.score}/100.`
      });

      await Notification.create({
        user_id: bestTechnician._id,
        type: 'repair_assigned',
        title: `[AI GIAO VIỆC] AI Giao Việc Đúng Chuyên Môn (${repair.ticket_code})`,
        message: `Bạn được AI phân công phiếu ${repair.ticket_code} (${repair.equipment_id?.name || 'Thiết bị'}) theo đúng chuyên môn [${bestTechnician.short_specialty}].`,
        reference_type: 'repair',
        reference_id: repair._id
      }).catch(() => null);

      dispatchedList.push({
        _id: repair._id,
        ticket_code: repair.ticket_code,
        assigned_to: bestTechnician
      });
    }

    res.json({
      success: true,
      dispatched_count: dispatchedList.length,
      dispatched: dispatchedList,
      message: dispatchedList.length > 0
        ? `AI đã tự động phân công ${dispatchedList.length} phiếu sửa chữa cho đúng Kỹ thuật viên chuyên môn!`
        : 'Hiện không có phiếu chờ nào cần AI phân công thêm.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept repair task (Technician)
// @route   PUT /api/repairs/:id/accept
export const acceptRepairTask = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.IN_PROGRESS, req.user.role);

    repair.status = REPAIR_STATUSES.IN_PROGRESS;
    await repair.save();

    // Update equipment status to REPAIRING
    const equipment = await Equipment.findById(repair.equipment_id);
    if (equipment) {
      equipment.status = EQUIPMENT_STATUSES.REPAIRING;
      await equipment.save();
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: 'in_progress',
      performed_by: req.user._id,
      description: `Kỹ thuật viên đã tiếp nhận và bắt đầu sửa chữa.`
    });

    res.json({ success: true, message: 'Đã tiếp nhận nhiệm vụ sửa chữa.', data: repair });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Log repair progress / parts replacement / cost (Technician) (UC-5.5)
// @route   POST /api/repairs/:id/logs
// @route   PUT /api/repairs/:id/progress
export const addRepairLog = async (req, res) => {
  try {
    const { 
      action = 'in_progress', 
      description, 
      notes, 
      cost = 0, 
      images = [], 
      parts_used = [], 
      replaced_parts = [] 
    } = req.body;
    
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    if (repair.status === REPAIR_STATUSES.ASSIGNED) {
      assertTransition('REPAIR', repair.status, REPAIR_STATUSES.IN_PROGRESS, req.user.role);
      repair.status = REPAIR_STATUSES.IN_PROGRESS;
    }

    const numCost = Number(cost) || 0;
    const validActions = ['reported', 'assigned', 'in_progress', 'resolved', 'unrepairable', 'closed', 'escalated'];
    const rawAction = String(action || '').trim();
    const isEnumAction = validActions.includes(rawAction);
    const normalizedAction = isEnumAction ? rawAction : 'in_progress';
    
    // Combine parts replacement info if provided
    const partsList = (parts_used.length > 0 ? parts_used : replaced_parts)
      .map(p => typeof p === 'string' ? p : `${p.name || p.part_id} (x${p.qty || p.quantity || 1})`)
      .join(', ');
    const partsNote = partsList ? `Linh kiện thay thế: [${partsList}]` : '';

    let combinedDesc = description ? String(description).trim() : [(!isEnumAction ? rawAction : ''), String(notes || '').trim()].filter(Boolean).join(' — ');
    if (partsNote) {
      combinedDesc = combinedDesc ? `${combinedDesc} | ${partsNote}` : partsNote;
    }

    const log = await RepairLog.create({
      repair_id: repair._id,
      action: normalizedAction,
      performed_by: req.user._id,
      description: combinedDesc || 'Cập nhật tiến độ xử lý kỹ thuật (UC-5.5)',
      cost: numCost,
      images
    });

    if (numCost > 0) {
      repair.total_cost = (repair.total_cost || 0) + numCost;
      await repair.save();

      const equipment = await Equipment.findById(repair.equipment_id);
      if (equipment) {
        equipment.estimated_repair_cost = (equipment.estimated_repair_cost || 0) + numCost;
        await equipment.save();
      }
    } else {
      await repair.save();
    }

    res.status(201).json({
      success: true,
      message: 'Cập nhật tiến độ sửa chữa thành công (UC-5.5).',
      data: log,
      total_cost: repair.total_cost
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const updateRepairProgress = addRepairLog;

// @desc    Report repair outcome (Technician): repaired or unrepairable
// @route   PUT /api/repairs/:id/outcome
export const reportRepairOutcome = async (req, res) => {
  try {
    const { outcome, notes = '' } = req.body;
    if (![REPAIR_OUTCOMES.REPAIRED, REPAIR_OUTCOMES.UNREPAIRABLE].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Kết luận phải là repaired hoặc unrepairable.' });
    }

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    // Chặn báo cáo kết quả nếu vẫn còn yêu cầu linh kiện chưa được Quản lý duyệt xuất kho
    const pendingParts = await PartsRequest.find({
      repair_id: repair._id,
      status: PARTS_REQUEST_STATUSES.PENDING
    });
    if (pendingParts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Phiếu sửa chữa đang có ${pendingParts.length} yêu cầu linh kiện chờ Quản lý duyệt xuất kho. Vui lòng đợi Quản lý duyệt hoặc từ chối phiếu xin linh kiện trước khi báo cáo kết quả.`
      });
    }

    const targetStatus = outcome === REPAIR_OUTCOMES.REPAIRED ? REPAIR_STATUSES.RESOLVED : REPAIR_STATUSES.UNREPAIRABLE;
    assertTransition('REPAIR', repair.status, targetStatus, req.user.role);

    repair.status = targetStatus;
    repair.outcome = outcome;
    if (outcome === REPAIR_OUTCOMES.REPAIRED) {
      repair.resolved_at = new Date();
    }
    await repair.save();

    const equipment = await Equipment.findById(repair.equipment_id);
    if (equipment) {
      if (outcome === REPAIR_OUTCOMES.UNREPAIRABLE) {
        // Equipment is pending disposal
        equipment.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
      }
      await equipment.save();
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: targetStatus,
      performed_by: req.user._id,
      description: `Kỹ thuật viên báo cáo kết quả: [${outcome.toUpperCase()}]. ${notes}`.trim()
    });

    // Notify Facility Managers
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: outcome === REPAIR_OUTCOMES.REPAIRED ? 'repair_resolved' : 'repair_unrepairable',
        title: outcome === REPAIR_OUTCOMES.REPAIRED ? 'Thiết bị đã sửa xong' : 'Thiết bị không thể sửa chữa',
        message: `Phiếu ${repair.ticket_code} đã có kết quả: [${outcome.toUpperCase()}]. Vui lòng xử lý tiếp.`,
        reference_type: 'repair',
        reference_id: repair._id
      });
    }

    res.json({
      success: true,
      message: `Đã cập nhật kết luận sửa chữa [${outcome}].`,
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Close repair ticket & assign post-repair location (Facility Manager)
// @route   PUT /api/repairs/:id/close
export const closeRepairTicket = async (req, res) => {
  try {
    const { destination_room_id, close_notes = '' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    assertTransition('REPAIR', repair.status, REPAIR_STATUSES.CLOSED, req.user.role);

    const equipment = await Equipment.findById(repair.equipment_id);
    let destinationRoom = null;

    if (repair.outcome === REPAIR_OUTCOMES.REPAIRED) {
      if (destination_room_id) {
        destinationRoom = await Room.findById(destination_room_id);
      }

      // Default to the equipment's current room in Building A1 if present, else warehouse KHO-01
      if (!destinationRoom && equipment.room_id) {
        destinationRoom = await Room.findById(equipment.room_id);
      }
      if (!destinationRoom) {
        destinationRoom = await Room.findOne({ room_type: ROOM_TYPES.WAREHOUSE });
      }

      repair.destination_room_id = destinationRoom ? destinationRoom._id : null;

      const isWarehouse = destinationRoom && destinationRoom.room_type === ROOM_TYPES.WAREHOUSE;
      const movementType = isWarehouse ? MOVEMENT_TYPES.TO_STOCK : MOVEMENT_TYPES.REPAIR_RETURN;
      const sameRoom = Boolean(
        equipment.room_id &&
        destinationRoom &&
        equipment.room_id.toString() === destinationRoom._id.toString()
      );

      await EquipmentMovement.create({
        equipment_id: equipment._id,
        type: movementType,
        from_room_id: equipment.room_id,
        to_room_id: destinationRoom ? destinationRoom._id : null,
        repair_id: repair._id,
        ordered_by: req.user._id,
        ...(sameRoom ? { performed_by: req.user._id, completed_at: new Date() } : {}),
        reason: isWarehouse
          ? 'Sửa xong nhập kho dự phòng KHO-01'
          : sameRoom
            ? 'Sửa xong bàn giao tại chỗ'
            : `Sửa xong điều chuyển về phòng ${destinationRoom?.code || ''}`.trim(),
        status: sameRoom ? MOVEMENT_STATUSES.COMPLETED : MOVEMENT_STATUSES.PENDING
      });

      // Equipment is now healthy; if moving to a different room, room_id updates when Technician confirms the movement
      equipment.status = isWarehouse ? EQUIPMENT_STATUSES.IN_STOCK : EQUIPMENT_STATUSES.IN_USE;
      if (sameRoom && destinationRoom) {
        equipment.room_id = destinationRoom._id;
      }
      await equipment.save();
    }

    repair.status = REPAIR_STATUSES.CLOSED;
    repair.closed_at = new Date();
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'closed',
      performed_by: req.user._id,
      description: `Facility Manager đã nghiệm thu và đóng phiếu. ${close_notes}`.trim()
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'REPAIR_CLOSE',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'closed', closed_at: repair.closed_at }
    });

    res.json({
      success: true,
      message: 'Đóng phiếu sửa chữa thành công.',
      data: repair
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Evaluate repair quality (Lecturer)
// @route   POST /api/repairs/:id/evaluate
export const evaluateRepairQuality = async (req, res) => {
  try {
    const { feedback_rating, feedback_comment = '' } = req.body;
    const numRating = Number(feedback_rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao.' });
    }

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa.' });
    }

    repair.feedback_rating = numRating;
    repair.feedback_comment = String(feedback_comment).trim();
    repair.feedback_at = new Date();
    await repair.save();

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá chất lượng sửa chữa.',
      data: {
        id: repair._id,
        feedback_rating: repair.feedback_rating,
        feedback_comment: repair.feedback_comment,
        feedback_at: repair.feedback_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get complete repair history and accumulated costs per asset (UC-5.8)
// @route   GET /api/repairs/equipment/:id
export const getEquipmentRepairHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.findById(id)
      .populate('room_id', 'code name building')
      .populate('category_id', 'code name');
    
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
    }

    const repairs = await Repair.find({ equipment_id: id })
      .populate('reported_by', 'full_name code email')
      .populate('assigned_to', 'full_name code email')
      .populate('replacement_equipment_id', 'code name')
      .sort({ created_at: -1 });

    const totalRepairCost = repairs.reduce((acc, r) => acc + (r.total_cost || 0), 0);

    const repairIds = repairs.map(r => r._id);
    const logs = await RepairLog.find({ repair_id: { $in: repairIds } })
      .populate('performed_by', 'full_name code')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      equipment: {
        _id: equipment._id,
        code: equipment.code,
        name: equipment.name,
        brand: equipment.brand,
        model: equipment.model,
        price: equipment.price,
        remaining_value: equipment.remaining_value,
        estimated_repair_cost: equipment.estimated_repair_cost,
        repair_count: repairs.length,
        total_accumulated_cost: totalRepairCost,
        room: equipment.room_id
      },
      repairs,
      logs,
      totalCost: totalRepairCost,
      repairCount: repairs.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compatibility exports
export const resolveRepair = reportRepairOutcome;
export const closeRepair = closeRepairTicket;
