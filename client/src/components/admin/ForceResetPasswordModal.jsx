import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';

/**
 * UC-10.5: Force Reset User Password Modal (Admin Only)
 * POST /api/admin/users/:id/reset-password
 * Supports auto-generating temporary passwords, copy to clipboard, and session revocation warnings.
 * Strictly Native SVG Only.
 */
export const ForceResetPasswordModal = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    const randNum = Math.floor(100000 + Math.random() * 900000);
    return `Ruo@${randNum}`;
  };

  useEffect(() => {
    if (isOpen) {
      setPassword(generateRandomPassword());
      setShowPassword(true);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const roleMeta = ROLE_METADATA[user.role] || ROLE_METADATA[USER_ROLES.LECTURER];

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || password.trim().length < 6) return;
    onConfirm(user._id, password.trim());
  };

  return (
    <div className="ruo-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="ruo-modal-content"
        style={{
          maxWidth: '480px',
          width: '92%',
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--hairline-medium)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--hairline-medium)',
            background: 'rgba(245, 158, 11, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B'
              }}
            >
              <Icons.Key size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                Đặt Lại Mật Khẩu Khẩn Cấp
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                Force Password Reset & Invalidate Sessions (UC-10.5)
              </span>
            </div>
          </div>
          <button
            type="button"
            className="ruo-btn-close"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target User Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline-medium)'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: roleMeta.bg,
                  color: roleMeta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px'
                }}
              >
                {user.code?.substring(0, 2) || 'CB'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink-primary)' }}>
                    {user.full_name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: roleMeta.bg,
                      color: roleMeta.color
                    }}
                  >
                    {roleMeta.label}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                  <span>{user.code}</span> • <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <Icons.AlertTriangle size={18} color="#F59E0B" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <strong style={{ color: '#F59E0B', display: 'block', marginBottom: '2px' }}>
                  Chính sách bảo mật tài khoản
                </strong>
                <span style={{ color: 'var(--ink-secondary)' }}>
                  Hệ thống sẽ bật cờ <code>force_change_pw: true</code> và thu hồi toàn bộ phiên đăng nhập hiện tại. Cán bộ bắt buộc phải nhập mật khẩu mới này và tiến hành đổi mật khẩu cá nhân ở lần đăng nhập tới.
                </span>
              </div>
            </div>

            {/* New Password Input & Generate Button */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', margin: 0 }}>
                  Mật khẩu mới cấp phát <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <button
                  type="button"
                  className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                  onClick={() => setPassword(generateRandomPassword())}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '2px 8px' }}
                >
                  <Icons.Refresh size={12} />
                  <span>Tạo Mật Khẩu Ngẫu Nhiên</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="ruo-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Nhập tối thiểu 6 ký tự..."
                  style={{ width: '100%', paddingRight: '76px', fontFamily: 'monospace', fontWeight: 600, fontSize: '14px' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ruo-btn-close"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    style={{ padding: '6px' }}
                  >
                    {showPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                    title="Sao chép mật khẩu"
                    style={{ padding: '4px 6px', fontSize: '11px', color: copied ? '#10B981' : 'var(--ink-secondary)' }}
                  >
                    {copied ? 'Đã chép' : 'Chép'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--hairline-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--surface-elevated)'
            }}
          >
            <button
              type="button"
              className="ruo-btn ruo-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="ruo-btn ruo-btn-primary"
              disabled={loading || !password || password.length < 6}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '140px', justifyContent: 'center' }}
            >
              {loading ? (
                <span>Đang cập nhật...</span>
              ) : (
                <>
                  <Icons.Key size={14} />
                  <span>Xác Nhận Cấp Mật Khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForceResetPasswordModal;
