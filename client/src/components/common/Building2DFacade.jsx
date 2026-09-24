import React, { useState } from 'react';

/**
 * Building2DFacade
 * Pure 2D SVG Architectural Elevation of Tòa Nhà A1 (5 Floors)
 * Built strictly with native SVG — zero external libraries, zero canvas lag.
 * Features architectural grid, elevation heights (+18.5m..+0.0m),
 * interactive floor occupancy inspection, and crisp drafting callouts.
 */
export const Building2DFacade = ({ onSelectFloor, activeFloor = 3 }) => {
  const [hoveredFloor, setHoveredFloor] = useState(null);

  const FLOORS = [
    {
      level: 5,
      heightLabel: '+18.5m',
      title: 'TẦNG 5 • VIỆN NGHIÊN CỨU & ĐỒ ÁN',
      rooms: '21 Phòng CAD/Studio',
      avail: 17,
      total: 21,
      usage: 'Studio Đồ án tốt nghiệp • Phòng Nghiên cứu Sau đại học',
      highlightColor: '#8B5CF6'
    },
    {
      level: 4,
      heightLabel: '+14.5m',
      title: 'TẦNG 4 • PHÒNG LAB MÁY TÍNH & AI',
      rooms: '21 Phòng Lab Máy Tính',
      avail: 16,
      total: 21,
      usage: 'Thực hành CAD/BIM • Trung tâm Tính toán Hiệu năng cao',
      highlightColor: '#3B82F6'
    },
    {
      level: 3,
      heightLabel: '+10.5m',
      title: 'TẦNG 3 • GIẢNG ĐƯỜNG ĐA PHƯƠNG TIỆN',
      rooms: '22 Phòng Lý Thuyết',
      avail: 19,
      total: 22,
      usage: 'Lớp học chính khóa • Hội thảo chuyên đề đa phương tiện',
      highlightColor: '#0EA5E9'
    },
    {
      level: 2,
      heightLabel: '+6.5m',
      title: 'TẦNG 2 • PHÒNG HỌC & HỘI NGHỊ NHỎ',
      rooms: '22 Phòng Giảng Đường',
      avail: 15,
      total: 22,
      usage: 'Giảng đường bậc thang • Phòng thảo luận nhóm sinh viên',
      highlightColor: '#10B981'
    },
    {
      level: 1,
      heightLabel: '+0.0m',
      title: 'TẦNG 1 • SẢNH CHÍNH & VĂN PHÒNG CSVC',
      rooms: '22 Phòng Kỹ Thuật',
      avail: 17,
      total: 22,
      usage: 'Sảnh đón tiếp sinh viên • Ban Quản trị CSVC & Tiếp nhận thiết bị',
      highlightColor: '#F59E0B'
    }
  ];

  const currentDisplayFloor = hoveredFloor || FLOORS.find((f) => f.level === activeFloor) || FLOORS[2];

  return (
    <div className="ruo-2d-building-panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Blueprint Header Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--hairline-soft)',
          background: 'var(--surface-panel)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
            }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.01em' }}>
              MẶT ĐỨNG KIẾN TRÚC 2D • TÒA NHÀ A1
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              Bản vẽ kỹ thuật phân tầng • 108 Phòng Học & Nghiên Cứu
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              fontWeight: 700
            }}
          >
            TỶ LỆ 1:100 • 2D SVG
          </span>
        </div>
      </div>

      {/* Main 2D Drawing Canvas Viewport */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 12px 10px' }}>
        <svg
          viewBox="0 0 680 430"
          style={{ width: '100%', height: '100%', maxHeight: '420px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Subtle Drafting Blueprint Grid Pattern */}
            <pattern id="ruoGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.8" />
            </pattern>

            {/* Glass Facade Gradient */}
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.06" />
            </linearGradient>

            {/* Lit Window Gradient */}
            <linearGradient id="windowLit" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
            </linearGradient>

            {/* Warm Classroom Evening Light */}
            <linearGradient id="windowWarm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* Background Technical Drafting Grid */}
          <rect x="0" y="0" width="680" height="430" fill="url(#ruoGrid)" />

          {/* ==============================================================
              1. LEFT ELEVATION HEIGHT DATUM MARKS (+18.5m down to +0.0m)
              ============================================================== */}
          <g opacity="0.85">
            {FLOORS.map((f, idx) => {
              const y = 60 + idx * 56;
              const isSelected = currentDisplayFloor.level === f.level;
              return (
                <g key={`datum-${f.level}`} style={{ transition: 'all 0.2s' }}>
                  {/* Elevation Datum Line */}
                  <line
                    x1="24"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke={isSelected ? '#2563EB' : 'var(--hairline-medium)'}
                    strokeWidth={isSelected ? '1.8' : '1'}
                    strokeDasharray={isSelected ? 'none' : '3 3'}
                  />
                  {/* Datum Triangle Marker */}
                  <polygon
                    points={`100,${y} 90,${y - 4} 90,${y + 4}`}
                    fill={isSelected ? '#2563EB' : 'var(--ink-muted)'}
                  />
                  {/* Datum Height Text */}
                  <text
                    x="20"
                    y={y + 4}
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? '#2563EB' : 'var(--ink-muted)'}
                    textAnchor="start"
                  >
                    {f.heightLabel}
                  </text>
                  <text
                    x="62"
                    y={y - 5}
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                    fill={isSelected ? '#2563EB' : 'var(--ink-muted)'}
                    opacity="0.85"
                  >
                    T.{f.level}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ==============================================================
              2. THE BUILDING 2D MAIN MASSING (TÒA NHÀ A1)
              ============================================================== */}
          {/* Main Structural Outline Frame */}
          <rect
            x="115"
            y="35"
            width="490"
            height="315"
            rx="4"
            fill="var(--surface-panel)"
            stroke="var(--hairline-medium)"
            strokeWidth="2"
          />

          {/* Roof Parapet & Solar Screen / Louvers */}
          <rect x="125" y="24" width="470" height="12" rx="2" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1.2" />
          {/* Roof HVAC / Architectural Louver Slits */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => (
            <line
              key={`louver-${i}`}
              x1={140 + i * 31}
              y1="26"
              x2={140 + i * 31}
              y2="34"
              stroke="var(--hairline-medium)"
              strokeWidth="1.5"
            />
          ))}

          {/* ==============================================================
              3. FLOORS 5, 4, 3, 2, 1 RENDERING & WINDOW BAYS
              ============================================================== */}
          {FLOORS.map((floor, floorIdx) => {
            const y = 35 + floorIdx * 56;
            const isHovered = currentDisplayFloor.level === floor.level;

            return (
              <g
                key={`floor-band-${floor.level}`}
                onClick={() => onSelectFloor && onSelectFloor(floor.level)}
                onMouseEnter={() => setHoveredFloor(floor)}
                onMouseLeave={() => setHoveredFloor(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Floor Highlighting Fill on Hover */}
                <rect
                  x="116"
                  y={y}
                  width="488"
                  height="56"
                  fill={isHovered ? 'rgba(37, 99, 235, 0.08)' : 'transparent'}
                  transition="fill 0.2s"
                />

                {/* Floor Reinforced Concrete Slab (Dầm sàn bê tông) */}
                <line
                  x1="115"
                  y1={y + 56}
                  x2="605"
                  y2={y + 56}
                  stroke="var(--hairline-medium)"
                  strokeWidth="2"
                />

                {/* Left Floor Identifier Plaque */}
                <rect
                  x="122"
                  y={y + 12}
                  width="36"
                  height="32"
                  rx="4"
                  fill={isHovered ? '#2563EB' : 'var(--canvas-subtle)'}
                  stroke={isHovered ? '#2563EB' : 'var(--hairline-medium)'}
                  strokeWidth="1"
                />
                <text
                  x="140"
                  y={y + 32}
                  fontFamily="var(--font-sans)"
                  fontSize="12"
                  fontWeight="800"
                  fill={isHovered ? '#FFFFFF' : 'var(--ink-pure)'}
                  textAnchor="middle"
                >
                  T{floor.level}
                </text>

                {/* 6 Architectural Window Bays per Floor (Phòng A1-X01 .. A1-X06) */}
                {[0, 1, 2, 3, 4, 5].map((colIdx) => {
                  const bayX = 168 + colIdx * 71;
                  const isLit = (floor.level + colIdx) % 2 === 0;
                  const isWarm = (floor.level * 2 + colIdx) % 3 === 0;

                  return (
                    <g key={`bay-${floor.level}-${colIdx}`}>
                      {/* Window Mullion Frame */}
                      <rect
                        x={bayX}
                        y={y + 8}
                        width="64"
                        height="40"
                        rx="3"
                        fill={isHovered ? 'url(#windowLit)' : isLit ? 'url(#glassGrad)' : isWarm ? 'url(#windowWarm)' : 'var(--canvas-subtle)'}
                        stroke={isHovered ? '#3B82F6' : 'var(--hairline-soft)'}
                        strokeWidth="1.2"
                      />

                      {/* Glass Divider Crosshair (Thanh đố cửa kính) */}
                      <line x1={bayX + 32} y1={y + 8} x2={bayX + 32} y2={y + 48} stroke="var(--hairline-soft)" strokeWidth="0.8" />
                      <line x1={bayX} y1={y + 24} x2={bayX + 64} y2={y + 24} stroke="var(--hairline-soft)" strokeWidth="0.8" />

                      {/* Room Code Callout */}
                      <text
                        x={bayX + 32}
                        y={y + 43}
                        fontFamily="var(--font-mono)"
                        fontSize="8.5"
                        fontWeight="600"
                        fill="var(--ink-muted)"
                        textAnchor="middle"
                        opacity="0.8"
                      >
                        {`A1-${floor.level}0${colIdx + 1}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ==============================================================
              4. GROUND LEVEL SẢNH ĐÓN (ENTRANCE PORTICO & CANOPY)
              ============================================================== */}
          {/* Main Center Entrance Portico on Ground Floor */}
          <rect x="330" y="275" width="80" height="75" rx="3" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1.5" />
          {/* Glass Double Entrance Doors */}
          <rect x="345" y="295" width="22" height="55" fill="url(#windowLit)" stroke="#2563EB" strokeWidth="1" />
          <rect x="373" y="295" width="22" height="55" fill="url(#windowLit)" stroke="#2563EB" strokeWidth="1" />
          {/* Door Handles */}
          <line x1="364" y1="322" x2="364" y2="330" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="376" y1="322" x2="376" y2="330" stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Entrance Modern Cantilever Canopy (Mái sảnh đua) */}
          <polygon points="315,285 425,285 415,280 325,280" fill="#2563EB" />
          <text x="370" y="290" fontFamily="var(--font-sans)" fontSize="7.5" fontWeight="800" fill="#FFFFFF" textAnchor="middle">
            SẢNH CHÍNH A1
          </text>

          {/* Entrance Steps (Bậc tam cấp đại học) */}
          <rect x="310" y="350" width="120" height="4" fill="var(--hairline-medium)" />
          <rect x="300" y="354" width="140" height="4" fill="var(--hairline-medium)" />

          {/* ==============================================================
              5. GROUND LINE & CAMPUS URBAN ELEMENTS
              ============================================================== */}
          {/* University Ground Surface Line */}
          <line x1="10" y1="358" x2="670" y2="358" stroke="var(--hairline-medium)" strokeWidth="2.5" />

          {/* Stylized Architectural Campus Trees */}
          {/* Tree Left */}
          <g transform="translate(68, 290)">
            <line x1="18" y1="40" x2="18" y2="68" stroke="var(--hairline-medium)" strokeWidth="2.5" />
            <circle cx="18" cy="28" r="24" fill="rgba(16, 185, 129, 0.12)" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="18" cy="28" r="14" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.6" />
          </g>
          {/* Tree Right */}
          <g transform="translate(620, 295)">
            <line x1="16" y1="36" x2="16" y2="63" stroke="var(--hairline-medium)" strokeWidth="2.5" />
            <circle cx="16" cy="24" r="20" fill="rgba(16, 185, 129, 0.12)" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>

          {/* ==============================================================
              6. TECHNICAL GRID AXES ON TOP (TRỤC A, B, C, D, E, F)
              ============================================================== */}
          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((axis, i) => {
            const axisX = 135 + i * 74;
            return (
              <g key={`axis-${axis}`}>
                <line x1={axisX} y1="35" x2={axisX} y2="15" stroke="var(--hairline-medium)" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx={axisX} cy="10" r="7" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1" />
                <text x={axisX} y="13" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="700" fill="var(--ink-muted)" textAnchor="middle">
                  {axis}
                </text>
              </g>
            );
          })}

          {/* Architectural Compass Rose (Kim chỉ hướng Bắc) */}
          <g transform="translate(640, 45)">
            <circle cx="15" cy="15" r="14" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1" />
            <polygon points="15,4 12,15 15,12" fill="#EF4444" />
            <polygon points="15,4 18,15 15,12" fill="#B91C1C" />
            <polygon points="15,26 12,15 15,18" fill="var(--ink-muted)" />
            <polygon points="15,26 18,15 15,18" fill="var(--hairline-medium)" />
            <text x="15" y="2" fontFamily="var(--font-mono)" fontSize="7.5" fontWeight="800" fill="#EF4444" textAnchor="middle">
              N
            </text>
          </g>
        </svg>
      </div>

      {/* Dynamic Floor Telemetry Callout Card */}
      <div
        style={{
          margin: '0 16px 14px',
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'var(--surface-panel)',
          border: '1px solid var(--hairline-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#FFFFFF',
                background: currentDisplayFloor.highlightColor,
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              TẦNG {currentDisplayFloor.level}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-pure)' }}>
              {currentDisplayFloor.title.split('•')[1] || currentDisplayFloor.title}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
            {currentDisplayFloor.usage}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Hiện trạng phòng:</div>
            <div style={{ fontSize: '13px', fontWeight: 800 }}>
              <span style={{ color: '#10B981' }}>{currentDisplayFloor.avail} Trống</span>
              <span style={{ color: 'var(--ink-muted)', margin: '0 4px' }}>/</span>
              <span style={{ color: 'var(--ink-pure)' }}>{currentDisplayFloor.total} Phòng</span>
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#2563EB'
            }}
          >
            Độ khả dụng: {Math.round((currentDisplayFloor.avail / currentDisplayFloor.total) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
