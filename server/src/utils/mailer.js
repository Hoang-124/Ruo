import crypto from 'crypto';

/**
 * Mailer service for Ruo UFMS
 * Supports sending real emails if SMTP credentials are provided,
 * or cleanly logging structured OTP notifications in development mode.
 */
export const sendPasswordResetEmail = async (email, otp) => {
  const isDev = process.env.NODE_ENV !== 'production';

  console.log(`\n=============================================================`);
  console.log(`[RUO EMAIL SERVICE] 🎓 MAILER NOTIFICATION FOR PASSWORD RESET`);
  console.log(`To: ${email}`);
  console.log(`Subject: [RUO UFMS] Mã xác thực OTP khôi phục mật khẩu tài khoản`);
  console.log(`Time: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`Mã OTP của bạn: >>> ${otp} <<< (Hiệu lực: 15 phút)`);
  console.log(`Lưu ý: Không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản.`);
  console.log(`=============================================================\n`);

  // If SMTP environment variables are configured, Nodemailer can be dynamically loaded
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Ruo University Facility Management" <${process.env.SMTP_FROM || 'noreply@university.edu.vn'}>`,
        to: email,
        subject: '[RUO UFMS] Mã xác thực OTP khôi phục mật khẩu',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 560px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            <h2 style="color: #1E3A8A; margin-top: 0;">RUO — Hệ Thống Quản Lý Cơ Sở Vật Chất Đại Học</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email này.</p>
            <div style="background: #F1F5F9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <span style="font-size: 13px; color: #64748B; display: block; margin-bottom: 6px;">MÃ XÁC THỰC OTP (TTL: 15 PHÚT)</span>
              <strong style="font-size: 32px; letter-spacing: 6px; color: #1E3A8A; font-family: monospace;">${otp}</strong>
            </div>
            <p style="font-size: 13px; color: #64748B;">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email hoặc thông báo cho Ban Quản trị.</p>
          </div>
        `
      });
      return true;
    } catch (err) {
      console.warn('[Ruo Mailer] Failed to send email via SMTP transporter:', err.message);
      // Still return true if in dev so dev flow is not blocked
      return isDev;
    }
  }

  return true;
};

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
export const generateSixDigitOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};
