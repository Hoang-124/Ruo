import React, { useState } from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';

/**
 * UC-10.7: Role Approval & Appointment Modal
 * 
 * Agency-grade interactive dialog for Admin to approve privileged role appointments
 * (Facility Manager, Technician) or reject requests (demoting candidate to Lecturer).
 * 
 * Strict Native SVG Only.
 */
export const RoleApprovalModal = ({
  user,
  initialAction = 'approve', // 'approve' | 'reject'
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [action, setAction] = useState(initialAction);
  const [selectedRole, setSelectedRole] = useState(user?.requested_role || USER_ROLES.FACILITY_MANAGER);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync state if user or initialAction changes
  React.useEffect(() => {
    if (user) {
      setAction(initialAction);
      setSelectedRole(user.requested_role || USER_ROLES.FACILITY_MANAGER);
      setNote('');
      setErrorMsg(null);
    }
  }, [user, initialAction, isOpen]);

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen || !user) return null;

  const reqRoleMeta = ROLE_METADATA[user.requested_role] || ROLE_METADATA[USER_ROLES.FACILITY_MANAGER];
  const targetRoleMeta = ROLE_METADATA[action === 'reject' ? USER_ROLES.LECTURER : selectedRole] || ROLE_METADATA[USER_ROLES.LECTURER];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === 'reject' && !note.trim()) {
      setErrorMsg('Vui lòng nhập lý do từ chối nguyện vọng chức vụ để thông báo cho cán bộ.');
      return;
    }
    setErrorMsg(null);
    onSubmit({
      userId: user._id,
      action,
      role: action === 'reject' ? USER_ROLES.LECTURER : selectedRole,
      note: note.trim()
    });
  };

  return (
    <div
      className="ruo-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        animation: 'fadeIn 0.18s ease'
      }}
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="ruo-modal-content"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--surface-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: action === 'approve'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: action === 'approve' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                border: `1px solid ${action === 'approve' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {action === 'approve' ? (
                <Icons.CheckCircle size={22} color="#10B981" />
              ) : (
                <Icons.XCircle size={22} color="#EF4444" />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                  {action === 'approve' ? 'Phê Duyệt Bổ Nhiệm Chức Vụ' : 'Từ Chối Nguyện Vọng Chức Vụ'}
                </h3>
                <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-sunken)', color: 'var(--ink-muted)' }}>
                  UC-10.7
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                Quyết định thẩm quyền Ban Giám Hiệu đối với tài khoản chờ duyệt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="ruo-modal-body" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Candidate Identity Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: reqRoleMeta.bg,
                  color: reqRoleMeta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '15px',
                  border: `1.5px solid ${reqRoleMeta.color}40`
                }}
              >
                {user.avatar || user.full_name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink-primary)' }}>
                    {user.full_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blueprint-400)', fontWeight: 700 }}>
                    {user.code}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  {user.email} • {user.department || 'Đại Học Quốc Gia'}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Nguyện vọng
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: reqRoleMeta.bg,
                  color: reqRoleMeta.color,
                  border: `1px solid ${reqRoleMeta.color}40`,
                  display: 'inline-block',
                  marginTop: '2px'
                }}
              >
                {reqRoleMeta.label}
              </span>
            </div>
          </div>

          {/* Segmented Action Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Quyết định của Quản trị viên:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'var(--surface-sunken)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--border-default)'
              }}
            >
              <button
                type="button"
                onClick={() => { setAction('approve'); setErrorMsg(null); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: action === 'approve' ? '1px solid rgba(16, 185, 129, 0.5)' : 'none',
                  background: action === 'approve' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: action === 'approve' ? '#10B981' : 'var(--ink-secondary)',
                  fontWeight: action === 'approve' ? 800 : 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icons.Check size={16} strokeWidth={2.5} />
                <span>Chấp Thuận Bổ Nhiệm</span>
              </button>

              <button
                type="button"
                onClick={() => { setAction('reject'); setErrorMsg(null); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: action === 'reject' ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
                  background: action === 'reject' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  color: action === 'reject' ? '#EF4444' : 'var(--ink-secondary)',
                  fontWeight: action === 'reject' ? 800 : 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icons.X size={16} strokeWidth={2.5} />
                <span>Từ Chối (Hạ về Giảng Viên)</span>
              </button>
            </div>
          </div>

          {/* Action-specific Options */}
          {action === 'approve' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                Chức vụ chính thức được trao:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--ink-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={USER_ROLES.FACILITY_MANAGER}>Quản Lý CSVC (Toàn quyền Kanban, SLA & Kho)</option>
                <option value={USER_ROLES.TECHNICIAN}>Kỹ Thuật Viên (Tiếp nhận sửa chữa, QR & Linh kiện)</option>
                <option value={USER_ROLES.ADMIN}>Quản Trị Viên BGH (Quyền cấu hình & Phê duyệt cao cấp)</option>
                <option value={USER_ROLES.LECTURER}>Giảng Viên (Quyền cơ bản: Báo hỏng & Tra cứu phòng)</option>
              </select>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                fontSize: '12.5px',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5
              }}
            >
              <Icons.Shield size={16} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                Cán bộ sẽ được kích hoạt tài khoản ngay lập tức với vai trò{' '}
                <strong style={{ color: '#10B981' }}>Giảng Viên (Lecturer)</strong> để tiếp tục sử dụng hệ thống tra cứu thiết bị và gửi đề xuất báo hỏng thông thường.
              </div>
            </div>
          )}

          {/* Note & Reason Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{action === 'approve' ? 'Ghi chú phê duyệt / Số quyết định bổ nhiệm:' : 'Lý do từ chối (bắt buộc):'}</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 500 }}>
                {action === 'approve' ? 'Tùy chọn' : 'Lưu vào hồ sơ cán bộ'}
              </span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === 'approve'
                ? 'Ví dụ: Đạt chuẩn nghiệp vụ thiết bị theo Quyết định số 45/QĐ-BGH ngày 15/10/2026'
                : 'Ví dụ: Chưa đủ chứng chỉ kiểm định an toàn điện thiết bị bậc 3 theo quy định'
              }
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--surface-sunken)',
                border: `1px solid ${errorMsg ? '#EF4444' : 'var(--border-default)'}`,
                color: 'var(--ink-primary)',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errorMsg && (
              <span style={{ fontSize: '11.5px', color: '#EF4444', fontWeight: 600 }}>
                {errorMsg}
              </span>
            )}
          </div>

          {/* Decision Outcome Summary */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--surface-sunken)',
              border: '1px dashed var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Kết quả sau xử lý:</span>
              <span
                style={{
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: targetRoleMeta.bg,
                  color: targetRoleMeta.color
                }}
              >
                {targetRoleMeta.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 700 }}>
              <Icons.CheckCircle size={14} color="#10B981" />
              <span>Trạng thái: Hoạt động (Active)</span>
            </div>
          </div>

          </div>

          {/* Action Buttons */}
          <div className="ruo-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ruo-btn ruo-btn-ghost ruo-btn-sm"
              style={{ padding: '9px 16px' }}
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={loading}
              className="ruo-btn ruo-btn-sm"
              style={{
                padding: '9px 20px',
                background: action === 'approve' ? '#10B981' : '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: action === 'approve'
                  ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                  : '0 4px 14px rgba(239, 68, 68, 0.35)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <span>Đang xử lý thẩm quyền...</span>
              ) : action === 'approve' ? (
                <>
                  <Icons.Check size={16} strokeWidth={2.5} />
                  <span>Xác Nhận Bổ Nhiệm</span>
                </>
              ) : (
                <>
                  <Icons.X size={16} strokeWidth={2.5} />
                  <span>Xác Nhận Từ Chối</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
