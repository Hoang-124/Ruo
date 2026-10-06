import React from 'react';
import { Icons } from '../common/SvgIcons';

export const FloatingPillarDock = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Bản Đồ Không Gian', short: 'Mặt Bằng CAD', icon: Icons.Building, color: 'var(--laser-cyan)' },
    { id: 'equipments', label: 'Kho Thiết Bị & QR', short: 'Thiết Bị', icon: Icons.Equipment, color: 'var(--laser-amber)' },
    { id: 'transfers', label: 'Điều Chuyển', short: 'Điều Chuyển', icon: Icons.RefreshCw, color: 'var(--laser-indigo)' },
    { id: 'tickets_kanban', label: 'Kanban SLA Sửa Chữa', short: 'Sửa Chữa', icon: Icons.Wrench, color: 'var(--laser-crimson)' },
    { id: 'maintenance', label: 'Bảo Trì Định Kỳ', short: 'Bảo Trì', icon: Icons.Calendar, color: 'var(--laser-emerald)' },
    { id: 'inventory', label: 'Kiểm Kê Kho QR', short: 'Kiểm Kê', icon: Icons.CheckCircle, color: 'var(--laser-cyan)' },
    { id: 'disposal_calc', label: 'Thanh Lý R ≥ 60%', short: 'Thanh Lý', icon: Icons.Sliders, color: 'var(--laser-amber)' },
    { id: 'rbac', label: 'Ma Trận Quyền', short: 'RBAC', icon: Icons.Users, color: 'var(--laser-violet)' },
    { id: 'audit_log', label: 'Audit Log SHA-256', short: 'Audit', icon: Icons.Audit, color: 'var(--laser-emerald)' }
  ];

  return (
    <nav className="floating-pillar-dock" title="Thanh điều hướng nhanh các phân hệ nghiệp vụ">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        const IconComp = t.icon;
        return (
          <button
            key={t.id}
            className={`pillar-pill-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(t.id)}
            style={{
              color: isActive ? t.color : 'var(--ink-secondary)',
              borderColor: isActive ? t.color : 'transparent',
              background: isActive ? `${t.color}18` : 'transparent',
              boxShadow: isActive ? `0 0 12px ${t.color}30` : 'none',
              padding: '6px 12px'
            }}
            title={t.label}
          >
            <IconComp size={14} color={isActive ? t.color : 'var(--ink-muted)'} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>
              {t.short}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
