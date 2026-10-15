import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';

/**
 * UC-10.5: User Lock / Unlock Confirmation Modal
 * Supports selecting/entering lock reasons and warns about session revocation.
 * Strictly Native SVG Only.
 */
export const UserLockModal = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [reasonOption, setReasonOption] = useState('Nghi vấn an ninh / Tài khoản bị xâm phạm hoặc lộ thông tin');
  const [customReason, setCustomReason] = useState('');

  const PRESET_REASONS = [
    'Nghi vấn an ninh / Tài khoản bị xâm phạm hoặc lộ thông tin',
    'Tạm ngưng công tác / Đang trong quy trình thanh tra nội bộ',
    'Vi phạm nghiêm trọng quy chế quản lý và sử dụng tài sản phòng máy',
    'Cán bộ chuyển đơn vị / Nghỉ việc chưa thanh lý hồ sơ bàn giao',
    'custom'
  ];

  useEffect(() => {
    if (isOpen) {
      setReasonOption('Nghi vấn an ninh / Tài khoản bị xâm phạm hoặc lộ thông tin');
      setCustomReason('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isLocked = user.status === 'locked';
  const roleMeta = ROLE_METADATA[user.role] || ROLE_METADATA[USER_ROLES.LECTURER];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked) {
      // Unlock action
      onConfirm(user._id, 'unlock', '');
    } else {
      // Lock action
      const finalReason = reasonOption === 'custom'
        ? (customReason.trim() || 'Quản trị viên khóa tài khoản')
        : reasonOption;
      onConfirm(user._id, 'lock', finalReason);
    }
  };

  return (
    <div className="ruo-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="ruo-modal-content"
        style={{
          maxWidth: '520px',
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
            background: isLocked ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLocked ? '#10B981' : '#EF4444'
              }}
            >
              {isLocked ? <Icons.Unlock size={20} /> : <Icons.Lock size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                {isLocked ? 'Xác Nhận Mở Khóa Tài Khoản' : 'Khóa Tài Khoản Người Dùng (Soft Lock)'}
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                {isLocked ? 'Kích hoạt lại quyền truy cập hệ thống' : 'Thu hồi tức thời phiên làm việc & phân quyền (UC-10.5)'}
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
            {/* Target User Info Card */}
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
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: roleMeta.bg,
                  color: roleMeta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '15px'
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
                  <span>{user.code}</span> • <span>{user.email}</span> • <span>{user.department || 'Chưa gán đơn vị'}</span>
                </div>
              </div>
            </div>

            {/* Lock Action Details */}
            {!isLocked ? (
              <>
                {/* Warning Banner */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}
                >
                  <Icons.AlertTriangle size={18} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    <strong style={{ color: '#EF4444', display: 'block', marginBottom: '2px' }}>
                      Cảnh báo thu hồi phiên làm việc tức thời (Session Invalidation)
                    </strong>
                    <span style={{ color: 'var(--ink-secondary)' }}>
                      Tài khoản sẽ bị chuyển sang trạng thái <strong>Đã Khóa (Locked)</strong>. Toàn bộ Refresh Tokens hiện tại của cán bộ sẽ bị vô hiệu hóa lập tức, ngăn chặn mọi truy cập trên mọi thiết bị.
                    </span>
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                      marginBottom: '8px'
                    }}
                  >
                    Lý do khóa tài khoản <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {PRESET_REASONS.map((reason, idx) => (
                      <label
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: reasonOption === reason ? '1px solid var(--laser-cyan)' : '1px solid var(--hairline-medium)',
                          background: reasonOption === reason ? 'rgba(0, 242, 254, 0.04)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          color: reasonOption === reason ? 'var(--laser-cyan)' : 'var(--ink-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="lockReason"
                          checked={reasonOption === reason}
                          onChange={() => setReasonOption(reason)}
                          style={{ accentColor: 'var(--laser-cyan)' }}
                        />
                        <span>{reason === 'custom' ? 'Lý do khác (Nhập chi tiết bên dưới)' : reason}</span>
                      </label>
                    ))}
                  </div>

                  {reasonOption === 'custom' && (
                    <div style={{ marginTop: '10px' }}>
                      <textarea
                        className="ruo-input"
                        rows={2}
                        placeholder="Nhập chi tiết lý do khóa tài khoản..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        required
                        style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Unlock Action Details */
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}
              >
                <Icons.CheckCircle size={18} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', lineHeight: '1.5' }}>
                  <strong style={{ color: '#10B981', display: 'block', marginBottom: '4px' }}>
                    Khôi phục trạng thái hoạt động (Active)
                  </strong>
                  <span style={{ color: 'var(--ink-secondary)', display: 'block', marginBottom: '6px' }}>
                    Tài khoản sẽ được mở khóa ngay lập tức. Số lần đăng nhập sai sẽ được đặt lại về 0 và lý do khóa trước đây sẽ được giải tỏa.
                  </span>
                  {user.lock_reason && (
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                      Lý do khóa hiện tại: <em>"{user.lock_reason}"</em>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              className={`ruo-btn ${isLocked ? 'ruo-btn-success' : 'ruo-btn-danger'}`}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '130px', justifyContent: 'center' }}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  {isLocked ? <Icons.Unlock size={14} /> : <Icons.Lock size={14} />}
                  <span>{isLocked ? 'Mở Khóa Ngay' : 'Khóa Tài Khoản'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserLockModal;
