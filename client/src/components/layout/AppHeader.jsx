import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';
import { CommandPaletteModal } from '../ui/CommandPaletteModal';

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

  const [currentTime, setCurrentTime] = useState('');
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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

  // 6 Defined Actors in UFMS RBAC
  const roles = [
    {
      key: 'student',
      label: 'Sinh viên',
      desc: 'Tra cứu phòng, đặt phòng học nhóm, báo hỏng sự cố',
      color: '#3B82F6',
      icon: Icons.User
    },
    {
      key: 'lecturer',
      label: 'Giảng viên',
      desc: 'Đặt phòng giảng dạy, hội thảo chuyên đề, mượn thiết bị Lab',
      color: '#6366F1',
      icon: Icons.AcademicCap || Icons.User
    },
    {
      key: 'facility_staff',
      label: 'Quản Lý CSVC',
      desc: 'Duyệt yêu cầu phòng, quản lý thiết bị, kiểm kê mã QR',
      color: '#0EA5E9',
      icon: Icons.Building
    },
    {
      key: 'maintenance',
      label: 'Kỹ Thuật Viên',
      desc: 'Tiếp nhận sự cố Kanban, sửa chữa thiết bị, cam kết SLA',
      color: '#F59E0B',
      icon: Icons.Wrench
    },
    {
      key: 'academic_affairs',
      label: 'Phòng Đào Tạo',
      desc: 'Xếp thời khóa biểu tự động toàn trường với CSP Engine',
      color: '#10B981',
      icon: Icons.Calendar
    },
    {
      key: 'admin',
      label: 'Quản Trị Hệ Thống',
      desc: 'Toàn quyền điều hành, phân quyền RBAC 7 nhóm, Audit Log SHA-256',
      color: '#EF4444',
      icon: Icons.Shield
    }
  ];

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
              className="ruo-brand-btn"
              title="Về Bàn Điều Hành Không Gian Kiến Trúc"
            >
              <div className="ruo-brand-logo">
                <Icons.Building size={16} color="#FFFFFF" />
              </div>
              <div className="ruo-brand-titles">
                <span className="ruo-brand-name">RUO</span>
                <span className="ruo-brand-tag ruo-hide-sm">Quản Lý CSVC</span>
              </div>
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
            <div style={{ position: 'relative' }}>
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
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginLeft: '14px', fontFamily: 'var(--font-mono)' }}>
                          {n.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Human-Crafted User Profile & Workspace Role Switcher */}
            <div style={{ position: 'relative' }}>
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
                <div className="ruo-popover-menu ruo-profile-popover">
                  {/* Account Overview Header */}
                  <div className="ruo-profile-meta">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink-pure)' }}>
                        {currentUser.name}
                      </span>
                      <span className="ruo-uid-pill">{currentUser.code}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {currentUser.email}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '6px' }}>
                      Đơn vị: <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.department}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Điểm uy tín check-in:</span>
                      <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>{currentUser.reputeScore}/100</strong>
                    </div>
                  </div>

                  {/* Clean Role Switcher Section (Anti-AI: Tucked cleanly inside Profile) */}
                  <div className="ruo-role-section">
                    <div className="ruo-section-label">
                      <span>CHUYỂN ĐỔI GÓC NHÌN TÁC NHÂN (RBAC)</span>
                    </div>
                    <div className="ruo-role-list">
                      {roles.map((r) => {
                        const isCurrent = currentRoleKey === r.key;
                        const IconComp = r.icon;
                        return (
                          <div
                            key={r.key}
                            className={`ruo-role-item ${isCurrent ? 'active' : ''}`}
                            onClick={() => {
                              switchRole(r.key);
                              setShowProfilePopover(false);
                            }}
                          >
                            <div className="ruo-role-icon-box" style={{ color: r.color, backgroundColor: `${r.color}15` }}>
                              <IconComp size={15} />
                            </div>
                            <div className="ruo-role-texts">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: isCurrent ? 'var(--ink-pure)' : 'var(--ink-primary)' }}>
                                  {r.label}
                                </span>
                                {isCurrent && (
                                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700 }}>
                                    Đang kích hoạt
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', lineHeight: 1.3 }}>
                                {r.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="ruo-profile-footer" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      className="ruo-footer-btn"
                      style={{ color: 'var(--laser-cyan)' }}
                      onClick={() => {
                        setShowProfilePopover(false);
                        if (onOpenProfileModal) onOpenProfileModal();
                      }}
                      title="Xem hồ sơ, điểm uy tín, sửa SĐT và đổi mật khẩu"
                    >
                      <Icons.User size={14} color="var(--laser-cyan)" />
                      <span>Hồ Sơ & Đổi Mật Khẩu (UC-1.4..1.6)</span>
                    </button>

                    <button
                      className="ruo-footer-btn"
                      onClick={() => {
                        setShowProfilePopover(false);
                        setShowCommandPalette(true);
                      }}
                    >
                      <Icons.Layers size={14} />
                      <span>Tra cứu danh mục 95 Use Cases</span>
                    </button>

                    <button
                      className="ruo-footer-btn"
                      style={{ color: '#EF4444' }}
                      onClick={() => {
                        setShowProfilePopover(false);
                        logout(false);
                      }}
                      title="Đăng xuất khỏi hệ thống Ruo UFMS"
                    >
                      <Icons.LogOut size={14} color="#EF4444" />
                      <span>Đăng Xuất (UC-1.2)</span>
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

          {/* Quick 95 Use Case Launcher on Subnav Right */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="ruo-subnav-catalog-btn"
            title="Mở bảng tra cứu toàn bộ 95 Use Cases (Ctrl+K)"
          >
            <Icons.Layers size={13} color="var(--laser-cyan)" />
            <span>95 Chức Năng</span>
            <kbd className="ruo-kbd-shortcut">Ctrl+K</kbd>
          </button>
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
    </>
  );
};
