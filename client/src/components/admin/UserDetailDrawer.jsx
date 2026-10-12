import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';
import { authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * UC-10.3: User Detail & RBAC Drawer
 * Displays detailed user profile, registered roles, creation date, and activity history.
 * Strict Native SVG Only.
 */
export const UserDetailDrawer = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  onOpenResetPassword,
  onToggleLock
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'rbac' | 'history'
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [userData, setUserData] = useState(user);

  // Sync internal user data when prop changes
  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);

  // Load detailed user info & audit activities on open
  useEffect(() => {
    if (isOpen && user?._id) {
      setLoadingActivities(true);
      authApi.getUserById(user._id)
        .then(res => {
          if (res.success) {
            if (res.user) setUserData(res.user);
            if (Array.isArray(res.activities)) setActivities(res.activities);
          }
        })
        .catch(err => {
          console.warn('Lỗi tải nhật ký hoạt động người dùng:', err.message);
        })
        .finally(() => {
          setLoadingActivities(false);
        });
    }
  }, [isOpen, user?._id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !userData) return null;

  const roleMeta = ROLE_METADATA[userData.role] || ROLE_METADATA[USER_ROLES.LECTURER];
  const isLocked = userData.status === 'locked';
  const isPending = userData.status === 'pending_approval' || userData.status === 'pending';
  const reputeScore = userData.repute_score ?? 100;
  const reputeColor = reputeScore >= 80 ? '#10B981' : reputeScore >= 50 ? '#F59E0B' : '#EF4444';
  const reputeLabel = reputeScore >= 85 ? 'Tín nhiệm xuất sắc' : reputeScore >= 60 ? 'Mức bình thường' : 'Cảnh báo vi phạm';

  const getActionMeta = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'USER_LOGIN':
        return { label: 'Đăng nhập hệ thống', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'LOGOUT':
        return { label: 'Đăng xuất', color: '#71717A', bg: 'rgba(113, 113, 122, 0.15)' };
      case 'RBAC_UPDATE':
      case 'UPDATE_ROLE':
        return { label: 'Cập nhật phân quyền RBAC', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'UPDATE_PROFILE':
      case 'USER_UPDATE_PROFILE':
        return { label: 'Cập nhật thông tin hồ sơ', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'LOCK_USER':
        return { label: 'Khóa tài khoản', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'UNLOCK_USER':
        return { label: 'Mở khóa tài khoản', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'RESET_PASSWORD':
      case 'CHANGE_PASSWORD':
        return { label: 'Thay đổi mật khẩu', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'APPROVE_USER':
        return { label: 'Phê duyệt bổ nhiệm', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      default:
        return { label: action || 'Thao tác hệ thống', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
    }
  };

  return (
    <div className="ruo-modal-overlay" style={{ animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div
        className="ruo-modal-content"
        style={{
          maxWidth: '720px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header Banner */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--surface-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isPending ? 'rgba(245, 158, 11, 0.18)' : roleMeta.bg,
                color: isPending ? '#F59E0B' : roleMeta.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '17px',
                border: `1.5px solid ${isPending ? '#F59E0B50' : `${roleMeta.color}50`}`
              }}
            >
              {userData.avatar || userData.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink-primary)' }}>
                  {userData.full_name}
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: 'var(--blueprint-400)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {userData.code}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                Chi tiết hồ sơ nhân sự, phân quyền RBAC và lịch sử tài khoản (UC-10.3)
              </p>
            </div>
          </div>

          <button
            className="ruo-btn-close"
            onClick={onClose}
            title="Đóng (Esc)"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 24px',
            background: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--hairline-medium)'
          }}
        >
          {[
            { id: 'profile', label: 'Hồ Sơ & Đơn Vị', icon: Icons.User },
            { id: 'rbac', label: 'Phân Quyền (RBAC)', icon: Icons.Shield },
            { id: 'history', label: `Lịch Sử Hoạt Động (${activities.length})`, icon: Icons.Audit }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--blueprint-500)' : 'transparent'}`,
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? 'var(--laser-cyan)' : 'var(--ink-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <TabIcon size={14} color={isActive ? 'var(--laser-cyan)' : 'var(--ink-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body with Tab Views */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TAB 1: Profile & Contact */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Repute Score Card */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: `${reputeColor}18`,
                      border: `1px solid ${reputeColor}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icons.Shield size={20} color={reputeColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Điểm Tín Nhiệm Người Dùng (Repute Score)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: reputeColor }}>
                        {reputeScore}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>/ 100</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: reputeColor,
                          background: `${reputeColor}15`,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {reputeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ width: '150px' }}>
                  <div style={{ height: '7px', width: '100%', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, reputeScore))}%`, height: '100%', background: reputeColor, borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', display: 'block', marginTop: '4px', textAlign: 'right' }}>
                    Hệ thống đánh giá tự động
                  </span>
                </div>
              </div>

              {/* Identity & Contact Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>MÃ CÁN BỘ / MSSV</span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: '10px' }}>(Khóa cứng)</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--blueprint-400)', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                    {userData.code}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>EMAIL ĐĂNG NHẬP</span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: '10px' }}>(Khóa cứng)</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                    {userData.email}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>SỐ ĐIỆN THOẠI</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                    {userData.phone || 'Chưa cập nhật'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>KHOA / ĐƠN VỊ CÔNG TÁC</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                    {userData.department || 'Đại Học Ruo'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>NGÀY KHỞI TẠO TÀI KHOẢN</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                    {userData.created_at ? new Date(userData.created_at).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>ĐĂNG NHẬP GẦN NHẤT</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px', fontSize: '12.5px' }}>
                    {userData.last_login_at ? new Date(userData.last_login_at).toLocaleString('vi-VN') : 'Chưa có lượt đăng nhập'}
                    {userData.last_login_ip && (
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        IP: {userData.last_login_ip}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC & Permissions Scaffold */}
          {activeTab === 'rbac' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    VAI TRÒ HIỆN TẠI (ROLE)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: roleMeta.bg,
                        color: roleMeta.color,
                        border: `1px solid ${roleMeta.color}40`
                      }}
                    >
                      {roleMeta.label || userData.role}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Mã vai trò: <code>{userData.role}</code>
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    TRẠNG THÁI TÀI KHOẢN
                  </span>
                  <div style={{ marginTop: '4px' }}>
                    {isLocked ? (
                      <span className="ruo-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <Icons.Lock size={12} style={{ marginRight: '4px' }} /> Đang bị khóa
                      </span>
                    ) : isPending ? (
                      <span className="ruo-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <Icons.Clock size={12} style={{ marginRight: '4px' }} /> Chờ phê duyệt
                      </span>
                    ) : (
                      <span className="ruo-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Icons.CheckCircle size={12} style={{ marginRight: '4px' }} /> Đang hoạt động
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {userData.requested_role && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#F59E0B', fontWeight: 700 }}>
                      NGUYỆN VỌNG BỔ NHIỆM CHỨC VỤ ĐĂNG KÝ
                    </span>
                    <div style={{ fontWeight: 700, color: 'var(--ink-primary)', fontSize: '14px', marginTop: '2px' }}>
                      {ROLE_METADATA[userData.requested_role]?.label || userData.requested_role}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Activity Audit History */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 800, margin: 0, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Audit size={16} color="var(--blueprint-400)" />
                  <span>Lịch Sử Hoạt Động & Kiểm Toán ({activities.length})</span>
                </h3>
                {loadingActivities && (
                  <span style={{ fontSize: '12px', color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Icons.Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Đang nạp dữ liệu...
                  </span>
                )}
              </div>

              {loadingActivities ? (
                <div style={{ padding: '36px', textAlign: 'center', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <Icons.Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blueprint-400)' }} />
                  <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--ink-muted)' }}>Đang truy vấn chuỗi kiểm toán SHA-256 từ máy chủ...</div>
                </div>
              ) : activities.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                  <Icons.Clock size={28} style={{ color: 'var(--ink-faint)', marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Chưa ghi nhận hoạt động nào của cán bộ này trong hệ thống.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {activities.map((act, idx) => {
                    const meta = getActionMeta(act.action);
                    const actDate = act.created_at || act.hashed_at || act.timestamp;
                    return (
                      <div
                        key={act._id || idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-sunken)',
                          border: '1px solid var(--hairline-soft)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          fontSize: '12.5px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.color}40`
                              }}
                            >
                              {meta.label}
                            </span>
                            {act.target_table && (
                              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                                [{act.target_table}]
                              </span>
                            )}
                            {act.seq !== undefined && (
                              <span style={{ fontSize: '10px', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                                #{act.seq}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--ink-secondary)', fontSize: '12px' }}>
                            {act.entity_id ? `Thực thể: ${act.entity_id}` : act.user_display || 'Thao tác trên giao diện'}
                            {act.ip_address && <span style={{ marginLeft: '8px', color: 'var(--ink-muted)' }}>• IP: {act.ip_address}</span>}
                          </div>
                        </div>

                        <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                          {actDate ? new Date(actDate).toLocaleString('vi-VN') : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {onOpenResetPassword && (
              <button
                type="button"
                className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                onClick={() => {
                  onOpenResetPassword(userData);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icons.Key size={13} color="#F59E0B" />
                <span>Cấp Lại Mật Khẩu</span>
              </button>
            )}

            {onToggleLock && (
              <button
                type="button"
                className={`ruo-btn ruo-btn-sm ${isLocked ? 'ruo-btn-success' : 'ruo-btn-danger'}`}
                onClick={() => onToggleLock(userData._id, userData.status)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isLocked ? <Icons.Unlock size={13} /> : <Icons.Lock size={13} />}
                <span>{isLocked ? 'Mở Khóa Tài Khoản' : 'Khóa Tài Khoản'}</span>
              </button>
            )}
          </div>

          <button type="button" className="ruo-btn ruo-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailDrawer;
