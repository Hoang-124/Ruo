import React from 'react';
import { Icons } from '../common/SvgIcons';

export const FloatingPillarDock = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Bản Đồ Không Gian', short: 'Spatial Twin', icon: Icons.Building, color: 'var(--laser-cyan)' },
    { id: 'rooms', label: 'Phòng Học', short: 'Phòng', icon: Icons.Room, color: 'var(--laser-cyan)' },
    { id: 'calendar', label: 'Lịch Tuần', short: 'Lịch Biểu', icon: Icons.Calendar, color: 'var(--laser-cyan)' },
    { id: 'approvals', label: 'Duyệt Yêu Cầu', short: 'Duyệt Đơn', icon: Icons.CheckCircle, color: 'var(--laser-emerald)' },
    { id: 'tickets_kanban', label: 'Kanban SLA', short: 'SLA Engine', icon: Icons.Wrench, color: 'var(--laser-crimson)' },
    { id: 'csp_studio', label: 'Phân Bổ CSP', short: 'CSP Solver', icon: Icons.Cpu, color: 'var(--laser-indigo)' },
    { id: 'equipments', label: 'Kho Thiết Bị', short: 'Thiết Bị', icon: Icons.Equipment, color: 'var(--laser-amber)' },
    { id: 'disposal_calc', label: 'Thanh Lý R ≥ 60%', short: 'Thanh Lý', icon: Icons.Sliders, color: 'var(--laser-amber)' },
    { id: 'rbac', label: 'Ma Trận Quyền', short: 'RBAC', icon: Icons.Users, color: 'var(--laser-violet)' },
    { id: 'audit_log', label: 'Audit Log', short: 'Audit', icon: Icons.Audit, color: 'var(--laser-emerald)' }
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>
              {t.short}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
