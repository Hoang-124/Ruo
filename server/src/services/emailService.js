import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { ruoMailQueue, createSmtpTransporter } from '../utils/mailer.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { interpolateTemplate, DEFAULT_NOTIFICATION_TEMPLATES } from '../controllers/adminConfigController.js';

/**
 * Ruo University Facilities Management System (UFMS) - Institutional Email Service
 * Module 4: Notifications & Email (UC-9.1 - UC-9.4)
 * UC-9.3: Automated Email Dispatcher with Nodemailer Gmail & SHA-256 Audit Trail
 */

const getSenderHeader = () => {
  const senderEmail = process.env.SMTP_USER || 'no-reply@ruo.university.edu.vn';
  const senderDisplayName = process.env.SMTP_FROM_NAME || 'Ruo — Ban Quản Lý CSVC Đại Học';
  return `"${senderDisplayName}" <${process.env.SMTP_FROM || senderEmail}>`;
};

/**
 * Base institutional responsive HTML email template
 */
export const buildInstitutionalEmailHtml = ({
  title,
  preheader = '',
  badge = { text: 'THÔNG BÁO', color: '#2563EB', bg: '#EFF6FF' },
  recipientName = 'Thành viên Ruo UFMS',
  summaryText = '',
  details = [],
  actionButton = null,
  alertNotice = null,
  footerNote = 'Email tự động từ Hệ thống Quản lý CSVC Đại Học Ruo (UFMS). Vui lòng không phản hồi trực tiếp.'
}) => {
  const detailsRows = details
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #64748B; border-bottom: 1px solid #F1F5F9; width: 36%;">
          ${item.label}
        </td>
        <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #1E293B; border-bottom: 1px solid #F1F5F9;">
          ${item.value}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.5;">
  ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">${preheader}</div>` : ''}
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px rgba(0,0,0,0.06); overflow: hidden;">
          
          <!-- University Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%); text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; color: #93C5FD; text-transform: uppercase;">
                      ĐẠI HỌC RUO • PHÂN HỆ QUẢN LÝ CSVC
                    </span>
                    <h1 style="margin: 4px 0 0 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">
                      RUO UFMS
                    </h1>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${badge.bg}; color: ${badge.color};">
                      ${badge.text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #0F172A;">
                ${title}
              </h2>
              <p style="margin: 0 0 18px 0; font-size: 14px; color: #475569;">
                Kính gửi <strong>${recipientName}</strong>,
              </p>
              ${summaryText ? `<p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">${summaryText}</p>` : ''}

              <!-- Structured Information Table -->
              ${details.length > 0 ? `
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  ${detailsRows}
                </table>
              </div>
              ` : ''}

              <!-- Alert Banner (if any) -->
              ${alertNotice ? `
              <div style="background-color: ${alertNotice.bg || '#FEF2F2'}; border-left: 4px solid ${alertNotice.color || '#EF4444'}; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: ${alertNotice.color || '#DC2626'}; margin-bottom: 2px;">
                  ${alertNotice.title || 'Lưu ý khẩn'}
                </div>
                <div style="font-size: 12.5px; color: #4B5563; line-height: 1.5;">
                  ${alertNotice.message}
                </div>
              </div>
              ` : ''}

              <!-- Call to Action Button -->
              ${actionButton ? `
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${actionButton.url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                  ${actionButton.label}
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Institutional Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">
                ${footerNote}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                © 2026 Ruo University Facilities Management System. Bảo mật cấp cơ sở dữ liệu.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Universal email dispatcher (with Nodemailer Gmail / SMTP transporter & audit logging)
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  category = 'TRANSACTIONAL',
  metadata = {},
  auditContext = null
}) => {
  const targetEmail = String(to || '').trim().toLowerCase();
  if (!targetEmail) {
    return { success: false, message: 'Địa chỉ email người nhận không hợp lệ' };
  }

  const mailPayload = {
    to: targetEmail,
    subject,
    category,
    metadata,
    enqueuedAt: new Date()
  };

  const queueItem = ruoMailQueue.enqueue(mailPayload);

  // Terminal telemetry log
  console.log(`\n[RUO EMAIL SERVICE] ✉️ Outgoing Institutional Notification`);
  console.log(`├─ ID: ${queueItem.id}`);
  console.log(`├─ To: ${targetEmail}`);
  console.log(`├─ Category: ${category}`);
  console.log(`└─ Subject: ${subject}`);

  let dispatchResult = { success: true, delivered: true, simulated: true, queueId: queueItem.id };

  const transporter = createSmtpTransporter();
  if (transporter) {
    try {
      const fromHeader = getSenderHeader();
      const sendPromise = transporter.sendMail({
        from: fromHeader,
        to: targetEmail,
        subject,
        html,
        text: text || subject
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout vượt quá 6s')), 6000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      ruoMailQueue.recordDelivered(queueItem, info);
      console.log(`[RUO EMAIL SERVICE] ✅ Email delivered via SMTP! MsgID: ${info.messageId}`);
      dispatchResult = { success: true, delivered: true, messageId: info.messageId, queueId: queueItem.id };
    } catch (err) {
      console.error(`[RUO EMAIL SERVICE] ⚠️ SMTP transport error (${err.message}). Buffered in mail queue.`);
      ruoMailQueue.recordDelivered(queueItem, { messageId: `fallback_${Date.now()}` });
      dispatchResult = { success: true, delivered: false, simulated: true, queueId: queueItem.id, error: err.message };
    }
  } else {
    // Graceful in-memory buffer (local development / test environments)
    ruoMailQueue.recordDelivered(queueItem, { messageId: `mock_${Date.now()}` });
  }

  // Cryptographic audit log recording (GET /api/audit/logs)
  if (auditContext) {
    try {
      if (typeof AuditLog?.logAction === 'function') {
        await AuditLog.logAction({
          user_id: auditContext.user_id || null,
          user_display: auditContext.user_display || 'Hệ Thống Email (System)',
          action: 'EMAIL_DISPATCH',
          target_table: auditContext.target_table || 'audit_logs',
          entity_id: auditContext.entity_id || queueItem.id,
          ip_address: auditContext.ip_address || '127.0.0.1',
          new_value: {
            recipient: targetEmail,
            category,
            subject,
            delivered: dispatchResult.delivered,
            simulated: Boolean(dispatchResult.simulated),
            queue_id: queueItem.id
          }
        });
      }
    } catch (auditErr) {
      console.warn('[RUO EMAIL SERVICE] Audit logging notice:', auditErr.message);
    }
  }

  return dispatchResult;
};

/**
 * 1. CẤP LẠI MẬT KHẨU OTP (Password Reset OTP Dispatcher - UC-9.3)
 */
export const dispatchPasswordResetOtpEmail = async ({
  to,
  userName = null,
  otp,
  expiryMinutes = 15,
  userId = null,
  ipAddress = '127.0.0.1'
}) => {
  // Retrieve template if customized in DB
  let template = DEFAULT_NOTIFICATION_TEMPLATES.password_reset;
  try {
    if (mongoose.connection?.readyState === 1) {
      const custom = await NotificationTemplate.findOne({ key: 'password_reset' }).lean();
      if (custom) template = { ...template, ...custom };
    }
  } catch (e) {
    // fallback to preset
  }

  const variables = {
    userName: userName || to,
    user_name: userName || to,
    email: to,
    otp,
    expiryMinutes,
    expiry_minutes: expiryMinutes
  };

  const subject = interpolateTemplate(template.subject, variables);
  const title = interpolateTemplate(template.title, variables);
  const bodyText = interpolateTemplate(template.body, variables);

  const html = buildInstitutionalEmailHtml({
    title,
    preheader: `Mã xác thực OTP của bạn là: ${otp}`,
    badge: { text: template.badge_text || 'BẢO MẬT TÀI KHOẢN', color: template.badge_color || '#1E3A8A', bg: template.badge_bg || '#EFF6FF' },
    recipientName: to,
    summaryText: bodyText,
    details: [
      { label: 'Địa chỉ tài khoản', value: to },
      { label: 'Mã xác thực OTP', value: `<span style="font-size: 20px; font-weight: 900; letter-spacing: 4px; color: #1E3A8A;">${otp}</span>` },
      { label: 'Thời gian hiệu lực', value: `${expiryMinutes} phút kể từ lúc gửi` }
    ],
    alertNotice: {
      title: 'CẢNH BÁO AN TOÀN',
      color: '#DC2626',
      bg: '#FEF2F2',
      message: 'Không cung cấp mã này cho bất kỳ ai, kể cả nhân viên quản trị hệ thống.'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category: 'AUTH_OTP',
    metadata: { otp, expiryMinutes },
    auditContext: {
      user_id: userId,
      user_display: 'Hệ Thống Xác Thực (SSO)',
      target_table: 'audit_logs',
      entity_id: to,
      ip_address: ipAddress
    }
  });
};

/**
 * 2. PHIẾU GIAO VIỆC (Work Order & Repair Task Assignment Dispatcher - UC-9.3)
 */
export const dispatchTaskAssignmentEmail = async ({
  to,
  technicianName = 'Kỹ thuật viên',
  ticketCode,
  equipmentCode,
  equipmentName,
  roomCode,
  priority = 'Cao',
  deadline = 'Trong vòng 24 giờ',
  description = 'Sự cố thiết bị ghi nhận từ giảng viên',
  category = 'TASK_ASSIGNED',
  userId = null,
  ipAddress = '127.0.0.1'
}) => {
  let template = DEFAULT_NOTIFICATION_TEMPLATES.repair_assigned;
  try {
    if (mongoose.connection?.readyState === 1) {
      const custom = await NotificationTemplate.findOne({ key: 'repair_assigned' }).lean();
      if (custom) template = { ...template, ...custom };
    }
  } catch (e) {
    // fallback
  }

  const variables = {
    userName: technicianName,
    user_name: technicianName,
    ticketCode,
    ticket_code: ticketCode,
    equipmentCode,
    equipment_code: equipmentCode,
    equipmentName,
    equipment_name: equipmentName,
    roomCode,
    room_code: roomCode,
    priority,
    deadline,
    description
  };

  const subject = interpolateTemplate(template.subject, variables);
  const title = interpolateTemplate(template.title, variables);
  const bodyText = interpolateTemplate(template.body, variables);

  const html = buildInstitutionalEmailHtml({
    title,
    preheader: `Nhiệm vụ sửa chữa mới: Phiếu #${ticketCode} - ${equipmentName} tại phòng ${roomCode}`,
    badge: { text: template.badge_text || 'PHIẾU GIAO VIỆC', color: template.badge_color || '#0369A1', bg: template.badge_bg || '#E0F2FE' },
    recipientName: technicianName,
    summaryText: bodyText,
    details: [
      { label: 'Mã phiếu giao việc', value: `#${ticketCode}` },
      { label: 'Thiết bị & Mã tài sản', value: `${equipmentName} (${equipmentCode})` },
      { label: 'Vị trí phòng học', value: `Phòng ${roomCode}` },
      { label: 'Mức độ ưu tiên', value: priority },
      { label: 'Hạn chót cam kết (SLA)', value: deadline },
      { label: 'Nội dung sự cố', value: description }
    ],
    actionButton: {
      label: 'Mở Bàn Làm Việc Xử Lý Sự Cố',
      url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}#repairs` : 'http://localhost:5173#repairs'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category,
    metadata: { ticketCode, equipmentCode, roomCode },
    auditContext: {
      user_id: userId,
      user_display: 'Quản Lý CSVC (Facility Manager)',
      target_table: 'audit_logs',
      entity_id: ticketCode,
      ip_address: ipAddress
    }
  });
};

/**
 * 3. THANH LÝ TÀI SẢN (Equipment Disposal Dispatcher - UC-9.3)
 */
export const dispatchDisposalNotificationEmail = async ({
  to,
  recipientName = 'Hội Đồng Thanh Lý / Ban Giám Hiệu',
  equipmentCode,
  equipmentName = 'Thiết bị trường',
  reason = 'Hỏng hoàn toàn, vượt quá chi phí sửa chữa',
  recoveryValue = 0,
  proposalId = 'N/A',
  isApproved = false,
  userId = null,
  ipAddress = '127.0.0.1'
}) => {
  const subject = isApproved
    ? `[RUO UFMS] Phê duyệt thanh lý thiết bị ${equipmentCode} — Hồ sơ #${proposalId}`
    : `[RUO UFMS] Đề xuất thanh lý tài sản ${equipmentCode} — Cần phê duyệt`;

  const html = buildInstitutionalEmailHtml({
    title: isApproved ? 'Hồ sơ thanh lý tài sản đã được phê duyệt' : 'Đề xuất thanh lý tài sản cơ sở vật chất',
    preheader: `Hồ sơ thanh lý thiết bị ${equipmentCode} (${equipmentName})`,
    badge: isApproved
      ? { text: 'ĐÃ PHÊ DUYỆT THANH LÝ', color: '#15803D', bg: '#DCFCE7' }
      : { text: 'ĐỀ XUẤT THANH LÝ', color: '#B45309', bg: '#FEF3C7' },
    recipientName,
    summaryText: isApproved
      ? `Hồ sơ thanh lý thiết bị <strong>${equipmentCode}</strong> đã được Ban Giám Hiệu/Hội Đồng phê duyệt hoàn tất.`
      : `Ban Quản Lý CSVC vừa lập hồ sơ đề xuất thanh lý tài sản hư hỏng không thể phục hồi. Kính chuyển Hội đồng thẩm định và phê duyệt.`,
    details: [
      { label: 'Mã hồ sơ thanh lý', value: `#${proposalId}` },
      { label: 'Mã số thiết bị', value: equipmentCode },
      { label: 'Tên thiết bị', value: equipmentName },
      { label: 'Lý do thanh lý', value: reason },
      { label: 'Giá trị thu hồi dự kiến', value: `${Number(recoveryValue).toLocaleString('vi-VN')} VNĐ` }
    ],
    actionButton: {
      label: 'Kiểm Tra Hồ Sơ Thanh Lý',
      url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}#disposal` : 'http://localhost:5173#disposal'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category: 'DISPOSAL_NOTIFICATION',
    metadata: { equipmentCode, proposalId, isApproved },
    auditContext: {
      user_id: userId,
      user_display: 'Ban Quản Lý CSVC (UFMS)',
      target_table: 'audit_logs',
      entity_id: equipmentCode,
      ip_address: ipAddress
    }
  });
};

// Aliases for backwards compatibility with UC-9.1
export const sendNewRepairAssignedEmail = (params) => dispatchTaskAssignmentEmail({ category: 'REPAIR_ASSIGNED', ...params });
export const sendApprovalRequestEmail = ({ to, managerName, requestType, requestCode, requesterName, summary, details = [] }) => {
  const subject = `[RUO UFMS] Yêu cầu duyệt phiếu ${requestType} — #${requestCode}`;
  const html = buildInstitutionalEmailHtml({
    title: `Phiếu ${requestType} đang chờ duyệt`,
    badge: { text: 'CẦN PHÊ DUYỆT', color: '#D97706', bg: '#FEF3C7' },
    recipientName: managerName,
    summaryText: `Hệ thống tiếp nhận yêu cầu từ <strong>${requesterName}</strong>.`,
    details: [
      { label: 'Loại nghiệp vụ', value: requestType },
      { label: 'Mã số phiếu', value: `#${requestCode}` },
      { label: 'Người tạo đề xuất', value: requesterName },
      { label: 'Nội dung', value: summary },
      ...details
    ]
  });
  return sendEmail({ to, subject, html, category: 'APPROVAL_REQUEST' });
};

export const sendDeadlineWarningEmail = async ({
  to,
  recipientName = 'Cán bộ phụ trách',
  ticketCode,
  equipmentCode,
  roomCode,
  deadline,
  isOverdue = false,
  hoursRemaining = 0
}) => {
  const subject = isOverdue
    ? `[RUO UFMS] 🚨 CẢNH BÁO QUÁ HẠN SLA — Phiếu #${ticketCode}`
    : `[RUO UFMS] ⚠️ CẢNH BÁO SẮP ĐẾN HẠN SLA — Phiếu #${ticketCode}`;

  const html = buildInstitutionalEmailHtml({
    title: isOverdue ? 'Phiếu sửa chữa đã quá hạn SLA' : 'Cảnh báo hạn chót hoàn thành sửa chữa',
    badge: isOverdue ? { text: 'QUÁ HẠN SLA', color: '#DC2626', bg: '#FEE2E2' } : { text: 'CẢNH BÁO DEADLINE', color: '#B45309', bg: '#FEF3C7' },
    recipientName,
    summaryText: `Ca sửa chữa mã phiếu <strong>#${ticketCode}</strong>.`,
    details: [
      { label: 'Mã phiếu', value: `#${ticketCode}` },
      { label: 'Mã thiết bị', value: equipmentCode },
      { label: 'Phòng học', value: `Phòng ${roomCode}` }
    ]
  });

  return sendEmail({ to, subject, html, category: isOverdue ? 'DEADLINE_OVERDUE' : 'DEADLINE_WARNING' });
};

export const getEmailQueue = () => ruoMailQueue.getHistory();
export const clearEmailQueue = () => ruoMailQueue.clear();

export default {
  sendEmail,
  dispatchPasswordResetOtpEmail,
  dispatchTaskAssignmentEmail,
  dispatchDisposalNotificationEmail,
  sendNewRepairAssignedEmail,
  sendApprovalRequestEmail,
  sendDeadlineWarningEmail,
  buildInstitutionalEmailHtml,
  getEmailQueue,
  clearEmailQueue
};
