import crypto from 'crypto';
import mongoose from 'mongoose';
import { Disposal } from '../models/Disposal.js';
import { Equipment } from '../models/Equipment.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Repair } from '../models/Repair.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { assertTransition } from '../domain/stateMachines.js';
import {
  DISPOSAL_STATUSES,
  EQUIPMENT_STATUSES,
  REPAIR_OUTCOMES,
  MOVEMENT_TYPES,
  MOVEMENT_STATUSES,
  USER_ROLES,
  USER_STATUSES
} from '../config/constants.js';

export const calculateDisposalRatio = (repairCost, originalValue) => {
  const cost = Number(repairCost) || 0;
  const original = Number(originalValue) || 0;
  return original > 0 ? (cost / original) * 100 : 0;
};

const populateDisposal = (query) => query
  .populate('equipment_id', 'code name brand model price remaining_value estimated_repair_cost category_id room_id status')
  .populate('repair_id', 'ticket_code damage_level outcome status total_cost')
  .populate('proposed_by', 'full_name code role email')
  .populate('hc_reviewed_by', 'full_name code role')
  .populate('approved_by', 'full_name code role email')
  .populate('procurement.category_id', 'code name')
  .populate('procurement.room_id', 'code name')
  .populate('replacement_equipment_id', 'code qr_code name room_id');

const auditDisposal = (req, proposal, action, newValue) => AuditLog.logAction({
  user_id: req.user._id,
  user_display: `${req.user.full_name} (${req.user.code})`,
  action,
  target_table: 'disposals',
  entity_id: proposal._id.toString(),
  ip_address: req.ip || '127.0.0.1',
  new_value: newValue
});

const notifyRoles = async (roles, proposal, title, message) => {
  const recipients = await User.find({
    role: { $in: roles },
    status: USER_STATUSES.ACTIVE
  }).select('_id');
  if (recipients.length) {
    await Notification.insertMany(recipients.map(({ _id }) => ({
      user_id: _id,
      type: 'disposal_request',
      title,
      message,
      reference_type: 'disposal',
      reference_id: proposal._id
    })));
  }
};

const rejectProposal = async (req, res, allowedStatus, event) => {
  const proposal = await Disposal.findById(req.params.id);
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
  }
  if (proposal.status !== allowedStatus) {
    return res.status(409).json({ success: false, message: 'Hồ sơ không ở bước có thể từ chối.' });
  }

  assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.REJECTED, req.user.role);
  const reason = String(req.body.reject_reason || '').trim();
  if (!reason) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối hồ sơ.' });
  }

  proposal.status = DISPOSAL_STATUSES.REJECTED;
  proposal.reject_reason = reason;
  await proposal.save();

  const equipment = await Equipment.findById(proposal.equipment_id);
  if (equipment) {
    equipment.status = proposal.prior_equipment_status || EQUIPMENT_STATUSES.BROKEN;
    await equipment.save();
  }
  await auditDisposal(req, proposal, event, { status: proposal.status, reject_reason: reason });
  return res.json({ success: true, message: 'Đã từ chối hồ sơ; thiết bị được hoàn về trạng thái trước khi đề xuất.', data: proposal });
};

export const getDisposalList = async (req, res) => {
  try {
    const proposals = await populateDisposal(Disposal.find()).sort({ created_at: -1 });
    const activeEquipmentIds = await Disposal.distinct('equipment_id', {
      status: { $nin: [DISPOSAL_STATUSES.COMPLETED, DISPOSAL_STATUSES.REJECTED] }
    });
    const equipmentCandidates = await Equipment.find({
      _id: { $nin: activeEquipmentIds },
      status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] },
      $or: [
        { status: { $in: [EQUIPMENT_STATUSES.BROKEN, EQUIPMENT_STATUSES.PENDING_DISPOSAL] } },
        { $expr: { $gte: ['$estimated_repair_cost', { $multiply: ['$price', 0.6] }] } }
      ]
    }).populate('category_id room_id');
    const unrepairableRepairs = await Repair.find({
      outcome: REPAIR_OUTCOMES.UNREPAIRABLE
    }).select('_id equipment_id ticket_code');
    const unrepairableByEquipment = new Map();
    for (const repair of unrepairableRepairs) {
      const key = repair.equipment_id.toString();
      if (!unrepairableByEquipment.has(key)) unrepairableByEquipment.set(key, repair);
    }
    const candidates = equipmentCandidates.map((equipment) => {
      const repairCost = Number(equipment.estimated_repair_cost) || 0;
      const originalValue = Number(equipment.price) || 0;
      const rRatio = calculateDisposalRatio(repairCost, originalValue);
      const unrepairableRepair = unrepairableByEquipment.get(equipment._id.toString());
      return {
        ...equipment.toObject(),
        repair_cost: repairCost,
        original_value: originalValue,
        r_ratio: rRatio,
        unrepairable_repair_id: unrepairableRepair?._id || null,
        unrepairable_ticket_code: unrepairableRepair?.ticket_code || ''
      };
    }).filter((candidate) => candidate.r_ratio >= 60 || candidate.unrepairable_repair_id);

    res.json({ success: true, totalProposals: proposals.length, proposals, totalCandidates: candidates.length, candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDisposalProposal = async (req, res) => {
  try {
    const { equipment_id, repair_id, reason, recovery_value = 0 } = req.body;
    if (!mongoose.isValidObjectId(equipment_id) || !String(reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thiết bị và nhập lý do đề xuất thanh lý.' });
    }
    const numericRecovery = Number(recovery_value);
    if (!Number.isFinite(numericRecovery) || numericRecovery < 0) {
      return res.status(400).json({ success: false, message: 'Giá trị thu hồi phải là số không âm.' });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    if ([EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST].includes(equipment.status)) {
      return res.status(409).json({ success: false, message: 'Thiết bị đã thanh lý hoặc thất lạc, không thể đề xuất lại.' });
    }

    const activeProposal = await Disposal.findOne({
      equipment_id,
      status: { $nin: [DISPOSAL_STATUSES.COMPLETED, DISPOSAL_STATUSES.REJECTED] }
    });
    if (activeProposal) {
      return res.status(409).json({ success: false, message: 'Thiết bị này đã có hồ sơ thanh lý đang chờ xử lý.' });
    }

    const repairCost = Number(equipment.estimated_repair_cost) || 0;
    const originalValue = Number(equipment.price) || 0;
    const rRatio = calculateDisposalRatio(repairCost, originalValue);
    let unrepairableRepair = null;
    if (repair_id) {
      if (!mongoose.isValidObjectId(repair_id)) {
        return res.status(400).json({ success: false, message: 'Phiếu sửa chữa không hợp lệ.' });
      }
      unrepairableRepair = await Repair.findOne({
        _id: repair_id,
        equipment_id,
        outcome: REPAIR_OUTCOMES.UNREPAIRABLE
      });
      if (!unrepairableRepair) {
        return res.status(400).json({ success: false, message: 'Phiếu gắn kèm phải thuộc thiết bị này và có kết luận không thể sửa chữa.' });
      }
    }
    if (rRatio < 60 && !unrepairableRepair) {
      return res.status(422).json({
        success: false,
        message: `Chưa đủ điều kiện đề xuất: R hiện là ${rRatio}% (chi phí sửa chữa / nguyên giá), cần đạt ít nhất 60% hoặc gắn phiếu không thể sửa chữa.`
      });
    }

    const proposal = await Disposal.create({
      equipment_id: equipment._id,
      repair_id: unrepairableRepair?._id || null,
      proposed_by: req.user._id,
      reason: String(reason).trim(),
      recovery_value: numericRecovery,
      repair_cost: repairCost,
      original_value: originalValue,
      r_ratio: rRatio,
      prior_equipment_status: equipment.status,
      status: DISPOSAL_STATUSES.PROPOSED
    });
    equipment.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
    await equipment.save();
    await auditDisposal(req, proposal, 'DISPOSAL_PROPOSE', {
      equipment_id: equipment._id,
      r_ratio: rRatio,
      repair_id: unrepairableRepair?._id || null
    });
    await notifyRoles(
      [USER_ROLES.FACILITY_MANAGER],
      proposal,
      'Hồ sơ thanh lý chờ thẩm định CSVC',
      `${req.user.full_name} đề xuất thanh lý thiết bị ${equipment.code}; chỉ số R là ${rRatio}%.`
    );

    res.status(201).json({
      success: true,
      message: 'Đã gửi đề xuất; hồ sơ đang chờ Quản lý CSVC thẩm định.',
      data: proposal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const hcApproveDisposal = async (req, res) => {
  try {
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.HC_APPROVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.HC_APPROVED;
    proposal.hc_reviewed_by = req.user._id;
    proposal.hc_reviewed_at = new Date();
    proposal.hc_review_note = String(req.body.review_note || '').trim();
    await proposal.save();
    await auditDisposal(req, proposal, 'DISPOSAL_HC_APPROVE', { status: proposal.status, note: proposal.hc_review_note });
    await notifyRoles(
      [USER_ROLES.ADMIN],
      proposal,
      'Hồ sơ thanh lý chờ BGH phê duyệt',
      `CSVC đã thẩm định thiết bị ${proposal.equipment_id}; hồ sơ đang chờ quyết định BGH.`
    );
    res.json({ success: true, message: 'CSVC đã thẩm định; hồ sơ được chuyển Ban Giám Hiệu.', data: proposal });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const bghApproveDisposal = async (req, res) => {
  try {
    const decisionNumber = String(req.body.decision_number || '').trim();
    if (!decisionNumber) return res.status(400).json({ success: false, message: 'Vui lòng nhập số quyết định BGH.' });
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.BGH_APPROVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.BGH_APPROVED;
    proposal.approved_by = req.user._id;
    proposal.bgh_reviewed_by = req.user._id;
    proposal.approved_at = new Date();
    proposal.decision_number = decisionNumber;
    if (req.body.recovery_value !== undefined) {
      const recoveryValue = Number(req.body.recovery_value);
      if (!Number.isFinite(recoveryValue) || recoveryValue < 0) {
        return res.status(400).json({ success: false, message: 'Giá trị thu hồi phải là số không âm.' });
      }
      proposal.recovery_value = recoveryValue;
    }
    await proposal.save();
    await auditDisposal(req, proposal, 'DISPOSAL_BGH_APPROVE', { status: proposal.status, decision_number: decisionNumber });
    await notifyRoles(
      [USER_ROLES.FACILITY_MANAGER],
      proposal,
      'Hồ sơ thanh lý đã được BGH phê duyệt',
      `Quyết định ${decisionNumber} đã được ban hành cho thiết bị ${proposal.equipment_id}.`
    );
    res.json({ success: true, message: 'BGH đã phê duyệt; hồ sơ chuyển sang bước lập dự trù mua sắm.', data: proposal });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const updateDisposalProcurement = async (req, res) => {
  try {
    const budget = Number(req.body.budget);
    const replacementName = String(req.body.replacement_name || '').trim();
    if (!Number.isFinite(budget) || budget < 0 || !replacementName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên thiết bị thay thế và ngân sách hợp lệ.' });
    }
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.PROCUREMENT_PLANNED, req.user.role);

    const originalEquipment = await Equipment.findById(proposal.equipment_id);
    if (!originalEquipment) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị trong hồ sơ.' });
    proposal.procurement = {
      budget,
      replacement_name: replacementName,
      category_id: originalEquipment.category_id,
      room_id: originalEquipment.room_id,
      planned_at: new Date(),
      planned_by: req.user._id,
      note: String(req.body.note || '').trim()
    };
    proposal.status = DISPOSAL_STATUSES.PROCUREMENT_PLANNED;
    await proposal.save();
    await auditDisposal(req, proposal, 'DISPOSAL_PROCUREMENT_PLAN', {
      status: proposal.status,
      budget,
      replacement_name: replacementName
    });
    await notifyRoles(
      [USER_ROLES.TECHNICIAN],
      proposal,
      'Thiết bị thay thế sẵn sàng tiếp nhận',
      `Đã lập dự trù thay thế thiết bị ${originalEquipment.code}; KTV có thể ghi nhận tiếp nhận và QR.`
    );
    res.json({ success: true, message: 'Đã lưu dự trù mua sắm; hồ sơ chờ KTV tiếp nhận thiết bị thay thế.', data: proposal });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const completeDisposalReceipt = async (req, res) => {
  try {
    const { code, serial_number = '', brand = '', model = '', price } = req.body;
    if (!String(code || '').trim() || price === undefined || price === null || String(price).trim() === '' || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã tài sản và nguyên giá hợp lệ của thiết bị mới.' });
    }
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.COMPLETED, req.user.role);
    const originalEquipment = await Equipment.findById(proposal.equipment_id);
    if (!originalEquipment) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị cần thanh lý.' });
    if (!proposal.procurement?.category_id) {
      return res.status(409).json({ success: false, message: 'Hồ sơ chưa có thông tin dự trù mua sắm.' });
    }
    if (Number(price) > Number(proposal.procurement.budget)) {
      return res.status(422).json({ success: false, message: 'Nguyên giá thiết bị nhận vượt ngân sách dự trù; cần cập nhật/phê duyệt lại dự trù trước khi tiếp nhận.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const duplicateCode = await Equipment.findOne({ code: cleanCode });
    if (duplicateCode) return res.status(409).json({ success: false, message: `Mã tài sản ${cleanCode} đã tồn tại.` });
    const category = await Category.findById(proposal.procurement.category_id);
    if (!category) return res.status(409).json({ success: false, message: 'Danh mục dự trù không còn tồn tại.' });
    if (proposal.procurement.room_id && !await Room.findById(proposal.procurement.room_id)) {
      return res.status(409).json({ success: false, message: 'Phòng dự trù không còn tồn tại.' });
    }
    if (!proposal.procurement.room_id) {
      return res.status(409).json({ success: false, message: 'Thiết bị thay thế cần được phân bổ vào phòng trước khi tiếp nhận.' });
    }

    let qrCode = `QR-${cleanCode}`;
    if (await Equipment.exists({ qr_code: qrCode })) {
      qrCode = `QR-${cleanCode}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    }
    const replacement = await Equipment.create({
      code: cleanCode,
      qr_code: qrCode,
      name: proposal.procurement.replacement_name,
      serial_number: String(serial_number).trim(),
      brand: String(brand).trim(),
      model: String(model).trim(),
      category_id: proposal.procurement.category_id,
      room_id: proposal.procurement.room_id,
      price: Number(price),
      remaining_value: Number(price),
      purchase_date: new Date(),
      status: EQUIPMENT_STATUSES.IN_USE
    });
    await EquipmentMovement.create({
      equipment_id: replacement._id,
      type: MOVEMENT_TYPES.REPLACEMENT,
      from_room_id: null,
      to_room_id: proposal.procurement.room_id,
      ordered_by: req.user._id,
      performed_by: req.user._id,
      status: MOVEMENT_STATUSES.COMPLETED,
      reason: `Tiếp nhận thay thế tài sản ${originalEquipment.code}`,
      completed_at: new Date()
    });

    proposal.status = DISPOSAL_STATUSES.COMPLETED;
    proposal.replacement_equipment_id = replacement._id;
    proposal.received_by = req.user._id;
    proposal.received_at = new Date();
    proposal.completed_at = proposal.received_at;
    await proposal.save();
    originalEquipment.status = EQUIPMENT_STATUSES.DISPOSED;
    await originalEquipment.save();

    await auditDisposal(req, proposal, 'DISPOSAL_RECEIPT', {
      status: proposal.status,
      original_equipment_id: originalEquipment._id,
      replacement_equipment_id: replacement._id,
      replacement_code: replacement.code,
      qr_code: replacement.qr_code,
      room_id: replacement.room_id
    });
    res.json({
      success: true,
      message: `Đã tiếp nhận thiết bị ${replacement.code}, tạo QR ${replacement.qr_code} và hoàn tất hồ sơ thanh lý.`,
      data: proposal,
      replacement
    });
  } catch (error) {
    const status = error.statusCode || (error.code === 11000 ? 409 : 500);
    res.status(status).json({ success: false, message: error.message });
  }
};

export const approveDisposal = bghApproveDisposal;

export const rejectDisposal = async (req, res) => {
  try {
    return await rejectProposal(req, res, DISPOSAL_STATUSES.HC_APPROVED, 'DISPOSAL_BGH_REJECT');
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const rejectHcDisposal = async (req, res) => {
  try {
    return await rejectProposal(req, res, DISPOSAL_STATUSES.PROPOSED, 'DISPOSAL_HC_REJECT');
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
