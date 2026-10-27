import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../common/SvgIcons';
import { CommandPaletteModal } from '../ui/CommandPaletteModal';
import { LogoutConfirmModal } from '../ui/LogoutConfirmModal';
import { RuoLogo } from '../common/RuoLogo';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

const PRIMARY_TAB_LIMIT = 8;

const ROLE_TITLE_PREFIX = /^(Giảng Viên|Kỹ Thuật Viên|Quản Lý CSVC|Quản Trị Viên Hệ Thống|Quản Trị Viên|Cán Bộ)\s*/i;

function formatCompactUserName(rawName, fallbackCode) {
  const cleaned = String(rawName || '').replace(ROLE_TITLE_PREFIX, '').trim();
  if (!cleaned) return fallbackCode || 'Quản Trị';
  const parts = cleaned.split(/\s+/);
  return parts.length > 3 ? parts.slice(-3).join(' ') : cleaned;
}

export const AppHeader = ({ activeTab, onSelectTab, onOpenProfileModal }) => {
  const {
    currentRoleMeta,
    currentUser,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    deleteNotification,
    seedDemoNotifications,
    fetchNotifications,
    navItems,
    logout
  } = useAuth();

  const { toast } = useToast();

  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const profilePopoverRef = useRef(null);
  const moreMenuRef = useRef(null);

  const roleInfo = currentRoleMeta || {
    label: 'Người dùng',
    shortLabel: 'Người dùng',
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.12)'
  };
  const visibleNavTabs = navItems || [];
  const primaryTabs = visibleNavTabs.slice(0, PRIMARY_TAB_LIMIT);
  const overflowTabs = visibleNavTabs.slice(PRIMARY_TAB_LIMIT);
  const activeOverflowTab = overflowTabs.find((t) => t.id === activeTab) || null;
  const activeNavItem = visibleNavTabs.find((t) => t.id === activeTab) || null;

  const displayName = formatCompactUserName(currentUser?.name, currentUser?.code);
  const roleShortText = roleInfo.shortLabel || roleInfo.label;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        setShowProfilePopover(false);
        setShowMoreMenu(false);
        setIsMobileNavOpen(false);
      } else if (e.key === 'Escape') {
        setShowProfilePopover(false);
        setShowMoreMenu(false);
        setIsMobileNavOpen(false);
      }
    };

    const handlePointerDown = (e) => {
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(e.target)) {
        setShowProfilePopover(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const handleNavigate = (tabId) => {
    onSelectTab(tabId);
    setShowMoreMenu(false);
    setIsMobileNavOpen(false);
  };

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

  const ActiveOverflowIcon = activeOverflowTab?.icon || Icons.MoreHorizontal;

  return (
    <>
      <header className="ruo-header-root">
        {/* TIER 1: Precision 52px Command & Identity Bar */}
        <div className="ruo-topbar">
          <div className="ruo-topbar-inner">
            {/* Left: Architectural Brand + Contextual Workspace Crumb */}
            <div className="ruo-topbar-left">
              <button
                type="button"
                className="ruo-brand-trigger"
                onClick={() => handleNavigate('dashboard')}
                title="Về Sơ Đồ Phòng Học Tòa A1"
              >
                <RuoLogo size={28} showText={false} />
                <span className="ruo-brand-wordmark">RUO</span>
              </button>

              <span className="ruo-header-slash" aria-hidden="true">/</span>
              <span className="ruo-workspace-context">Cơ Sở Vật Chất · Tòa A1</span>

              {activeTab && activeTab !== 'dashboard' && activeNavItem && (
                <>
                  <span className="ruo-header-slash ruo-hide-md" aria-hidden="true">/</span>
                  <span className="ruo-active-crumb ruo-hide-md">
                    {activeNavItem.short || activeNavItem.label}
                  </span>
                </>
              )}
            </div>

            {/* Center: Command Palette Search Trigger */}
            <div className="ruo-topbar-center">
              <button
                type="button"
                className="ruo-search-trigger"
                onClick={() => {
                  setShowCommandPalette(true);
                  setShowProfilePopover(false);
                  setShowMoreMenu(false);
                }}
                aria-label="Tìm nhanh phân hệ, phòng học, thiết bị (Ctrl+K)"
                title="Mở bảng điều hướng nhanh (Ctrl+K)"
              >
                <Icons.Search size={14} color="var(--ink-muted)" />
                <span className="ruo-search-placeholder">
                  Tìm nhanh phân hệ, phòng học, thiết bị...
                </span>
                <kbd className="ruo-kbd-shortcut">Ctrl K</kbd>
              </button>
            </div>

            {/* Right: Uniform 34px Utility & Identity Controls */}
            <div className="ruo-topbar-right">
              <button
                type="button"
                className="ruo-icon-button ruo-mobile-search-btn"
                onClick={() => setShowCommandPalette(true)}
                aria-label="Tìm kiếm nhanh"
                title="Tìm kiếm nhanh (Ctrl+K)"
              >
                <Icons.Search size={15} color="var(--ink-secondary)" />
              </button>

              <button
                type="button"
                className="ruo-icon-button"
                onClick={toggleTheme}
                aria-label={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
                title={theme === 'light' ? 'Chế độ tối (Dark Mode)' : 'Chế độ sáng (Light Mode)'}
              >
                {theme === 'light' ? (
                  <Icons.Moon size={15} color="var(--ink-secondary)" />
                ) : (
                  <Icons.Sun size={15} color="var(--laser-amber)" />
                )}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`ruo-icon-button ${isNotifDrawerOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsNotifDrawerOpen(!isNotifDrawerOpen);
                    setShowProfilePopover(false);
                    setShowMoreMenu(false);
                  }}
                  aria-label={`Trung tâm thông báo (${unreadCount} chưa đọc)`}
                  title={`Trung tâm thông báo (${unreadCount} chưa đọc)`}
                >
                  <Icons.Bell size={15} color={unreadCount > 0 ? 'var(--ink-pure)' : 'var(--ink-secondary)'} />
                  {unreadCount > 0 && (
                    <span className="ruo-header-badge-red" title={`${unreadCount} thông báo chưa đọc`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <span className="ruo-topbar-divider" aria-hidden="true" />

              {/* User Identity & Active Role Capsule */}
              <div ref={profilePopoverRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`ruo-profile-button ${showProfilePopover ? 'active' : ''}`}
                  onClick={() => {
                    setShowProfilePopover((prev) => !prev);
                    setIsNotifDrawerOpen(false);
                    setShowMoreMenu(false);
                  }}
                  aria-label={`Hồ sơ tài khoản ${displayName} (${roleShortText})`}
                  aria-expanded={showProfilePopover}
                  title="Hồ sơ tài khoản và thông tin vai trò"
                >
                  <div className="ruo-avatar">
                    {currentUser?.avatar || 'AD'}
                  </div>
                  <span className="ruo-profile-name">{displayName}</span>
                  <span
                    className="ruo-profile-role-pill"
                    style={{
                      color: roleInfo.color,
                      background: roleInfo.bg
                    }}
                  >
                    {roleShortText}
                  </span>
                  <Icons.ChevronDown
                    size={12}
                    color="var(--ink-muted)"
                    style={{
                      transition: 'transform 160ms ease',
                      transform: showProfilePopover ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </button>

                {showProfilePopover && (
                  <div className="ruo-popover-menu ruo-profile-popover">
                    <div className="ruo-profile-meta">
                      <div className="ruo-profile-meta-row">
                        <div className="ruo-profile-avatar-lg">
                          {currentUser?.avatar || 'AD'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span className="ruo-profile-fullname" title={currentUser?.name}>
                              {currentUser?.name}
                            </span>
                            <span className="ruo-uid-pill">{currentUser?.code || 'UEMS'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span
                              className="ruo-profile-role-pill"
                              style={{ color: roleInfo.color, background: roleInfo.bg }}
                            >
                              {roleShortText}
                            </span>
                            <span className="ruo-online-pill">
                              <span className="ruo-online-dot" />
                              Trực tuyến
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ruo-profile-details">
                      <div className="ruo-profile-detail-row" title={currentUser?.email}>
                        <Icons.Mail size={13} color="var(--laser-cyan)" />
                        <span>{currentUser?.email || 'user@ruo.edu.vn'}</span>
                      </div>
                      <div className="ruo-profile-detail-row" title={currentUser?.department}>
                        <Icons.Building size={13} color="var(--laser-cyan)" />
                        <span>{currentUser?.department || 'Phòng Quản Lý CSVC'}</span>
                      </div>
                      {currentUser?.phone && (
                        <div className="ruo-profile-detail-row">
                          <Icons.Phone size={13} color="var(--laser-cyan)" />
                          <span>{currentUser.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="ruo-profile-footer">
                      <button
                        type="button"
                        className="ruo-footer-btn"
                        onClick={() => {
                          setShowProfilePopover(false);
                          if (onOpenProfileModal) onOpenProfileModal();
                        }}
                      >
                        <Icons.User size={14} color="var(--laser-cyan)" />
                        <span>Hồ Sơ & Đổi Mật Khẩu</span>
                      </button>

                      <button
                        type="button"
                        className="ruo-footer-btn ruo-footer-btn-danger"
                        onClick={() => {
                          setShowProfilePopover(false);
                          setIsLogoutModalOpen(true);
                        }}
                      >
                        <Icons.LogOut size={14} color="#DC2626" />
                        <span>Đăng Xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Drawer Toggle (< 900px) */}
              <button
                type="button"
                className={`ruo-icon-button ruo-mobile-menu-btn ${isMobileNavOpen ? 'active' : ''}`}
                onClick={() => setIsMobileNavOpen((prev) => !prev)}
                aria-label="Mở danh mục điều hướng"
                aria-expanded={isMobileNavOpen}
              >
                {isMobileNavOpen ? <Icons.X size={16} /> : <Icons.Menu size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* TIER 2: Sleek 40px Role-Prioritized Sub-Navigation Strip */}
        <nav className="ruo-subnav" aria-label="Điều hướng phân hệ">
          <div className="ruo-subnav-inner">
            <div className="ruo-subnav-items">
              {primaryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`ruo-subnav-btn ${isActive ? 'active' : ''}`}
                    title={tab.label}
                  >
                    <IconComp size={14} />
                    <span>{tab.short || tab.label}</span>
                    {tab.badge && (
                      <span
                        className="ruo-subnav-badge"
                        style={{ backgroundColor: tab.badgeColor || '#EA580C' }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {overflowTabs.length > 0 && (
                <div ref={moreMenuRef} className="ruo-more-nav-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu((prev) => !prev);
                      setShowProfilePopover(false);
                    }}
                    className={`ruo-subnav-btn ruo-subnav-more-btn ${activeOverflowTab ? 'active' : ''} ${showMoreMenu ? 'open' : ''}`}
                    aria-label={`Phân hệ khác (${overflowTabs.length})`}
                    aria-expanded={showMoreMenu}
                    title="Các phân hệ nghiệp vụ bổ sung"
                  >
                    <ActiveOverflowIcon size={14} />
                    <span>{activeOverflowTab ? (activeOverflowTab.short || activeOverflowTab.label) : 'Khác'}</span>
                    <span className="ruo-more-count">{overflowTabs.length}</span>
                    <Icons.ChevronDown
                      size={12}
                      style={{
                        transition: 'transform 160ms ease',
                        transform: showMoreMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    />
                  </button>

                  {showMoreMenu && (
                    <div className="ruo-popover-menu ruo-more-popover" role="menu">
                      <div className="ruo-more-popover-label">Phân hệ mở rộng</div>
                      {overflowTabs.map((tab) => {
                        const isItemActive = activeTab === tab.id;
                        const IconComp = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="menuitem"
                            onClick={() => handleNavigate(tab.id)}
                            className={`ruo-more-item ${isItemActive ? 'active' : ''}`}
                          >
                            <IconComp size={15} />
                            <span style={{ flex: 1, textAlign: 'left' }}>{tab.label}</span>
                            {isItemActive && <Icons.Check size={14} color="var(--laser-cyan)" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Responsive Mobile Navigation Panel (< 900px) */}
        {isMobileNavOpen && (
          <div className="ruo-mobile-nav-panel">
            <div className="ruo-mobile-nav-grid">
              {visibleNavTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`ruo-mobile-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <IconComp size={15} />
                    <span>{tab.short || tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectModule={(modId) => {
          handleNavigate(modId);
          setShowCommandPalette(false);
        }}
      />

      {/* UC-9.1: Notification Center Slide-over Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onDeleteNotification={deleteNotification}
        onSeedDemo={seedDemoNotifications}
        onRefresh={fetchNotifications}
        onNavigate={(tabId) => {
          if (onSelectTab) handleNavigate(tabId);
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
