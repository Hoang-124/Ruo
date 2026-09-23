import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

// Native Inline SVG Icons strictly adhering to project specifications
const SvgIcons = {
  Close: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  User: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Edit: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Lock: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Shield: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Check: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  XCircle: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  LogOut: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Award: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  Phone: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Mail: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Building: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" /><line x1="8" y1="6" x2="10" y2="6" /><line x1="14" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  ),
  AlertTriangle: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

export const UserProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, changePassword, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('view'); // 'view', 'edit', 'password'

  // Edit profile state (UC-1.6)
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || 'TH');
  const [editStatus, setEditStatus] = useState({ loading: false, success: null, error: null });

  // Change password state (UC-1.4)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true);
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, success: null, error: null });

  // Logout state (UC-1.2)
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Live password validation checklist
  const passwordCriteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[^a-zA-Z\d\s]/.test(newPassword),
      isMatching: newPassword.length > 0 && newPassword === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  if (!isOpen) return null;

  // Handle Profile Update (UC-1.6)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditStatus({ loading: true, success: null, error: null });
    const res = await updateProfile(phone, avatar);
    if (res.success) {
      setEditStatus({ loading: false, success: res.message, error: null });
    } else {
      setEditStatus({ loading: false, success: null, error: res.message });
    }
  };

  // Handle Change Password (UC-1.4)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setPasswordStatus({ loading: true, success: null, error: null });
    const res = await changePassword(oldPassword, newPassword, logoutOtherDevices);
    if (res.success) {
      setPasswordStatus({ loading: false, success: res.message, error: null });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordStatus({ loading: false, success: null, error: res.message });
    }
  };

  // Handle Logout (UC-1.2)
  const handleLogout = async (allDevices = false) => {
    setIsLoggingOut(true);
    await logout(allDevices);
    setIsLoggingOut(false);
    onClose();
  };

  const reputeColor = currentUser.reputeScore >= 90 ? '#10B981' : currentUser.reputeScore >= 70 ? '#3B82F6' : currentUser.reputeScore >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-panel)',
          border: '1px solid var(--hairline-medium)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--hairline-soft)',
            background: 'var(--surface-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px'
              }}
            >
              {currentUser.avatar || 'TH'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                  {currentUser.name}
                </h3>
                <span className="ruo-uid-pill">{currentUser.code}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
                {currentUser.roleTitle} • {currentUser.department}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ruo-icon-button"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            title="Đóng cửa sổ"
          >
            <SvgIcons.Close size={18} color="var(--ink-muted)" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--hairline-soft)',
            padding: '0 24px',
            background: 'var(--surface-subtle)',
            gap: '8px'
          }}
        >
          <button
            onClick={() => setActiveTab('view')}
            className={`ruo-subnav-btn ${activeTab === 'view' ? 'active' : ''}`}
            style={{ padding: '12px 16px', borderRadius: '0', borderBottom: activeTab === 'view' ? '2px solid var(--laser-cyan)' : 'none' }}
          >
            <SvgIcons.User size={14} />
            <span>Hồ Sơ & Điểm Uy Tín (UC-1.5)</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`ruo-subnav-btn ${activeTab === 'edit' ? 'active' : ''}`}
            style={{ padding: '12px 16px', borderRadius: '0', borderBottom: activeTab === 'edit' ? '2px solid var(--laser-cyan)' : 'none' }}
          >
            <SvgIcons.Edit size={14} />
            <span>Cập Nhật Liên Hệ (UC-1.6)</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`ruo-subnav-btn ${activeTab === 'password' ? 'active' : ''}`}
            style={{ padding: '12px 16px', borderRadius: '0', borderBottom: activeTab === 'password' ? '2px solid var(--laser-cyan)' : 'none' }}
          >
            <SvgIcons.Lock size={14} />
            <span>Đổi Mật Khẩu (UC-1.4)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: PROFILE VIEW & REPUTE SCORE (UC-1.5) */}
          {activeTab === 'view' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Repute Score Card */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--hairline-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: reputeColor }}>
                      <SvgIcons.Award size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                        Điểm Uy Tín Mượn Phòng (Repute Score)
                      </span>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        Hạng thành viên: <strong style={{ color: reputeColor }}>{currentUser.reputeTier}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: reputeColor }}>
                      {currentUser.reputeScore}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>/100</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${currentUser.reputeScore}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, #3B82F6 0%, ${reputeColor} 100%)`,
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>

                {/* Privileges & Rules Notice */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '12px',
                    color: 'var(--ink-secondary)',
                    background: 'var(--surface-panel)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--hairline-soft)'
                  }}
                >
                  <SvgIcons.Shield size={16} color="var(--laser-cyan)" />
                  <div>
                    <strong style={{ color: 'var(--ink-pure)', display: 'block', marginBottom: '3px' }}>
                      Quyền hạn đặt phòng hiện tại:
                    </strong>
                    {currentUser.bookingPrivilege}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '11.5px',
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <SvgIcons.AlertTriangle size={15} color="#F59E0B" />
                  <span>
                    <strong>Cơ chế tự động:</strong> No-Show (quá 15 phút không quét mã QR Check-in) sẽ bị trừ 10 điểm. Khi điểm uy tín ≤ 30, tài khoản sẽ tự động bị đình chỉ quyền đặt phòng.
                  </span>
                </div>
              </div>

              {/* Identity & Academic Info Table */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}
              >
                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    <SvgIcons.User size={13} />
                    <span>MÃ ĐỊNH DANH (MSSV/CB)</span>
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>
                    {currentUser.code}
                  </strong>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    <SvgIcons.Mail size={13} />
                    <span>EMAIL NHÀ TRƯỜNG</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>
                    {currentUser.email}
                  </strong>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    <SvgIcons.Building size={13} />
                    <span>KHOA / ĐƠN VỊ CÔNG TÁC</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>
                    {currentUser.department}
                  </strong>
                </div>

                <div style={{ background: 'var(--surface-sunken)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                    <SvgIcons.Phone size={13} />
                    <span>SỐ ĐIỆN THOẠI LIÊN HỆ</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>
                    {currentUser.phone || 'Chưa cập nhật'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPDATE CONTACT PROFILE (UC-1.6) */}
          {activeTab === 'edit' && (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {editStatus.success && (
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#10B981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcons.Check size={16} />
                  <span>{editStatus.success}</span>
                </div>
              )}
              {editStatus.error && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcons.XCircle size={16} />
                  <span>{editStatus.error}</span>
                </div>
              )}

              {/* Editable: Phone */}
              <div className="form-group">
                <label className="form-label">
                  Số điện thoại liên hệ (Di động Việt Nam)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)' }}>
                    <SvgIcons.Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    className="form-control"
                    style={{ paddingLeft: '38px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    required
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                  Dùng để nhận SMS/Zalo thông báo khẩn cấp khi hủy phòng hoặc thay đổi lịch đột xuất.
                </span>
              </div>

              {/* Editable: Avatar Initials */}
              <div className="form-group">
                <label className="form-label">
                  Biểu tượng Avatar đại diện (1-3 ký tự)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      flexShrink: 0
                    }}
                  >
                    {avatar || 'TH'}
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    className="form-control"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value.toUpperCase())}
                    placeholder="TH"
                  />
                </div>
              </div>

              {/* Read-Only Locked Fields Notice (Hard Locked Identity) */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--hairline-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>
                  <SvgIcons.Lock size={14} />
                  <span>CÁC TRƯỜNG ĐỊNH DANH BỊ KHÓA CỨNG THEO CHÍNH SÁCH ĐẠI HỌC</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>MSSV/Mã CB:</span>
                    <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.code}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Email trường:</span>
                    <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Khoa đào tạo:</span>
                    <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.department}</strong>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
                  * Để điều chỉnh thông tin học vụ chính quy, sinh viên/giảng viên vui lòng nộp hồ sơ yêu cầu đến Phòng Đào Tạo hoặc Quản trị viên hệ thống.
                </p>
              </div>

              <button
                type="submit"
                disabled={editStatus.loading}
                className="laser-btn laser-btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: '13px' }}
              >
                {editStatus.loading ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
              </button>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD (UC-1.4) */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {passwordStatus.success && (
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#10B981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcons.Check size={16} />
                  <span>{passwordStatus.success}</span>
                </div>
              )}
              {passwordStatus.error && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcons.XCircle size={16} />
                  <span>{passwordStatus.error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="form-control"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu mới an toàn"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              {/* Password Policy Criteria Checklist */}
              <div
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--hairline-soft)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '4px' }}>
                  TIÊU CHUẨN MẬT KHẨU BẢO MẬT (ISO/IEC 27001):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.minLength ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.minLength ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasUpper ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.hasUpper ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Chứa chữ in hoa (A-Z)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasLower ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.hasLower ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Chứa chữ thường (a-z)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasNumber ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.hasNumber ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Chứa chữ số (0-9)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasSpecial ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.hasSpecial ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Ký tự đặc biệt (@$!%*?&)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.isMatching ? '#10B981' : 'var(--ink-muted)' }}>
                    {passwordCriteria.isMatching ? <SvgIcons.Check size={14} /> : <SvgIcons.XCircle size={14} />}
                    <span>Mật khẩu xác nhận trùng khớp</span>
                  </div>
                </div>
              </div>

              {/* Logout other devices checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--ink-secondary)' }}>
                <input
                  type="checkbox"
                  checked={logoutOtherDevices}
                  onChange={(e) => setLogoutOtherDevices(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--laser-cyan)' }}
                />
                <span>Thu hồi và đăng xuất khỏi tất cả các phiên làm việc trên thiết bị khác</span>
              </label>

              <button
                type="submit"
                disabled={!isPasswordValid || passwordStatus.loading}
                className="laser-btn laser-btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: '13px' }}
              >
                {passwordStatus.loading ? 'Đang cập nhật mật khẩu...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer: Logout Action Bar (UC-1.2) */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--hairline-soft)',
            background: 'var(--surface-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => handleLogout(false)}
              disabled={isLoggingOut}
              className="laser-btn laser-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-secondary)' }}
              title="Đăng xuất khỏi thiết bị hiện tại"
            >
              <SvgIcons.LogOut size={14} />
              <span>Đăng xuất thiết bị này</span>
            </button>

            <button
              onClick={() => handleLogout(true)}
              disabled={isLoggingOut}
              className="laser-btn laser-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#EF4444' }}
              title="Đăng xuất khỏi tất cả thiết bị (revoke all sessions)"
            >
              <SvgIcons.Shield size={14} color="#EF4444" />
              <span>Đăng xuất tất cả thiết bị</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="laser-btn laser-btn-ghost"
            style={{ padding: '6px 18px', fontSize: '12.5px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
