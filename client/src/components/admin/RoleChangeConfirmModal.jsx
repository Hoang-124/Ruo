import React from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';

/**
 * UC-10.4: Role Change Confirmation Modal
 * Notifies the Admin of live RBAC update and immediate session revocation.
 * Strict Native SVG Only.
 */
export const RoleChangeConfirmModal = ({
  user,
  newRole,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  if (!isOpen || !user || !newRole) return null;

  const currentMeta = ROLE_METADATA[user.role] || ROLE_METADATA[USER_ROLES.LECTURER];
  const targetMeta = ROLE_METADATA[newRole] || ROLE_METADATA[USER_ROLES.LECTURER];

  return (
    <div
      className="ruo-modal-overlay"
      style={{
        animation: 'fadeIn 0.15s ease',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        className="ruo-modal-content"
        style={{
          maxWidth: '520px',
          width: '92%',
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--surface-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icons.Shield size={18} color="#F59E0B" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink-primary)' }}>
                Điều Chỉnh Vai Trò (UC-10.4)
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                Xác nhận thay đổi phân quyền RBAC & thu hồi phiên làm việc
              </span>
            </div>
          </div>

          <button
            className="ruo-btn-close"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '6px', borderRadius: '6px' }}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* User target information card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--hairline-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: currentMeta.bg,
                  color: currentMeta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: `1px solid ${currentMeta.color}40`
                }}
              >
                {user.avatar || user.full_name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--ink-primary)', fontSize: '14px' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  {user.code} • {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Role Change Visual Progression */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              border: '1px dashed var(--border-default)'
            }}
          >
            {/* Old Role */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Vai trò hiện tại
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: currentMeta.bg,
                  color: currentMeta.color,
                  border: `1px solid ${currentMeta.color}40`
                }}
              >
                {currentMeta.label}
              </span>
            </div>

            {/* Direction Arrow */}
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--laser-cyan)'
              }}
            >
              <Icons.ArrowRight size={16} />
            </div>

            {/* New Role */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Vai trò mới (Live)
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: targetMeta.bg,
                  color: targetMeta.color,
                  border: `1.5px solid ${targetMeta.color}`
                }}
              >
                {targetMeta.label}
              </span>
            </div>
          </div>

          {/* Session Revocation Alert (UC-10.4 Key Requirement) */}
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
                Thu Hồi Phiên Đăng Nhập Tức Thời (Session Invalidation)
              </strong>
              <span style={{ color: 'var(--ink-secondary)' }}>
                Sau khi áp dụng vai trò mới, máy chủ sẽ thu hồi toàn bộ <strong>Refresh Tokens</strong> của người dùng này trên mọi thiết bị.
                Cán bộ sẽ được yêu cầu đăng nhập lại để nhận Token chứa phân quyền RBAC mới.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            className="ruo-btn ruo-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            className="ruo-btn ruo-btn-primary"
            onClick={() => onConfirm(user._id, newRole)}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? (
              <>
                <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <>
                <Icons.Check size={14} />
                <span>Xác Nhận & Thu Hồi Phiên</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleChangeConfirmModal;
