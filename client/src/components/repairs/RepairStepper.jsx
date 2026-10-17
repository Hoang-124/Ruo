import React from 'react';

/**
 * UC-5.7: RepairStepper Component
 * Visual repair stage tracker: Báo hỏng → Giao việc → Đang sửa → Nghiệm thu
 * Strict 100% Native Inline SVG - Zero external icon library dependencies
 */
export const RepairStepper = ({ status, outcome, logs = [], deadline }) => {
  const steps = [
    { key: 'reported', label: 'Báo Hỏng', sublabel: 'Tiếp nhận sự cố', num: 1 },
    { key: 'assigned', label: 'Giao Việc', sublabel: 'Phân công KTV', num: 2 },
    { key: 'in_progress', label: 'Đang Sửa', sublabel: 'Xử lý kỹ thuật', num: 3 },
    { key: 'resolved', label: 'Nghiệm Thu', sublabel: 'Hoàn tất bàn giao', num: 4 }
  ];

  // Map status to active index (0 to 3)
  const getStepIndex = (st) => {
    switch (st) {
      case 'reported': return 0;
      case 'assigned': return 1;
      case 'in_progress': return 2;
      case 'resolved':
      case 'closed': return 3;
      case 'unrepairable': return 2; // Failed at in_progress stage
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const isUnrepairable = status === 'unrepairable' || outcome === 'unrepairable';
  const isClosed = status === 'closed';

  return (
    <div style={{
      background: 'var(--surface-panel)',
      border: '1px solid var(--hairline-medium)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Laser accent line on top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: isUnrepairable
          ? 'linear-gradient(90deg, #EF4444, #F87171)'
          : isClosed
            ? 'linear-gradient(90deg, #10B981, #06B6D4)'
            : 'linear-gradient(90deg, #06B6D4, #3B82F6)'
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--laser-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-primary)' }}>
            Tiến Độ Khắc Phục Sự Cố (UC-5.7)
          </span>
        </div>

        {isUnrepairable ? (
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'rgba(239,68,68,0.15)',
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Không Thể Sửa Chữa (Đề xuất thanh lý)
          </span>
        ) : isClosed ? (
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'rgba(16,185,129,0.15)',
            color: '#10B981',
            border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã Nghiệm Thu & Đóng Phiếu
          </span>
        ) : (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--laser-cyan)'
          }}>
            Chặng {currentIndex + 1} / 4: {steps[currentIndex]?.label}
          </span>
        )}
      </div>

      {/* Stepper track */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        position: 'relative'
      }}>
        {steps.map((st, idx) => {
          const isPassed = idx < currentIndex || (idx === 3 && (status === 'resolved' || status === 'closed'));
          const isCurrent = idx === currentIndex && !(idx === 3 && isClosed);
          const isFailed = idx === 2 && isUnrepairable;

          let badgeBg = 'var(--surface-card)';
          let badgeColor = 'var(--ink-muted)';
          let borderColor = 'var(--hairline-medium)';
          let textColor = 'var(--ink-secondary)';

          if (isFailed) {
            badgeBg = 'rgba(239,68,68,0.2)';
            badgeColor = '#EF4444';
            borderColor = '#EF4444';
            textColor = '#EF4444';
          } else if (isPassed) {
            badgeBg = 'rgba(16,185,129,0.2)';
            badgeColor = '#10B981';
            borderColor = '#10B981';
            textColor = '#10B981';
          } else if (isCurrent) {
            badgeBg = 'rgba(6,182,212,0.2)';
            badgeColor = 'var(--laser-cyan)';
            borderColor = 'var(--laser-cyan)';
            textColor = 'var(--ink-primary)';
          }

          return (
            <div key={st.key} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative'
            }}>
              {/* Connector line between steps */}
              {idx > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '50%',
                  width: '100%',
                  height: '2px',
                  background: idx <= currentIndex ? 'var(--laser-cyan)' : 'var(--hairline-medium)',
                  zIndex: 0
                }} />
              )}

              {/* Step circle */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: badgeBg,
                border: `2px solid ${borderColor}`,
                color: badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
                zIndex: 1,
                marginBottom: '8px',
                boxShadow: isCurrent ? '0 0 10px rgba(6,182,212,0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}>
                {isPassed ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isFailed ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  st.num
                )}
              </div>

              {/* Step Labels */}
              <div style={{ fontSize: '12px', fontWeight: isCurrent ? 800 : 700, color: textColor }}>
                {st.label}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                {st.sublabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RepairStepper;
