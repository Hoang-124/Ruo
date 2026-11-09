import mongoose from 'mongoose';
import { WarrantyClaim } from '../models/WarrantyClaim.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendEmail } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALLOWED_ROLES = ['technician', 'facility_manager', 'admin'];
const CLAIM_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']);
const STATUS_TRANSITIONS = {
  OPEN: new Set(['IN_PROGRESS', 'REJECTED']),
  IN_PROGRESS: new Set(['RESOLVED', 'REJECTED']),
  RESOLVED: new Set(),
  REJECTED: new Set()
};

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[char]);

const populateClaim = (query) => query
  .populate('equipment_id', 'code name serial_number warranty_expiry warranty_status')
  .populate('supplier_id', 'code name phone email')
  .populate('requested_by', 'full_name code role')
  .populate('status_history.updated_by', 'full_name code role');

const auditClaim = (req, claim, action, oldValue, newValue) => AuditLog.logAction({
  user_id: req.user._id,
  user_display: `${req.user.full_name || 'Người dùng'} (${req.user.code || req.user.role})`,
  action,
  target_table: 'warranty_claims',
  entity_id: claim._id.toString(),
  ip_address: req.ip || '127.0.0.1',
  old_value: oldValue,
  new_value: newValue
});

export const getWarrantyClaims = asyncHandler(async (_req, res) => {
  const claims = await populateClaim(WarrantyClaim.find()).sort({ created_at: -1 });
  res.json({ success: true, count: claims.length, claims });
});

export const createWarrantyClaim = asyncHandler(async (req, res) => {
  const { equipment_id, issue_description } = req.body;
  const description = String(issue_description || '').trim();
  if (!mongoose.isValidObjectId(equipment_id) || !description || description.length > 3000) {
    return res.status(400).json({
      success: false,
      message: 'Chọn thiết bị và nhập mô tả sự cố (tối đa 3000 ký tự).'
    });
  }

  const equipment = await Equipment.findById(equipment_id).populate('supplier_id', 'code name email');
  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
  }
  const expiry = equipment.warranty_expiry ? new Date(equipment.warranty_expiry) : null;
  if (
    equipment.warranty_status === 'expired' ||
    equipment.warranty_status === 'void' ||
    !expiry ||
    !Number.isFinite(expiry.getTime()) ||
    expiry <= new Date()
  ) {
    return res.status(422).json({
      success: false,
      message: 'Thiết bị không còn thời hạn bảo hành để tạo yêu cầu hãng.'
    });
  }

  const supplier = equipment.supplier_id;
  if (!supplier?._id || !String(supplier.email || '').trim()) {
    return res.status(422).json({
      success: false,
      message: 'Thiết bị chưa có nhà cung cấp với email hợp lệ. Hãy cập nhật thông tin nhà cung cấp trước.'
    });
  }

  const activeClaim = await WarrantyClaim.findOne({
    equipment_id,
    status: { $in: ['OPEN', 'IN_PROGRESS'] }
  });
  if (activeClaim) {
    return res.status(409).json({
      success: false,
      message: 'Thiết bị đã có yêu cầu bảo hành đang xử lý.'
    });
  }

  const claim = await WarrantyClaim.create({
    equipment_id: equipment._id,
    supplier_id: supplier._id,
    requested_by: req.user._id,
    issue_description: description,
    status: 'OPEN',
    status_history: [{
      status: 'OPEN',
      note: 'Đã gửi yêu cầu bảo hành đến nhà cung cấp.',
      updated_by: req.user._id
    }]
  });

  const subject = `Yêu cầu bảo hành thiết bị ${equipment.code}`;
  const text = [
    `Kính gửi ${supplier.name},`,
    '',
    `Ruo gửi yêu cầu bảo hành cho thiết bị ${equipment.code} - ${equipment.name}.`,
    `Số serial: ${equipment.serial_number || 'Không có'}`,
    `Hạn bảo hành: ${expiry.toLocaleDateString('vi-VN')}`,
    `Mô tả sự cố: ${description}`,
    `Mã hồ sơ: ${claim._id}`,
    '',
    'Vui lòng phản hồi để cập nhật tiến độ xử lý.'
  ].join('\n');
  const html = `<p>Kính gửi ${escapeHtml(supplier.name)},</p>
    <p>Ruo gửi yêu cầu bảo hành cho thiết bị <strong>${escapeHtml(equipment.code)} - ${escapeHtml(equipment.name)}</strong>.</p>
    <p>Số serial: ${escapeHtml(equipment.serial_number || 'Không có')}<br>
    Hạn bảo hành: ${escapeHtml(expiry.toLocaleDateString('vi-VN'))}<br>
    Mô tả sự cố: ${escapeHtml(description)}<br>
    Mã hồ sơ: ${escapeHtml(claim._id)}</p>
    <p>Vui lòng phản hồi để cập nhật tiến độ xử lý.</p>`;
  const emailResult = await sendEmail({
    to: supplier.email,
    subject,
    text,
    html,
    category: 'WARRANTY_CLAIM',
    metadata: { claimId: claim._id.toString(), equipmentId: equipment._id.toString() },
    auditContext: {
      user_id: req.user._id,
      user_display: `${req.user.full_name || 'Người dùng'} (${req.user.code || req.user.role})`,
      target_table: 'warranty_claims',
      entity_id: claim._id.toString(),
      ip_address: req.ip || '127.0.0.1'
    }
  });

  claim.supplier_email_status =
    emailResult.delivered && !emailResult.simulated ? 'sent' : 'queued';
  claim.supplier_email_message_id = emailResult.messageId || emailResult.queueId || '';
  await claim.save();
  await auditClaim(req, claim, 'WARRANTY_CLAIM_CREATE', null, {
    equipment_id: equipment._id,
    supplier_id: supplier._id,
    status: claim.status,
    supplier_email_status: claim.supplier_email_status
  });

  const message = claim.supplier_email_status === 'sent'
    ? 'Đã tạo hồ sơ và gửi yêu cầu bảo hành đến nhà cung cấp.'
    : 'Đã tạo hồ sơ; email nhà cung cấp được xếp hàng gửi (chưa xác nhận SMTP).';
  res.status(201).json({
    success: true,
    message,
    claim: await populateClaim(WarrantyClaim.findById(claim._id))
  });
});

export const updateWarrantyClaimStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  if (!CLAIM_STATUSES.has(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái hồ sơ không hợp lệ.' });
  }
  if (!ALLOWED_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền cập nhật hồ sơ bảo hành.' });
  }

  const claim = await WarrantyClaim.findById(req.params.id);
  if (!claim) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ bảo hành.' });
  }
  if (!STATUS_TRANSITIONS[claim.status]?.has(status)) {
    return res.status(409).json({
      success: false,
      message: `Không thể chuyển hồ sơ từ ${claim.status} sang ${status}.`
    });
  }

  const previousStatus = claim.status;
  claim.status = status;
  claim.status_history.push({
    status,
    note: String(note).trim().slice(0, 1000),
    updated_by: req.user._id
  });
  await claim.save();
  await auditClaim(req, claim, 'WARRANTY_CLAIM_STATUS_UPDATE', { status: previousStatus }, {
    status,
    note: String(note).trim()
  });

  res.json({
    success: true,
    message: `Đã cập nhật trạng thái hồ sơ bảo hành: ${status}.`,
    claim: await populateClaim(WarrantyClaim.findById(claim._id))
  });
});
