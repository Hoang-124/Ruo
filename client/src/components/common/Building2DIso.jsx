import React, { useState, useMemo } from 'react';
import { CAMPUS_FLOORS } from '../../mock/campusBuildingData';

/**
 * Building2DIso
 * Pure 2D Isometric Architectural Elevation of Tòa Nhà A1
 * Chuẩn hóa 100% theo mặt bằng kiến trúc FloorPlan2D & dữ liệu CAMPUS_FLOORS:
 * 1. Tỷ lệ hình khối chữ nhật (Elongated 2:1): Mặt dài (Dãy phòng học Bắc/Nam) & Mặt hẹp (Lõi buồng thang Đông).
 * 2. Giếng trời thông tầng (Central Atrium Skylight) tại tâm mái đón sáng tự nhiên xuyên suốt 5 tầng.
 * 3. Mái đón sảnh chính (Grand Entrance Canopy) tại Tầng 1 đón tiếp giảng viên & sinh viên.
 * 4. Sân thượng sinh thái (Eco Sky Terrace) & Hội trường lớn 300 chỗ tại Tầng 5.
 * 5. Vách kính buồng thang thoát hiểm thông tầng (Stairwell Glazed Core) ở mặt bên Đông.
 * 6. Dữ liệu phòng & trạng thái thực tế đồng bộ 100% từ CAMPUS_FLOORS.
 * 
 * Strict Native SVG Only — Zero external icon dependencies.
 */
export const Building2DIso = ({ activeFloor = null, onSelectFloor }) => {
  const [hoveredFloor, setHoveredFloor] = useState(null);

  // Configuration for 5 floors synchronized with FloorPlan2D & CAMPUS_FLOORS
  const FLOOR_CONFIG = [
    {
      level: 5,
      name: 'TẦNG 5',
      title: 'Sự Kiện & Sinh Hoạt',
      highlight: 'Hội trường 300 chỗ',
      accent: '#8B5CF6'
    },
    {
      level: 4,
      name: 'TẦNG 4',
      title: 'Hành Chính & Hội Thảo',
      highlight: 'VP Khoa & Hội thảo',
      accent: '#3B82F6'
    },
    {
      level: 3,
      name: 'TẦNG 3',
      title: 'Thí Nghiệm & Lab Máy Tính',
      highlight: '3 Lab PM & PTN',
      accent: '#0EA5E9'
    },
    {
      level: 2,
      name: 'TẦNG 2',
      title: 'Giảng Đường Lý Thuyết',
      highlight: 'Phòng học 201 - 208',
      accent: '#10B981'
    },
    {
      level: 1,
      name: 'TẦNG 1',
      title: 'Sảnh Chính & Công Cộng',
      highlight: 'Thư viện & Căn tin',
      accent: '#F59E0B'
    }
  ];

  // Dynamically compute real stats from CAMPUS_FLOORS
  const floorsData = useMemo(() => {
    return FLOOR_CONFIG.map((cfg) => {
      const flData = CAMPUS_FLOORS[cfg.level];
      if (!flData) {
        return { ...cfg, total: 10, avail: 6 };
      }
      const allRooms = [...(flData.topRooms || []), ...(flData.bottomRooms || [])];
      const total = allRooms.length;
      // Daytime simulation (11:15 = 675 min)
      const nowMin = 675;
      const busy = allRooms.filter((r) => {
        if (r.statusOverride === 'maintenance') return true;
        if (r.occupiedAt && r.occupiedAt.some((s) => nowMin >= s.start && nowMin < s.end)) return true;
        return false;
      }).length;
      const avail = Math.max(0, total - busy);
      return {
        ...cfg,
        total,
        avail
      };
    });
  }, []);

  const activeItem = hoveredFloor || (activeFloor ? floorsData.find((f) => f.level === activeFloor) : null);

  // Isometric Geometry Parameters
  // Elongated horizontal ratio matching FloorPlan2D (~2.0 : 1)
  const cx = 215;
  const h = 42; // Floor height
  const stepY = 48; // Vertical spacing per floor tier
  const dxLeft = 192; // Long front facade (South/North)
  const dyLeft = 56;
  const dxRight = 96; // Short end facade (East Stairwell)
  const dyRight = 28;

  // Center of the roof slab for Central Skylight Atrium
  const roofTopY = 164 - h; // Base of T5 is 164, roof is 122
  const atriumMidX = cx + (dxRight - dxLeft) / 2; // 215 + (96 - 192)/2 = 167
  const atriumMidY = roofTopY - (dyLeft + dyRight) / 2; // 122 - 42 = 80
  const aDxL = 38;
  const aDyL = 11.1;
  const aDxR = 22;
  const aDyR = 6.4;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg
          viewBox="10 18 556 384"
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
            {/* Smooth hardware-accelerated transitions */}
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
                cursor: pointer;
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

            {/* Ground Architectural Grid */}
            <pattern id="isoGroundGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.8" />
            </pattern>

            {/* Shading Gradients for Facades */}
            <linearGradient id="isoFrontLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.20" />
              <stop offset="50%" stopColor="#1D4ED8" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.10" />
            </linearGradient>

            <linearGradient id="isoSideShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.26" />
            </linearGradient>

            <linearGradient id="isoTopSlab" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
            </linearGradient>

            {/* Skylight Glass Gradients */}
            <linearGradient id="isoAtriumGlassFront" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="isoAtriumGlassSide" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0369A1" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Technical Blueprint Grid Background */}
          <rect x="15" y="20" width="538" height="380" fill="url(#isoGroundGrid)" rx="16" />

          {/* ==============================================================
              5 ISOMETRIC TIERS (FLOORS 1 TO 5, RENDERED FROM BOTTOM TO TOP)
              ============================================================== */}
          {floorsData.slice().reverse().map((floor) => {
            const floorIdx = floor.level; // 1 to 5
            const baseY = 356 - (floorIdx - 1) * stepY;
            const isHovered = activeItem ? activeItem.level === floor.level : false;
            const highlightColor = floor.accent;

            // Coordinate Vertices for Current Tier
            const cy = baseY;
            const pCenterBottom = `${cx},${cy}`;
            const pLeftBottom = `${cx - dxLeft},${cy - dyLeft}`;
            const pRightBottom = `${cx + dxRight},${cy - dyRight}`;

            const pCenterTop = `${cx},${cy - h}`;
            const pLeftTop = `${cx - dxLeft},${cy - h - dyLeft}`;
            const pRightTop = `${cx + dxRight},${cy - h - dyRight}`;
            const pBackTop = `${cx - dxLeft + dxRight},${cy - h - dyLeft - dyRight}`;

            // Leader line anchor point on the right (East) facade
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
                  transform: isHovered ? 'translateY(-7px)' : 'translateY(0px)',
                  filter: isHovered
                    ? `drop-shadow(0 14px 22px ${highlightColor}45)`
                    : 'none'
                }}
              >
                {/* --------------------------------------------------------
                    1. LONG FRONT FACADE (MẶT DÀI HƯỚNG BẮC/NAM)
                    Bao gồm 6 nhịp kết cấu, băng kính lớp học, lam chắn nắng
                    -------------------------------------------------------- */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterBottom} ${pLeftBottom} ${pLeftTop} ${pCenterTop}`}
                  fill="url(#isoFrontLight)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                />

                {/* Smooth hover illumination overlay */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterBottom} ${pLeftBottom} ${pLeftTop} ${pCenterTop}`}
                  fill={highlightColor}
                  fillOpacity="0.25"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* Continuous Classroom Window Ribbon (Băng kính giảng đường) */}
                <polygon
                  points={`
                    ${cx},${cy - h * 0.30}
                    ${cx - dxLeft},${cy - dyLeft - h * 0.30}
                    ${cx - dxLeft},${cy - dyLeft - h * 0.78}
                    ${cx},${cy - h * 0.78}
                  `}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                  strokeWidth="0.8"
                />

                {/* Sun-shading Louver Line (Lam chắn nắng mặt trời) */}
                <line
                  className="iso-wire"
                  x1={cx}
                  y1={cy - h * 0.82}
                  x2={cx - dxLeft}
                  y2={cy - dyLeft - h * 0.82}
                  stroke={isHovered ? highlightColor : 'var(--hairline-strong)'}
                  strokeWidth={isHovered ? '1.4' : '1'}
                />

                {/* 6 Structural Columns on Long Facade (Hệ cột chịu lực 400x400) */}
                {[1, 2, 3, 4, 5].map((bay) => {
                  const xB = cx - bay * (dxLeft / 6);
                  const yB = cy - bay * (dyLeft / 6);
                  return (
                    <g key={`l-col-${bay}`}>
                      <line
                        className="iso-wire"
                        x1={xB}
                        y1={yB}
                        x2={xB}
                        y2={yB - h}
                        stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                        strokeWidth={isHovered ? '1.2' : '0.9'}
                      />
                      {/* Window mullion subdivider */}
                      <line
                        x1={xB + dxLeft / 12}
                        y1={yB + dyLeft / 12 - h * 0.30}
                        x2={xB + dxLeft / 12}
                        y2={yB + dyLeft / 12 - h * 0.78}
                        stroke="var(--hairline-soft)"
                        strokeWidth="0.6"
                        strokeDasharray="2 2"
                        strokeOpacity="0.5"
                      />
                    </g>
                  );
                })}

                {/* SPECIAL FACADE ARCHITECTURE PER SPECIFIC FLOOR */}
                {/* Tầng 1: Mái đón sảnh chính (Grand Entrance Canopy) */}
                {floor.level === 1 && (
                  <g id="t1-grand-entrance">
                    {/* Canopy glass projection at center bays */}
                    <polygon
                      points={`
                        ${cx - dxLeft * 0.40},${cy - dyLeft * 0.40 - 24}
                        ${cx - dxLeft * 0.62},${cy - dyLeft * 0.62 - 24}
                        ${cx - dxLeft * 0.62 + 14},${cy - dyLeft * 0.62 - 24 + 4}
                        ${cx - dxLeft * 0.40 + 14},${cy - dyLeft * 0.40 - 24 + 4}
                      `}
                      fill="#38BDF8"
                      fillOpacity="0.5"
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    />
                    {/* Tension suspension rods */}
                    <line
                      x1={cx - dxLeft * 0.40 + 14}
                      y1={cy - dyLeft * 0.40 - 24 + 4}
                      x2={cx - dxLeft * 0.40}
                      y2={cy - dyLeft * 0.40 - 36}
                      stroke="var(--hairline-strong)"
                      strokeWidth="0.8"
                    />
                    <line
                      x1={cx - dxLeft * 0.62 + 14}
                      y1={cy - dyLeft * 0.62 - 24 + 4}
                      x2={cx - dxLeft * 0.62}
                      y2={cy - dyLeft * 0.62 - 36}
                      stroke="var(--hairline-strong)"
                      strokeWidth="0.8"
                    />
                    {/* Double glass entrance doors with welcoming amber backlight */}
                    <polygon
                      points={`
                        ${cx - dxLeft * 0.42},${cy - dyLeft * 0.42}
                        ${cx - dxLeft * 0.60},${cy - dyLeft * 0.60}
                        ${cx - dxLeft * 0.60},${cy - dyLeft * 0.60 - 22}
                        ${cx - dxLeft * 0.42},${cy - dyLeft * 0.42 - 22}
                      `}
                      fill="#F59E0B"
                      fillOpacity="0.28"
                      stroke="#F59E0B"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* Tầng 5: Sân thượng sinh thái & Lan can kính (Eco Sky Terrace) */}
                {floor.level === 5 && (
                  <g id="t5-sky-terrace">
                    {/* Modern safety glass railing along the front edge */}
                    <polygon
                      points={`
                        ${cx},${cy - h}
                        ${cx - dxLeft * 0.32},${cy - dyLeft * 0.32 - h}
                        ${cx - dxLeft * 0.32},${cy - dyLeft * 0.32 - h - 7}
                        ${cx},${cy - h - 7}
                      `}
                      fill="rgba(56, 189, 248, 0.22)"
                      stroke="#38BDF8"
                      strokeWidth="0.9"
                    />
                    {/* Top chrome handrail */}
                    <line
                      x1={cx}
                      y1={cy - h - 7}
                      x2={cx - dxLeft * 0.32}
                      y2={cy - dyLeft * 0.32 - h - 7}
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    />
                    {/* Miniature green eco shrubs on terrace */}
                    <circle cx={cx - dxLeft * 0.08} cy={cy - dyLeft * 0.08 - h - 3} r="3" fill="#10B981" fillOpacity="0.9" />
                    <circle cx={cx - dxLeft * 0.16} cy={cy - dyLeft * 0.16 - h - 3.5} r="3.5" fill="#059669" fillOpacity="0.9" />
                    <circle cx={cx - dxLeft * 0.24} cy={cy - dyLeft * 0.24 - h - 3} r="2.8" fill="#10B981" fillOpacity="0.9" />
                  </g>
                )}

                {/* --------------------------------------------------------
                    2. SHORT END FACADE (MẶT HẸP HƯỚNG ĐÔNG)
                    Lõi buồng thang bộ thoát hiểm & vách kính lấy sáng thông tầng
                    -------------------------------------------------------- */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterBottom} ${pRightBottom} ${pRightTop} ${pCenterTop}`}
                  fill="url(#isoSideShadow)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                />

                {/* Right Facade Hover Glow Overlay */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterBottom} ${pRightBottom} ${pRightTop} ${pCenterTop}`}
                  fill={highlightColor}
                  fillOpacity="0.22"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* Vertical Glazed Stairwell Core (Vách kính buồng thang Đông) */}
                <polygon
                  points={`
                    ${cx + dxRight * 0.30},${cy - dyRight * 0.30 - 4}
                    ${cx + dxRight * 0.70},${cy - dyRight * 0.70 - 4}
                    ${cx + dxRight * 0.70},${cy - dyRight * 0.70 - h + 4}
                    ${cx + dxRight * 0.30},${cy - dyRight * 0.30 - h + 4}
                  `}
                  fill="rgba(56, 189, 248, 0.18)"
                  stroke={isHovered ? highlightColor : 'rgba(56, 189, 248, 0.45)'}
                  strokeWidth="0.9"
                />

                {/* Stair Mid-Landing Sill Line (Chiếu nghỉ thang bộ) */}
                <line
                  x1={cx + dxRight * 0.30}
                  y1={cy - dyRight * 0.30 - h / 2}
                  x2={cx + dxRight * 0.70}
                  y2={cy - dyRight * 0.70 - h / 2}
                  stroke={isHovered ? highlightColor : 'rgba(255, 255, 255, 0.5)'}
                  strokeWidth="1"
                />

                {/* Stair Flight Diagonal Silhouette */}
                <line
                  x1={cx + dxRight * 0.32}
                  y1={cy - dyRight * 0.32 - 7}
                  x2={cx + dxRight * 0.68}
                  y2={cy - dyRight * 0.68 - h / 2}
                  stroke="var(--hairline-soft)"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <line
                  x1={cx + dxRight * 0.32}
                  y1={cy - dyRight * 0.32 - h / 2}
                  x2={cx + dxRight * 0.68}
                  y2={cy - dyRight * 0.68 - h + 7}
                  stroke="var(--hairline-soft)"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />

                {/* Structural Pilasters on East Wall */}
                <line
                  className="iso-wire"
                  x1={cx + dxRight * 0.30}
                  y1={cy - dyRight * 0.30}
                  x2={cx + dxRight * 0.30}
                  y2={cy - dyRight * 0.30 - h}
                  stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                  strokeWidth="0.9"
                />
                <line
                  className="iso-wire"
                  x1={cx + dxRight * 0.70}
                  y1={cy - dyRight * 0.70}
                  x2={cx + dxRight * 0.70}
                  y2={cy - dyRight * 0.70 - h}
                  stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                  strokeWidth="0.9"
                />

                {/* --------------------------------------------------------
                    3. TOP SLAB / CEILING (MẶT SÀN TẦNG)
                    -------------------------------------------------------- */}
                <polygon
                  className="iso-surface"
                  points={`${pCenterTop} ${pLeftTop} ${pBackTop} ${pRightTop}`}
                  fill="url(#isoTopSlab)"
                  stroke={isHovered ? highlightColor : 'var(--hairline-medium)'}
                  strokeWidth={isHovered ? '1.8' : '1'}
                />

                {/* Top Slab Glow Overlay */}
                <polygon
                  className="iso-glow-overlay"
                  points={`${pCenterTop} ${pLeftTop} ${pBackTop} ${pRightTop}`}
                  fill={highlightColor}
                  fillOpacity="0.32"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />

                {/* --------------------------------------------------------
                    4. FLOOR IDENTIFICATION BADGE (T1..T5)
                    Gắn tại góc đỉnh giao diện chính xác
                    -------------------------------------------------------- */}
                <rect
                  className="iso-badge-rect"
                  x={cx - 15}
                  y={cy - h / 2 - 10}
                  width="30"
                  height="20"
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
                  y={cy - h / 2 + 4.5}
                  fontFamily="var(--font-sans)"
                  fontSize="10.5"
                  fontWeight="800"
                  fill={isHovered ? '#FFFFFF' : 'var(--ink-pure)'}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  T{floor.level}
                </text>

                {/* --------------------------------------------------------
                    5. LEADER CONNECTOR TO CALLOUT CARD
                    Nối từ lõi thang Đông sang thẻ chú giải
                    -------------------------------------------------------- */}
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

                {/* --------------------------------------------------------
                    6. CALLOUT INFORMATION CARD
                    Không tràn viền, kích thước rộng 214px, căn chỉnh chuẩn xác
                    -------------------------------------------------------- */}
                <g
                  className="iso-tag-box"
                  style={{
                    transform: isHovered
                      ? `translate(${tagAnchorX + 28}px, ${tagAnchorY - 19}px)`
                      : `translate(${tagAnchorX + 24}px, ${tagAnchorY - 19}px)`,
                    opacity: isHovered ? 1 : 0.92
                  }}
                >
                  {/* Card Background Container */}
                  <rect
                    className="iso-tag-rect"
                    x="0"
                    y="0"
                    width="214"
                    height="38"
                    rx="8"
                    fill={isHovered ? 'var(--surface-panel)' : 'var(--canvas-subtle)'}
                    stroke={isHovered ? highlightColor : 'var(--hairline-soft)'}
                    strokeWidth={isHovered ? '1.6' : '1'}
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0 6px 18px ${highlightColor}30)`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.04))'
                    }}
                  />

                  {/* Left Accent Color Indicator */}
                  <rect
                    x="0"
                    y="5"
                    width="3.5"
                    height="28"
                    rx="1.75"
                    fill={isHovered ? highlightColor : 'transparent'}
                    style={{ transition: 'fill 0.25s ease' }}
                  />

                  {/* Floor Level & Title */}
                  <text
                    className="iso-tag-txt"
                    x="11"
                    y="16"
                    fontFamily="var(--font-sans)"
                    fontSize="9.2"
                    fontWeight="800"
                    fill={isHovered ? highlightColor : 'var(--ink-pure)'}
                  >
                    {floor.name} • {floor.title}
                  </text>

                  {/* Live Status Indicator & Room Stats */}
                  <g transform="translate(11, 28)">
                    {/* Small Status Dot */}
                    <circle cx="3" cy="-3.5" r="2.5" fill="#10B981" />
                    <text
                      className="iso-tag-txt"
                      x="10"
                      y="0"
                      fontFamily="var(--font-sans)"
                      fontSize="8.2"
                      fill="var(--ink-muted)"
                      fontWeight="600"
                    >
                      <tspan fontFamily="var(--font-mono)" fontWeight="700" fill="var(--ink-pure)">
                        {floor.avail}/{floor.total}
                      </tspan>{' '}
                      Phòng trống • {floor.highlight}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}

          {/* ==============================================================
              ROOFTOP ARCHITECTURAL ELEMENTS:
              GIẾNG TRỜI THÔNG TẦNG (CENTRAL ATRIUM SKYLIGHT)
              Căn đúng trọng tâm giếng trời 180x74m từ FloorPlan2D
              ============================================================== */}
          <g id="rooftop-central-atrium" style={{ filter: 'drop-shadow(0 4px 12px rgba(56, 189, 248, 0.35))' }}>
            {/* 1. Atrium Raised Concrete Curb Base (Bệ đỡ giếng trời) */}
            <polygon
              points={`
                ${atriumMidX},${atriumMidY + 4}
                ${atriumMidX - aDxL},${atriumMidY + 4 - aDyL}
                ${atriumMidX - aDxL + aDxR},${atriumMidY + 4 - aDyL - aDyR}
                ${atriumMidX + aDxR},${atriumMidY + 4 - aDyR}
              `}
              fill="var(--surface-panel)"
              stroke="var(--hairline-strong)"
              strokeWidth="0.8"
            />

            {/* 2. Skylight Curb Walls (Thành bệ cao 6px) */}
            <polygon
              points={`
                ${atriumMidX},${atriumMidY + 4}
                ${atriumMidX - aDxL},${atriumMidY + 4 - aDyL}
                ${atriumMidX - aDxL},${atriumMidY - 2 - aDyL}
                ${atriumMidX},${atriumMidY - 2}
              `}
              fill="#1E293B"
              stroke="var(--hairline-medium)"
              strokeWidth="0.8"
            />
            <polygon
              points={`
                ${atriumMidX},${atriumMidY + 4}
                ${atriumMidX + aDxR},${atriumMidY + 4 - aDyR}
                ${atriumMidX + aDxR},${atriumMidY - 2 - aDyR}
                ${atriumMidX},${atriumMidY - 2}
              `}
              fill="#0F172A"
              stroke="var(--hairline-medium)"
              strokeWidth="0.8"
            />

            {/* 3. Faceted Glass Lantern Canopy (Chóp kính giếng trời lấy sáng) */}
            {/* Front Glass Facet */}
            <polygon
              points={`
                ${atriumMidX},${atriumMidY - 2}
                ${atriumMidX + aDxR},${atriumMidY - 2 - aDyR}
                ${atriumMidX - aDxL * 0.15 + aDxR * 0.15},${atriumMidY - 16}
              `}
              fill="url(#isoAtriumGlassFront)"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            {/* Left Glass Facet */}
            <polygon
              points={`
                ${atriumMidX},${atriumMidY - 2}
                ${atriumMidX - aDxL},${atriumMidY - 2 - aDyL}
                ${atriumMidX - aDxL * 0.15 + aDxR * 0.15},${atriumMidY - 16}
              `}
              fill="url(#isoAtriumGlassSide)"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            {/* Back Facets Silhouette */}
            <polygon
              points={`
                ${atriumMidX - aDxL},${atriumMidY - 2 - aDyL}
                ${atriumMidX - aDxL + aDxR},${atriumMidY - 2 - aDyL - aDyR}
                ${atriumMidX - aDxL * 0.15 + aDxR * 0.15},${atriumMidY - 16}
              `}
              fill="#0369A1"
              fillOpacity="0.45"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="0.8"
            />
            <polygon
              points={`
                ${atriumMidX + aDxR},${atriumMidY - 2 - aDyR}
                ${atriumMidX - aDxL + aDxR},${atriumMidY - 2 - aDyL - aDyR}
                ${atriumMidX - aDxL * 0.15 + aDxR * 0.15},${atriumMidY - 16}
              `}
              fill="#0284C7"
              fillOpacity="0.4"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="0.8"
            />

            {/* Aluminum Glass Mullions / Structural Ribs */}
            <line
              x1={atriumMidX - aDxL * 0.5}
              y1={atriumMidY - 2 - aDyL * 0.5}
              x2={atriumMidX - aDxL * 0.15 + aDxR * 0.15}
              y2={atriumMidY - 16}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="0.9"
            />
            <line
              x1={atriumMidX + aDxR * 0.5}
              y1={atriumMidY - 2 - aDyR * 0.5}
              x2={atriumMidX - aDxL * 0.15 + aDxR * 0.15}
              y2={atriumMidY - 16}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="0.9"
            />

            {/* Subtle Downward Light Cone (Ánh sáng tự nhiên xuyên tầng) */}
            <polygon
              points={`
                ${atriumMidX - aDxL * 0.15 + aDxR * 0.15},${atriumMidY - 16}
                ${atriumMidX - aDxL * 0.8},${atriumMidY + 12}
                ${atriumMidX + aDxR * 0.8},${atriumMidY + 12}
              `}
              fill="url(#isoAtriumGlassFront)"
              fillOpacity="0.08"
              style={{ pointerEvents: 'none' }}
            />
          </g>

          {/* Rear Elevator Motor Core (Lõi phòng máy thang máy kỹ thuật sau mái) */}
          <polygon
            points={`
              ${cx + dxRight * 0.85 - dxLeft * 0.80},${roofTopY - dyRight * 0.85 - dyLeft * 0.80}
              ${cx + dxRight * 0.85 - dxLeft * 0.95},${roofTopY - dyRight * 0.85 - dyLeft * 0.95}
              ${cx + dxRight * 0.70 - dxLeft * 0.95},${roofTopY - dyRight * 0.70 - dyLeft * 0.95}
              ${cx + dxRight * 0.70 - dxLeft * 0.80},${roofTopY - dyRight * 0.70 - dyLeft * 0.80}
            `}
            fill="var(--canvas-subtle)"
            stroke="var(--hairline-medium)"
            strokeWidth="0.8"
          />
        </svg>
      </div>
    </div>
  );
};
