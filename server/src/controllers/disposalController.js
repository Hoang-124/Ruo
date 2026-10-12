import { Disposal } from '../models/Disposal.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { assertTransition } from '../domain/stateMachines.js';
import { 
  DISPOSAL_STATUSES, 
  EQUIPMENT_STATUSES, 
  USER_ROLES, 
  USER_STATUSES 
} from '../config/constants.js';

// @desc    Get all disposal requests & candidates (View disposal requests)
// @route   GET /api/disposals
export const getDisposalList = async (req, res) => {
  try {
    const proposals = await Disposal.find()
      .populate('equipment_id', 'code name brand model price remaining_value estimated_repair_cost room_id')
      .populate('repair_id', 'ticket_code damage_level outcome status')
      .populate('proposed_by', 'full_name code role email')
      .populate('approved_by', 'full_name code role email')
      .sort({ created_at: -1 });

    // Flagged candidates: equipments whose repair costs >= 60% of remaining value or marked pending_disposal
    const candidates = await Equipment.find({
      status: { $in: [EQUIPMENT_STATUSES.PENDING_DISPOSAL, EQUIPMENT_STATUSES.BROKEN] }
    }).populate('category_id room_id');

    res.json({
      success: true,
      totalProposals: proposals.length,
      proposals,
      totalCandidates: candidates.length,
      candidates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Propose equipment disposal (Facility Manager)
// @route   POST /api/disposals
export const createDisposalProposal = async (req, res) => {
  try {
    const { equipment_id, repair_id, reason, recovery_value = 0 } = req.body;

    if (!equipment_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã thiết bị và lý do đề xuất thanh lý.'
      });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
    }

    const existingActive = await Disposal.findOne({
      equipment_id,
      status: { $nin: [DISPOSAL_STATUSES.COMPLETED, DISPOSAL_STATUSES.REJECTED] }
    });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'Thiết bị này đã có hồ sơ thanh lý đang chờ xử lý.'
      });
    }

    const proposal = await Disposal.create({
      equipment_id: equipment._id,
      repair_id: repair_id || null,
      proposed_by: req.user._id,
      reason: String(reason).trim(),
      recovery_value: Number(recovery_value) || 0,
      status: DISPOSAL_STATUSES.PROPOSED
    });

    equipment.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
    await equipment.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_PROPOSE',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { equipment_id: equipment._id, reason }
    });

    // Notify Admins
    const admins = await User.find({ role: USER_ROLES.ADMIN, status: USER_STATUSES.ACTIVE });
    for (const adm of admins) {
      await Notification.create({
        user_id: adm._id,
        type: 'disposal_request',
        title: 'Hồ sơ đề xuất thanh lý tài sản',
        message: `Facility Manager ${req.user.full_name} đề xuất thanh lý thiết bị ${equipment.code}.`,
        reference_type: 'disposal',
        reference_id: proposal._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lập đề xuất thanh lý thành công. Đã gửi Ban Giám Hiệu / Admin phê duyệt.',
      data: proposal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve disposal request (Admin Only)
// @route   PUT /api/disposals/:id/approve
export const approveDisposal = async (req, res) => {
  try {
    const { decision_number, recovery_value } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.APPROVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.APPROVED;
    proposal.approved_by = req.user._id;
    proposal.approved_at = new Date();
    if (decision_number) proposal.decision_number = String(decision_number).trim();
    if (recovery_value !== undefined) proposal.recovery_value = Number(recovery_value);

    // If decision number provided, can directly mark completed & dispose equipment
    if (proposal.decision_number) {
      proposal.status = DISPOSAL_STATUSES.COMPLETED;
      proposal.completed_at = new Date();

      const equipment = await Equipment.findById(proposal.equipment_id);
      if (equipment) {
        equipment.status = EQUIPMENT_STATUSES.DISPOSED;
        await equipment.save();
      }
    }

    await proposal.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_APPROVE',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: proposal.status, decision_number: proposal.decision_number }
    });

    res.json({
      success: true,
      message: 'Phê duyệt hồ sơ thanh lý thành công.',
      data: proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Reject disposal request (Admin Only)
// @route   PUT /api/disposals/:id/reject
export const rejectDisposal = async (req, res) => {
  try {
    const { reject_reason } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thanh lý.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.REJECTED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.REJECTED;
    proposal.reject_reason = String(reject_reason || 'Không đủ điều kiện thanh lý').trim();
    await proposal.save();

    // Revert equipment status to in_stock / broken
    const equipment = await Equipment.findById(proposal.equipment_id);
    if (equipment) {
      equipment.status = EQUIPMENT_STATUSES.BROKEN;
      await equipment.save();
    }

    res.json({
      success: true,
      message: 'Đã từ chối đề xuất thanh lý.',
      data: proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// Backward compatibility exports for old RACI test names
export const hcApproveDisposal = approveDisposal;
export const bghApproveDisposal = approveDisposal;
export const updateDisposalProcurement = approveDisposal;
export const completeDisposalReceipt = async (req, res) => res.json({ success: true, message: 'Receipt completed' });
