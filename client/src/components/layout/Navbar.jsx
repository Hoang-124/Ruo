import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const Navbar = ({ onOpenQRDemo, onSearchChange, searchQuery = '' }) => {
  const { currentUser, theme, toggleTheme, notifications, unreadCount, markAllNotificationsRead } = useAuth();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      {/* Global Command Search Bar */}
      <div className="topbar-search">
        <Icons.Search size={16} color="var(--laser-cyan)" />
        <input
          type="text"
          placeholder="Tìm kiếm thông minh (Phòng A1-302, Ticket SLA, Thiết bị)..."
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {searchQuery ? (
            <button
              onClick={() => onSearchChange && onSearchChange('')}
              style={{ color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
            >
              <Icons.X size={14} />
            </button>
          ) : (
            <kbd
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--hairline-medium)',
                borderRadius: '4px',
                padding: '2px 6px',
                color: 'var(--ink-muted)'
              }}
            >
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Topbar Actions */}
      <div className="topbar-actions">
        {/* Live Monospace Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--ink-secondary)',
            background: 'rgba(255,255,255,0.03)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--hairline-soft)'
          }}
          title="Thời gian hệ thống máy chủ Ruo"
        >
          <Icons.Clock size={13} color="var(--laser-cyan)" />
          <span>{currentTime || '08:00:00'}</span>
          <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>ICT</span>
        </div>

        {/* Quick QR Check-in Action */}
        <button
          className="laser-btn laser-btn-cyan"
          onClick={onOpenQRDemo}
          title="Mô phỏng quét mã QR Check-in phòng học"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <Icons.QrCode size={15} />
          <span>Quét QR Check-in</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Chuyển sang Obsidian Dark Mode' : 'Chuyển sang Clean Light Mode'}
        >
          {theme === 'light' ? (
            <Icons.Moon size={18} color="var(--laser-indigo)" />
          ) : (
            <Icons.Sun size={18} color="var(--laser-amber)" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            title="Thông báo hệ thống thời gian thực"
            style={{ position: 'relative' }}
          >
            <Icons.Bell size={18} color={unreadCount > 0 ? 'var(--laser-cyan)' : 'var(--ink-secondary)'} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--laser-crimson)',
                  boxShadow: '0 0 8px var(--laser-crimson)'
                }}
              />
            )}
          </button>

          {showNotifDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '360px',
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                zIndex: 150,
                overflow: 'hidden',
                animation: 'scaleIn 150ms ease-out'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--hairline-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Bell size={14} color="var(--laser-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-primary)' }}>
                    Thông Báo Realtime ({unreadCount})
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    style={{
                      fontSize: '11px',
                      color: 'var(--laser-cyan)',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Đã đọc tất cả
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--hairline-soft)',
                      background: n.read ? 'transparent' : 'rgba(6, 182, 212, 0.05)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: n.read ? 'var(--ink-faint)' : 'var(--laser-cyan)',
                          boxShadow: n.read ? 'none' : '0 0 6px var(--laser-cyan)'
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink-primary)' }}>
                        {n.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.4, margin: '2px 0 4px 14px' }}>
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

        {/* User Profile Info & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="user-menu-btn"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            title="Hồ sơ tài khoản tác nhân"
          >
            <div className="avatar-circle">
              {currentUser.avatar}
            </div>
            <div className="user-info-text">
              <div className="user-info-name">{currentUser.name}</div>
              <div className="user-info-role">{currentUser.roleTitle}</div>
            </div>
            <Icons.ChevronDown size={14} color="var(--ink-muted)" />
          </button>

          {showUserDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: '0',
                width: '270px',
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                zIndex: 150,
                padding: '14px',
                animation: 'scaleIn 150ms ease-out'
              }}
            >
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--hairline-soft)', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink-primary)' }}>{currentUser.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>{currentUser.email}</div>
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--laser-cyan)',
                    marginTop: '6px',
                    background: 'rgba(6,182,212,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}
                >
                  Mã UID: {currentUser.code}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Điểm Uy Tín Check-in:</span>
                  <span style={{ fontWeight: 700, color: 'var(--laser-emerald)', fontFamily: 'var(--font-mono)' }}>
                    {currentUser.reputeScore}/100
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  Đơn vị: <strong style={{ color: 'var(--ink-primary)' }}>{currentUser.department}</strong>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-muted)',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--hairline-soft)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  RBAC: Level {currentUser.roleKey === 'admin' ? '5 (Full Access)' : '3 (Role-Restricted)'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
