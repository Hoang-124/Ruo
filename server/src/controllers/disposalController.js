import { Disposal } from '../models/Disposal.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { assertTransition } from '../domain/stateMachines.js';
import { DISPOSAL_STATUSES, EQUIPMENT_STATUSES, DISPOSAL_R_RATIO_THRESHOLD, USER_ROLES, USER_STATUSES } from '../config/constants.js';

// @desc    Get all disposal proposals & flagged candidate equipments (R >= 60%)
// @route   GET /api/disposals
export const getDisposalList = async (req, res) => {
  try {
    const proposals = await Disposal.find()
      .populate('equipment_id', 'code name brand model price remaining_value estimated_repair_cost room_id')
      .populate('proposed_by', 'full_name code role email')
      .populate('manager_approved_by', 'full_name code role')
      .populate('admin_approved_by', 'full_name code role')
      .populate('received_by', 'full_name code role')
      .sort({ created_at: -1 });

    // Flagged candidates: active equipments whose repair costs >= 60% of remaining value
    const equipments = await Equipment.find({
      status: { $in: [EQUIPMENT_STATUSES.ACTIVE, EQUIPMENT_STATUSES.REPAIRING, EQUIPMENT_STATUSES.PENDING_DISPOSAL] }
    }).populate('category_id room_id');

    const candidates = equipments.filter(eq => eq.rRatio >= DISPOSAL_R_RATIO_THRESHOLD);

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

// @desc    Step 1: Initiate a 5-step disposal proposal (Staff, Admin)
// @route   POST /api/disposals
export const createDisposalProposal = async (req, res) => {
  try {
    const { equipment_id, reason, decision_number, recovery_value = 0 } = req.body;

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
      status: { $nin: ['received', 'rejected'] }
    });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'Thiết bị này đã có một hồ sơ thanh lý đang trong tiến trình xử lý.'
      });
    }

    const proposal = await Disposal.create({
      equipment_id: equipment._id,
      proposed_by: req.user._id,
      reason: String(reason).trim(),
      decision_number: decision_number || '',
      recovery_value: Number(recovery_value) || 0,
      current_step: 1,
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
      new_value: { equipment_id: equipment._id, reason, rRatio: equipment.rRatio }
    });

    // Notify Managers
    const managers = await User.find({ role: USER_ROLES.MANAGER, status: USER_STATUSES.ACTIVE });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: 'disposal_proposed',
        title: 'Đề xuất thanh lý tài sản mới',
        message: `Nhân viên ${req.user.full_name} đã đề xuất thanh lý thiết bị ${equipment.code} - ${equipment.name}.`,
        reference_type: 'disposal',
        reference_id: proposal._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lập hồ sơ đề xuất thanh lý thành công. Hồ sơ đã chuyển đến Quản lý Phòng HC xét duyệt.',
      proposal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 2: Manager HC Approves (Manager, Admin)
// @route   PUT /api/disposals/:id/hc-approve
export const hcApproveDisposal = async (req, res) => {
  try {
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.HC_APPROVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.HC_APPROVED;
    proposal.current_step = 2;
    proposal.manager_approved_by = req.user._id;
    proposal.manager_approved_at = new Date();
    await proposal.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_HC_APPROVE',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: proposal.status, current_step: 2 }
    });

    res.json({
      success: true,
      message: 'Phòng Hành Chính đã phê duyệt hồ sơ thanh lý. Chuyển tiếp lên Ban Giám Hiệu phê duyệt.',
      proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Step 3: BGH / Admin Approves (Admin Only)
// @route   PUT /api/disposals/:id/bgh-approve
export const bghApproveDisposal = async (req, res) => {
  try {
    const { decision_number } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.BGH_APPROVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.BGH_APPROVED;
    proposal.current_step = 3;
    proposal.admin_approved_by = req.user._id;
    proposal.admin_approved_at = new Date();
    if (decision_number) proposal.decision_number = decision_number;
    await proposal.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_BGH_APPROVE',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: proposal.status, decision_number: proposal.decision_number }
    });

    res.json({
      success: true,
      message: 'Ban Giám Hiệu đã ban hành quyết định phê duyệt thanh lý tài sản.',
      proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Step 4: Procurement Plan Update (Manager, Admin)
// @route   PUT /api/disposals/:id/procurement
export const updateDisposalProcurement = async (req, res) => {
  try {
    const { procurement_plan } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.PROCURING, req.user.role);

    proposal.status = DISPOSAL_STATUSES.PROCURING;
    proposal.current_step = 4;
    proposal.procurement_plan = procurement_plan || '';
    await proposal.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_PROCUREMENT',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { procurement_plan }
    });

    res.json({
      success: true,
      message: 'Đã cập nhật dự trù mua sắm tài sản thay thế.',
      proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Step 5: Receive replacement and finalize disposal (Staff, Admin)
// @route   PUT /api/disposals/:id/receipt
export const completeDisposalReceipt = async (req, res) => {
  try {
    const { replacement_equipment_id } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.RECEIVED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.RECEIVED;
    proposal.current_step = 5;
    proposal.received_by = req.user._id;
    proposal.received_at = new Date();
    if (replacement_equipment_id) proposal.replacement_equipment_id = replacement_equipment_id;
    await proposal.save();

    // Mark original equipment as DISPOSED
    await Equipment.findByIdAndUpdate(proposal.equipment_id, {
      status: EQUIPMENT_STATUSES.DISPOSED,
      condition: 'disposed',
      remaining_value: 0
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_COMPLETE',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'received', current_step: 5, replacement_equipment_id }
    });

    res.json({
      success: true,
      message: 'Hoàn tất quy trình thanh lý RACI 5 bước và nhập kho tài sản thay thế.',
      proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Reject disposal proposal (Manager, Admin)
// @route   PUT /api/disposals/:id/reject
export const rejectDisposal = async (req, res) => {
  try {
    const { reject_reason } = req.body;
    const proposal = await Disposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
    }

    assertTransition('DISPOSAL', proposal.status, DISPOSAL_STATUSES.REJECTED, req.user.role);

    proposal.status = DISPOSAL_STATUSES.REJECTED;
    proposal.reject_reason = reject_reason || 'Không được phê duyệt';
    await proposal.save();

    // Restore equipment to active
    await Equipment.findByIdAndUpdate(proposal.equipment_id, { status: EQUIPMENT_STATUSES.ACTIVE });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'DISPOSAL_REJECT',
      target_table: 'disposals',
      entity_id: proposal._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { reject_reason: proposal.reject_reason }
    });

    res.json({
      success: true,
      message: 'Đã từ chối hồ sơ thanh lý.',
      proposal
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
