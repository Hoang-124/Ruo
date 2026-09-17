import { DisposalProposal } from '../models/Disposal.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { DISPOSAL_STATUSES, EQUIPMENT_STATUSES, DISPOSAL_R_RATIO_THRESHOLD } from '../config/constants.js';

// @desc    Get all disposal proposals & flagged equipment with R >= 60%
// @route   GET /api/disposals
export const getDisposalList = async (req, res) => {
  const proposals = await DisposalProposal.find({ deletedAt: null })
    .populate('equipment')
    .populate('proposedBy', 'fullName role email')
    .populate('committeeVotes.member', 'fullName role')
    .sort({ createdAt: -1 });

  // Also query equipment that exceed R >= 60% but have no active proposal yet
  const flaggedEquipments = await Equipment.find({
    status: { $in: [EQUIPMENT_STATUSES.PENDING_DISPOSAL, EQUIPMENT_STATUSES.AVAILABLE] },
    remainingValue: { $gt: 0 },
    estimatedRepairCost: { $gt: 0 }
  }).populate('category room');

  const candidates = flaggedEquipments.filter(eq => eq.rRatio >= DISPOSAL_R_RATIO_THRESHOLD);

  res.json({
    success: true,
    totalProposals: proposals.length,
    proposals,
    totalCandidates: candidates.length,
    candidates
  });
};

// @desc    Initiate a 5-step disposal proposal (R >= 60%)
// @route   POST /api/disposals
export const createDisposalProposal = async (req, res) => {
  const { equipmentId, reason } = req.body;

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
  }

  const rRatio = equipment.rRatio;
  if (rRatio < DISPOSAL_R_RATIO_THRESHOLD) {
    return res.status(400).json({
      success: false,
      message: `Chỉ số tài chính R hiện tại (${rRatio}%) chưa đạt ngưỡng tối thiểu >= ${DISPOSAL_R_RATIO_THRESHOLD}% để kích hoạt quy trình thanh lý.`
    });
  }

  // Lock equipment immediately
  equipment.status = EQUIPMENT_STATUSES.PENDING_DISPOSAL;
  await equipment.save();

  const proposalCode = `DISP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

  // Default 5 RACI Steps
  const steps = [
    {
      stepNumber: 1,
      stepName: 'Lập Hồ Sơ Kỹ Thuật & Khóa Mượn',
      responsibleRole: 'facility_staff',
      status: 'completed',
      handledBy: req.user._id,
      completedAt: new Date(),
      notes: `Đã khóa mượn tự động do chỉ số R = ${rRatio}% >= 60%.`
    },
    {
      stepNumber: 2,
      stepName: 'Thẩm Định Kỹ Thuật Độc Lập',
      responsibleRole: 'maintenance',
      status: 'in_progress'
    },
    {
      stepNumber: 3,
      stepName: 'Họp Hội Đồng Thanh Lý (Ma Trận RACI)',
      responsibleRole: 'facility_staff',
      status: 'pending'
    },
    {
      stepNumber: 4,
      stepName: 'Ban Giám Hiệu Phê Duyệt Quyết Định',
      responsibleRole: 'admin',
      status: 'pending'
    },
    {
      stepNumber: 5,
      stepName: 'Bán Đấu Giá Hoặc Hủy Phế Liệu',
      responsibleRole: 'facility_staff',
      status: 'pending'
    }
  ];

  const proposal = await DisposalProposal.create({
    proposalCode,
    equipment: equipment._id,
    proposedBy: req.user._id,
    repairCost: equipment.estimatedRepairCost,
    remainingValue: equipment.remainingValue,
    rRatio,
    currentStep: 2,
    status: DISPOSAL_STATUSES.TECHNICAL_ASSESSMENT,
    reason: reason || `Thiết bị xuống cấp nghiêm trọng, chỉ số R = ${rRatio}% vượt định mức 60%`,
    steps
  });

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'DISPOSAL_PROPOSAL_CREATE',
    entityType: 'DisposalProposal',
    entityId: proposal._id.toString(),
    ipAddress: req.ip,
    diffData: {
      proposalCode,
      assetCode: equipment.assetCode,
      rRatio
    }
  });

  res.status(201).json({
    success: true,
    message: `Đã kích hoạt Quy Trình Thanh Lý 5 Bước cho thiết bị ${equipment.name} (R = ${rRatio}%).`,
    proposal
  });
};

// @desc    Advance step in disposal proposal
// @route   PUT /api/disposals/:id/step
export const advanceDisposalStep = async (req, res) => {
  const { stepNumber, notes, nextStepStatus = 'completed' } = req.body;

  const proposal = await DisposalProposal.findById(req.params.id).populate('equipment');
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Hồ sơ thanh lý không tồn tại.' });
  }

  const step = proposal.steps.find(s => s.stepNumber === stepNumber);
  if (!step) {
    return res.status(400).json({ success: false, message: 'Bước thanh lý không hợp lệ.' });
  }

  step.status = nextStepStatus;
  step.handledBy = req.user._id;
  step.completedAt = new Date();
  if (notes) step.notes = notes;

  if (stepNumber < 5 && nextStepStatus === 'completed') {
    proposal.currentStep = stepNumber + 1;
    const nextStep = proposal.steps.find(s => s.stepNumber === stepNumber + 1);
    if (nextStep) nextStep.status = 'in_progress';
  } else if (stepNumber === 5 && nextStepStatus === 'completed') {
    proposal.status = DISPOSAL_STATUSES.SCRAP_COMPLETED;
    // Mark equipment as DISPOSED
    await Equipment.findByIdAndUpdate(proposal.equipment._id, {
      status: EQUIPMENT_STATUSES.AVAILABLE,
      condition: 'disposed',
      remainingValue: 0
    });
  }

  await proposal.save();

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'DISPOSAL_STEP_ADVANCE',
    entityType: 'DisposalProposal',
    entityId: proposal._id.toString(),
    ipAddress: req.ip,
    diffData: {
      proposalCode: proposal.proposalCode,
      stepNumber,
      status: nextStepStatus
    }
  });

  res.json({
    success: true,
    message: `Đã cập nhật tiến độ Bước ${stepNumber} trong quy trình thanh lý.`,
    proposal
  });
};
