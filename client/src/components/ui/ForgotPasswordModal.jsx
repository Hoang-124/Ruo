import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Native Inline SVG Icons strictly adhering to project specifications
const SvgIcons = {
  Close: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Mail: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Key: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-1.5 1.5L14 9m0 0l-3 3m3-3l3 3m-3-3l-2-2m-2 2l-3 3-4-4 4-4 3 3" />
      <circle cx="7.5" cy="15.5" r="4.5" />
    </svg>
  ),
  Lock: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  CheckCircle: ({ size = 24, color = '#10B981' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Check: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  XCircle: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Clock: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ArrowRight: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
};

export const ForgotPasswordModal = ({ isOpen, onClose, defaultEmail = '', onSuccessLogin }) => {
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isRealMailSent, setIsRealMailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 15-minute countdown timer (900 seconds)
  const [timeLeft, setTimeLeft] = useState(900);

  useEffect(() => {
    if (step === 2) {
      setTimeLeft(900);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Close modal on Escape key - safeguard progress in Step 2 & 3
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !verifyingOtp && !sendingOtp && !resettingPassword) {
        if (step > 1 && step < 4) {
          toast.info('Bạn đang trong tiến trình xác thực mã OTP. Nhấn nút [✕] ở góc phải nếu bạn muốn hủy bỏ.', 'Tiến Trình Xác Thực');
          return;
        }
        resetModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, verifyingOtp, sendingOtp, resettingPassword, step]);

  // Format mm:ss
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Password criteria checklist
  const passwordCriteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[^a-zA-Z\d\s]/.test(newPassword),
      isMatching: newPassword.length > 0 && newPassword === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  if (!isOpen) return null;

  // Step 1: Request OTP (Rate limited: 3 requests per hour, TTL: 15 minutes)
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSendingOtp(true);

    try {
      const res = await forgotPassword(email);
      if (res && res.success) {
        setSuccessMsg(res.message);
        if (res.debugOtp) {
          setDebugOtp(res.debugOtp);
        } else {
          setDebugOtp('');
        }
        setIsRealMailSent(Boolean(res.isRealMailSent));
        setStep(2);
        toast.info(res.message || 'Mã xác thực OTP (6 chữ số) đã được gửi.', 'Đã Gửi OTP');
      } else {
        setErrorMsg(res?.message || 'Không thể gửi mã OTP.');
        if (res?.message && res.message.includes('quá 3 lần')) {
          toast.warning(res.message, 'Giới Hạn Tần Suất (Rate Limit)');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      setErrorMsg('Mã OTP này đã hết hạn hiệu lực 15 phút. Vui lòng bấm gửi lại mã mới.');
      return;
    }

    setErrorMsg(null);
    setVerifyingOtp(true);

    try {
      const res = await verifyResetOtp(email, otp);
      if (res && res.success) {
        setSuccessMsg(res.message);
        setStep(3);
        toast.success('Xác thực mã OTP thành công! Vui lòng tạo mật khẩu mới.', 'Xác Thực OTP');
      } else {
        setErrorMsg(res?.message || 'Mã xác thực OTP không chính xác.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi kiểm tra mã OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setErrorMsg(null);
    setResettingPassword(true);

    try {
      const res = await resetPassword(email, otp, newPassword);
      if (res && res.success) {
        setStep(4);
        toast.success('Đặt lại mật khẩu thành công! Mọi phiên đăng nhập cũ đã được thu hồi an toàn.', 'Hoàn Tất Khôi Phục');
      } else {
        setErrorMsg(res?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setResettingPassword(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setOtp('');
    setDebugOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  // Prevent accidental loss of progress when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (step > 1 && step < 4) {
      toast.info('Bạn đang trong tiến trình xác thực mã OTP. Hộp thoại được giữ nguyên để bạn không bị mất dữ liệu.', 'Tiến Trình Xác Thực');
      return;
    }
    resetModal();
  };

  // Safe close button with confirmation if in progress
  const handleCloseButton = () => {
    if (step > 1 && step < 4) {
      const confirmClose = window.confirm('Bạn có chắc muốn đóng hộp thoại xác thực OTP? (Bạn vẫn có thể mở lại trong 15 phút)');
      if (!confirmClose) return;
    }
    resetModal();
  };

  return (
    <div
      className="ruo-modal-backdrop-smooth"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ruo-modal-card-smooth"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--surface-panel)',
          border: '1px solid var(--hairline-medium)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Accent Bar */}
        <div
          className="ruo-modal-accent-bar"
          style={{ background: 'linear-gradient(90deg, #3B82F6 0%, #06B6D4 50%, #10B981 100%)' }}
        />
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--hairline-soft)',
            background: 'var(--surface-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--laser-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SvgIcons.Key size={20} color="var(--laser-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                Khôi Phục Mật Khẩu (UC-1.3)
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                Bước {step > 3 ? 3 : step}/3 • Xác thực OTP 6 số qua email trường
              </span>
            </div>
          </div>

          <button
            onClick={handleCloseButton}
            className="ruo-icon-button"
            title="Đóng hộp thoại"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          >
            <SvgIcons.Close size={18} color="var(--ink-muted)" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', height: '3px', background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              width: step === 1 ? '33%' : step === 2 ? '66%' : '100%',
              background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SvgIcons.XCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: INPUT EMAIL */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp}>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: 0, marginBottom: '18px', lineHeight: 1.5 }}>
                Nhập email định danh nhà trường của bạn. Hệ thống sẽ gửi một mã OTP 6 chữ số có hiệu lực trong 15 phút.
              </p>

              <div className="form-group">
                <label className="form-label">Email trường (@university.edu.vn)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)' }}>
                    <SvgIcons.Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: '40px' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hoang.tb220412@university.edu.vn"
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--ink-muted)',
                  background: 'var(--surface-sunken)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px'
                }}
              >
                * Chính sách bảo vệ: Giới hạn tối đa 3 lần yêu cầu OTP trong vòng 1 giờ để chống thư rác và tấn công dò quét.
              </div>

              <button
                type="submit"
                disabled={sendingOtp}
                className="laser-btn laser-btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>{sendingOtp ? 'Đang gửi mã OTP...' : 'Gửi Mã Xác Thực OTP'}</span>
                <SvgIcons.ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  Gửi tới: <strong style={{ color: 'var(--ink-pure)' }}>{email}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#F59E0B', fontFamily: 'var(--font-sans)' }}>
                  <SvgIcons.Clock size={14} color="#F59E0B" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>

              {isRealMailSent && (
                <div
                  style={{
                    background: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: 'var(--ink-primary)',
                    lineHeight: 1.45
                  }}
                >
                  <SvgIcons.Mail size={18} color="var(--laser-cyan)" />
                  <span>
                    Mã xác thực đã được gửi tới hộp thư thật của bạn. Vui lòng kiểm tra <strong>Hộp thư đến</strong> hoặc mục <strong>Thư rác (Spam/Junk)</strong> để nhận mã OTP 6 số.
                  </span>
                </div>
              )}

              {debugOtp && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}
                >
                  <span style={{ color: '#10B981' }}>
                    [Dev Sandbox] Mã OTP máy chủ: <strong>{debugOtp}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(debugOtp)}
                    className="laser-btn laser-btn-ghost"
                    style={{ fontSize: '11px', padding: '3px 10px', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }}
                  >
                    Tự động điền
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Mã xác thực OTP (6 chữ số)</label>
                <input
                  type="text"
                  maxLength={6}
                  className="form-control"
                  style={{
                    fontSize: '24px',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-sans)'
                  }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                />
              </div>

              {/* Expired or Resend prompt */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '12px' }}>
                <span style={{ color: timeLeft === 0 ? '#EF4444' : 'var(--ink-muted)' }}>
                  {timeLeft === 0 ? 'Mã OTP đã hết hạn (15 phút).' : 'Chưa nhận được mã OTP?'}
                </span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={sendingOtp || verifyingOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--laser-cyan)',
                    fontWeight: 700,
                    cursor: (sendingOtp || verifyingOtp) ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {sendingOtp ? 'Đang gửi lại...' : 'Gửi lại mã mới'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={verifyingOtp || sendingOtp}
                  className="laser-btn laser-btn-ghost"
                  style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <SvgIcons.ArrowLeft size={16} />
                  <span>Đổi Email</span>
                </button>

                <button
                  type="submit"
                  disabled={otp.length !== 6 || verifyingOtp || timeLeft === 0}
                  className="laser-btn laser-btn-primary"
                  style={{ flex: 2, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span>{verifyingOtp ? 'Đang kiểm tra OTP...' : 'Xác Thực Mã OTP'}</span>
                  <SvgIcons.ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: INPUT NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu mới chuẩn bảo mật"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              {/* Live Validation Criteria */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--hairline-soft)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                  fontSize: '11.5px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.minLength ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.minLength ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Tối thiểu 8 ký tự</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasUpper ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.hasUpper ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Có chữ in hoa (A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasLower ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.hasLower ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Có chữ thường (a-z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasNumber ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.hasNumber ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Có chữ số (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasSpecial ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.hasSpecial ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Ký tự đặc biệt (@$!%*?&)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.isMatching ? '#10B981' : 'var(--ink-muted)' }}>
                  {passwordCriteria.isMatching ? <SvgIcons.Check size={13} /> : <SvgIcons.XCircle size={13} />}
                  <span>Khớp mật khẩu</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isPasswordValid || resettingPassword}
                className="laser-btn laser-btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '13.5px' }}
              >
                {resettingPassword ? 'Đang cập nhật mật khẩu...' : 'Lưu Mật Khẩu & Thu Hồi Phiên Cũ'}
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}
              >
                <SvgIcons.CheckCircle size={32} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 8px' }}>
                Đặt Lại Mật Khẩu Thành Công!
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Mọi phiên đăng nhập trên các thiết bị khác đã được thu hồi.
              </p>

              <button
                type="button"
                onClick={() => {
                  resetModal();
                  if (onSuccessLogin) onSuccessLogin(email);
                }}
                className="laser-btn laser-btn-primary"
                style={{ padding: '10px 28px', fontSize: '13.5px' }}
              >
                Đăng Nhập Bằng Mật Khẩu Mới
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
