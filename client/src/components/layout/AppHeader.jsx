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
    currentRoleMeta,
    currentUser,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    navItems,
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

  const roleInfo = currentRoleMeta || { label: 'Người dùng', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' };
  const visibleNavTabs = navItems || [];

  const handleConfirmLogout = async (allDevices = false) => {
    setIsLogoutModalOpen(false);
    toast.success(
      allDevices
        ? 'Đã thu hồi tất cả phiên và đăng xuất mọi thiết bị an toàn!'
        : 'Đăng xuất thành công! Phiên làm việc đã kết thúc an toàn.'
    );
    try {
      await logout(allDevices);
    } catch (err) {
      toast.error('Có lỗi xảy ra trong quá trình đăng xuất: ' + (err?.message || 'Lỗi hệ thống'));
    }
  };

  return (
    <>
      <header className="ruo-header-root">
        {/* TIER 1: Grounded Top Navigation Bar */}
        <div className="ruo-topbar">
          {/* Left: Brand Identity */}
          <div className="ruo-topbar-left">
            <button
              onClick={() => onSelectTab('dashboard')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
              title="Về Bàn Điều Hành Không Gian Kiến Trúc"
            >
              <RuoLogo size={32} subtitle="Quản Lý CSVC" />
            </button>
          </div>

          {/* Center: Command Palette Trigger */}
          <div className="ruo-topbar-center">
            <button
              className="ruo-search-trigger"
              onClick={() => setShowCommandPalette(true)}
              title="Tìm kiếm thông minh (Phòng 302, Ticket SLA, Thiết bị)..."
            >
              <Icons.Search size={14} color="var(--ink-muted)" />
              <span className="ruo-search-placeholder">
                Tìm phòng, thiết bị, ticket SLA (Ctrl+K)...
              </span>
              <kbd className="ruo-kbd-shortcut">Ctrl+K</kbd>
            </button>
          </div>

          {/* Right: Quick Tools, Clock, Theme, Notifications, User Menu */}
          <div className="ruo-topbar-right">
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
                <div className="ruo-popover-menu ruo-profile-popover" style={{ width: '320px', padding: '16px' }}>
                  {/* Account Overview Header */}
                  <div className="ruo-profile-meta" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--hairline-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                      >
                        {currentUser.avatar || 'TH'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink-pure)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser.name}
                          </span>
                          <span className="ruo-uid-pill" style={{ flexShrink: 0 }}>{currentUser.code}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: roleInfo.color,
                              background: roleInfo.bg,
                              padding: '1.5px 7px',
                              borderRadius: 'var(--radius-full)'
                            }}
                          >
                            {roleInfo.label}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                            Trực tuyến
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic & University Profile Specs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--hairline-soft)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-secondary)' }}>
                      <Icons.Mail size={13} color="var(--laser-cyan)" />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser.email}>
                        {currentUser.email}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-secondary)' }}>
                      <Icons.Building size={13} color="var(--laser-cyan)" />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser.department}>
                        Đơn vị: <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.department}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-secondary)' }}>
                      <Icons.Layers size={13} color="var(--laser-cyan)" />
                      <span>
                        Mã định danh: <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.code || 'NV2026-CSVC'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-secondary)' }}>
                      <Icons.Phone size={13} color="var(--laser-cyan)" />
                      <span>
                        Số điện thoại: <strong style={{ color: 'var(--ink-pure)' }}>{currentUser.phone || '0987 654 321'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-secondary)' }}>
                      <Icons.Shield size={13} color="var(--laser-cyan)" />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Vai trò hệ thống: <strong style={{ color: 'var(--laser-cyan)' }}>{currentUser.roleTitle || 'Quản lý CSVC'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>
                      <Icons.Shield size={12} color="var(--ink-muted)" />
                      <span>Xác thực: <strong>SSO Nội Bộ (OAuth2)</strong></span>
                    </div>
                  </div>

                  {/* Real User Actions */}
                  <div className="ruo-profile-footer" style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px' }}>
                    <button
                      className="ruo-footer-btn"
                      style={{ color: 'var(--laser-cyan)' }}
                      onClick={() => {
                        setShowProfilePopover(false);
                        if (onOpenProfileModal) onOpenProfileModal();
                      }}
                      title="Xem thông tin chi tiết tài khoản và đổi mật khẩu"
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
