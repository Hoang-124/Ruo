import React, { useState, useMemo } from 'react';
import { Icons } from '../common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

/**
 * UC-10.6: Mandatory Password Change Modal
 * Displayed upon login when an admin has reset the user's password (force_change_pw === true).
 * Non-dismissible until new password meeting all complexity criteria is set, or user logs out.
 * Strictly Native Inline SVG Only.
 */
export const MandatoryPasswordChangeModal = () => {
  const { currentUser, changePassword, logout } = useAuth();
  const { toast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Policy Checklist
  const criteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[^a-zA-Z\d\s]/.test(newPassword),
      isDifferent: Boolean(newPassword && oldPassword && newPassword !== oldPassword),
      isMatching: Boolean(newPassword && confirmPassword && newPassword === confirmPassword)
    };
  }, [newPassword, oldPassword, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLength) score += 20;
    if (criteria.hasUpper) score += 20;
    if (criteria.hasLower) score += 20;
    if (criteria.hasNumber) score += 20;
    if (criteria.hasSpecial) score += 20;
    return score;
  }, [criteria]);

  const strengthMeta = useMemo(() => {
    if (strengthScore <= 40) return { label: 'Yếu', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (strengthScore <= 80) return { label: 'Trung bình', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    return { label: 'Rất mạnh (Đạt chuẩn)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
  }, [strengthScore]);

  const isValid = criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial &&
    criteria.isDifferent &&
    criteria.isMatching;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!oldPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu tạm thời hiện tại.');
      return;
    }

    if (!isValid) {
      setErrorMessage('Mật khẩu mới chưa đáp ứng đầy đủ tiêu chuẩn bảo mật bên dưới.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim()
      });

      if (res && res.success) {
        toast.success(
          res.message || 'Thiết lập mật khẩu mới thành công! Bạn có thể bắt đầu sử dụng hệ thống.',
          'Đổi Mật Khẩu Thành Công (UC-10.6)'
        );
      } else {
        const msg = res?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';
        setErrorMessage(msg);
        toast.error(msg, 'Lỗi Đổi Mật Khẩu');
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Lỗi hệ thống khi đổi mật khẩu.';
      setErrorMessage(msg);
      toast.error(msg, 'Lỗi Thao Tác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.info('Đã đăng xuất tài khoản an toàn.', 'Đăng Xuất');
    } catch (e) {
      window.location.reload();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      className="ruo-modal-overlay"
      style={{
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="ruo-modal-content"
        style={{
          maxWidth: '540px',
          width: '100%',
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--hairline-medium)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 100%)',
            borderBottom: '1px solid var(--hairline-medium)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B',
              flexShrink: 0
            }}
          >
            <Icons.Key size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink-primary)' }}>
              Yêu Cầu Đổi Mật Khẩu Khởi Tạo (UC-10.6)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Tài khoản được Admin cấp lại mật khẩu tạm — Bắt buộc đổi ở lần đăng nhập đầu
            </span>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="ruo-modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Notice card */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <Icons.AlertTriangle size={16} color="#F59E0B" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--ink-secondary)' }}>
                Xin chào <strong>{currentUser?.fullName || currentUser?.name}</strong> ({currentUser?.code}). Vì lý do an toàn bảo mật thông tin, bạn bắt buộc phải tạo mật khẩu mới đạt chuẩn trước khi có thể truy cập các tính năng của hệ thống Ruo.
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Field 1: Old / Temp Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                Mật khẩu tạm thời hiện tại <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOld ? 'text' : 'password'}
                  className="ruo-input"
                  required
                  placeholder="Nhập mật khẩu tạm được cấp (e.g. Ruo@...)"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="ruo-btn-close"
                  title={showOld ? 'Ẩn' : 'Hiện'}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '6px' }}
                >
                  {showOld ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Field 2 & Field 3: New Password & Confirm Password side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  Mật khẩu mới của bạn <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="ruo-input"
                    required
                    placeholder="Mật khẩu mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '36px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="ruo-btn-close"
                    title={showNew ? 'Ẩn' : 'Hiện'}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '6px' }}
                  >
                    {showNew ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  Xác nhận lại mật khẩu mới <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="ruo-input"
                    required
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '36px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="ruo-btn-close"
                    title={showConfirm ? 'Ẩn' : 'Hiện'}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '6px' }}
                  >
                    {showConfirm ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Password Strength Meter */}
            {newPassword && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>Độ phức tạp mật khẩu:</span>
                  <span style={{ fontWeight: 700, color: strengthMeta.color }}>{strengthMeta.label} ({strengthScore}%)</span>
                </div>
                <div style={{ height: '5px', width: '100%', background: 'var(--hairline-medium)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${strengthScore}%`,
                      background: strengthMeta.color,
                      borderRadius: '3px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Password Policy Criteria Checklist */}
            <div
              style={{
                background: 'var(--surface-elevated)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--hairline-medium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11.5px'
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Tiêu chuẩn mật khẩu an toàn:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.minLength ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.minLength ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>≥ 8 ký tự</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.hasUpper ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.hasUpper ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>Chữ hoa (A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.hasLower ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.hasLower ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>Chữ thường (a-z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.hasNumber ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.hasNumber ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>Chữ số (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.hasSpecial ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.hasSpecial ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>Ký tự đặc biệt</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: criteria.isMatching ? '#10B981' : 'var(--ink-muted)' }}>
                  {criteria.isMatching ? <Icons.CheckCircle size={13} color="#10B981" /> : <Icons.Clock size={13} />}
                  <span>Mật khẩu khớp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="ruo-modal-footer"
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--hairline-medium)',
              background: 'var(--surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <button
              type="button"
              className="ruo-btn ruo-btn-ghost ruo-btn-sm"
              onClick={handleLogout}
              disabled={submitting || loggingOut}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-muted)' }}
            >
              <Icons.LogOut size={14} />
              <span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</span>
            </button>

            <button
              type="submit"
              className="ruo-btn ruo-btn-primary"
              disabled={!isValid || submitting || loggingOut}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '160px',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Icons.CheckCircle size={15} />
                  <span>Xác Nhận Đổi Mật Khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MandatoryPasswordChangeModal;
