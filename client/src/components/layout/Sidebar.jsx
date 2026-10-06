import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const Sidebar = ({ activeTab, onSelectTab }) => {
  const { currentRoleKey } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Menu mapping per role strictly matching 3 Domain Actors of Facility Management
  const getNavSections = () => {
    switch (currentRoleKey) {
      case 'lecturer':
        return [
          {
            title: '// ĐIỀU HÀNH',
            items: [
              { id: 'dashboard', label: 'Bàn Điều Hành Giảng Dạy', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// THIẾT BỊ & PHÒNG HỌC',
            items: [
              { id: 'equipments', label: 'Tra Cứu Thiết Bị Phòng Học', icon: Icons.Equipment }
            ]
          },
          {
            title: '// SỰ CỐ & SỬA CHỮA',
            items: [
              { id: 'tickets_kanban', label: 'Báo Hỏng & Theo Dõi SLA', icon: Icons.Wrench }
            ]
          }
        ];

      case 'maintenance_staff':
      case 'facility_staff':
      case 'maintenance':
        return [
          {
            title: '// COMMAND CENTER',
            items: [
              { id: 'dashboard', label: 'Trung Tâm Chỉ Huy CSVC', icon: Icons.Dashboard }
            ]
          },
          {
            title: '// QUẢN LÝ VẬN HÀNH CSVC',
            items: [
              { id: 'equipments', label: 'Kho Thiết Bị & Nhãn QR', icon: Icons.Equipment },
              { id: 'transfers', label: 'Điều Chuyển Trang Thiết Bị', icon: Icons.RefreshCw },
              { id: 'tickets_kanban', label: 'Sửa Chữa & Tiếp Nhận SLA', icon: Icons.Wrench, badge: 'SLA Active', badgeType: 'danger' },
              { id: 'maintenance', label: 'Kế Hoạch Bảo Trì Định Kỳ', icon: Icons.Calendar },
              { id: 'inventory', label: 'Kiểm Kê Kho Thực Địa', icon: Icons.CheckCircle },
              { id: 'disposal_calc', label: 'Đề Xuất Thanh Lý (R ≥ 60%)', icon: Icons.Sliders }
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
            title: '// ĐIỀU HÀNH TÀI SẢN CSVC',
            items: [
              { id: 'equipments', label: 'Kho Thiết Bị & Nhãn QR', icon: Icons.Equipment },
              { id: 'transfers', label: 'Giám Sát Điều Chuyển', icon: Icons.RefreshCw },
              { id: 'tickets_kanban', label: 'Giám Sát Sửa Chữa Toàn HT', icon: Icons.Wrench },
              { id: 'maintenance', label: 'Kế Hoạch Bảo Trì Định Kỳ', icon: Icons.Calendar },
              { id: 'inventory', label: 'Kiểm Kê & Đối Soát QR', icon: Icons.CheckCircle },
              { id: 'disposal_calc', label: 'Phê Duyệt Thanh Lý (R ≥ 60%)', icon: Icons.Sliders }
            ]
          },
          {
            title: '// BẢO MẬT & QUẢN TRỊ',
            items: [
              { id: 'rbac', label: 'Ma Trận Quyền (RBAC)', icon: Icons.Users, badge: '3 Actors' },
              { id: 'audit_log', label: 'Nhật Ký Audit (Bất biến)', icon: Icons.Audit, badge: 'SHA-256' }
            ]
          }
        ];

      default:
        return [
          {
            title: '// ĐIỀU HÀNH CSVC',
            items: [
              { id: 'dashboard', label: 'Trung Tâm Chỉ Huy CSVC', icon: Icons.Dashboard },
              { id: 'equipments', label: 'Kho Thiết Bị & Tài Sản', icon: Icons.Equipment },
              { id: 'tickets_kanban', label: 'Sự Cố & Sửa Chữa (SLA)', icon: Icons.Wrench }
            ]
          }
        ];
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
                    fontFamily: 'var(--font-sans)',
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
                  fontFamily: 'var(--font-sans)',
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
                  fontFamily: 'var(--font-sans)',
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
                            fontFamily: 'var(--font-sans)',
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
              <span style={{ fontSize: '10px', color: 'var(--laser-emerald)', fontFamily: 'var(--font-sans)' }}>
                ONLINE
              </span>
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '10px', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
              95 USE CASES • 5 TRỤ CỘT • 7 ACTORS
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
