import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const RoleSwitcherBar = () => {
  const { currentRoleKey, switchRole } = useAuth();

  const rolePills = [
    { key: 'student', label: 'Sinh viên', short: 'SV', icon: Icons.User, color: 'var(--laser-cyan)' },
    { key: 'lecturer', label: 'Giảng viên', short: 'GV', icon: Icons.AcademicCap, color: 'var(--laser-indigo)' },
    { key: 'facility_staff', label: 'QL Cơ Sở Vật Chất', short: 'QL-CSVC', icon: Icons.Building, color: 'var(--laser-violet)' },
    { key: 'maintenance', label: 'Kỹ thuật Bảo trì', short: 'KỸ THUẬT', icon: Icons.Wrench, color: 'var(--laser-amber)' },
    { key: 'academic_affairs', label: 'Phòng Đào tạo', short: 'ĐÀO TẠO', icon: Icons.Calendar, color: 'var(--laser-emerald)' },
    { key: 'admin', label: 'Quản trị hệ thống', short: 'ADMIN', icon: Icons.Shield, color: 'var(--laser-crimson)' }
  ];

  return (
    <div className="hud-telemetry-strip">
      <div className="hud-telemetry-left">
        <span className="telemetry-live-dot" />
        <span className="telemetry-tag">CAMPUS OPS OS</span>
        <span className="telemetry-divider">|</span>
        <span className="telemetry-stat">
          <strong style={{ color: 'var(--laser-cyan)' }}>84/108</strong> PHÒNG HOẠT ĐỘNG
        </span>
        <span className="telemetry-divider">•</span>
        <span className="telemetry-stat">
          SLA DOANH NGHIỆP: <strong style={{ color: 'var(--laser-emerald)' }}>98.4%</strong>
        </span>
        <span className="telemetry-divider">•</span>
        <span className="telemetry-stat">
          CSP ENGINE: <strong style={{ color: 'var(--laser-indigo)' }}>SẴN SÀNG</strong>
        </span>
      </div>

      <div className="role-dock-capsule">
        <span className="role-dock-label">
          <Icons.Sparkles size={12} color="var(--laser-cyan)" />
          <span>SIMULATOR:</span>
        </span>
        {rolePills.map((pill) => {
          const IconComp = pill.icon;
          const isActive = currentRoleKey === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => switchRole(pill.key)}
              className={`role-pill-btn ${isActive ? 'active' : ''}`}
              title={`Chuyển góc nhìn: ${pill.label}`}
              style={{
                borderColor: isActive ? pill.color : 'transparent',
                boxShadow: isActive ? `0 0 12px ${pill.color}40` : 'none'
              }}
            >
              <IconComp size={13} color={isActive ? pill.color : 'var(--ink-secondary)'} />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
