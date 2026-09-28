import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../common/SvgIcons';
import { CommandPaletteModal } from '../ui/CommandPaletteModal';
import { LogoutConfirmModal } from '../ui/LogoutConfirmModal';
import { RuoLogo } from '../common/RuoLogo';

export const AppHeader = ({ activeTab, onSelectTab, onOpenQRDemo, onOpenProfileModal }) => {
  const {
    currentRoleKey,
    switchRole,
    currentUser,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    allowedTabs,
    logout
  } = useAuth();

  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState('');
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const notifPopoverRef = useRef(null);
  const profilePopoverRef = useRef(null);

  const handleConfirmLogout = async (allDevices) => {
    setIsLogoutModalOpen(false);
    toast.success(
      allDevices
        ? 'Đã thu hồi tất cả phiên và đăng xuất khỏi mọi thiết bị an toàn!'
        : 'Đăng xuất thành công! Phiên làm việc đã kết thúc an toàn.',
      'Đăng Xuất Thành Công'
    );
    try {
      await logout(allDevices);
    } catch (err) {
      toast.error('Có lỗi xảy ra trong quá trình đăng xuất.');
    }
  };

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifPopoverRef.current && !notifPopoverRef.current.contains(e.target)) {
        setShowNotifPopover(false);
      }
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(e.target)) {
        setShowProfilePopover(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifPopover(false);
        setShowProfilePopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Canonical Role Metadata for User Badging
  const ROLE_METADATA = {
    student: { label: 'Sinh viên', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
    lecturer: { label: 'Giảng viên', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
    facility_staff: { label: 'Quản lý CSVC', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' },
    maintenance: { label: 'Kỹ thuật viên', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
    academic_affairs: { label: 'Phòng Đào tạo', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
    admin: { label: 'Quản trị viên', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' }
  };

  const activeRole = currentUser?.role || currentRoleKey || 'student';
  const roleInfo = ROLE_METADATA[activeRole] || ROLE_METADATA.student;

  // 10 Core Subsystems Navigation Definition
  const allNavTabs = [
    { id: 'dashboard', label: 'Bản Đồ CAD', short: 'Mặt Bằng CAD', icon: Icons.Building },
    { id: 'rooms', label: 'Tra Cứu Phòng', short: '108 Phòng', icon: Icons.Room },
    { id: 'calendar', label: 'Lịch Biểu Tuần', short: 'Lịch RFC-5545', icon: Icons.Calendar },
    { id: 'approvals', label: 'Phê Duyệt Đơn', short: 'Duyệt Đơn', icon: Icons.CheckCircle, badge: '8', badgeColor: '#F59E0B' },
    { id: 'tickets_kanban', label: 'Kanban SLA', short: 'Sự Cố SLA', icon: Icons.Wrench, badge: '2', badgeColor: '#EF4444' },
    { id: 'csp_studio', label: 'Xếp TKB CSP', short: 'Thuật Toán CSP', icon: Icons.Cpu },
    { id: 'equipments', label: 'Kho Thiết Bị', short: 'Thiết Bị & QR', icon: Icons.Equipment },
    { id: 'disposal_calc', label: 'Thanh Lý CSVC', short: 'Thanh Lý R≥60%', icon: Icons.Sliders },
    { id: 'rbac', label: 'Ma Trận Quyền', short: 'Phân Quyền RBAC', icon: Icons.Users },
    { id: 'audit_log', label: 'Nhật Ký Audit', short: 'Audit SHA-256', icon: Icons.Audit }
  ];

  // Filter tabs according to current actor permissions
  const effectiveAllowedTabs = allowedTabs || ['dashboard', 'rooms', 'calendar'];
  const visibleNavTabs = allNavTabs.filter((tab) => effectiveAllowedTabs.includes(tab.id));

  return (
    <>
      <header className="ruo-header-root">
        {/* TIER 1: Grounded Top Navigation Bar */}
        <div className="ruo-topbar">
          {/* Left: Brand Identity & Breadcrumb */}
          <div className="ruo-topbar-left">
            <button
              onClick={() => onSelectTab('dashboard')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
              title="Về Bàn Điều Hành Không Gian Kiến Trúc"
            >
              <RuoLogo size={32} subtitle="Quản Lý CSVC" />
            </button>

            <div className="ruo-breadcrumb-divider ruo-hide-md" />

            <div className="ruo-breadcrumbs ruo-hide-md">
              <span className="ruo-crumb-active">Tòa A1 • Giảng Đường</span>
            </div>
          </div>

          {/* Center: Command Palette Trigger */}
          <div className="ruo-topbar-center">
            <button
              className="ruo-search-trigger"
              onClick={() => setShowCommandPalette(true)}
              title="Tìm kiếm thông minh (Phòng A1-302, Ticket SLA, Thiết bị, 95 Use Cases)..."
            >
              <Icons.Search size={14} color="var(--ink-muted)" />
              <span className="ruo-search-placeholder">
                Tìm phòng, thiết bị, ticket SLA (Ctrl+K)...
              </span>
              <kbd className="ruo-kbd-shortcut">Ctrl+K</kbd>
            </button>
          </div>

          {/* Right: Telemetry, Quick Tools, Theme, Notifications, User Menu */}
          <div className="ruo-topbar-right">
            {/* Campus Real-time Telemetry Pill */}
            <div className="ruo-telemetry-badge" title="Tình trạng phòng học và chỉ số SLA thời gian thực">
              <span className="ruo-status-dot ruo-dot-emerald" />
              <span className="ruo-telemetry-item">
                <strong style={{ color: 'var(--laser-cyan)' }}>84/108</strong> Trống
              </span>
              <span className="ruo-telemetry-sep">•</span>
              <span className="ruo-telemetry-item">
                SLA <strong style={{ color: '#10B981' }}>98.4%</strong>
              </span>
            </div>

            {/* Server Clock */}
            <div className="ruo-clock-pill ruo-hide-lg" title="Thời gian hệ thống máy chủ">
              <Icons.Clock size={12} color="var(--ink-muted)" />
              <span>{currentTime || '17:00:00'}</span>
            </div>

            {/* QR Check-in Action Button */}
            <button
              className="ruo-btn ruo-btn-secondary ruo-btn-compact"
              onClick={onOpenQRDemo}
              title="Mô phỏng sinh viên / giảng viên quét mã QR Check-in vào phòng"
            >
              <Icons.QrCode size={14} />
              <span className="ruo-hide-sm">QR Check-in</span>
            </button>

            {/* Theme Switcher */}
            <button
              className="ruo-icon-button"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Chuyển sang chế độ tối (Dark Mode)' : 'Chuyển sang chế độ sáng (Light Mode)'}
            >
              {theme === 'light' ? (
                <Icons.Moon size={15} color="var(--ink-secondary)" />
              ) : (
                <Icons.Sun size={15} color="var(--laser-amber)" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div ref={notifPopoverRef} style={{ position: 'relative' }}>
              <button
                className={`ruo-icon-button ${showNotifPopover ? 'active' : ''}`}
                onClick={() => {
                  setShowNotifPopover(!showNotifPopover);
                  setShowProfilePopover(false);
                }}
                title="Thông báo hệ thống"
              >
                <Icons.Bell size={15} color="var(--ink-secondary)" />
                {unreadCount > 0 && <span className="ruo-notif-indicator" />}
              </button>

              {showNotifPopover && (
                <div className="ruo-popover-menu ruo-notif-popover">
                  <div className="ruo-popover-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icons.Bell size={14} color="var(--laser-cyan)" />
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>Thông Báo Realtime ({unreadCount})</span>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead} className="ruo-link-btn">
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>

                  <div className="ruo-notif-scroll">
                    {notifications.map((n) => (
                      <div key={n.id} className={`ruo-notif-row ${n.read ? 'read' : 'unread'}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span className={`ruo-dot ${n.read ? 'muted' : 'cyan'}`} />
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink-pure)' }}>
                            {n.title}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: '2px 0 4px 14px' }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginLeft: '14px', fontFamily: 'var(--font-sans)' }}>
                          {n.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Human-Crafted User Profile & Workspace Role Switcher */}
            <div ref={profilePopoverRef} style={{ position: 'relative' }}>
              <button
                className={`ruo-profile-button ${showProfilePopover ? 'active' : ''}`}
                onClick={() => {
                  setShowProfilePopover(!showProfilePopover);
                  setShowNotifPopover(false);
                }}
                title="Hồ sơ tài khoản và chuyển đổi vai trò tác nhân"
              >
                <div className="ruo-avatar">
                  {currentUser.avatar || 'AD'}
                </div>
                <div className="ruo-profile-info">
                  <span className="ruo-profile-name">{currentUser.name.split(' ').slice(-1)[0]}</span>
                </div>
                <Icons.ChevronDown size={12} color="var(--ink-muted)" />
              </button>

              {showProfilePopover && (
                <div className="ruo-popover-menu ruo-profile-popover" style={{ minWidth: '280px', padding: '16px' }}>
                  {/* Account Overview Header */}
                  <div className="ruo-profile-meta" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--hairline-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink-pure)' }}>
                        {currentUser.name}
                      </span>
                      <span className="ruo-uid-pill">{currentUser.code}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Vai trò:</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: roleInfo.color,
                          background: roleInfo.bg,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}
                      >
                        {roleInfo.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '6px' }}>
                      {currentUser.email}
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                      Đơn vị: <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.department}</strong>
                    </div>
                  </div>

                  {/* Real User Actions */}
                  <div className="ruo-profile-footer" style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px' }}>
                    <button
                      className="ruo-footer-btn"
                      style={{ color: 'var(--laser-cyan)' }}
                      onClick={() => {
                        setShowProfilePopover(false);
                        if (onOpenProfileModal) onOpenProfileModal();
                      }}
                      title="Xem thông tin tài khoản và đổi mật khẩu"
                    >
                      <Icons.User size={15} color="var(--laser-cyan)" />
                      <span>Hồ Sơ & Đổi Mật Khẩu</span>
                    </button>

                    <button
                      className="ruo-footer-btn"
                      style={{ color: '#EF4444' }}
                      onClick={() => {
                        setShowProfilePopover(false);
                        setIsLogoutModalOpen(true);
                      }}
                      title="Đăng xuất khỏi hệ thống Ruo CSVC"
                    >
                      <Icons.LogOut size={15} color="#EF4444" />
                      <span>Đăng Xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TIER 2: Secondary Horizontal Sub-Navigation Bar */}
        <nav className="ruo-subnav">
          <div className="ruo-subnav-items">
            {visibleNavTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`ruo-subnav-btn ${isActive ? 'active' : ''}`}
                  title={tab.label}
                >
                  <IconComp size={15} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className="ruo-subnav-badge"
                      style={{ backgroundColor: tab.badgeColor || '#3B82F6' }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Global 95-Use Case Command Palette Modal */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectModule={(modId) => {
          onSelectTab(modId);
          setShowCommandPalette(false);
        }}
      />

      {/* Global Logout Confirmation Modal (UC-1.2) */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        userName={currentUser?.name || 'Người dùng'}
      />
    </>
  );
};
