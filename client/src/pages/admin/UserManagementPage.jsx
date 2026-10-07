import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { authApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { USER_ROLES, ROLE_METADATA } from '../../config/navigation';

export const UserManagementPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusTab, setStatusTab] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Create Form State
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listUsers({
        search: search || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined
      });
      if (res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách người dùng: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
        toast.success(`Đã tạo tài khoản cho ${createForm.full_name} (${res.user?.code})`, 'Tạo Thành Công');
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
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi khi tạo người dùng: ' + err.message);
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
      }
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái khóa: ' + err.message);
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

  const pendingCount = users.filter(u => u.status === 'pending_approval').length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const lockedCount = users.filter(u => u.status === 'locked').length;

  const filteredUsers = users.filter(u => {
    if (statusTab === 'ALL') return true;
    return u.status === statusTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.Users size={26} color="var(--blueprint-400)" />
            Quản Lý Tài Khoản Người Dùng (Admin)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Xem danh sách, chi tiết, tạo tài khoản mới, phân vai trò, khóa tài khoản và thiết lập lại mật khẩu
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

      {/* Status Segmented Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'Tất Cả', count: users.length, color: 'var(--blueprint-500)' },
          { key: 'pending_approval', label: 'Chờ Phê Duyệt', count: pendingCount, color: '#F59E0B', highlight: pendingCount > 0 },
          { key: 'active', label: 'Đang Hoạt Động', count: activeCount, color: '#10B981' },
          { key: 'locked', label: 'Đã Khóa', count: lockedCount, color: '#EF4444' }
        ].map(tab => {
          const isActive = statusTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${isActive ? tab.color : 'var(--border-default)'}`,
                background: isActive ? `${tab.color}18` : 'var(--surface-card)',
                color: isActive ? tab.color : 'var(--ink-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: tab.highlight && !isActive ? 'rgba(245, 158, 11, 0.2)' : isActive ? tab.color : 'var(--surface-3)',
                  color: tab.highlight && !isActive ? '#F59E0B' : isActive ? '#FFFFFF' : 'var(--ink-muted)'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                            onClick={() => setSelectedUser(u)}
                            title="Xem chi tiết"
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
                  <label className="ruo-label">Mật Khẩu Khởi Tạo (Để trống để tự tạo Ruo@xxxx)</label>
                  <input
                    type="password"
                    className="ruo-input"
                    placeholder="Mặc định: Ruo@2026 hoặc ngẫu nhiên"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
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

      {/* MODAL 3: View User Details */}
      {selectedUser && (
        <div className="ruo-modal-overlay">
          <div className="ruo-modal-content" style={{ maxWidth: '520px' }}>
            <div className="ruo-modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Chi Tiết Hồ Sơ: {selectedUser.full_name}
              </h2>
              <button className="ruo-btn-close" onClick={() => setSelectedUser(null)}>
                <Icons.X size={18} />
              </button>
            </div>

            <div className="ruo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: ROLE_METADATA[selectedUser.role]?.bg || 'rgba(62, 123, 250, 0.1)',
                    color: ROLE_METADATA[selectedUser.role]?.color || '#3E7BFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '18px'
                  }}
                >
                  {selectedUser.avatar || selectedUser.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-primary)' }}>{selectedUser.full_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>Mã CB: {selectedUser.code}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>EMAIL</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{selectedUser.email}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>SỐ ĐIỆN THOẠI</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{selectedUser.phone || 'Chưa có'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>KHOA / ĐƠN VỊ</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{selectedUser.department}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>VAI TRÒ</div>
                  <div style={{ fontWeight: 700, color: ROLE_METADATA[selectedUser.role]?.color }}>
                    {ROLE_METADATA[selectedUser.role]?.label}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>TRẠNG THÁI TÀI KHOẢN</div>
                  <div style={{ fontWeight: 600, color: selectedUser.status === 'locked' ? '#EF4444' : selectedUser.status === 'pending_approval' ? '#F59E0B' : '#10B981' }}>
                    {selectedUser.status === 'locked' ? 'Đang bị khóa' : selectedUser.status === 'pending_approval' ? '⏳ Chờ Admin phê duyệt bổ nhiệm' : 'Đang hoạt động'}
                  </div>
                </div>
                {selectedUser.requested_role && (
                  <div>
                    <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>NGUYỆN VỌNG CHỨC VỤ</div>
                    <div style={{ fontWeight: 700, color: '#F59E0B' }}>
                      {ROLE_METADATA[selectedUser.requested_role]?.label || selectedUser.requested_role}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px', fontWeight: 600 }}>NGÀY TẠO TÀI KHOẢN</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink-secondary)' }}>
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="ruo-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedUser.status === 'pending_approval' && (
                <>
                  <button
                    type="button"
                    className="ruo-btn ruo-btn-danger"
                    onClick={() => handleApproveUser(selectedUser, 'reject')}
                  >
                    <Icons.X size={14} />
                    <span>Từ Chối (Về Giảng Viên)</span>
                  </button>
                  <button
                    type="button"
                    className="ruo-btn ruo-btn-success"
                    style={{ background: '#10B981', color: '#fff', border: 'none' }}
                    onClick={() => handleApproveUser(selectedUser, 'approve', selectedUser.requested_role)}
                  >
                    <Icons.Check size={14} />
                    <span>Phê Duyệt Bổ Nhiệm</span>
                  </button>
                </>
              )}
              <button className="ruo-btn ruo-btn-secondary" onClick={() => setSelectedUser(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
