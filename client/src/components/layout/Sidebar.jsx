import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const Sidebar = ({ activeTab, onSelectTab }) => {
  const { currentRoleKey } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Menu mapping per role strictly matching 95 UCs & 7 Actors
  const getNavSections = () => {
    switch (currentRoleKey) {
      case 'student':
        return [
          {
            title: '// ĐIỀU HÀNH',
            items: [
              { id: 'dashboard', label: 'Bàn Điều Hành', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// ĐẶT PHÒNG HỌC',
            items: [
              { id: 'rooms', label: 'Tìm & Giữ Phòng', icon: Icons.Room },
              { id: 'calendar', label: 'Lịch Biểu Tuần', icon: Icons.Calendar },
              { id: 'my_bookings', label: 'Lịch Của Tôi', icon: Icons.Clock, badge: '2 phòng' }
            ]
          },
          {
            title: '// SỰ CỐ & BẢO TRÌ',
            items: [
              { id: 'tickets', label: 'Theo Dõi Sự Cố', icon: Icons.Ticket, badge: '1 ticket', badgeType: 'warning' }
            ]
          }
        ];

      case 'lecturer':
        return [
          {
            title: '// ĐIỀU HÀNH',
            items: [
              { id: 'dashboard', label: 'Bàn Điều Hành Giảng Dạy', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// PHÒNG HỌC & GIẢNG ĐƯỜNG',
            items: [
              { id: 'rooms', label: 'Tra Cứu Phòng Học', icon: Icons.Room },
              { id: 'calendar', label: 'Lịch Giảng & Sự Kiện', icon: Icons.Calendar },
              { id: 'series_booking', label: 'Đặt Định Kỳ (Series)', icon: Icons.Layers, badge: 'RFC-5545' },
              { id: 'equipments', label: 'Mượn Thiết Bị Lab', icon: Icons.Equipment }
            ]
          },
          {
            title: '// SỰ CỐ & BẢO HÀNH',
            items: [
              { id: 'tickets', label: 'Báo Hỏng Khẩn Cấp', icon: Icons.Wrench }
            ]
          }
        ];

      case 'facility_staff':
        return [
          {
            title: '// COMMAND CENTER',
            items: [
              { id: 'dashboard', label: 'Trung Tâm Chỉ Huy CSVC', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// DUYỆT & ĐIỀU PHỐI',
            items: [
              { id: 'approvals', label: 'Hàng Đợi Duyệt Phòng', icon: Icons.CheckCircle, badge: '8 yêu cầu', badgeType: 'warning' },
              { id: 'tickets_kanban', label: 'Kanban SLA Khẩn Cấp', icon: Icons.Ticket, badge: '2 Quá hạn', badgeType: 'danger' }
            ]
          },
          {
            title: '// CƠ SỞ DỮ LIỆU',
            items: [
              { id: 'rooms', label: 'Danh Mục 108 Phòng', icon: Icons.Building },
              { id: 'calendar', label: 'Lịch Tổng Thể Toàn Trường', icon: Icons.Calendar },
              { id: 'equipments', label: 'Kho Thiết Bị & Tài Sản', icon: Icons.Equipment }
            ]
          }
        ];

      case 'maintenance':
        return [
          {
            title: '// COMMAND CENTER',
            items: [
              { id: 'dashboard', label: 'Bàn Kỹ Thuật Bảo Trì', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// PHÂN HỆ KỸ THUẬT',
            items: [
              { id: 'tickets_kanban', label: 'SLA Dispatcher (5 việc)', icon: Icons.Wrench, badge: 'SLA Active', badgeType: 'danger' },
              { id: 'disposal_calc', label: 'Thanh Lý Tài Sản (R ≥ 60%)', icon: Icons.Sliders, badge: 'Trụ cột 3' },
              { id: 'calendar', label: 'Lịch Bảo Trì Định Kỳ', icon: Icons.Calendar }
            ]
          }
        ];

      case 'academic_affairs':
        return [
          {
            title: '// COMMAND CENTER',
            items: [
              { id: 'dashboard', label: 'Chỉ Huy Phòng Đào Tạo', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// THUẬT TOÁN CSP & TKB',
            items: [
              { id: 'csp_studio', label: 'Phân Bổ TKB Tự Động (CSP)', icon: Icons.Cpu, badge: 'Trụ cột 1' },
              { id: 'approvals', label: 'Duyệt Ngoại Lệ (Escalation)', icon: Icons.Shield, badge: '2 đơn', badgeType: 'warning' },
              { id: 'calendar', label: 'Khóa Lịch Chính Khóa', icon: Icons.Lock },
              { id: 'rooms', label: 'Tra Cứu Phòng Giảng Đường', icon: Icons.Building }
            ]
          }
        ];

      case 'admin':
        return [
          {
            title: '// ROOT COMMAND',
            items: [
              { id: 'dashboard', label: 'Root Control Telemetry', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// PHÂN HỆ QUẢN TRỊ',
            items: [
              { id: 'rbac', label: 'Ma Trận Quyền (RBAC)', icon: Icons.Users, badge: '6 Roles' },
              { id: 'audit_log', label: 'Audit Log (Bất biến)', icon: Icons.Audit, badge: 'SHA-256' },
              { id: 'csp_studio', label: 'Bộ Giải Thuật Toán CSP', icon: Icons.Cpu },
              { id: 'tickets_kanban', label: 'Giám Sát Ticket SLA Toàn HT', icon: Icons.Ticket }
            ]
          }
        ];

      default:
        return [];
    }
  };

  const navSections = getNavSections();

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="brand-logo">
            <div
              className="brand-icon-box"
              style={{
                background: 'linear-gradient(135deg, var(--laser-indigo) 0%, var(--laser-cyan) 100%)',
                boxShadow: '0 0 16px var(--laser-cyan-glow)'
              }}
            >
              <Icons.Building size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em', color: 'var(--ink-pure)' }}>
                  RUO
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--laser-cyan)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}
                >
                  v2.6 OS
                </span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  display: 'block',
                  color: 'var(--ink-muted)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em'
                }}
              >
                SMART CAMPUS
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="icon-btn"
          style={{
            color: 'var(--ink-secondary)',
            margin: isCollapsed ? '0 auto' : '0',
            background: 'rgba(255,255,255,0.04)'
          }}
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Items with Precision Rail Styling */}
      <nav className="sidebar-nav">
        {navSections.map((sec, idx) => (
          <div key={idx} style={{ marginBottom: '14px' }}>
            {!isCollapsed && (
              <div
                className="nav-section-title"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--ink-muted)',
                  padding: '6px 14px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                  title={item.label}
                  style={{
                    position: 'relative',
                    margin: '2px 8px',
                    width: 'calc(100% - 16px)'
                  }}
                >
                  {/* Left laser active pill indicator */}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '-8px',
                        top: '18%',
                        bottom: '18%',
                        width: '3px',
                        borderRadius: '0 4px 4px 0',
                        background: 'var(--laser-cyan)',
                        boxShadow: '0 0 10px var(--laser-cyan)'
                      }}
                    />
                  )}

                  <IconComponent
                    size={17}
                    color={isActive ? 'var(--laser-cyan)' : 'var(--ink-secondary)'}
                  />

                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: isActive ? 600 : 400 }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              item.badgeType === 'danger'
                                ? 'rgba(244,63,94,0.15)'
                                : item.badgeType === 'warning'
                                ? 'rgba(245,158,11,0.15)'
                                : 'rgba(99,102,241,0.15)',
                            color:
                              item.badgeType === 'danger'
                                ? 'var(--laser-crimson)'
                                : item.badgeType === 'warning'
                                ? 'var(--laser-amber)'
                                : 'var(--laser-indigo)',
                            border: `1px solid ${
                              item.badgeType === 'danger'
                                ? 'rgba(244,63,94,0.3)'
                                : item.badgeType === 'warning'
                                ? 'rgba(245,158,11,0.3)'
                                : 'rgba(99,102,241,0.3)'
                            }`
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Futuristic Telemetry Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '11px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: 'var(--ink-pure)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--laser-emerald)',
                    boxShadow: '0 0 6px var(--laser-emerald)'
                  }}
                />
                <span>RUO KERNEL</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--laser-emerald)', fontFamily: 'var(--font-mono)' }}>
                ONLINE
              </span>
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
              95 USE CASES • 5 TRỤ CỘT • 7 ACTORS
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
