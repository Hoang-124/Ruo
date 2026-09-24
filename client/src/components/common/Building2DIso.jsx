import React, { useState } from 'react';

/**
 * Building2DIso
 * Pure 2D Isometric Architectural Vector Elevation of Tòa Nhà A1
 * Replaces the heavy WebGL 3D canvas with a crisp, human-crafted 2D architectural diagram.
 * 100% Native SVG — zero canvas lag, responsive, interactive floor hovering.
 *
 * Fixes:
 * - Resolved text overflow in callout cards: widened card to 186px, calibrated concise typography.
 * - Line 2 streamlined to "{avail}/{total} Phòng Trống" for crisp, uncluttered layout.
 * - Adjusted SVG viewBox and horizontal positioning to give ample right-hand margin.
 * - Preserved scaled up geometry and butter-smooth CSS cubic-bezier hover transitions.
 */
export const Building2DIso = ({ activeFloor = null, onSelectFloor }) => {
  const [hoveredFloor, setHoveredFloor] = useState(null);

  const FLOORS = [
    {
      level: 5,
      name: 'TẦNG 5',
      title: 'Viện Nghiên Cứu',
      avail: 17,
      total: 21,
      accent: '#8B5CF6'
    },
    {
      level: 4,
      name: 'TẦNG 4',
      title: 'Lab Máy Tính & AI',
      avail: 16,
      total: 21,
      accent: '#3B82F6'
    },
    {
      level: 3,
      name: 'TẦNG 3',
      title: 'Giảng Đường Đa Năng',
      avail: 19,
      total: 22,
      accent: '#0EA5E9'
    },
    {
      level: 2,
      name: 'TẦNG 2',
      title: 'Phòng Giảng Chuyên Đề',
      avail: 15,
      total: 22,
      accent: '#10B981'
    },
    {
      level: 1,
      name: 'TẦNG 1',
      title: 'Sảnh Chính & Ban CSVC',
      avail: 17,
      total: 22,
      accent: '#F59E0B'
    }
  ];

  // Active item is strictly the hovered floor, or an explicitly selected floor (if any).
  // When activeFloor is null and hoveredFloor is null, activeItem is null (no floor is lit up).
  const activeItem = hoveredFloor || (activeFloor ? FLOORS.find((f) => f.level === activeFloor) : null);

  // Central isometric vertex and dimensions (scaled up)
  const cx = 214;
  const h = 50; // Floor height
  const stepY = 56; // Vertical offset per tier
  const dxLeft = 150;
  const dyLeft = 44;
  const dxRight = 130;
  const dyRight = 38;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* Main Isometric 2D SVG Architectural Drawing */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg
          viewBox="20 8 554 414"
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '520px',
            minHeight: '360px',
            overflow: 'visible',
            userSelect: 'none'
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Inline CSS for silky smooth hardware-accelerated transitions */}
            <style>{`
              .iso-floor-tier {
                cursor: pointer;
                transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), filter 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
              }
              .iso-surface {
                transition: stroke 0.25s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.25s ease;
              }
              .iso-glow-overlay {
                transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: none;
              }
              .iso-wire {
                transition: stroke 0.25s ease, stroke-width 0.25s ease;
              }
              .iso-badge-rect {
                transition: fill 0.25s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.25s ease, filter 0.25s ease;
              }
              .iso-badge-txt {
                transition: fill 0.25s ease;
              }
              .iso-tag-box {
                transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.25s ease;
              }
              .iso-tag-rect {
                transition: fill 0.25s ease, stroke 0.25s ease, stroke-width 0.25s ease, filter 0.25s ease;
              }
              .iso-tag-txt {
                transition: fill 0.25s ease;
              }
              .iso-leader-line {
                transition: stroke 0.25s ease, stroke-width 0.25s ease;
              }
              .iso-leader-dot {
                transition: fill 0.25s ease, r 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
              }
            `}</style>

            {/* Ground Grid Pattern */}
            <pattern id="isoGroundGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.8" />
            </pattern>

            {/* Shading Gradients for Facades */}
            <linearGradient id="isoFrontLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.14" />
            </linearGradient>

            <linearGradient id="isoSideShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.26" />
            </linearGradient>

            <linearGradient id="isoTopSlab" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Background Technical Blueprint Grid */}
          <rect x="25" y="5" width="545" height="420" fill="url(#isoGroundGrid)" rx="16" />

          {/* ==============================================================
              5 ISOMETRIC TIERS (FLOORS 1 TO 5, DRAWN FROM BOTTOM TO TOP)
              ============================================================== */}
          {FLOORS.slice().reverse().map((floor) => {
            const floorIdx = floor.level; // 1 to 5
            const baseY = 388 - (floorIdx - 1) * stepY;
            const isHovered = activeItem ? activeItem.level === floor.level : false;
            const highlightColor = floor.accent;

            // Geometry Coordinates
            const cy = baseY;
            const pCenterBottom = `${cx},${cy}`;
            const pLeftBottom = `${cx - dxLeft},${cy - dyLeft}`;
            const pRightBottom = `${cx + dxRight},${cy - dyRight}`;

            const pCenterTop = `${cx},${cy - h}`;
            const pLeftTop = `${cx - dxLeft},${cy - h - dyLeft}`;
            const pRightTop = `${cx + dxRight},${cy - h - dyRight}`;
            const pBackTop = `${cx - dxLeft + dxRight},${cy - h - dyLeft - dyRight}`;

            // Leader line anchor point (on right facade)
            const tagAnchorX = cx + dxRight;
            const tagAnchorY = cy - h / 2 - dyRight;

            return (
              <g
                key={`floor-${floor.level}`}
                className="iso-floor-tier"
                onClick={() => onSelectFloor && onSelectFloor(floor.level)}
                onMouseEnter={() => setHoveredFloor(floor)}
                onMouseLeave={() => setHoveredFloor(null)}
                style={{
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0px)',
                  filter: isHovered
                    ? `drop-shadow(0 12px 20px ${highlightColor}40)`
                    : 'none'
                }}
              >
                {/* 1. LEFT FACADE (MẶT TRƯỚC BÊN TRÁI) */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterBottom} ${pLeftBottom} ${pLeftTop} ${pCenterTop}`}
                  fill="url(#isoFrontLight)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                />

                {/* Left Facade Highlight Glow Overlay (Smooth Opacity Fade) */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterBottom} ${pLeftBottom} ${pLeftTop} ${pCenterTop}`}
                  fill={highlightColor}
                  fillOpacity="0.28"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* Left Facade Columns & Structural Mullions (4 Bays) */}
                {[1, 2, 3].map((bay) => {
                  const xB = cx - bay * (dxLeft / 4);
                  const yB = cy - bay * (dyLeft / 4);
                  return (
                    <line
                      key={`l-col-${bay}`}
                      className="iso-wire"
                      x1={xB}
                      y1={yB}
                      x2={xB}
                      y2={yB - h}
                      stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                      strokeWidth={isHovered ? '1.2' : '1'}
                    />
                  );
                })}

                {/* Left Facade Horizontal Window Ribbon */}
                <line
                  className="iso-wire"
                  x1={cx}
                  y1={cy - h * 0.52}
                  x2={cx - dxLeft}
                  y2={cy - h * 0.52 - dyLeft}
                  stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                  strokeWidth="0.9"
                  strokeDasharray="4 2"
                />

                {/* 2. RIGHT FACADE (MẶT BÊN PHẢI) */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterBottom} ${pRightBottom} ${pRightTop} ${pCenterTop}`}
                  fill="url(#isoSideShadow)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                />

                {/* Right Facade Highlight Glow Overlay */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterBottom} ${pRightBottom} ${pRightTop} ${pCenterTop}`}
                  fill={highlightColor}
                  fillOpacity="0.22"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* Right Facade Structural Columns (3 Bays) */}
                {[1, 2].map((bay) => {
                  const xB = cx + bay * (dxRight / 3);
                  const yB = cy - bay * (dyRight / 3);
                  return (
                    <line
                      key={`r-col-${bay}`}
                      className="iso-wire"
                      x1={xB}
                      y1={yB}
                      x2={xB}
                      y2={yB - h}
                      stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                      strokeWidth={isHovered ? '1.2' : '1'}
                    />
                  );
                })}

                {/* Right Facade Horizontal Window Ribbon */}
                <line
                  className="iso-wire"
                  x1={cx}
                  y1={cy - h * 0.52}
                  x2={cx + dxRight}
                  y2={cy - h * 0.52 - dyRight}
                  stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                  strokeWidth="0.9"
                  strokeDasharray="4 2"
                />

                {/* 3. TOP SLAB / CEILING (MẶT TRÊN TẦNG) */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterTop} ${pLeftTop} ${pBackTop} ${pRightTop}`}
                  fill="url(#isoTopSlab)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1'}
                />

                {/* Top Slab Highlight Glow Overlay */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterTop} ${pLeftTop} ${pBackTop} ${pRightTop}`}
                  fill={highlightColor}
                  fillOpacity="0.35"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* Floor Identification Badge on Front Vertex */}
                <rect
                  className="iso-badge-rect"
                  x={cx - 16}
                  y={cy - h / 2 - 11}
                  width="32"
                  height="22"
                  rx="6"
                  fill={isHovered ? highlightColor : 'var(--surface-panel)'}
                  stroke={isHovered ? '#FFFFFF' : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.6' : '1.2'}
                  style={{
                    filter: isHovered ? `drop-shadow(0 3px 8px ${highlightColor}80)` : 'none'
                  }}
                />
                <text
                  className="iso-badge-txt"
                  x={cx}
                  y={cy - h / 2 + 5}
                  fontFamily="var(--font-sans)"
                  fontSize="11"
                  fontWeight="800"
                  fill={isHovered ? '#FFFFFF' : 'var(--ink-pure)'}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  T{floor.level}
                </text>

                {/* 4. LEADER CONNECTOR TO CALLOUT CARD */}
                <line
                  className="iso-leader-line"
                  x1={tagAnchorX}
                  y1={tagAnchorY}
                  x2={tagAnchorX + 24}
                  y2={tagAnchorY}
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1'}
                  strokeDasharray={isHovered ? 'none' : '2 2'}
                />
                <circle
                  className="iso-leader-dot"
                  cx={tagAnchorX}
                  cy={tagAnchorY}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isHovered ? highlightColor : 'var(--ink-muted)'}
                />

                {/* 5. CALLOUT INFORMATION CARD */}
                <g
                  className="iso-tag-box"
                  style={{
                    transform: isHovered
                      ? `translate(${tagAnchorX + 28}px, ${tagAnchorY - 17}px)`
                      : `translate(${tagAnchorX + 24}px, ${tagAnchorY - 17}px)`,
                    opacity: isHovered ? 1 : 0.88
                  }}
                >
                  <rect
                    className="iso-tag-rect"
                    x="0"
                    y="0"
                    width="186"
                    height="34"
                    rx="8"
                    fill={isHovered ? 'var(--surface-panel)' : 'var(--canvas-subtle)'}
                    stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                    strokeWidth={isHovered ? '1.6' : '1'}
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0 6px 16px ${highlightColor}25)`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.04))'
                    }}
                  />

                  {/* Left accent indicator bar */}
                  <rect
                    x="0"
                    y="4"
                    width="3.5"
                    height="26"
                    rx="1.75"
                    fill={isHovered ? highlightColor : 'transparent'}
                    style={{ transition: 'fill 0.25s ease' }}
                  />

                  {/* Title & Level */}
                  <text
                    className="iso-tag-txt"
                    x="10"
                    y="15"
                    fontFamily="var(--font-sans)"
                    fontSize="9.5"
                    fontWeight="800"
                    fill={isHovered ? highlightColor : 'var(--ink-pure)'}
                  >
                    {floor.name} • {floor.title}
                  </text>

                  {/* Room Availability */}
                  <text
                    className="iso-tag-txt"
                    x="10"
                    y="26"
                    fontFamily="var(--font-mono)"
                    fontSize="8.5"
                    fill="var(--ink-muted)"
                  >
                    {floor.avail}/{floor.total} Phòng Trống
                  </text>
                </g>
              </g>
            );
          })}

          {/* ==============================================================
              ROOFTOP ARCHITECTURAL ELEMENTS (ELEVATOR CORE & SKYLIGHT)
              ============================================================== */}
          <polygon
            points="196,68 172,61 198,52 222,59"
            fill="var(--canvas-subtle)"
            stroke="var(--hairline-medium)"
            strokeWidth="1"
          />
          <polygon
            points="196,68 222,59 222,49 196,58"
            fill="#2563EB"
            fillOpacity="0.45"
            stroke="var(--hairline-medium)"
            strokeWidth="1"
          />
          <polygon
            points="196,68 172,61 172,51 196,58"
            fill="#1E3A8A"
            fillOpacity="0.35"
            stroke="var(--hairline-medium)"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
};
