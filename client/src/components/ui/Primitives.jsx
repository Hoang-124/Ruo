import React, { useState, useMemo } from 'react';
import { Icons } from '../common/SvgIcons';

/**
 * 1. Button Primitive
 */
export const Button = ({
  children,
  variant = 'primary', // primary | secondary | ghost | danger | outline
  size = 'md', // sm | md | lg
  icon: IconComponent,
  iconRight: IconRightComponent,
  loading = false,
  disabled = false,
  className = '',
  id,
  type = 'button',
  onClick,
  style,
  ...props
}) => {
  const baseClasses = 'ruo-btn';
  const variantClass = `ruo-btn-${variant}`;
  const sizeClass = `ruo-btn-${size}`;

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : IconComponent ? (
        <IconComponent size={size === 'sm' ? 13 : 15} />
      ) : null}
      {children && <span>{children}</span>}
      {IconRightComponent && !loading && <IconRightComponent size={size === 'sm' ? 13 : 15} />}
    </button>
  );
};

/**
 * 2. Badge & StatusBadge Primitives
 */
export const Badge = ({ children, variant = 'neutral', size = 'md', className = '', style }) => {
  return (
    <span className={`ruo-badge ruo-badge-${variant} ruo-badge-${size} ${className}`} style={style}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, label: customLabel }) => {
  const map = {
    active: { label: 'Đang hoạt động', variant: 'active', dot: '#2FB37A' },
    available: { label: 'Sẵn sàng cấp phát', variant: 'active', dot: '#2FB37A' },
    repairing: { label: 'Đang sửa chữa', variant: 'repairing', dot: '#E5A33B' },
    transferring: { label: 'Đang điều chuyển', variant: 'transferring', dot: '#3E7BFA' },
    pending_disposal: { label: 'Chờ thanh lý (R≥60%)', variant: 'disposal', dot: '#E07A3E' },
    disposed: { label: 'Đã thanh lý', variant: 'disposed', dot: '#71717A' },
    lost: { label: 'Thất thoát / Mất', variant: 'disposed', dot: '#71717A' },
    // Transfer statuses
    pending: { label: 'Chờ Quản lý duyệt', variant: 'repairing', dot: '#E5A33B' },
    approved: { label: 'Đã duyệt (Chờ bàn giao)', variant: 'transferring', dot: '#3E7BFA' },
    completed: { label: 'Đã hoàn tất', variant: 'active', dot: '#2FB37A' },
    rejected: { label: 'Đã từ chối', variant: 'danger', dot: '#E5484D' },
    // SLA statuses
    on_track: { label: 'Đúng hạn SLA', variant: 'active', dot: '#2FB37A' },
    at_risk: { label: 'Nguy cơ quá hạn', variant: 'repairing', dot: '#E5A33B' },
    overdue: { label: 'Quá hạn SLA', variant: 'danger', dot: '#E5484D' },
    // Repair & Ticket statuses
    reported: { label: 'Chờ tiếp nhận', variant: 'repairing', dot: '#EF4444' },
    assigned: { label: 'Đã giao KTV', variant: 'transferring', dot: '#0EA5E9' },
    in_progress: { label: 'Đang sửa chữa', variant: 'repairing', dot: '#F59E0B' },
    repaired: { label: 'Đã sửa xong (Chờ nghiệm thu)', variant: 'active', dot: '#10B981' },
    closed: { label: 'Đã hoàn tất', variant: 'active', dot: '#2FB37A' }
  };

  const meta = map[status] || { label: status || 'Chưa rõ', variant: 'neutral', dot: '#A1A1AA' };
  const text = customLabel || meta.label;

  return (
    <span className={`ruo-status-badge ruo-status-${meta.variant}`}>
      <span className="ruo-status-dot" style={{ backgroundColor: meta.dot }} />
      <span>{text}</span>
    </span>
  );
};

/**
 * 3. Card Primitive
 */
export const Card = ({ children, title, subtitle, action, className = '', style, onClick, id }) => {
  return (
    <div id={id} className={`ruo-card ${className}`} style={style} onClick={onClick}>
      {(title || action) && (
        <div className="ruo-card-header">
          <div>
            {title && <h3 className="ruo-card-title">{title}</h3>}
            {subtitle && <p className="ruo-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="ruo-card-action">{action}</div>}
        </div>
      )}
      <div className="ruo-card-body">{children}</div>
    </div>
  );
};

/**
 * 4. KPI Summary Card
 */
export const KPI = ({ label, value, subtext, trend, icon: IconComponent, color = 'var(--blueprint-500)', onClick }) => {
  return (
    <div className="ruo-kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="ruo-kpi-top">
        <span className="ruo-kpi-label">{label}</span>
        {IconComponent && (
          <div className="ruo-kpi-icon" style={{ color }}>
            <IconComponent size={18} />
          </div>
        )}
      </div>
      <div className="ruo-kpi-value">{value}</div>
      {(subtext || trend) && (
        <div className="ruo-kpi-footer">
          {trend && (
            <span className={`ruo-kpi-trend ${trend.positive ? 'positive' : 'negative'}`}>
              {trend.positive ? '+' : ''}{trend.value}
            </span>
          )}
          {subtext && <span className="ruo-kpi-subtext">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

/**
 * 5. DataTable Primitive
 */
export const DataTable = ({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'Không có bản ghi dữ liệu.',
  onRowClick,
  id
}) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortDir === 'asc' ? res : -res;
    });
  }, [data, sortCol, sortDir]);

  return (
    <div id={id} className="ruo-table-wrapper">
      <table className="ruo-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{
                  width: col.width,
                  cursor: col.sortable ? 'pointer' : 'default',
                  textAlign: col.align || 'left'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>{col.title}</span>
                  {col.sortable && sortCol === col.key && (
                    <span style={{ fontSize: '10px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Đang tải dữ liệu...</span>
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>
                <EmptyState message={emptyMessage} compact />
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={row._id || row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row[col.key], row, idx) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 6. Slide-Over Detail Drawer
 */
export const Drawer = ({ isOpen, onClose, title, subtitle, children, width = '520px' }) => {
  if (!isOpen) return null;

  return (
    <div className="ruo-drawer-backdrop" onClick={onClose}>
      <div
        className="ruo-drawer-panel"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ruo-drawer-header">
          <div>
            <h2 className="ruo-drawer-title">{title}</h2>
            {subtitle && <p className="ruo-drawer-subtitle">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng ngăn chi tiết">
            <Icons.X size={18} />
          </button>
        </div>
        <div className="ruo-drawer-body">{children}</div>
      </div>
    </div>
  );
};

/**
 * 7. Empty State with subtle SVG illustration
 */
export const EmptyState = ({
  title = 'Chưa có dữ liệu',
  message = 'Danh sách hiện tại đang trống hoặc không có bản ghi phù hợp bộ lọc.',
  action,
  compact = false
}) => {
  return (
    <div className={`ruo-empty-state ${compact ? 'compact' : ''}`}>
      <div className="ruo-empty-icon">
        <svg width={compact ? 36 : 48} height={compact ? 36 : 48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <h4 className="ruo-empty-title">{title}</h4>
      <p className="ruo-empty-desc">{message}</p>
      {action && <div className="ruo-empty-action">{action}</div>}
    </div>
  );
};

/**
 * 8. Skeleton Loading Primitive
 */
export const Skeleton = ({ width = '100%', height = '16px', borderRadius = 'var(--radius-xs)', style }) => {
  return (
    <div
      className="ruo-skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
};
