import React from 'react';

/**
 * Bespoke Architectural Logo for RUO (University Facilities Management)
 * Handcrafted Pure SVG — Non-AI, high-precision geometry combining:
 * 1. Letter "R" monogram
 * 2. Architectural structural colonnade / gateway (Cổng trường đại học)
 * 3. Floor plan golden-ratio isometric perspective
 */
export const RuoLogo = ({ size = 44, showText = true, subtitle = 'CỔNG QUẢN LÝ CSVC ĐẠI HỌC', className = '' }) => {
  return (
    <div className={`ruo-brand-composite ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
      {/* Handcrafted Architectural Emblem SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Main University Royal Blue Gradient */}
          <linearGradient id="ruoPillarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Architectural Arch Gradient */}
          <linearGradient id="ruoArchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>

          {/* Cantilever Dynamic Kickstand Gradient (The leg of the 'R') */}
          <linearGradient id="ruoKickGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Golden Ambient Accent */}
          <linearGradient id="ruoGoldAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>

          {/* Subtle Outer Drop Shadow */}
          <filter id="ruoShadow" x="-10%" y="-10%" width="125%" height="125%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1E3A8A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Architectural Foundation Framing */}
        <rect
          x="3"
          y="3"
          width="50"
          height="50"
          rx="14"
          fill="url(#ruoPillarGrad)"
          filter="url(#ruoShadow)"
        />

        {/* Structural Cad Grid Lines in Background of Icon */}
        <path
          d="M10 28H46M28 10V46M19 10V46M37 10V46"
          stroke="#FFFFFF"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* THE "R" MONOGRAM ARCHITECTURAL COLONNADE */}
        {/* 1. Left Vertical Load-Bearing Pillar (Trụ kết cấu chính) */}
        <path
          d="M15 15C15 13.8954 15.8954 13 17 13H21C22.1046 13 23 13.8954 23 15V41C23 42.1046 22.1046 43 21 43H17C15.8954 43 15 42.1046 15 41V15Z"
          fill="#FFFFFF"
        />

        {/* 2. Top Arch & Upper Bowl of "R" (Mái vòm kiến trúc) */}
        <path
          d="M23 13H33C37.4183 13 41 16.5817 41 21C41 25.4183 37.4183 29 33 29H23V21H32.5C33.8807 21 35 19.8807 35 18.5C35 17.1193 33.8807 16 32.5 16H23V13Z"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />

        {/* 3. Cantilever Diagonal Strut (Chân giằng chéo chịu lực hoàn thiện chữ R) */}
        <path
          d="M27.5 26.5L38.2 41.2C38.8 42.1 38.1 43 37 43H31.5C30.6 43 29.8 42.5 29.3 41.8L22 31.5V26.5H27.5Z"
          fill="url(#ruoGoldAccent)"
        />

        {/* 4. Golden Ratio Spatial Portal Node (Tâm điểm giao thoa số hóa) */}
        <circle cx="33" cy="21" r="2.8" fill="url(#ruoGoldAccent)" />

        {/* 5. Modern Corner Chamfer Accent (Góc định vị CAD) */}
        <path
          d="M45 11L45 17M45 11L39 11"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Brand Identity Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--ink-pure)',
                fontFamily: 'var(--font-sans)'
              }}
            >
              RUO
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                border: '1px solid rgba(37, 99, 235, 0.28)',
                letterSpacing: '0.04em'
              }}
            >
              UFMS V2.6
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--ink-muted)',
              letterSpacing: '0.03em',
              marginTop: '3px'
            }}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
