import React, { useState, useEffect } from 'react';

/**
 * 100% Native Inline SVG Icons for SLA Countdown
 * Strictly conforms to project rule: ZERO external icon libraries.
 */
const SvgIcons = {
  Clock: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  AlertTriangle: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  AlertCircle: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  CheckCircle: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
};

/**
 * Format milliseconds into human readable countdown string
 */
function formatTimeRemaining(diffMs) {
  const isNegative = diffMs < 0;
  const absMs = Math.abs(diffMs);
  
  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) {
    return {
      text: `${isNegative ? '-' : ''}${days}d ${pad(hours)}h ${pad(minutes)}m`,
      detailed: `${isNegative ? 'Quá hạn ' : 'Còn '}${days} ngày ${hours} giờ ${minutes} phút`,
      isNegative,
      days,
      hours,
      minutes,
      seconds
    };
  }

  return {
    text: `${isNegative ? '-' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    detailed: `${isNegative ? 'Quá hạn ' : 'Còn '}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    isNegative,
    days,
    hours,
    minutes,
    seconds
  };
}

/**
 * DeadlineCountdown Component (UC-7.1)
 * Real-time live ticking SLA countdown with color states and micro-animations.
 * 
 * Props:
 * - deadline: ISO date string or Date object
 * - status: Ticket status ('reported', 'assigned', 'in_progress', 'resolved', 'closed', 'unrepairable')
 * - compact: boolean (render as inline badge or full card block)
 */
export const DeadlineCountdown = ({ deadline, status = 'assigned', compact = false }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Only tick if ticket is active (not resolved/closed/unrepairable)
    const isCompleted = ['resolved', 'closed', 'unrepairable'].includes(status);
    if (!deadline || isCompleted) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, status]);

  if (!deadline) {
    return (
      <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
        Chưa gán deadline SLA
      </span>
    );
  }

  const deadlineTime = new Date(deadline).getTime();
  const diffMs = deadlineTime - now;
  const isCompleted = ['resolved', 'closed', 'unrepairable'].includes(status);
  const formatted = formatTimeRemaining(diffMs);

  // SLA State Evaluation
  let slaState = 'ON_TRACK';
  let theme = {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    color: '#10B981',
    pulse: false,
    label: 'Đúng hạn SLA',
    Icon: SvgIcons.Clock
  };

  if (isCompleted) {
    slaState = 'COMPLETED';
    theme = {
      bg: 'rgba(100, 116, 139, 0.12)',
      border: 'rgba(100, 116, 139, 0.3)',
      color: 'var(--ink-secondary)',
      pulse: false,
      label: 'Đã hoàn tất',
      Icon: SvgIcons.CheckCircle
    };
  } else if (diffMs <= 0) {
    slaState = 'OVERDUE';
    theme = {
      bg: 'rgba(239, 68, 68, 0.16)',
      border: 'rgba(239, 68, 68, 0.5)',
      color: '#EF4444',
      pulse: true,
      label: 'Quá hạn SLA',
      Icon: SvgIcons.AlertTriangle
    };
  } else if (diffMs <= 2 * 3600 * 1000) { // under 2 hours
    slaState = 'AT_RISK';
    theme = {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.45)',
      color: '#F59E0B',
      pulse: true,
      label: 'Sắp hết hạn SLA',
      Icon: SvgIcons.AlertCircle
    };
  }

  const deadlineFormatted = new Date(deadline).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (compact) {
    return (
      <div
        title={`Hạn chót SLA: ${deadlineFormatted} (${theme.label})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          color: theme.color,
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.02em',
          transition: 'all 0.2s ease',
          boxShadow: theme.pulse ? `0 0 8px ${theme.border}` : 'none'
        }}
      >
        <theme.Icon size={12} color={theme.color} />
        <span>{isCompleted ? 'Hoàn tất' : formatted.text}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 'var(--radius-md, 8px)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: theme.pulse ? `0 0 12px ${theme.border}` : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--surface-card, #1A1D24)',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <theme.Icon size={16} color={theme.color} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: theme.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {theme.label}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted, #94A3B8)' }}>
            Hạn SLA: <strong style={{ color: 'var(--ink-pure, #F8FAFC)' }}>{deadlineFormatted}</strong>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '16px',
            fontWeight: 800,
            color: theme.color,
            letterSpacing: '0.04em'
          }}
        >
          {isCompleted ? '✓ ĐÃ XONG' : formatted.text}
        </div>
        <div style={{ fontSize: '10.5px', color: 'var(--ink-muted, #94A3B8)' }}>
          {isCompleted ? 'Nhiệm vụ đã đóng' : formatted.detailed}
        </div>
      </div>
    </div>
  );
};

export default DeadlineCountdown;
