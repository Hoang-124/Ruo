import React from 'react';

export const StatCard = ({ title, value, icon: IconComponent, badge, badgeType = 'neutral', subtitle, color = 'var(--color-primary-600)' }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrapper" style={{ background: `${color}15`, color: color }}>
        {IconComponent && <IconComponent size={24} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div className="stat-metric-value">{value}</div>
          {badge && <span className={`badge badge-${badgeType}`}>{badge}</span>}
        </div>
        <div className="stat-metric-label">{title}</div>
        {subtitle && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
