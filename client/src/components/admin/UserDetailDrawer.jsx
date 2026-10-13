import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { ROLE_METADATA, USER_ROLES } from '../../config/navigation';
import { authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * UC-10.3: User Detail & RBAC Drawer
 * Displays detailed user profile, registered roles, creation date, and activity history.
 * Supports interactive RBAC role changes, status updates, and audit trail.
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

  // Edit Mode & Form State (UC-10.3 RBAC Update)
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: USER_ROLES.LECTURER,
    status: 'active',
    department: '',
    phone: '',
    repute_score: 100
  });

  // Sync internal user data and edit form when user prop changes
  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditForm({
        full_name: user.full_name || '',
        role: user.role || USER_ROLES.LECTURER,
        status: user.status || 'active',
        department: user.department || '',
        phone: user.phone || '',
        repute_score: user.repute_score ?? 100
      });
      setIsEditing(false);
    }
  }, [user]);

  // Load detailed user info & audit activities on open (GET /api/auth/users/:id)
  useEffect(() => {
    if (isOpen && user?._id) {
      setLoadingActivities(true);
      authApi.getUserById(user._id)
        .then(res => {
          if (res.success) {
            if (res.user) {
              setUserData(res.user);
              setEditForm({
                full_name: res.user.full_name || '',
                role: res.user.role || USER_ROLES.LECTURER,
                status: res.user.status || 'active',
                department: res.user.department || '',
                phone: res.user.phone || '',
                repute_score: res.user.repute_score ?? 100
              });
            }
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

  // UC-10.3: Submit RBAC & Profile Updates (PUT /api/admin/users/:id)
  const handleSaveUserUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.full_name || editForm.full_name.trim().length < 2) {
      toast.error('Họ và tên người dùng phải có ít nhất 2 ký tự.');
      return;
    }
    if (editForm.phone && !/^(84|0)(3|5|7|8|9)[0-9]{8}$/.test(editForm.phone.trim())) {
      toast.error('Số điện thoại không hợp lệ (yêu cầu định dạng di động Việt Nam 10 chữ số).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        role: editForm.role,
        status: editForm.status,
        full_name: editForm.full_name.trim(),
        department: editForm.department.trim(),
        phone: editForm.phone.trim(),
        repute_score: editForm.repute_score
      };

      const res = await authApi.adminUpdateUser(userData._id, payload);
      if (res.success && res.user) {
        setUserData(res.user);
        if (Array.isArray(res.activities)) setActivities(res.activities);
        setIsEditing(false);
        toast.success(res.message || 'Cập nhật phân quyền RBAC và hồ sơ thành công!', 'Cập Nhật Thành Công');
        if (onUserUpdated) {
          onUserUpdated(res.user);
        }
      }
    } catch (err) {
      const errorMsg = err.data?.message || err.message || 'Lỗi khi cập nhật thông tin người dùng.';
      toast.error(errorMsg, 'Lỗi Cập Nhật');
    } finally {
      setSaving(false);
    }
  };

  // Quick Approve Requested Role
  const handleQuickApproveRole = async () => {
    if (!userData.requested_role) return;
    const targetRole = userData.requested_role;
    const targetLabel = ROLE_METADATA[targetRole]?.label || targetRole;

    if (!window.confirm(`Bạn có chắc muốn phê duyệt bổ nhiệm cán bộ ${userData.full_name} (${userData.code}) vào chức vụ [${targetLabel}]?`)) return;

    setSaving(true);
    try {
      const res = await authApi.adminUpdateUser(userData._id, {
        role: targetRole,
        status: 'active',
        requested_role: null
      });

      if (res.success && res.user) {
        setUserData(res.user);
        if (Array.isArray(res.activities)) setActivities(res.activities);
        toast.success(`Đã bổ nhiệm thành công ${userData.full_name} vào chức vụ [${targetLabel}].`, 'Phê Duyệt Hoàn Tất');
        if (onUserUpdated) onUserUpdated(res.user);
      }
    } catch (err) {
      toast.error(err.data?.message || err.message || 'Lỗi phê duyệt chức vụ.');
    } finally {
      setSaving(false);
    }
  };

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
          maxWidth: '740px',
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
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: roleMeta.bg,
                    color: roleMeta.color,
                    border: `1px solid ${roleMeta.color}40`
                  }}
                >
                  {roleMeta.label}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                Chi tiết hồ sơ nhân sự, phân quyền RBAC và lịch sử tài khoản (UC-10.3)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isEditing ? (
              <button
                type="button"
                className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                onClick={() => setIsEditing(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Bật chế độ chỉnh sửa phân quyền RBAC và hồ sơ"
              >
                <Icons.Settings size={13} color="var(--laser-cyan)" />
                <span>Chỉnh Sửa RBAC</span>
              </button>
            ) : (
              <button
                type="button"
                className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    full_name: userData.full_name || '',
                    role: userData.role || USER_ROLES.LECTURER,
                    status: userData.status || 'active',
                    department: userData.department || '',
                    phone: userData.phone || '',
                    repute_score: userData.repute_score ?? 100
                  });
                }}
              >
                Hủy Chỉnh Sửa
              </button>
            )}

            <button
              className="ruo-btn-close"
              onClick={onClose}
              title="Đóng (Esc)"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <Icons.X size={18} />
            </button>
          </div>
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

        {/* Drawer Body */}
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
                        {isEditing ? editForm.repute_score : reputeScore}
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
                    <div style={{ width: `${Math.min(100, Math.max(0, isEditing ? editForm.repute_score : reputeScore))}%`, height: '100%', background: reputeColor, borderRadius: '4px' }} />
                  </div>
                  {isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editForm.repute_score}
                        onChange={(e) => setEditForm({ ...editForm, repute_score: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Identity & Contact Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>MÃ CÁN BỘ / MSSV</span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: '10px' }}>(Khóa cứng UC-10.3)</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--blueprint-400)', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                    {userData.code}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>EMAIL NHÀ TRƯỜNG</span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: '10px' }}>(Khóa cứng UC-10.3)</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                    {userData.email}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>HỌ VÀ TÊN</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="ruo-input"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                      {userData.full_name}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>SỐ ĐIỆN THOẠI</div>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="ruo-input"
                      placeholder="0912345678"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                      {userData.phone || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>KHOA / ĐƠN VỊ CÔNG TÁC</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="ruo-input"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                      {userData.department || 'Đại Học Ruo'}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>NGÀY KHỞI TẠO TÀI KHOẢN</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                    {userData.created_at ? new Date(userData.created_at).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)', gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600 }}>ĐĂNG NHẬP GẦN NHẤT</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px', fontSize: '12.5px' }}>
                    {userData.last_login_at ? new Date(userData.last_login_at).toLocaleString('vi-VN') : 'Chưa có lượt đăng nhập'}
                    {userData.last_login_ip && (
                      <span style={{ display: 'inline-block', marginLeft: '12px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        Địa chỉ IP: <code>{userData.last_login_ip}</code>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC & Permissions Management (UC-10.3) */}
          {activeTab === 'rbac' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Role Selection & Configuration */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                      Cấu Hình Vai Trò & Phân Quyền (RBAC)
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Xác lập quyền hạn thao tác tài sản và chức năng cho tài khoản
                    </span>
                  </div>
                  {isEditing && (
                    <span style={{ fontSize: '11.5px', color: 'var(--laser-cyan)', fontWeight: 700 }}>
                      Đang chỉnh sửa
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="ruo-label">Vai Trò Hệ Thống (Role) *</label>
                    {isEditing ? (
                      <select
                        className="ruo-select"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value={USER_ROLES.LECTURER}>Lecturer (Giảng Viên)</option>
                        <option value={USER_ROLES.TECHNICIAN}>Technician (Kỹ Thuật Viên)</option>
                        <option value={USER_ROLES.FACILITY_MANAGER}>Facility Manager (Quản Lý CSVC)</option>
                        <option value={USER_ROLES.ADMIN}>Admin (Quản Trị Viên Toàn Quyền)</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            padding: '5px 12px',
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
                        <code style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{userData.role}</code>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="ruo-label">Trạng Thái Tài Khoản *</label>
                    {isEditing ? (
                      <select
                        className="ruo-select"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value="active">Đang Hoạt Động (Active)</option>
                        <option value="pending_approval">Chờ Phê Duyệt (Pending)</option>
                        <option value="locked">Đã Khóa (Locked)</option>
                      </select>
                    ) : (
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
                    )}
                  </div>
                </div>

                {/* UC-10.4: Session Revocation Warning during live role/status edit */}
                {isEditing && (editForm.role !== userData.role || editForm.status === 'locked') && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      marginTop: '6px'
                    }}
                  >
                    <Icons.AlertTriangle size={18} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#EF4444', display: 'block', marginBottom: '2px' }}>
                        Lưu ý thu hồi phiên làm việc (UC-10.4 Session Invalidation)
                      </strong>
                      <span style={{ color: 'var(--ink-secondary)' }}>
                        {editForm.role !== userData.role
                          ? `Thay đổi vai trò sang [${ROLE_METADATA[editForm.role]?.label}] sẽ lập tức thu hồi toàn bộ Refresh Tokens của cán bộ này để áp dụng phân quyền RBAC mới.`
                          : 'Khóa tài khoản sẽ lập tức vô hiệu hóa mọi phiên đăng nhập và token hiện tại của người dùng.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Registered Role Appointment (Nguyện vọng chức vụ) */}
              {userData.requested_role && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.Clock size={13} color="#F59E0B" />
                      NGUYỆN VỌNG BỔ NHIỆM CHỨC VỤ ĐĂNG KÝ
                    </span>
                    <div style={{ fontWeight: 800, color: 'var(--ink-primary)', fontSize: '15px', marginTop: '4px' }}>
                      {ROLE_METADATA[userData.requested_role]?.label || userData.requested_role}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'block', marginTop: '2px' }}>
                      Cán bộ đã đề xuất chức danh này khi khởi tạo tài khoản.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ruo-btn ruo-btn-success"
                    onClick={handleQuickApproveRole}
                    disabled={saving}
                    style={{ background: '#10B981', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Icons.Check size={14} />
                    <span>Duyệt Bổ Nhiệm Nhanh</span>
                  </button>
                </div>
              )}

              {/* RBAC Capabilities Breakdown Matrix */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  fontSize: '12.5px'
                }}
              >
                <h5 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Đặc Quyền Của Vai Trò [{ROLE_METADATA[isEditing ? editForm.role : userData.role]?.label}]
                </h5>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--ink-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(isEditing ? editForm.role : userData.role) === USER_ROLES.ADMIN && (
                    <>
                      <li>Toàn quyền quản trị danh mục người dùng, cấp phát tài khoản, phân quyền RBAC</li>
                      <li>Phê duyệt đề xuất thanh lý, thiết lập ma trận phân quyền phòng ban</li>
                      <li>Truy vết nhật ký kiểm toán mật mã SHA-256 toàn trường</li>
                    </>
                  )}
                  {(isEditing ? editForm.role : userData.role) === USER_ROLES.FACILITY_MANAGER && (
                    <>
                      <li>Quản lý điều chuyển tài sản, kho lưu trữ và mặt bằng các tòa nhà</li>
                      <li>Tạo phiên kiểm kê định kỳ và đối soát tình trạng phòng học</li>
                      <li>Khởi tạo đề xuất thanh lý thiết bị hỏng không thể phục hồi</li>
                    </>
                  )}
                  {(isEditing ? editForm.role : userData.role) === USER_ROLES.TECHNICIAN && (
                    <>
                      <li>Tiếp nhận và xử lý phiếu báo hỏng kỹ thuật (Kanban board)</li>
                      <li>Thực hiện lệnh điều chuyển tài sản và quét mã QR Code thiết bị</li>
                      <li>Yêu cầu xuất linh kiện dự phòng thay thế từ kho kỹ thuật</li>
                    </>
                  )}
                  {(isEditing ? editForm.role : userData.role) === USER_ROLES.LECTURER && (
                    <>
                      <li>Tra cứu danh mục trang thiết bị và sơ đồ tòa nhà</li>
                      <li>Gửi phiếu báo hỏng cơ sở vật chất tức thời</li>
                      <li>Xem lịch sử báo cáo và cập nhật hồ sơ cá nhân</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: Activity Audit History (UC-10.3) */}
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
            {onOpenResetPassword && !isEditing && (
              <button
                type="button"
                className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                onClick={() => onOpenResetPassword(userData)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icons.Key size={13} color="#F59E0B" />
                <span>Cấp Lại Mật Khẩu</span>
              </button>
            )}

            {onToggleLock && !isEditing && (
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

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="ruo-btn ruo-btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="ruo-btn ruo-btn-primary"
                  onClick={handleSaveUserUpdate}
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving ? (
                    <>
                      <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check size={14} />
                      <span>Lưu Thay Đổi (PUT /api/admin/users)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button type="button" className="ruo-btn ruo-btn-secondary" onClick={onClose}>
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailDrawer;
