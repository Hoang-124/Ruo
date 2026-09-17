import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const DynamicIslandDock = ({ onOpenQRDemo, activeTab, onSelectTab }) => {
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
    isTabAllowed,
    currentRoleMeta,
    allRolePermissions
  } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

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

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAppLauncher((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roles = [
    { key: 'student', label: 'Sinh viên', short: 'Sinh viên', color: 'var(--laser-cyan)', icon: Icons.User },
    { key: 'lecturer', label: 'Giảng viên', short: 'Giảng viên', color: 'var(--laser-indigo)', icon: Icons.AcademicCap },
    { key: 'facility_staff', label: 'QL CSVC', short: 'QL CSVC', color: 'var(--laser-violet)', icon: Icons.Building },
    { key: 'maintenance', label: 'Kỹ thuật', short: 'Kỹ thuật', color: 'var(--laser-amber)', icon: Icons.Wrench },
    { key: 'academic_affairs', label: 'Đào tạo', short: 'Đào tạo', color: 'var(--laser-emerald)', icon: Icons.Calendar },
    { key: 'admin', label: 'Quản trị', short: 'Quản trị', color: 'var(--laser-crimson)', icon: Icons.Shield }
  ];

  // Core navigation tabs displayed prominently in the nav strip
  const navTabs = [
    { id: 'dashboard', label: 'Bản Đồ Không Gian', short: 'Spatial CAD', icon: Icons.Building, color: 'var(--laser-cyan)' },
    { id: 'rooms', label: 'Tra Cứu Phòng', short: '108 Phòng', icon: Icons.Room, color: 'var(--laser-cyan)' },
    { id: 'calendar', label: 'Lịch Biểu Tuần', short: 'Lịch RFC-5545', icon: Icons.Calendar, color: 'var(--laser-indigo)' },
    { id: 'approvals', label: 'Hàng Đợi Duyệt', short: 'Duyệt Đơn', icon: Icons.CheckCircle, color: 'var(--laser-emerald)', badge: '8', badgeColor: 'var(--laser-amber)' },
    { id: 'tickets_kanban', label: 'Kanban SLA', short: 'SLA Engine', icon: Icons.Wrench, color: 'var(--laser-crimson)', badge: '2!', badgeColor: 'var(--laser-crimson)' },
    { id: 'csp_studio', label: 'Xếp TKB CSP', short: 'Thuật Toán CSP', icon: Icons.Cpu, color: 'var(--laser-indigo)', badge: 'Trụ cột 1' },
    { id: 'equipments', label: 'Kho Thiết Bị', short: 'Thiết Bị & QR', icon: Icons.Equipment, color: 'var(--laser-amber)' },
    { id: 'disposal_calc', label: 'Thanh Lý Tài Sản', short: 'Thanh Lý R≥60%', icon: Icons.Sliders, color: 'var(--laser-amber)', badge: 'Trụ cột 5' },
    { id: 'rbac', label: 'Ma Trận Quyền', short: 'RBAC Matrix', icon: Icons.Users, color: 'var(--laser-violet)' },
    { id: 'audit_log', label: 'Audit Log', short: 'SHA-256 Audit', icon: Icons.Audit, color: 'var(--laser-emerald)', badge: 'Bất biến' }
  ];

  // Dynamically filter tabs according to active Actor's RBAC permissions
  const effectiveAllowedTabs = allowedTabs || ['dashboard', 'rooms', 'calendar'];
  const visibleNavTabs = navTabs.filter((t) => effectiveAllowedTabs.includes(t.id));

  // Full 95 Use Cases categorized for the ⌘K command launcher
  const allModules = [
    { id: 'dashboard', label: 'Bản Đồ Không Gian (Spatial Digital Twin CAD Canvas)', cat: 'TRỤ CỘT 1 • KHÔNG GIAN', icon: Icons.Building, desc: 'Mặt bằng CAD tương tác thời gian thực, Time-Travel Scrubber, IoT Telemetry' },
    { id: 'rooms', label: 'Tra Cứu 108 Phòng Học & Đặt Chỗ 30s', cat: 'TRỤ CỘT 2 • LỊCH BIỂU', icon: Icons.Room, desc: 'Smart search theo sức chứa, thiết bị, chống xung đột lịch học' },
    { id: 'calendar', label: 'Lịch Biểu Tuần Chuẩn RFC-5545 Toàn Trường', cat: 'TRỤ CỘT 2 • LỊCH BIỂU', icon: Icons.Calendar, desc: 'Đồng bộ 3 lớp: Chính khóa, Sự kiện trường, Lịch tự học sinh viên' },
    { id: 'approvals', label: 'Hàng Đợi Phê Duyệt Đa Cấp & SLA Escalation', cat: 'TRỤ CỘT 3 • ĐIỀU HÀNH', icon: Icons.CheckCircle, desc: '8 yêu cầu pending, cơ chế tự động chuyển cấp lãnh đạo khi quá hạn SLA' },
    { id: 'tickets_kanban', label: 'Kanban SLA Quản Lý Sự Cố Khẩn Cấp', cat: 'TRỤ CỘT 3 • ĐIỀU HÀNH', icon: Icons.Ticket, desc: 'Đếm ngược SLA theo giờ hành chính 07:30 - 17:00, điều phối kỹ thuật viên' },
    { id: 'csp_studio', label: 'Bộ Giải Thuật Toán Xếp TKB Tự Động (CSP Engine)', cat: 'TRỤ CỘT 1 • KHÔNG GIAN', icon: Icons.Cpu, desc: 'Backtracking + MRV + LCV + AC-3, xếp 450 lớp học vào 108 phòng với 0 xung đột' },
    { id: 'equipments', label: 'Kho Thiết Bị & Quản Lý Mã QR Định Danh', cat: 'TRỤ CỘT 4 • THIẾT BỊ', icon: Icons.Equipment, desc: 'Quản lý tài sản phòng học, mượn trả thiết bị Lab, quét mã QR kiểm kê' },
    { id: 'disposal_calc', label: 'Máy Tính Thanh Lý Tài Sản Tự Động (R ≥ 60%)', cat: 'TRỤ CỘT 5 • THANH LÝ', icon: Icons.Sliders, desc: 'Tính chỉ số hao mòn kinh tế kỹ thuật, tự động lập hội đồng thanh lý' },
    { id: 'rbac', label: 'Ma Trận Phân Quyền 7 Vai Trò (RBAC Engine)', cat: 'QUẢN TRỊ & BẢO MẬT', icon: Icons.Users, desc: 'Phân quyền chi tiết cho SV, Giảng viên, QL CSVC, Kỹ thuật, Đào tạo, Admin' },
    { id: 'audit_log', label: 'Nhật Ký Kiểm Toán SHA-256 Bất Biến (Audit Trail)', cat: 'QUẢN TRỊ & BẢO MẬT', icon: Icons.Audit, desc: 'Ghi vết mọi thao tác đặt phòng, phê duyệt, điều phối kỹ thuật với hash cryptographic' }
  ];

  const filteredModules = allModules.filter(m =>
    m.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.cat.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.desc.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <>
      <header className="dynamic-island-header">
        {/* TIER 1: Brand + Status + Role Simulator + Actions + Sun/Moon Theme Toggle */}
        <div className="dynamic-island-top">
          {/* Brand & Telemetry Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => onSelectTab('dashboard')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: 0
              }}
              title="Quay lại Bản Đồ Không Gian (Spatial CAD Twin)"
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--laser-cyan), var(--laser-indigo))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px var(--laser-cyan-glow)'
                }}
              >
                <Icons.Building size={16} color="#FFFFFF" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '-0.03em', color: 'var(--ink-pure)' }}>
                    RUO
                  </span>
                  <span style={{ fontSize: '9px', background: 'rgba(37,99,235,0.12)', color: 'var(--laser-indigo)', padding: '2px 5px', borderRadius: '3px', fontWeight: 800, letterSpacing: '0.04em' }}>
                    SPATIAL OS
                  </span>
                </div>
                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', letterSpacing: '0.04em', fontWeight: 600 }}>
                  v2.6 DIGITAL TWIN
                </span>
              </div>
            </button>

            <div style={{ width: '1px', height: '22px', background: 'var(--hairline-medium)' }} />

            {/* Campus Live Telemetry Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--ink-secondary)',
                background: 'var(--spatial-bar-bg)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--hairline-soft)'
              }}
            >
              <span className="telemetry-live-dot" style={{ width: '6px', height: '6px' }} />
              <span><strong style={{ color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)' }}>84/108</strong> PHÒNG</span>
              <span style={{ color: 'var(--ink-faint)' }}>•</span>
              <span>SLA: <strong style={{ color: 'var(--laser-emerald)', fontFamily: 'var(--font-mono)' }}>98.4%</strong></span>
            </div>
          </div>

          {/* Center: Role Simulator Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--spatial-bar-bg)', padding: '3px 6px', borderRadius: 'var(--radius-full)', border: '1px solid var(--hairline-soft)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', padding: '0 4px', fontWeight: 700, letterSpacing: '0.02em' }}>
              GÓC NHÌN:
            </span>
            {roles.map((r) => {
              const isActive = currentRoleKey === r.key;
              const IconComp = r.icon;
              return (
                <button
                  key={r.key}
                  onClick={() => switchRole(r.key)}
                  title={`${r.label}: ${allRolePermissions?.[r.key]?.desc || ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? (theme === 'light' ? r.color : '#FFFFFF') : 'var(--ink-secondary)',
                    background: isActive ? (theme === 'light' ? '#FFFFFF' : `${r.color}30`) : 'transparent',
                    border: isActive ? `1.5px solid ${r.color}` : '1px solid transparent',
                    boxShadow: isActive ? (theme === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : `0 0 12px ${r.color}40`) : 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <IconComp size={12} color={isActive ? r.color : 'var(--ink-muted)'} />
                  <span>{r.short}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Clock + QR + THEME TOGGLE + Notifications + User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Realtime Clock */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--laser-cyan)',
                padding: '4px 10px',
                background: 'rgba(161, 101, 38, 0.12)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(161, 101, 38, 0.28)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Đồng hồ thời gian thực ICT"
            >
              <Icons.Clock size={12} />
              <span>{currentTime || '09:00:00'}</span>
              <span style={{ fontSize: '9px', color: 'var(--ink-muted)' }}>ICT</span>
            </div>

            {/* Quick QR Check-in */}
            <button
              className="laser-btn laser-btn-cyan"
              onClick={onOpenQRDemo}
              title="Mô phỏng quét mã QR Check-in phòng học"
              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)' }}
            >
              <Icons.QrCode size={13} />
              <span>QR Check-in</span>
            </button>

            {/* PROMINENT SUN/MOON THEME TOGGLE BUTTON */}
            <button
              className="theme-capsule-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Chuyển sang Giao Diện Sáng (Clean Light Mode)' : 'Chuyển sang Giao Diện Tối (Obsidian Dark Mode)'}
              style={{
                background: theme === 'light' ? 'rgba(161, 101, 38, 0.08)' : 'rgba(255, 255, 255, 0.06)',
                borderColor: theme === 'light' ? 'rgba(161, 101, 38, 0.3)' : 'var(--hairline-medium)',
                color: theme === 'light' ? 'var(--laser-indigo)' : 'var(--laser-cyan)'
              }}
            >
              {theme === 'dark' ? (
                <>
                  <Icons.Sun size={13} color="var(--laser-amber)" />
                  <span>SÁNG</span>
                </>
              ) : (
                <>
                  <Icons.Moon size={13} color="var(--laser-indigo)" />
                  <span>TỐI</span>
                </>
              )}
            </button>

            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  setShowUserMenu(false);
                }}
                title="Thông báo hệ thống thời gian thực"
                style={{ width: '30px', height: '30px', borderRadius: '50%', position: 'relative' }}
              >
                <Icons.Bell size={15} color={unreadCount > 0 ? 'var(--laser-cyan)' : 'var(--ink-secondary)'} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--laser-crimson)',
                      boxShadow: '0 0 6px var(--laser-crimson)'
                    }}
                  />
                )}
              </button>

              {showNotifs && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: '0',
                    width: '340px',
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--hairline-medium)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 200,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ink-pure)' }}>
                      Thông Báo Mới ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--hairline-soft)',
                          background: n.read ? 'transparent' : 'rgba(6, 182, 212, 0.05)'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--ink-pure)' }}>{n.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '2px' }}>{n.message}</div>
                        <div style={{ fontSize: '10px', color: 'var(--ink-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ALL 95 USE CASES COMMAND PALETTE TRIGGER BUTTON (Tier 1 Action) */}
            <button
              onClick={() => setShowAppLauncher(true)}
              className="laser-btn laser-btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                border: '1px solid var(--hairline-medium)',
                color: theme === 'light' ? 'var(--laser-indigo)' : 'var(--laser-cyan)',
                background: theme === 'light' ? 'rgba(161, 101, 38, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                cursor: 'pointer'
              }}
              title="Mở bảng tra cứu toàn bộ 95 Use Cases và 5 Trụ Cột (Phím tắt ⌘K / Ctrl+K)"
            >
              <Icons.Layers size={13} color="var(--laser-cyan)" />
              <span style={{ fontWeight: 600 }}>95 Chức Năng</span>
              <kbd style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.12)', padding: '1px 4px', borderRadius: '3px', color: 'var(--ink-secondary)' }}>
                Ctrl+K
              </kbd>
            </button>

            {/* User Profile Pill & Actor Navigation Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifs(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 9px 2px 3px',
                  background: showUserMenu ? 'rgba(161, 101, 38, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-full)',
                  border: showUserMenu ? '1px solid var(--laser-cyan)' : '1px solid var(--hairline-soft)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
                title={`Hồ sơ tác nhân & Danh mục ${visibleNavTabs.length} chức năng`}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--laser-indigo), var(--laser-cyan))',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800
                  }}
                >
                  {currentUser.avatar}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-primary)', maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name.split(' ').slice(-1)[0]}
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(161, 101, 38, 0.22)',
                    color: 'var(--laser-cyan)',
                    fontWeight: 800
                  }}
                >
                  {visibleNavTabs.length}
                </span>
                <Icons.ChevronDown size={12} color={showUserMenu ? 'var(--laser-cyan)' : 'var(--ink-muted)'} />
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: '0',
                    width: visibleNavTabs.length > 4 ? '490px' : '320px',
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--hairline-medium)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(24px)',
                    zIndex: 200,
                    padding: '16px'
                  }}
                >
                  {/* 1. Profile Identity Header */}
                  <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--hairline-soft)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink-pure)' }}>
                        {currentUser.name}
                      </div>
                      <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)', background: 'rgba(161, 101, 38, 0.14)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(161, 101, 38, 0.3)', fontWeight: 700 }}>
                        {currentUser.code}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                      {currentUser.roleTitle}
                    </div>
                  </div>

                  {/* 2. Section Title: Phân hệ của tác nhân hiện tại */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="telemetry-live-dot" style={{ width: '6px', height: '6px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', fontWeight: 800, letterSpacing: '0.02em' }}>
                        PHÂN HỆ CỦA {(currentRoleMeta?.title || 'Sinh viên').toUpperCase()} ({visibleNavTabs.length})
                      </span>
                    </div>
                    <span style={{ fontSize: '9.5px', color: 'var(--ink-muted)' }}>
                      Chọn để truy cập trực tiếp
                    </span>
                  </div>

                  {/* 3. Integrated Navigation Tab Grid (Hiển thị đầy đủ 100% chức năng dạng lưới 2 cột, không bị che khuất) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: visibleNavTabs.length > 4 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                      gap: '6px',
                      maxHeight: '460px',
                      overflowY: visibleNavTabs.length > 10 ? 'auto' : 'visible',
                      paddingRight: '1px'
                    }}
                  >
                    {visibleNavTabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onSelectTab(tab.id);
                            setShowUserMenu(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: isActive
                              ? (theme === 'light' ? 'rgba(161, 101, 38, 0.12)' : 'rgba(161, 101, 38, 0.18)')
                              : (theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)'),
                            border: isActive
                              ? '1px solid var(--laser-cyan)'
                              : '1px solid var(--hairline-soft)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 120ms ease'
                          }}
                          title={tab.label}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: 'var(--radius-sm)',
                                background: isActive
                                  ? 'linear-gradient(135deg, var(--laser-indigo), var(--laser-cyan))'
                                  : (theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <IconComp size={13} color={isActive ? '#FFFFFF' : 'var(--ink-secondary)'} />
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: isActive ? 700 : 600,
                                  color: isActive ? 'var(--laser-cyan)' : 'var(--ink-pure)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {tab.label}
                              </div>
                              <div
                                style={{
                                  fontSize: '9.5px',
                                  color: 'var(--ink-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {tab.short}
                              </div>
                            </div>
                          </div>

                          {tab.badge ? (
                            <span
                              style={{
                                fontSize: '9px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: tab.badgeColor ? `${tab.badgeColor}25` : 'rgba(255,255,255,0.1)',
                                color: tab.badgeColor || 'var(--ink-muted)',
                                border: `1px solid ${tab.badgeColor ? `${tab.badgeColor}50` : 'var(--hairline-soft)'}`,
                                flexShrink: 0,
                                marginLeft: '4px'
                              }}
                            >
                              {tab.badge}
                            </span>
                          ) : isActive ? (
                            <span style={{ fontSize: '8.5px', fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)', fontWeight: 700, flexShrink: 0, marginLeft: '4px' }}>
                              ● MỞ
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ALL 95 USE CASES COMMAND PALETTE MODAL (⌘K) */}
      {showAppLauncher && (
        <div
          className="modal-overlay"
          onClick={() => setShowAppLauncher(false)}
          style={{ zIndex: 300, backdropFilter: 'blur(20px)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-glow)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 25px 70px rgba(0,0,0,0.8)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--laser-indigo), var(--laser-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Layers size={18} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                    Danh Mục Toàn Bộ 95 Use Cases • 5 Trụ Cột Kỹ Thuật
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                    HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT ĐẠI HỌC (RUO v2.6 OS)
                  </div>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowAppLauncher(false)} style={{ width: '32px', height: '32px' }}>
                <Icons.X size={16} />
              </button>
            </div>

            {/* Quick Search in Launcher */}
            <div style={{ position: 'relative', marginBottom: '18px' }}>
              <Icons.Search size={16} color="var(--laser-cyan)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Gõ để tìm nhanh chức năng (CSP, Duyệt phòng, RFC-5545, QR, SLA, RBAC, Audit)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
                style={{ paddingLeft: '40px', fontSize: '13px', borderRadius: 'var(--radius-md)', background: 'var(--canvas-subtle)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-primary)' }}
              />
            </div>

            {/* Grid of All 95 Features with Actor RBAC Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredModules.map((m) => {
                const IconComp = m.icon;
                const isActive = activeTab === m.id;
                const isAllowed = isTabAllowed ? isTabAllowed(m.id) : true;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (!isAllowed) {
                        alert(`Chức năng "${m.label}" không thuộc thẩm quyền của ${currentRoleMeta?.title || currentRoleKey}. Vui lòng chuyển sang vai trò phù hợp (QL CSVC, Đào tạo, Admin...) trên thanh công cụ để sử dụng.`);
                        return;
                      }
                      onSelectTab(m.id);
                      setShowAppLauncher(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(37, 99, 235, 0.12)' : (isAllowed ? 'var(--spatial-tile-bg)' : 'rgba(255, 255, 255, 0.01)'),
                      border: `1px solid ${isActive ? 'var(--laser-indigo)' : (isAllowed ? 'var(--hairline-soft)' : 'rgba(225, 29, 72, 0.15)')}`,
                      cursor: isAllowed ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      opacity: isAllowed ? 1 : 0.65,
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      if (isAllowed) {
                        e.currentTarget.style.borderColor = 'var(--laser-indigo)';
                        e.currentTarget.style.background = 'var(--surface-panel-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isAllowed) {
                        e.currentTarget.style.borderColor = isActive ? 'var(--laser-indigo)' : 'var(--hairline-soft)';
                        e.currentTarget.style.background = isActive ? 'rgba(37, 99, 235, 0.12)' : 'var(--spatial-tile-bg)';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: isAllowed ? 'rgba(6, 182, 212, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <IconComp size={16} color={isAllowed ? 'var(--laser-cyan)' : 'var(--laser-crimson)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: isAllowed ? 'var(--laser-indigo)' : 'var(--ink-muted)', fontWeight: 700 }}>
                          {m.cat}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: '9px', color: 'var(--laser-cyan)', fontWeight: 800 }}>
                            ĐANG MỞ
                          </span>
                        )}
                        {!isAllowed && (
                          <span style={{ fontSize: '9px', color: 'var(--laser-crimson)', fontWeight: 700, background: 'rgba(225, 29, 72, 0.1)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                            KHÓA THEO VAI TRÒ
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: isAllowed ? 'var(--ink-pure)' : 'var(--ink-secondary)', marginBottom: '3px' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', lineHeight: 1.3 }}>
                        {m.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
