import React, { useState, useEffect, useMemo } from 'react';
import { NotificationTemplateModal } from './NotificationTemplateModal';
import './NotificationDrawer.css';

/**
 * Format timestamp into friendly Vietnamese relative time
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Vừa xong';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 45) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDays === 1) return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * Strict Native Inline SVGs (Zero external libraries)
 */
const DrawerSvg = {
  FileText: ({ size = 12, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Bell: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Wrench: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  ClipboardCheck: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  AlertOctagon: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  CheckCheck: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  ),
  Refresh: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Sparkles: ({ size = 12, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Trash: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ArrowUpRight: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  ),
  X: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

export const NotificationDrawer = ({
  isOpen = false,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onSeedDemo,
  onRefresh,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'repairs' | 'approvals' | 'deadlines'
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Categorize notifications
  const categorizedData = useMemo(() => {
    const repairs = [];
    const approvals = [];
    const deadlines = [];
    const unread = [];

    notifications.forEach((item) => {
      const isUnread = !item.is_read && !item.read && !item.isRead;
      if (isUnread) unread.push(item);

      const type = String(item.type || '').toLowerCase();
      const cat = String(item.category || '').toLowerCase();

      if (cat === 'repairs' || type.includes('repair') || type.includes('incident')) {
        repairs.push(item);
      } else if (cat === 'approvals' || type.includes('movement') || type.includes('disposal') || type.includes('parts')) {
        approvals.push(item);
      } else if (cat === 'deadlines' || type.includes('deadline') || type.includes('warranty') || type.includes('sla')) {
        deadlines.push(item);
      }
    });

    return {
      all: notifications,
      unread,
      repairs,
      approvals,
      deadlines
    };
  }, [notifications]);

  // Filtered notifications based on activeTab
  const visibleNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return categorizedData.unread;
      case 'repairs':
        return categorizedData.repairs;
      case 'approvals':
        return categorizedData.approvals;
      case 'deadlines':
        return categorizedData.deadlines;
      case 'all':
      default:
        return categorizedData.all;
    }
  }, [activeTab, categorizedData]);

  // Handle seed demo
  const handleSeedDemoClick = async () => {
    if (!onSeedDemo || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedDemo();
    } finally {
      setIsSeeding(false);
    }
  };

  // Helper to determine category icon & tag
  const getCategoryMeta = (item) => {
    const type = String(item.type || '').toLowerCase();
    const cat = String(item.category || '').toLowerCase();

    if (cat === 'deadlines' || type.includes('deadline') || type.includes('warranty')) {
      return {
        key: 'deadlines',
        label: 'Cảnh Báo Deadline',
        tagClass: 'deadlines',
        icon: <DrawerSvg.AlertOctagon size={16} />
      };
    }
    if (cat === 'approvals' || type.includes('movement') || type.includes('disposal') || type.includes('parts')) {
      return {
        key: 'approvals',
        label: 'Duyệt Phiếu',
        tagClass: 'approvals',
        icon: <DrawerSvg.ClipboardCheck size={16} />
      };
    }
    if (cat === 'repairs' || type.includes('repair') || type.includes('incident')) {
      return {
        key: 'repairs',
        label: 'Ca Sửa Chữa',
        tagClass: 'repairs',
        icon: <DrawerSvg.Wrench size={16} />
      };
    }
    return {
      key: 'general',
      label: 'Hệ Thống',
      tagClass: 'general',
      icon: <DrawerSvg.Bell size={16} />
    };
  };

  const handleActionNavigate = (item) => {
    const meta = getCategoryMeta(item);
    if (!onNavigate) return;

    if (meta.key === 'repairs') {
      onNavigate('repairs', item);
    } else if (meta.key === 'approvals') {
      if (item.type?.includes('disposal')) {
        onNavigate('disposal', item);
      } else {
        onNavigate('movements', item);
      }
    } else if (meta.key === 'deadlines') {
      onNavigate('repairs', item);
    } else {
      onNavigate('dashboard', item);
    }

    // Auto mark read if unread
    const notifId = item._id || item.id;
    const isUnread = !item.is_read && !item.read && !item.isRead;
    if (isUnread && onMarkRead && notifId) {
      onMarkRead(notifId);
    }

    onClose();
  };

  return (
    <>
      {/* Template Editor Modal (UC-9.2 / UC-9.3) */}
      <NotificationTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      {/* Backdrop Overlay */}
      <div
        className={`ruo-notif-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Drawer Container */}
      <div
        className={`ruo-drawer-container ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ruo-drawer-title"
      >
        {/* Header */}
        <div className="ruo-drawer-header">
          <div className="ruo-drawer-title-group">
            <div className="ruo-drawer-icon-wrap">
              <DrawerSvg.Bell size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 id="ruo-drawer-title" className="ruo-drawer-title">
                  Trung Tâm Thông Báo
                </h3>
                {unreadCount > 0 && (
                  <span className="ruo-badge-red-pill">
                    {unreadCount > 99 ? '99+' : unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="ruo-drawer-subtitle">
                Ca sửa mới • Duyệt phiếu • Cảnh báo deadline
              </p>
            </div>
          </div>

          <div className="ruo-drawer-actions">
            {unreadCount > 0 && onMarkAllRead && (
              <button
                className="ruo-drawer-btn"
                onClick={onMarkAllRead}
                title="Đánh dấu tất cả thông báo là đã đọc"
              >
                <DrawerSvg.CheckCheck size={14} color="#10B981" />
                <span>Đã đọc</span>
              </button>
            )}

            {onRefresh && (
              <button
                className="ruo-drawer-close-btn"
                onClick={onRefresh}
                title="Tải lại danh sách thông báo"
              >
                <DrawerSvg.Refresh size={14} />
              </button>
            )}

            <button
              className="ruo-drawer-close-btn"
              onClick={onClose}
              title="Đóng ngăn thông báo (Esc)"
            >
              <DrawerSvg.X size={16} />
            </button>
          </div>
        </div>

        {/* Demo Seed & Template Editor Quick Bar */}
        <div className="ruo-drawer-demobar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {onSeedDemo && (
            <button
              className="ruo-demo-btn"
              onClick={handleSeedDemoClick}
              disabled={isSeeding}
              title="Tạo nhanh 3 thông báo mẫu: Ca sửa mới, Duyệt phiếu, Cảnh báo deadline"
            >
              <DrawerSvg.Sparkles size={11} />
              <span>{isSeeding ? 'Đang tạo...' : '+ 3 Thông báo mẫu'}</span>
            </button>
          )}

          <button
            className="ruo-demo-btn"
            style={{ color: '#0369A1', borderColor: 'rgba(3, 105, 161, 0.3)' }}
            onClick={() => setIsTemplateModalOpen(true)}
            title="Quản lý và tùy chỉnh mẫu thông báo & email (UC-9.2/9.3 Template Editor)"
          >
            <DrawerSvg.FileText size={11} />
            <span>Mẫu thông báo</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="ruo-drawer-tabs">
          <button
            className={`ruo-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả
            <span className="ruo-tab-count">{categorizedData.all.length}</span>
          </button>

          <button
            className={`ruo-tab-pill ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Chưa đọc
            <span className={`ruo-tab-count ${categorizedData.unread.length > 0 ? 'alert' : ''}`}>
              {categorizedData.unread.length}
            </span>
          </button>

          <button
            className={`ruo-tab-pill ${activeTab === 'repairs' ? 'active' : ''}`}
            onClick={() => setActiveTab('repairs')}
          >
            Ca sửa mới
            <span className="ruo-tab-count">{categorizedData.repairs.length}</span>
          </button>

          <button
            className={`ruo-tab-pill ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            Duyệt phiếu
            <span className="ruo-tab-count">{categorizedData.approvals.length}</span>
          </button>

          <button
            className={`ruo-tab-pill ${activeTab === 'deadlines' ? 'active' : ''}`}
            onClick={() => setActiveTab('deadlines')}
          >
            Cảnh báo deadline
            <span className={`ruo-tab-count ${categorizedData.deadlines.length > 0 ? 'alert' : ''}`}>
              {categorizedData.deadlines.length}
            </span>
          </button>
        </div>

        {/* Notification List Body */}
        <div className="ruo-drawer-list">
          {visibleNotifications.length === 0 ? (
            <div className="ruo-drawer-empty">
              <div className="ruo-empty-icon-wrap">
                <DrawerSvg.Bell size={28} />
              </div>
              <h4>Không có thông báo nào</h4>
              <p>
                {activeTab === 'all'
                  ? 'Bạn đã cập nhật toàn bộ tin tức cơ sở vật chất. Không có thông báo mới tồn đọng.'
                  : `Không có thông báo nào trong mục "${
                      activeTab === 'unread'
                        ? 'Chưa đọc'
                        : activeTab === 'repairs'
                        ? 'Ca sửa mới'
                        : activeTab === 'approvals'
                        ? 'Duyệt phiếu'
                        : 'Cảnh báo deadline'
                    }".`}
              </p>
              {activeTab !== 'all' ? (
                <button
                  className="ruo-drawer-btn"
                  onClick={() => setActiveTab('all')}
                >
                  Xem tất cả thông báo
                </button>
              ) : onSeedDemo ? (
                <button
                  className="ruo-drawer-btn"
                  style={{ color: '#2563EB', borderColor: '#93C5FD' }}
                  onClick={handleSeedDemoClick}
                >
                  <DrawerSvg.Sparkles size={12} />
                  <span>Tạo thông báo demo ngay</span>
                </button>
              ) : null}
            </div>
          ) : (
            visibleNotifications.map((item) => {
              const notifId = item._id || item.id;
              const isUnread = !item.is_read && !item.read && !item.isRead;
              const meta = getCategoryMeta(item);
              const timeString = formatRelativeTime(item.created_at || item.createdAt || item.time);

              return (
                <div
                  key={notifId || Math.random()}
                  className={`ruo-notif-card category-${meta.key} ${isUnread ? 'unread' : 'read'}`}
                >
                  {/* Category Avatar */}
                  <div className={`ruo-notif-badge-icon ${meta.tagClass}`}>
                    {meta.icon}
                  </div>

                  {/* Body Content */}
                  <div className="ruo-notif-main">
                    <div className="ruo-notif-topline">
                      <h4 className="ruo-notif-title">{item.title}</h4>
                      <span className="ruo-notif-time">{timeString}</span>
                    </div>

                    <p className="ruo-notif-desc">{item.message}</p>

                    <div className="ruo-notif-footer">
                      <span className={`ruo-notif-tag ${meta.tagClass}`}>
                        {meta.label}
                      </span>

                      <div className="ruo-notif-card-actions">
                        <button
                          className="ruo-card-btn primary"
                          onClick={() => handleActionNavigate(item)}
                          title="Điều hướng đến phân hệ tương ứng"
                        >
                          <span>Xem chi tiết</span>
                          <DrawerSvg.ArrowUpRight size={12} />
                        </button>

                        {isUnread && onMarkRead && (
                          <button
                            className="ruo-card-btn"
                            style={{ color: '#10B981' }}
                            onClick={() => onMarkRead(notifId)}
                            title="Đánh dấu đã đọc"
                          >
                            <DrawerSvg.CheckCheck size={12} />
                          </button>
                        )}

                        {onDeleteNotification && (
                          <button
                            className="ruo-card-btn dismiss"
                            onClick={() => onDeleteNotification(notifId)}
                            title="Xóa thông báo"
                          >
                            <DrawerSvg.Trash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & live sync indicator */}
        <div className="ruo-drawer-footer">
          <div className="ruo-sync-indicator">
            <span className="ruo-sync-dot" />
            <span>Đồng bộ thời gian thực</span>
          </div>
          <div>
            Tổng số: <strong>{notifications.length}</strong> thông báo
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
