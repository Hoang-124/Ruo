import React, { useState, useEffect } from 'react';
import { Icons, SvgIcon } from '../common/SvgIcons';

/**
 * Native SVG Device Icons for Logout Scope Selection
 * Strict Native SVG Only — Zero external dependencies.
 */
const LaptopIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </SvgIcon>
);

const DevicesIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="4" y="4" width="16" height="12" rx="2" />
    <line x1="8" y1="20" x2="16" y2="20" />
    <line x1="12" y1="16" x2="12" y2="20" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
  </SvgIcon>
);

/**
 * LogoutConfirmModal
 * Elegant, smooth dialog confirming user logout intent with session scope choice (UC-1.2).
 */
export const LogoutConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  userName = 'Người Dùng'
}) => {
  const [allDevices, setAllDevices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleExecuteLogout = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(allDevices);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="ruo-modal-backdrop-smooth ruo-logout-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div className="ruo-modal-card-smooth ruo-logout-modal-card">
        {/* Top Decorative Amber/Crimson Accent Bar */}
        <div className="ruo-modal-accent-bar" />

        {/* Modal Header */}
        <div className="ruo-logout-header">
          <div className="ruo-logout-icon-wrap" title="Đăng xuất bảo mật">
            <Icons.LogOut size={26} color="#EF4444" />
          </div>

          <div style={{ flex: 1 }}>
            <h2 id="logout-dialog-title" className="ruo-logout-title">
              Bạn có chắc chắn muốn đăng xuất?
            </h2>
            <p className="ruo-logout-subtitle">
              Chào <strong style={{ color: 'var(--ink-pure)' }}>{userName}</strong>, phiên làm việc hiện tại của bạn sẽ được kết thúc an toàn và thu hồi mã phiên JWT trên hệ thống CSVC Ruo.
            </p>
          </div>

          <button
            type="button"
            className="ruo-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            title="Hủy bỏ và đóng"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Scope Selector: Single Device vs All Devices (UC-1.2 Standard) */}
        <div className="ruo-logout-scope-box">
          <div className="ruo-scope-label">
            <span>CHỌN PHẠM VI KẾT THÚC PHIÊN LÀM VIỆC:</span>
          </div>

          <div className="ruo-scope-options">
            {/* Option 1: Current Device Only */}
            <div
              className={`ruo-scope-item ${!allDevices ? 'selected' : ''}`}
              onClick={() => !isSubmitting && setAllDevices(false)}
              onKeyDown={(e) => {
                if (!isSubmitting && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setAllDevices(false);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Đăng xuất chỉ trên thiết bị này"
            >
              <div className="ruo-scope-radio">
                {!allDevices && <div className="ruo-scope-radio-dot" />}
              </div>
              <div className="ruo-scope-icon">
                <LaptopIcon size={18} color={!allDevices ? 'var(--laser-cyan)' : 'var(--ink-muted)'} />
              </div>
              <div className="ruo-scope-text">
                <span className="ruo-scope-title">Chỉ thiết bị này</span>
                <span className="ruo-scope-desc">Đăng xuất khỏi trình duyệt hiện tại. Giữ đăng nhập trên các máy tính và điện thoại khác.</span>
              </div>
            </div>

            {/* Option 2: All Devices */}
            <div
              className={`ruo-scope-item ${allDevices ? 'selected danger' : ''}`}
              onClick={() => !isSubmitting && setAllDevices(true)}
              onKeyDown={(e) => {
                if (!isSubmitting && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setAllDevices(true);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Đăng xuất khỏi tất cả các thiết bị"
            >
              <div className="ruo-scope-radio danger">
                {allDevices && <div className="ruo-scope-radio-dot danger" />}
              </div>
              <div className="ruo-scope-icon">
                <DevicesIcon size={18} color={allDevices ? '#EF4444' : 'var(--ink-muted)'} />
              </div>
              <div className="ruo-scope-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="ruo-scope-title">Tất cả các thiết bị</span>
                  <span className="ruo-scope-badge">Khuyên dùng khi mất máy</span>
                </div>
                <span className="ruo-scope-desc">Hủy toàn bộ token và cưỡng chế đăng xuất trên mọi phiên máy tính, điện thoại, máy tính bảng.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Note */}
        <div className="ruo-logout-audit-note">
          <Icons.Shield size={13} color="var(--laser-cyan)" />
          <span>Hành động đăng xuất sẽ được lưu vết vào Nhật Ký Kiểm Toán SHA-256 (Audit Log) theo chuẩn UC-1.2.</span>
        </div>

        {/* Modal Actions */}
        <div className="ruo-logout-actions">
          <button
            type="button"
            className="laser-btn laser-btn-ghost ruo-logout-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <span>Hủy Bỏ</span>
          </button>

          <button
            type="button"
            className={`laser-btn ${allDevices ? 'laser-btn-danger' : 'laser-btn-primary'} ruo-logout-confirm-btn`}
            onClick={handleExecuteLogout}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Đang xử lý đăng xuất...</span>
              </>
            ) : (
              <>
                <Icons.LogOut size={16} />
                <span>{allDevices ? 'Đăng Xuất Mọi Thiết Bị' : 'Đăng Xuất Thiết Bị Này'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
