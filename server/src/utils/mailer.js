import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * In-Memory Mail Queue for Ruo UFMS (UC-1.3)
 * Keeps a buffer of sent/queued transactional emails for audit and testing.
 */
class MailQueue {
  constructor() {
    this.queue = [];
    this.history = [];
    this.maxHistory = 50;
  }

  enqueue(mailItem) {
    const item = {
      id: 'mail_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      enqueuedAt: new Date(),
      status: 'QUEUED',
      ...mailItem
    };
    this.queue.push(item);
    return item;
  }

  recordDelivered(item, info = {}) {
    item.status = 'DELIVERED';
    item.deliveredAt = new Date();
    item.messageId = info.messageId || `msg_${Date.now()}@ruo.university.edu.vn`;
    this.history.unshift(item);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getLastMail() {
    return this.history[0] || null;
  }

  getLastMailFor(email) {
    const target = String(email).trim().toLowerCase();
    return this.history.find((m) => m.to.toLowerCase() === target) || null;
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.queue = [];
    this.history = [];
  }
}

export const ruoMailQueue = new MailQueue();

let cachedTransporter = null;

/**
 * Create configured Nodemailer transporter with connection pooling for maximum speed
 */
export const createSmtpTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  // Preset for popular services (e.g. Gmail)
  if (process.env.SMTP_SERVICE) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return cachedTransporter;
  }

  // Standard host/port configuration (Outlook, Brevo, SendGrid, Mailgun, Custom)
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: isSecure,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
};

/**
 * Mailer service for Ruo UFMS
 * Supports sending real emails if SMTP credentials are provided,
 * or logging structured OTP notifications and buffering in Mail Queue.
 */
export const sendPasswordResetEmail = async (email, otp) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const targetEmail = String(email).trim().toLowerCase();

  const mailPayload = {
    to: targetEmail,
    subject: '[RUO UFMS] Mã xác thực OTP khôi phục mật khẩu tài khoản',
    otp,
    expiresInMinutes: 15
  };

  const queueItem = ruoMailQueue.enqueue(mailPayload);

  // Terminal telemetry logging for development and institutional audit
  console.log(`\n=============================================================`);
  console.log(`[RUO MAIL QUEUE] 🎓 OUTGOING PASSWORD RESET NOTIFICATION`);
  console.log(`Queue ID: ${queueItem.id}`);
  console.log(`To: ${targetEmail}`);
  console.log(`Subject: ${mailPayload.subject}`);
  console.log(`Time: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`MÃ XÁC THỰC OTP: >>> ${otp} <<< (Hiệu lực: 15 phút)`);
  console.log(`Lưu ý: Không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản.`);
  console.log(`=============================================================\n`);

  // If SMTP environment variables are configured, send real email via Nodemailer
  const transporter = createSmtpTransporter();
  if (transporter) {
    try {
      const senderEmail = process.env.SMTP_USER;
      const senderDisplayName = process.env.SMTP_FROM_NAME || 'Ruo — Ban Quản Lý CSVC Đại Học';
      const fromHeader = `"${senderDisplayName}" <${process.env.SMTP_FROM || senderEmail}>`;

      const sendPromise = transporter.sendMail({
        from: fromHeader,
        to: targetEmail,
        subject: mailPayload.subject,
        html: `
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mã OTP Khôi Phục Mật Khẩu</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
              <tr>
                <td align="center">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px rgba(0,0,0,0.06); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); text-align: center;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px;">RUO UFMS</h1>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #BFDBFE; font-weight: 500;">HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT ĐẠI HỌC</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 32px 32px 24px 32px;">
                        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0F172A;">Yêu cầu đặt lại mật khẩu tài khoản</h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                          Xin chào bạn,<br>
                          Hệ thống vừa nhận được yêu cầu cấp lại mật khẩu truy cập hệ thống CSVC cho địa chỉ email: <strong style="color: #0F172A;">${targetEmail}</strong>.
                        </p>

                        <!-- OTP Box -->
                        <div style="background: #F1F5F9; border: 1.5px dashed #CBD5E1; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 24px 0;">
                          <span style="display: block; font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #64748B; margin-bottom: 10px; text-transform: uppercase;">
                            MÃ XÁC THỰC OTP (HIỆU LỰC 15 PHÚT)
                          </span>
                          <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1E3A8A; font-family: 'Courier New', Courier, monospace; display: inline-block;">
                            ${otp}
                          </span>
                          <span style="display: block; font-size: 12px; color: #DC2626; margin-top: 10px; font-weight: 600;">
                            ⏱ Hết hạn sau 15 phút • Không chia sẻ mã này cho bất kỳ ai
                          </span>
                        </div>

                        <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn an toàn và không có thay đổi nào được áp dụng.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                          © 2026 Ruo University Facilities Management System (UFMS)<br>
                          Email tự động — Vui lòng không phản hồi trực tiếp vào địa chỉ này.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout: dịch vụ email phản hồi chậm')), 6000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);

      console.log(`[Ruo Mailer] 🚀 REAL EMAIL DELIVERED via SMTP! MessageID: ${info.messageId}`);
      ruoMailQueue.recordDelivered(queueItem, info);
      return true;
    } catch (err) {
      console.error('[Ruo Mailer] ❌ Failed to send email via SMTP transporter:', err.message);
      ruoMailQueue.recordDelivered(queueItem, { messageId: `fallback_${Date.now()}` });
      return false;
    }
  }

  // In local/sandbox development mode without SMTP configured, mark delivered in queue
  console.log(`[Ruo Mailer] ⚠️ No SMTP credentials configured. Falling back to in-memory mail queue.`);
  ruoMailQueue.recordDelivered(queueItem, { messageId: `mock_${Date.now()}` });
  return true;
};

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
export const generateSixDigitOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};
