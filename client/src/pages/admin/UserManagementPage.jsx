import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { USER_ROLES, ROLE_METADATA } from '../../config/navigation';
import { UserDetailDrawer } from '../../components/admin/UserDetailDrawer';

export const UserManagementPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusTab, setStatusTab] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);

  // Modals & User Details (UC-10.2)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [createdUserResult, setCreatedUserResult] = useState(null); // UC-10.1: Lưu thông tin tài khoản & mật khẩu vừa tạo
  const [showPassword, setShowPassword] = useState(false);
  const [userActivities, setUserActivities] = useState([]); // UC-10.2: Lịch sử hoạt động của người dùng
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Create Form State (UC-10.1)
  const [createForm, setCreateForm] = useState({
    code: '',
    full_name: '',
    email: '',
    role: USER_ROLES.LECTURER,
    department: 'Khoa Công Nghệ Thông Tin',
    phone: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Helper sinh mật khẩu ngẫu nhiên đạt chuẩn bảo mật
  const handleGenerateRandomPassword = () => {
    const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
    const generated = `Ruo@${randomSixDigits}`;
    setCreateForm(prev => ({ ...prev, password: generated }));
    setShowPassword(true);
    toast.info(`Đã tạo mật khẩu ngẫu nhiên: ${generated}`, 'Tạo Mật Khẩu');
  };

  // UC-10.2: Realtime tab counts
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, active: 0, locked: 0 });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusTab !== 'ALL') params.status = statusTab;

      const res = await authApi.listUsers(params);
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
        if (res.counts) {
          setStatusCounts(res.counts);
        }
      }
    } catch (err) {
      toast.error('Không thể tải danh sách người dùng: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusTab, toast]);

  useEffect(() => {
    fetchUsers();
    // Realtime polling counts every 30s
    const timer = setInterval(fetchUsers, 30000);
    return () => clearInterval(timer);
  }, [fetchUsers]);

  // UC-10.1: Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.code || !createForm.full_name || !createForm.email) {
      toast.error('Vui lòng điền đủ Mã cán bộ, Họ tên và Email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.createUser(createForm);
      if (res.success) {
        const tempPwd = res.user?.tempPassword || res.user?.initialPassword || createForm.password || 'Ruo@2026';
        setCreatedUserResult({
          user: res.user,
          password: tempPwd
        });
        toast.success(`Đã tạo tài khoản cho ${createForm.full_name} (${res.user?.code || createForm.code})`, 'Tạo Thành Công');
        setIsCreateModalOpen(false);
        setCreateForm({
          code: '',
          full_name: '',
          email: '',
          role: USER_ROLES.LECTURER,
          department: 'Khoa Công Nghệ Thông Tin',
          phone: '',
          password: ''
        });
        setShowPassword(false);
        fetchUsers();
      }
    } catch (err) {
      const errorMsg = err.data?.message || err.message || 'Lỗi khi tạo người dùng.';
      toast.error(errorMsg, 'Lỗi Khởi Tạo Người Dùng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await authApi.updateUserRole(userId, newRole);
      if (res.success) {
        toast.success('Đã cập nhật vai trò người dùng thành công.');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(prev => ({ ...prev, role: newRole }));
        }
      }
    } catch (err) {
      toast.error('Không thể đổi vai trò: ' + err.message);
    }
  };

  const handleToggleLock = async (userId, currentStatus) => {
    const willLock = currentStatus !== 'locked';
    if (!window.confirm(`Bạn có chắc muốn ${willLock ? 'KHÓA' : 'MỞ KHÓA'} tài khoản này?`)) return;
    try {
      const res = await authApi.toggleUserLock(userId);
      if (res.success) {
        toast.success(res.message || 'Cập nhật trạng thái tài khoản thành công.');
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: res.status } : u));
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(prev => ({ ...prev, status: res.status }));
        }
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái khóa: ' + err.message);
    }
  };

  // UC-10.2: Xem chi tiết tài khoản kèm lịch sử hoạt động AuditLog
  const handleViewUserDetail = async (u) => {
    setSelectedUser(u);
    setUserActivities([]);
    setLoadingActivities(true);
    try {
      const res = await authApi.getUserById(u._id);
      if (res.success && res.user) {
        setSelectedUser(res.user);
        setUserActivities(res.activities || []);
      }
    } catch (err) {
      console.warn('Lỗi nạp nhật ký hoạt động người dùng:', err.message);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getActionMeta = (action) => {
    switch (action) {
      case 'LOGIN':
        return { label: 'Đăng nhập hệ thống', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'LOGOUT':
        return { label: 'Đăng xuất', color: '#71717A', bg: 'rgba(113, 113, 122, 0.15)' };
      case 'UPDATE_PROFILE':
        return { label: 'Cập nhật hồ sơ cá nhân', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'CREATE_USER':
        return { label: 'Khởi tạo tài khoản', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'LOCK_USER':
        return { label: 'Khóa tài khoản', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'UNLOCK_USER':
        return { label: 'Mở khóa tài khoản', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'CHANGE_PASSWORD':
      case 'RESET_PASSWORD':
        return { label: 'Đổi mật khẩu', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'APPROVE_USER':
        return { label: 'Phê duyệt bổ nhiệm', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      default:
        return { label: action || 'Thao tác hệ thống', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!userToReset || !newPasswordInput) return;
    try {
      const res = await authApi.adminResetPassword(userToReset._id, newPasswordInput);
      if (res.success) {
        toast.success(`Đã cấp mật khẩu mới cho ${userToReset.full_name}. Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập tới.`, 'Đặt Lại Mật Khẩu');
        setIsResetPasswordModalOpen(false);
        setUserToReset(null);
        setNewPasswordInput('');
      }
    } catch (err) {
      toast.error('Lỗi đặt lại mật khẩu: ' + err.message);
    }
  };

  const handleApproveUser = async (user, action, targetRole) => {
    const roleLabel = (targetRole || user.requested_role) === USER_ROLES.FACILITY_MANAGER ? 'Quản Lý CSVC'
      : (targetRole || user.requested_role) === USER_ROLES.TECHNICIAN ? 'Kỹ Thuật Viên' : 'Giảng Viên';

    const confirmMsg = action === 'approve'
      ? `Phê duyệt bổ nhiệm cán bộ ${user.full_name} (${user.code}) vào chức vụ [${roleLabel}]?`
      : `Từ chối nguyện vọng chức vụ và kích hoạt tài khoản ${user.full_name} với vai trò Giảng Viên thường?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await authApi.approveUser(user._id, {
        action,
        role: targetRole || user.requested_role
      });

      if (res.success) {
        toast.success(res.message, action === 'approve' ? 'Phê Duyệt Thành Công' : 'Đã Từ Chối Bổ Nhiệm');
        fetchUsers();
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser(null);
        }
      }
    } catch (err) {
      toast.error('Lỗi xử lý phê duyệt: ' + err.message);
    }
  };

  const allCount = statusCounts.all ?? users.length;
  const pendingCount = statusCounts.pending ?? users.filter(u => u.status === 'pending_approval' || u.status === 'pending').length;
  const activeCount = statusCounts.active ?? users.filter(u => u.status === 'active').length;
  const lockedCount = statusCounts.locked ?? users.filter(u => u.status === 'locked').length;

  const filteredUsers = users.filter(u => {
    if (statusTab === 'ALL') return true;
    if (statusTab === 'pending_approval') return u.status === 'pending_approval' || u.status === 'pending';
    return u.status === statusTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.Users size={26} color="var(--blueprint-400)" />
            Danh Mục Tài Khoản Người Dùng (UC-10.2)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Danh bạ người dùng với phân tab trạng thái, số đếm thời gian thực, quản lý vai trò và truy vết hoạt động
          </p>
        </div>

        <button
          className="ruo-btn ruo-btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Icons.Plus size={16} />
          <span>Tạo Người Dùng Mới</span>
        </button>
      </div>

      {/* Status Segmented Tabs with Realtime Counts (UC-10.2) */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'Tất Cả', count: allCount, color: 'var(--blueprint-500)', icon: Icons.Users },
          { key: 'pending_approval', label: 'Chờ Phê Duyệt', count: pendingCount, color: '#F59E0B', highlight: pendingCount > 0, icon: Icons.Clock },
          { key: 'active', label: 'Đang Hoạt Động', count: activeCount, color: '#10B981', icon: Icons.CheckCircle },
          { key: 'locked', label: 'Đã Khóa', count: lockedCount, color: '#EF4444', icon: Icons.Key }
        ].map(tab => {
          const isActive = statusTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: `1px solid ${isActive ? tab.color : 'var(--border-default)'}`,
                background: isActive ? `${tab.color}18` : 'var(--surface-card)',
                color: isActive ? tab.color : 'var(--ink-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 2px 8px ${tab.color}25` : 'none'
              }}
            >
              {TabIcon && <TabIcon size={14} color={isActive ? tab.color : 'var(--ink-muted)'} />}
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: tab.highlight && !isActive ? 'rgba(245, 158, 11, 0.2)' : isActive ? tab.color : 'var(--surface-3)',
                  color: tab.highlight && !isActive ? '#F59E0B' : isActive ? '#FFFFFF' : 'var(--ink-muted)',
                  border: tab.highlight && !isActive ? '1px solid rgba(245, 158, 11, 0.4)' : 'none'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          background: 'var(--surface-card)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}>
              <Icons.Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo họ tên, mã cán bộ, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ruo-input"
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', fontWeight: 600 }}>Vai trò:</span>
          <select
            className="ruo-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '190px' }}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value={USER_ROLES.ADMIN}>Admin (Quản trị)</option>
            <option value={USER_ROLES.FACILITY_MANAGER}>Facility Manager (CSVC)</option>
            <option value={USER_ROLES.TECHNICIAN}>Technician (Kỹ thuật)</option>
            <option value={USER_ROLES.LECTURER}>Lecturer (Giảng viên)</option>
          </select>

          <button className="ruo-btn ruo-btn-secondary" onClick={fetchUsers} title="Tải lại">
            <Icons.RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="ruo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>MÃ CB</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>HỌ VÀ TÊN</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>EMAIL & SĐT</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>ĐƠN VỊ / KHOA</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>VAI TRÒ</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    <Icons.Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: '8px', fontSize: '13px' }}>Đang nạp danh sách tài khoản...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    <Icons.Users size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <div>Không tìm thấy người dùng nào phù hợp.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const roleMeta = ROLE_METADATA[u.role] || ROLE_METADATA[USER_ROLES.LECTURER];
                  const isLocked = u.status === 'locked';
                  const isPending = u.status === 'pending_approval';

                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid var(--border-default)',
                        background: isPending ? 'rgba(245, 158, 11, 0.05)' : undefined,
                        transition: 'background 0.15s ease'
                      }}
                      className="ruo-table-row"
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
                        {u.code}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                          onClick={() => handleViewUserDetail(u)}
                          title="Bấm để xem chi tiết hồ sơ & phân quyền RBAC (UC-10.3)"
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isPending ? 'rgba(245, 158, 11, 0.15)' : roleMeta.bg,
                              color: isPending ? '#F59E0B' : roleMeta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: `1px solid ${isPending ? '#F59E0B40' : `${roleMeta.color}40`}`
                            }}
                          >
                            {u.avatar || u.full_name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink-primary)', fontSize: '13.5px' }}>{u.full_name}</div>
                            {u.force_change_pw && (
                              <span style={{ fontSize: '10.5px', color: '#F59E0B', fontWeight: 600 }}>Yêu cầu đổi mật khẩu</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>{u.email}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{u.phone || 'Chưa cập nhật SĐT'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                        {u.department || 'Đại Học Ruo'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPending ? (
                          <div>
                            <span style={{ fontSize: '10.5px', color: '#F59E0B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                              Nguyện vọng:
                            </span>
                            <span
                              className="ruo-badge"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontWeight: 700,
                                fontSize: '11px'
                              }}
                            >
                              {ROLE_METADATA[u.requested_role]?.label || u.requested_role || 'Chưa chọn'}
                            </span>
                          </div>
                        ) : (
                          <select
                            className="ruo-select ruo-select-sm"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: roleMeta.color,
                              background: roleMeta.bg,
                              border: `1px solid ${roleMeta.color}50`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px'
                            }}
                          >
                            <option value={USER_ROLES.ADMIN}>Admin</option>
                            <option value={USER_ROLES.FACILITY_MANAGER}>Facility Manager</option>
                            <option value={USER_ROLES.TECHNICIAN}>Technician</option>
                            <option value={USER_ROLES.LECTURER}>Lecturer</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPending ? (
                          <span className="ruo-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <Icons.Clock size={11} style={{ marginRight: '4px' }} /> Chờ Duyệt
                          </span>
                        ) : isLocked ? (
                          <span className="ruo-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <Icons.Lock size={11} style={{ marginRight: '4px' }} /> Đã khóa
                          </span>
                        ) : (
                          <span className="ruo-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <Icons.CheckCircle size={11} style={{ marginRight: '4px' }} /> Hoạt động
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {isPending ? (
                            <>
                              <button
                                className="ruo-btn ruo-btn-sm"
                                onClick={() => handleApproveUser(u, 'approve', u.requested_role)}
                                style={{
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 9px'
                                }}
                                title="Phê duyệt bổ nhiệm chức vụ"
                              >
                                <Icons.Check size={12} strokeWidth={2.5} />
                                <span>Duyệt</span>
                              </button>

                              <button
                                className="ruo-btn ruo-btn-sm"
                                onClick={() => handleApproveUser(u, 'reject')}
                                style={{
                                  background: 'transparent',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 8px'
                                }}
                                title="Từ chối nguyện vọng (kích hoạt vai trò Giảng Viên)"
                              >
                                <Icons.X size={12} strokeWidth={2.5} />
                                <span>Từ Chối</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                                onClick={() => {
                                  setUserToReset(u);
                                  setNewPasswordInput(`Ruo@${Math.floor(1000 + Math.random() * 9000)}`);
                                  setIsResetPasswordModalOpen(true);
                                }}
                                title="Reset mật khẩu"
                              >
                                <Icons.Key size={14} />
                              </button>

                              <button
                                className={`ruo-btn ruo-btn-sm ${isLocked ? 'ruo-btn-success' : 'ruo-btn-danger'}`}
                                onClick={() => handleToggleLock(u._id, u.status)}
                                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                style={{ padding: '4px 8px' }}
                              >
                                {isLocked ? <Icons.Unlock size={13} /> : <Icons.Lock size={13} />}
                              </button>
                            </>
                          )}

                          <button
                            className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                            onClick={() => handleViewUserDetail(u)}
                            title="Xem chi tiết hồ sơ & phân quyền RBAC (UC-10.3)"
                          >
                            <Icons.Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create User Account */}
      {isCreateModalOpen && (
        <div className="ruo-modal-overlay">
          <div className="ruo-modal-content" style={{ maxWidth: '540px' }}>
            <div className="ruo-modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.UserPlus size={20} color="var(--blueprint-400)" />
                Tạo Tài Khoản Mới (Admin)
              </h2>
              <button className="ruo-btn-close" onClick={() => setIsCreateModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="ruo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="ruo-label">Mã Cán Bộ / MSSV *</label>
                    <input
                      type="text"
                      className="ruo-input"
                      required
                      placeholder="VD: GV005, KT004..."
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="ruo-label">Vai Trò Hệ Thống *</label>
                    <select
                      className="ruo-select"
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    >
                      <option value={USER_ROLES.LECTURER}>Lecturer (Giảng viên)</option>
                      <option value={USER_ROLES.TECHNICIAN}>Technician (Kỹ thuật viên)</option>
                      <option value={USER_ROLES.FACILITY_MANAGER}>Facility Manager (Quản lý CSVC)</option>
                      <option value={USER_ROLES.ADMIN}>Admin (Quản trị viên)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ruo-label">Họ Và Tên *</label>
                  <input
                    type="text"
                    className="ruo-input"
                    required
                    placeholder="VD: Nguyễn Văn Bình"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="ruo-label">Email Trường *</label>
                    <input
                      type="email"
                      className="ruo-input"
                      required
                      placeholder="binh.nv@ruo.edu.vn"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value.toLowerCase() })}
                    />
                  </div>
                  <div>
                    <label className="ruo-label">Số Điện Thoại</label>
                    <input
                      type="tel"
                      className="ruo-input"
                      placeholder="0912345678"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="ruo-label">Đơn Vị / Khoa Phòng</label>
                  <input
                    type="text"
                    className="ruo-input"
                    placeholder="Khoa Công Nghệ Thông Tin"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="ruo-label" style={{ margin: 0 }}>Mật Khẩu Khởi Tạo (Để trống để tự sinh)</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: 'var(--laser-cyan)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Tự Động Tạo Mật Khẩu
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="ruo-input"
                      style={{ paddingRight: '50px' }}
                      placeholder="Để trống để hệ thống tự sinh Ruo@xxxxxx"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    />
                    {createForm.password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-muted)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                    * Mật khẩu tự động đạt chuẩn bảo mật: ≥ 8 ký tự, có chữ hoa, thường, số và ký tự đặc biệt (@).
                  </span>
                </div>
              </div>

              <div className="ruo-modal-footer">
                <button type="button" className="ruo-btn ruo-btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="ruo-btn ruo-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Xác Nhận Tạo Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bàn giao thông tin tài khoản vừa tạo (UC-10.1) */}
      {createdUserResult && (
        <div className="ruo-modal-overlay">
          <div className="ruo-modal-content" style={{ maxWidth: '480px' }}>
            <div className="ruo-modal-header" style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
                <Icons.CheckCircle size={20} color="#10B981" />
                Khởi Tạo Tài Khoản Thành Công (UC-10.1)
              </h2>
              <button className="ruo-btn-close" onClick={() => setCreatedUserResult(null)}>
                <Icons.X size={18} />
              </button>
            </div>

            <div className="ruo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
                Tài khoản đã sẵn sàng hoạt động trong hệ thống. Quản trị viên vui lòng lưu trữ và bàn giao thông tin đăng nhập cho cán bộ:
              </p>

              <div style={{ background: 'var(--surface-sunken)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-medium)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--ink-muted)' }}>Mã nhân viên / CB:</span> <strong style={{ color: 'var(--ink-primary)' }}>{createdUserResult.user.code}</strong></div>
                <div><span style={{ color: 'var(--ink-muted)' }}>Họ và tên:</span> <strong style={{ color: 'var(--ink-primary)' }}>{createdUserResult.user.full_name}</strong></div>
                <div><span style={{ color: 'var(--ink-muted)' }}>Email đăng nhập:</span> <strong style={{ color: 'var(--ink-primary)' }}>{createdUserResult.user.email}</strong></div>
                <div><span style={{ color: 'var(--ink-muted)' }}>Vai trò:</span> <strong style={{ color: 'var(--laser-cyan)' }}>{createdUserResult.user.role}</strong></div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--hairline-soft)' }}>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', marginBottom: '4px' }}>Mật khẩu khởi tạo:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 'var(--radius-sm)', letterSpacing: '0.05em' }}>
                      {createdUserResult.password || 'Ruo@2026'}
                    </code>
                    <button
                      type="button"
                      className="ruo-btn ruo-btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(`Mã NV: ${createdUserResult.user.code}\nEmail: ${createdUserResult.user.email}\nMật khẩu: ${createdUserResult.password || 'Ruo@2026'}`);
                        toast.success('Đã sao chép thông tin tài khoản vào bộ nhớ tạm!');
                      }}
                    >
                      Sao Chép
                    </button>
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                * Cán bộ sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên vì lý do an toàn bảo mật.
              </span>
            </div>

            <div className="ruo-modal-footer">
              <button type="button" className="ruo-btn ruo-btn-primary" onClick={() => setCreatedUserResult(null)}>
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset User Password */}
      {isResetPasswordModalOpen && userToReset && (
        <div className="ruo-modal-overlay">
          <div className="ruo-modal-content" style={{ maxWidth: '460px' }}>
            <div className="ruo-modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Key size={18} color="#F59E0B" />
                Cấp Lại Mật Khẩu Cho {userToReset.code}
              </h2>
              <button className="ruo-btn-close" onClick={() => setIsResetPasswordModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword}>
              <div className="ruo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0 }}>
                  Bạn đang thiết lập mật khẩu tạm thời cho cán bộ <strong>{userToReset.full_name}</strong> ({userToReset.email}).
                  Hệ thống sẽ bật cờ <code>force_change_pw</code> buộc người dùng đổi mật khẩu sau khi đăng nhập.
                </p>

                <div>
                  <label className="ruo-label">Mật khẩu mới khởi tạo</label>
                  <input
                    type="text"
                    className="ruo-input"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="ruo-modal-footer">
                <button type="button" className="ruo-btn ruo-btn-secondary" onClick={() => setIsResetPasswordModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="ruo-btn ruo-btn-primary">
                  Cập Nhật Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UC-10.3: User Detail & RBAC Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={(updatedUser) => {
          setSelectedUser(updatedUser);
          setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
          fetchUsers();
        }}
        onOpenResetPassword={(u) => {
          setUserToReset(u);
          setNewPasswordInput(`Ruo@${Math.floor(1000 + Math.random() * 9000)}`);
          setIsResetPasswordModalOpen(true);
        }}
        onToggleLock={(id, status) => handleToggleLock(id, status)}
      />
    </div>
  );
};

export default UserManagementPage;
