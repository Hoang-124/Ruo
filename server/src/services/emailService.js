import nodemailer from 'nodemailer';
import { ruoMailQueue, createSmtpTransporter } from '../utils/mailer.js';

/**
 * Ruo University Facilities Management System (UFMS) - Institutional Email Service
 * Module 4: Notifications & Email (UC-9.1 - UC-9.4)
 * Supports Nodemailer SMTP pooling with graceful fallback to in-memory Mail Queue
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
 * Universal email dispatcher (with SMTP transporter & queue telemetry)
 */
export const sendEmail = async ({ to, subject, html, text, category = 'TRANSACTIONAL', metadata = {} }) => {
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
      return { success: true, delivered: true, messageId: info.messageId, queueId: queueItem.id };
    } catch (err) {
      console.error(`[RUO EMAIL SERVICE] ⚠️ SMTP transport error (${err.message}). Buffered in mail queue.`);
      ruoMailQueue.recordDelivered(queueItem, { messageId: `fallback_${Date.now()}` });
      return { success: true, delivered: false, simulated: true, queueId: queueItem.id, error: err.message };
    }
  }

  // Graceful in-memory buffer (local development / test environments)
  ruoMailQueue.recordDelivered(queueItem, { messageId: `mock_${Date.now()}` });
  return { success: true, delivered: true, simulated: true, queueId: queueItem.id };
};

/**
 * 1. CA SỬA MỚI (New Repair Assignment Email)
 */
export const sendNewRepairAssignedEmail = async ({
  to,
  technicianName = 'Kỹ thuật viên',
  ticketCode,
  equipmentCode,
  equipmentName,
  roomCode,
  priority = 'Cao',
  deadline,
  description = 'Sự cố thiết bị ghi nhận từ giảng viên'
}) => {
  const subject = `[RUO UFMS] Phân công ca sửa chữa mới — Phiếu #${ticketCode}`;
  const html = buildInstitutionalEmailHtml({
    title: 'Phân công ca sửa chữa thiết bị',
    preheader: `Nhiệm vụ sửa chữa mới: Thiết bị ${equipmentName} (${equipmentCode}) tại phòng ${roomCode}`,
    badge: { text: 'CA SỬA CHỮA MỚI', color: '#0369A1', bg: '#E0F2FE' },
    recipientName: technicianName,
    summaryText: `Bạn vừa được Ban Quản Lý CSVC phân công thực hiện ca sửa chữa sự cố mới. Vui lòng kiểm tra thông tin và tiến hành theo quy trình SLA.`,
    details: [
      { label: 'Mã phiếu sửa chữa', value: `#${ticketCode}` },
      { label: 'Thiết bị cần sửa', value: `${equipmentName} (${equipmentCode})` },
      { label: 'Vị trí phòng học', value: `Phòng ${roomCode}` },
      { label: 'Mức độ ưu tiên', value: priority },
      { label: 'Hạn chót cam kết (SLA)', value: deadline || 'Trong vòng 24 giờ' },
      { label: 'Mô tả hư hỏng', value: description }
    ],
    actionButton: {
      label: 'Mở Bàn Làm Việc Kỹ Thuật Viên',
      url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}#repairs` : 'http://localhost:5173#repairs'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category: 'REPAIR_ASSIGNED',
    metadata: { ticketCode, equipmentCode, roomCode }
  });
};

/**
 * 2. DUYỆT PHIẾU (Approval Request Email: Điều chuyển, Thanh lý, Linh kiện)
 */
export const sendApprovalRequestEmail = async ({
  to,
  managerName = 'Quản lý CSVC / Admin',
  requestType = 'Điều chuyển thiết bị',
  requestCode,
  requesterName = 'Cán bộ đề xuất',
  summary = 'Yêu cầu phê duyệt nghiệp vụ cơ sở vật chất',
  details = []
}) => {
  const subject = `[RUO UFMS] Yêu cầu duyệt phiếu ${requestType} — #${requestCode}`;
  const html = buildInstitutionalEmailHtml({
    title: `Phiếu ${requestType} đang chờ duyệt`,
    preheader: `Hồ sơ ${requestCode} từ ${requesterName} cần bạn thẩm định và phê duyệt`,
    badge: { text: 'CẦN PHÊ DUYỆT', color: '#D97706', bg: '#FEF3C7' },
    recipientName: managerName,
    summaryText: `Hệ thống vừa tiếp nhận yêu cầu từ <strong>${requesterName}</strong>. Vui lòng xem xét hồ sơ và thực hiện phê duyệt kịp thời.`,
    details: [
      { label: 'Loại nghiệp vụ', value: requestType },
      { label: 'Mã số phiếu', value: `#${requestCode}` },
      { label: 'Người tạo đề xuất', value: requesterName },
      { label: 'Tóm tắt nội dung', value: summary },
      ...details
    ],
    actionButton: {
      label: 'Kiểm Tra & Phê Duyệt Phiếu',
      url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}#approvals` : 'http://localhost:5173#approvals'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category: 'APPROVAL_REQUEST',
    metadata: { requestType, requestCode, requesterName }
  });
};

/**
 * 3. CẢNH BÁO DEADLINE (Deadline SLA Alert & Overdue Notice)
 */
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

  const alertNotice = isOverdue
    ? {
        title: 'VI PHẠM THỜI GIAN CAM KẾT (SLA BREACH)',
        color: '#DC2626',
        bg: '#FEF2F2',
        message: `Phiếu này đã vượt quá hạn chót hoàn thành. Hệ thống đã ghi nhận log trễ hạn vào báo cáo hiệu suất kỹ thuật.`
      }
    : {
        title: 'SẮP ĐẾN HẠN CAM KẾT HOÀN THÀNH',
        color: '#D97706',
        bg: '#FFFBEB',
        message: `Chỉ còn khoảng ${hoursRemaining} giờ trước khi vượt quá cam kết SLA. Vui lòng ưu tiên xử lý dứt điểm.`
      };

  const html = buildInstitutionalEmailHtml({
    title: isOverdue ? 'Phiếu sửa chữa đã quá hạn SLA' : 'Cảnh báo hạn chót hoàn thành sửa chữa',
    preheader: `Phiếu #${ticketCode} tại phòng ${roomCode} cần được xử lý khẩn trương`,
    badge: isOverdue
      ? { text: 'QUÁ HẠN SLA', color: '#DC2626', bg: '#FEE2E2' }
      : { text: 'CẢNH BÁO DEADLINE', color: '#B45309', bg: '#FEF3C7' },
    recipientName,
    summaryText: isOverdue
      ? `Ca sửa chữa mã phiếu <strong>#${ticketCode}</strong> đã vượt quá thời hạn quy định. Vui lòng hoàn thành ngay hoặc báo cáo giải trình.`
      : `Ca sửa chữa mã phiếu <strong>#${ticketCode}</strong> sắp đến hạn kết thúc. Vui lòng tập trung hoàn thành đúng tiến độ.`,
    details: [
      { label: 'Mã phiếu', value: `#${ticketCode}` },
      { label: 'Mã thiết bị', value: equipmentCode || 'Chưa định danh' },
      { label: 'Phòng học / Vị trí', value: `Phòng ${roomCode}` },
      { label: 'Hạn chót cam kết', value: deadline || 'Hôm nay' },
      { label: 'Tình trạng tiến độ', value: isOverdue ? '🔴 Đã quá hạn' : `🟡 Còn ${hoursRemaining} giờ` }
    ],
    alertNotice,
    actionButton: {
      label: 'Cập Nhật Tiến Độ Ngay',
      url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}#repairs` : 'http://localhost:5173#repairs'
    }
  });

  return sendEmail({
    to,
    subject,
    html,
    category: isOverdue ? 'DEADLINE_OVERDUE' : 'DEADLINE_WARNING',
    metadata: { ticketCode, equipmentCode, isOverdue }
  });
};

export const getEmailQueue = () => ruoMailQueue.getHistory();
export const clearEmailQueue = () => ruoMailQueue.clear();

export default {
  sendEmail,
  sendNewRepairAssignedEmail,
  sendApprovalRequestEmail,
  sendDeadlineWarningEmail,
  buildInstitutionalEmailHtml,
  getEmailQueue,
  clearEmailQueue
};
