import React from 'react';
import { Icons } from './SvgIcons';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';

/**
 * FloorPlan2D
 * Sơ đồ mặt bằng kiến trúc 2D tối giản, tinh gọn và thoáng đãng ("Đơn giản, không rối mắt")
 * 
 * Thiết kế tối ưu:
 * 1. Các phòng nằm ở mép ngoài tòa nhà (Mép Bắc & Mép Nam) tiếp xúc ánh sáng.
 * 2. Trung tâm là hành lang giao thông rộng 3.5m, thang máy và thang bộ thoát hiểm.
 * 3. Loại bỏ hoàn toàn chữ thừa, hộp lồng hộp, chỉ giữ lại: Tên phòng, Số chỗ, Đèn trạng thái và Dải màu phân loại.
 * 
 * Strict Native SVG Only — Zero external icon dependencies.
 */
export const FloorPlan2D = ({
  selectedFloor = 1,
  onChangeFloor,
  selectedRoom = null,
  onSelectRoom,
  onOpenBookingModal,
  getRoomSimulatedStatus,
  currentTimeString = '11:15'
}) => {
  const currentFloorData = CAMPUS_FLOORS[selectedFloor] || CAMPUS_FLOORS[1];

  const getCategoryColor = (categoryKey) => {
    return ROOM_CATEGORIES[categoryKey]?.color || '#94A3B8';
  };

  const getCategoryName = (categoryKey) => {
    return ROOM_CATEGORIES[categoryKey]?.name || 'Tiện ích';
  };

  const getCategoryShortName = (categoryKey) => {
    switch (categoryKey) {
      case 'public_service': return 'Dịch vụ';
      case 'lab': return 'Thí nghiệm';
      case 'event': return 'Sự kiện';
      case 'academic': return 'Học tập';
      case 'admin': return 'Hành chính';
      case 'utility': return 'Tiện ích';
      default: return 'Tiện ích';
    }
  };

  // Dimensions of SVG architectural canvas
  const canvasW = 960;
  const canvasH = 412;

  // Perimeter bounds for rooms
  const perimeterLeft = 20;
  const perimeterRight = 940;
  const availableWidth = perimeterRight - perimeterLeft; // 920px

  const topRoomY = 16;
  const roomHeight = 114;
  const bottomRoomY = 276;

  const corridorY = 130;
  const corridorH = 146;

  // Calculate clean layout positions along perimeter
  const layoutRoomsAlongEdge = (roomList) => {
    if (!roomList || roomList.length === 0) return [];
    const gap = 6;
    const totalGap = (roomList.length - 1) * gap;
    const totalSpan = roomList.reduce((sum, r) => sum + (r.flexSpan || 1), 0);
    const usableW = availableWidth - totalGap;

    let currentX = perimeterLeft;
    return roomList.map((room) => {
      const span = room.flexSpan || 1;
      const width = (usableW * span) / totalSpan;
      const x = currentX;
      currentX += width + gap;
      return {
        ...room,
        x,
        width
      };
    });
  };

  const topPlacedRooms = layoutRoomsAlongEdge(currentFloorData.topRooms);
  const bottomPlacedRooms = layoutRoomsAlongEdge(currentFloorData.bottomRooms);

  // Intelligent Door Placement: Ensures doors open into corridor/foyers, never into stair walls
  const getRoomDoorProps = (room, index, totalRooms) => {
    const rx = room.x;
    const rw = room.width;
    let doorX;

    if (index === 0) {
      // West corner room: place door safely on the right side opening into West Foyer
      doorX = Math.max(rx + rw - 36, 126);
    } else if (index === totalRooms - 1) {
      // East corner room: place door safely on the left side opening into East Foyer
      doorX = Math.min(rx + 16, 810);
    } else {
      // Middle rooms: comfortable offset from left wall
      doorX = rx + Math.min(22, rw / 3);
    }

    return {
      doorX,
      doorW: 24
    };
  };

  // Structural column grid positions along corridor boundaries (Trục lưới kết cấu 400x400)
  const structuralColumns = [20, 108, 230, 340, 480, 620, 730, 852, 940];

  // Intelligent Room Text Renderer: Prevents text from overflowing room boundary
  const renderRoomLabels = (room, rx, ry, rw, rh) => {
    const rawName = room.name || '';
    const maxChars = Math.floor((rw - 28) / 7.2); // safe single line limit
    const words = rawName.split(/[\s/]+/);

    if (rawName.length > maxChars && words.length > 1) {
      // Split into 2 neat lines
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      const fontSize = rw > 140 ? '11.5' : '10.5';

      return (
        <g style={{ pointerEvents: 'none' }}>
          <text
            x={rx + 16}
            y={ry + rh / 2 - 12}
            fontFamily="var(--font-sans)"
            fontSize={fontSize}
            fontWeight="700"
            fill="var(--ink-pure)"
          >
            {line1}
          </text>
          <text
            x={rx + 16}
            y={ry + rh / 2 + 2}
            fontFamily="var(--font-sans)"
            fontSize={fontSize}
            fontWeight="700"
            fill="var(--ink-pure)"
          >
            {line2}
          </text>
          <text
            x={rx + 16}
            y={ry + rh / 2 + 17}
            fontFamily="var(--font-sans)"
            fontSize="10"
            fill="var(--ink-muted)"
            fontWeight="500"
          >
            {room.capacity ? `${room.capacity} chỗ` : getCategoryShortName(room.category)}
          </text>
        </g>
      );
    }

    const fontSize = rw > 180 ? '13.5' : rw > 120 ? '12' : '11';
    return (
      <g style={{ pointerEvents: 'none' }}>
        <text
          x={rx + 16}
          y={ry + rh / 2 - 4}
          fontFamily="var(--font-sans)"
          fontSize={fontSize}
          fontWeight="700"
          fill="var(--ink-pure)"
        >
          {rawName}
        </text>
        <text
          x={rx + 16}
          y={ry + rh / 2 + 14}
          fontFamily="var(--font-sans)"
          fontSize="11"
          fill="var(--ink-muted)"
          fontWeight="500"
        >
          {room.capacity ? `${room.capacity} chỗ` : getCategoryShortName(room.category)}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ==============================================================
          1. HEADER CONTROLS & FLOOR LEVEL SELECTOR
          ============================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--surface-panel)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid var(--hairline-soft)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 800,
                color: '#38BDF8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              {currentFloorData.floorCode}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)' }}>
              {currentFloorData.title}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Mặt bằng kiến trúc chuẩn: Phòng học mép ngoài • Trục hành lang 3.5m & Sảnh đệm kết nối
          </div>
        </div>

        {/* 5-Story Floor Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((fl) => {
            const isActive = selectedFloor === fl;
            const flData = CAMPUS_FLOORS[fl];
            return (
              <button
                key={fl}
                type="button"
                onClick={() => onChangeFloor && onChangeFloor(fl)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid #38BDF8' : '1px solid var(--hairline-medium)',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'var(--canvas-subtle)',
                  color: isActive ? '#38BDF8' : 'var(--ink-primary)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={flData?.title}
              >
                <span>Tầng {fl}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==============================================================
          2. ARCHITECTURAL 2D FLOOR PLAN WITH COMPLETE CIRCULATION
          ============================================================== */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          background: 'var(--canvas-subtle)',
          borderRadius: '16px',
          border: '1px solid var(--hairline-medium)',
          padding: '16px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <svg
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          style={{ width: '100%', height: 'auto', minWidth: '780px', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Subtle floor tile grid pattern for the corridor circulation zone */}
            <pattern id="corridor-tiles" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect width="18" height="18" fill="var(--surface-panel)" />
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="var(--hairline-soft)" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>

          {/* Outer Perimeter Wall of Building (Tường bao mép ngoài tòa nhà) */}
          <rect
            x="16"
            y="12"
            width={canvasW - 32}
            height={canvasH - 24}
            fill="none"
            stroke="var(--hairline-strong)"
            strokeWidth="2.5"
            rx="8"
          />

          {/* Exterior Window Lines on North & South Facades */}
          {[40, 150, 260, 370, 480, 590, 700, 810].map((wx) => (
            <g key={wx} stroke="#38BDF8" strokeWidth="2.5" opacity="0.6">
              <line x1={wx} y1="12" x2={wx + 65} y2="12" />
              <line x1={wx} y1={canvasH - 12} x2={wx + 65} y2={canvasH - 12} />
            </g>
          ))}

          {/* Exterior Fire Exit Door Lines on West & East Facades */}
          <line x1="16" y1={corridorY + 45} x2="16" y2={corridorY + 101} stroke="#10B981" strokeWidth="3.5" />
          <line x1={canvasW - 16} y1={corridorY + 45} x2={canvasW - 16} y2={corridorY + 101} stroke="#10B981" strokeWidth="3.5" />

          {/* ==============================================================
              3. SÀN HÀNH LANG & TRỤC GIAO THÔNG CHÍNH (CORRIDOR CIRCULATION)
              ============================================================== */}
          {/* Sàn gạch phân tầng riêng biệt cho toàn bộ dải hành lang trung tâm */}
          <rect
            x="108"
            y={corridorY}
            width={canvasW - 216}
            height={corridorH}
            fill="url(#corridor-tiles)"
            stroke="none"
          />

          {/* Tường ngăn hành lang với các phòng (Boundary Walls) */}
          <line x1="108" y1={corridorY} x2={canvasW - 108} y2={corridorY} stroke="var(--hairline-strong)" strokeWidth="2.5" />
          <line x1="108" y1={corridorY + corridorH} x2={canvasW - 108} y2={corridorY + corridorH} stroke="var(--hairline-strong)" strokeWidth="2.5" />

          {/* Tường đặc ngăn buồng thang Tây & Đông với các phòng góc */}
          <line x1="20" y1={corridorY} x2="108" y2={corridorY} stroke="var(--ink-muted)" strokeWidth="3.5" />
          <line x1="20" y1={corridorY + corridorH} x2="108" y2={corridorY + corridorH} stroke="var(--ink-muted)" strokeWidth="3.5" />
          <line x1={canvasW - 108} y1={corridorY} x2={canvasW - 20} y2={corridorY} stroke="var(--ink-muted)" strokeWidth="3.5" />
          <line x1={canvasW - 108} y1={corridorY + corridorH} x2={canvasW - 20} y2={corridorY + corridorH} stroke="var(--ink-muted)" strokeWidth="3.5" />

          {/* Trục dẫn hướng giao thông Hành Lang Nhánh Bắc (2.4m) */}
          <line x1="210" y1={corridorY + 20} x2={canvasW - 210} y2={corridorY + 20} stroke="#38BDF8" strokeWidth="1" strokeDasharray="6 4" opacity="0.45" />
          <text
            x={canvasW / 2}
            y={corridorY + 16}
            fontFamily="var(--font-sans)"
            fontSize="8"
            fontWeight="800"
            letterSpacing="0.08em"
            fill="var(--laser-cyan)"
            textAnchor="middle"
            style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
          >
            ◄── HÀNH LANG NHÁNH BẮC (RỘNG 2.4M) • PHỤC VỤ DÃY PHÒNG BẮC ──►
          </text>

          {/* Trục dẫn hướng giao thông Hành Lang Nhánh Nam (2.4m) */}
          <line x1="210" y1={corridorY + corridorH - 20} x2={canvasW - 210} y2={corridorY + corridorH - 20} stroke="#38BDF8" strokeWidth="1" strokeDasharray="6 4" opacity="0.45" />
          <text
            x={canvasW / 2}
            y={corridorY + corridorH - 12}
            fontFamily="var(--font-sans)"
            fontSize="8"
            fontWeight="800"
            letterSpacing="0.08em"
            fill="var(--laser-cyan)"
            textAnchor="middle"
            style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
          >
            ◄── HÀNH LANG NHÁNH NAM (RỘNG 2.4M) • PHỤC VỤ DÃY PHÒNG NAM ──►
          </text>

          {/* SẢNH THANG TÂY (WEST FOYER - RỘNG 3.5M) */}
          <g id="west-foyer" style={{ pointerEvents: 'none' }}>
            <text x="168" y={corridorY + 68} fontSize="9" fontWeight="800" fill="var(--ink-pure)" letterSpacing="0.05em" textAnchor="middle">
              SẢNH THANG TÂY
            </text>
            <text x="168" y={corridorY + 82} fontSize="7.5" fontWeight="600" fill="var(--ink-muted)" textAnchor="middle">
              Rộng 3.5m • Nút giao thông
            </text>
            {/* Đèn chỉ dẫn thoát nạn EXIT vào thang Tây */}
            <g transform={`translate(114, ${corridorY + 65})`}>
              <rect x="0" y="-8" width="34" height="15" rx="3" fill="#10B981" />
              <text x="17" y="3" fontSize="7.5" fontWeight="900" fill="#FFFFFF" textAnchor="middle">◄ EXIT</text>
            </g>
            {/* Hộp cứu hỏa PCCC vách tường */}
            <g transform={`translate(114, ${corridorY + 16})`}>
              <rect x="0" y="0" width="28" height="14" rx="2" fill="#EF4444" />
              <text x="14" y="10" fontSize="7.5" fontWeight="900" fill="#FFFFFF" textAnchor="middle">PCCC</text>
            </g>
            {/* Cây nước uống học đường tiện ích */}
            <g transform={`translate(114, ${corridorY + corridorH - 30})`}>
              <rect x="0" y="0" width="36" height="15" rx="3" fill="rgba(56, 189, 248, 0.12)" stroke="#38BDF8" strokeWidth="0.8" />
              <text x="18" y="11" fontSize="7" fontWeight="700" fill="#38BDF8" textAnchor="middle">💧 CÂY NƯỚC</text>
            </g>
          </g>

          {/* SẢNH THANG ĐÔNG (EAST FOYER - RỘNG 3.5M) */}
          <g id="east-foyer" style={{ pointerEvents: 'none' }}>
            <text x={canvasW - 168} y={corridorY + 68} fontSize="9" fontWeight="800" fill="var(--ink-pure)" letterSpacing="0.05em" textAnchor="middle">
              SẢNH THANG ĐÔNG
            </text>
            <text x={canvasW - 168} y={corridorY + 82} fontSize="7.5" fontWeight="600" fill="var(--ink-muted)" textAnchor="middle">
              Rộng 3.5m • Nút giao thông
            </text>
            {/* Đèn chỉ dẫn thoát nạn EXIT vào thang Đông */}
            <g transform={`translate(${canvasW - 148}, ${corridorY + 65})`}>
              <rect x="0" y="-8" width="34" height="15" rx="3" fill="#10B981" />
              <text x="17" y="3" fontSize="7.5" fontWeight="900" fill="#FFFFFF" textAnchor="middle">EXIT ►</text>
            </g>
            {/* Hộp cứu hỏa PCCC vách tường */}
            <g transform={`translate(${canvasW - 142}, ${corridorY + 16})`}>
              <rect x="0" y="0" width="28" height="14" rx="2" fill="#EF4444" />
              <text x="14" y="10" fontSize="7.5" fontWeight="900" fill="#FFFFFF" textAnchor="middle">PCCC</text>
            </g>
            {/* Cụm thùng rác phân loại 3 màu */}
            <g transform={`translate(${canvasW - 150}, ${corridorY + corridorH - 26})`}>
              <rect x="0" y="0" width="10" height="12" rx="2" fill="#10B981" />
              <rect x="12" y="0" width="10" height="12" rx="2" fill="#F59E0B" />
              <rect x="24" y="0" width="10" height="12" rx="2" fill="#64748B" />
              <text x="17" y="-3" fontSize="6.5" fontWeight="700" fill="var(--ink-muted)" textAnchor="middle">RÁC 3 MÀU</text>
            </g>
          </g>

          {/* ==============================================================
              LÕI DỊCH VỤ TRUNG TÂM (CENTRAL UTILITY & ELEVATOR CORE)
              Nằm cân đối giữa hành lang, để hở 2 làn đi thông thoáng 2 bên
              ============================================================== */}
          <g id="central-core">
            {/* Thang Máy A */}
            <g transform={`translate(${canvasW / 2 - 128}, ${corridorY + 38})`}>
              <rect x="0" y="0" width="46" height="58" fill="var(--canvas-subtle)" stroke="var(--hairline-strong)" strokeWidth="1.2" rx="4" />
              <line x1="0" y1="0" x2="46" y2="58" stroke="var(--hairline-soft)" strokeWidth="0.8" />
              <line x1="46" y1="0" x2="0" y2="58" stroke="var(--hairline-soft)" strokeWidth="0.8" />
              <rect x="10" y="16" width="26" height="26" rx="2" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
              <text x="23" y="32" fontSize="7.5" fontWeight="900" fill="var(--ink-pure)" textAnchor="middle">THANG A</text>
              <text x="23" y="52" fontSize="6.5" fontWeight="700" fill="#38BDF8" textAnchor="middle">▲ 1000KG</text>
            </g>

            {/* Thang Máy B */}
            <g transform={`translate(${canvasW / 2 - 76}, ${corridorY + 38})`}>
              <rect x="0" y="0" width="46" height="58" fill="var(--canvas-subtle)" stroke="var(--hairline-strong)" strokeWidth="1.2" rx="4" />
              <line x1="0" y1="0" x2="46" y2="58" stroke="var(--hairline-soft)" strokeWidth="0.8" />
              <line x1="46" y1="0" x2="0" y2="58" stroke="var(--hairline-soft)" strokeWidth="0.8" />
              <rect x="10" y="16" width="26" height="26" rx="2" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
              <text x="23" y="32" fontSize="7.5" fontWeight="900" fill="var(--ink-pure)" textAnchor="middle">THANG B</text>
              <text x="23" y="52" fontSize="6.5" fontWeight="700" fill="#38BDF8" textAnchor="middle">▼ 1000KG</text>
            </g>

            {/* Giếng Trời Thông Tầng & Sảnh Nghỉ Có Ghế Băng */}
            <g transform={`translate(${canvasW / 2 - 20}, ${corridorY + 38})`}>
              {/* Vùng giếng trời với lan can kính an toàn */}
              <rect x="0" y="0" width="148" height="58" fill="rgba(56, 189, 248, 0.04)" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" strokeDasharray="4 2" rx="5" />
              <text x="74" y="24" fontSize="8.5" fontWeight="800" fill="var(--laser-cyan)" textAnchor="middle">GIẾNG TRỜI THÔNG TẦNG</text>
              <text x="74" y="38" fontSize="7" fontWeight="500" fill="var(--ink-muted)" textAnchor="middle">Sảnh Đón Gió Tự Nhiên • Chiếu Sáng</text>

              {/* Ghế băng nghỉ chân hành lang sinh viên (Benches) */}
              <rect x="12" y="44" width="46" height="8" rx="2" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
              <text x="35" y="50.5" fontSize="6" fontWeight="700" fill="var(--ink-muted)" textAnchor="middle">GHẾ NGHỈ</text>

              <rect x="90" y="44" width="46" height="8" rx="2" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
              <text x="113" y="50.5" fontSize="6" fontWeight="700" fill="var(--ink-muted)" textAnchor="middle">GHẾ NGHỈ</text>
            </g>
          </g>

          {/* ==============================================================
              HỆ THỐNG CỘT KẾT CẤU CHỊU LỰC (STRUCTURAL COLUMNS 400x400)
              Tạo nhịp điệu kỹ thuật chuẩn CAD dọc 2 mép hành lang
              ============================================================== */}
          {structuralColumns.map((cx) => (
            <g key={`col-${cx}`}>
              {/* Cột hàng Bắc */}
              <rect
                x={cx - 4.5}
                y={corridorY - 4.5}
                width="9"
                height="9"
                fill="var(--ink-muted)"
                stroke="var(--hairline-strong)"
                strokeWidth="0.8"
                rx="1"
              />
              {/* Cột hàng Nam */}
              <rect
                x={cx - 4.5}
                y={corridorY + corridorH - 4.5}
                width="9"
                height="9"
                fill="var(--ink-muted)"
                stroke="var(--hairline-strong)"
                strokeWidth="0.8"
                rx="1"
              />
            </g>
          ))}

          {/* ==============================================================
              WEST STAIRWELL CORE — BUỒNG THANG BỘ 2 VẾ THUẬN TRỤC HÀNH LANG (TÂY)
              Chuẩn QCVN 06:2022/BXD: Đi thẳng từ sảnh Tây vào buồng thang
              ============================================================== */}
          <g id="west-stairwell">
            {/* Buồng thang kín bao quanh */}
            <rect
              x="20"
              y={corridorY}
              width="88"
              height={corridorH}
              fill="var(--canvas-subtle)"
              stroke="var(--hairline-medium)"
              strokeWidth="1.2"
              rx="4"
            />

            {/* Chiếu nghỉ giữa tầng (Mid-landing) sát tường ngoài Tây lấy sáng */}
            <rect
              x="20"
              y={corridorY}
              width="28"
              height={corridorH}
              fill="var(--surface-panel)"
              stroke="var(--hairline-soft)"
              strokeWidth="0.8"
            />
            {/* Kính lấy sáng mặt ngoài Tây */}
            <line x1="20" y1={corridorY + 20} x2="20" y2={corridorY + 56} stroke="#38BDF8" strokeWidth="2.5" />
            <line x1="20" y1={corridorY + 90} x2="20" y2={corridorY + 126} stroke="#38BDF8" strokeWidth="2.5" />
            <text
              x="34"
              y={corridorY + corridorH / 2}
              fontFamily="var(--font-sans)"
              fontSize="7.5"
              fontWeight="700"
              fill="var(--ink-muted)"
              textAnchor="middle"
              transform={`rotate(-90, 34, ${corridorY + corridorH / 2})`}
              style={{ letterSpacing: '0.08em' }}
            >
              CHIẾU NGHỈ
            </text>

            {/* Vế thang Bắc (Vế Đi Lên — UP Flight) */}
            <rect x="48" y={corridorY + 4} width="58" height="62" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[55, 62, 69, 76, 83, 90, 97].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 4} x2={tx} y2={corridorY + 66} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Lên */}
            <line x1="98" y1={corridorY + 34} x2="54" y2={corridorY + 34} stroke="#38BDF8" strokeWidth="1.2" />
            <polyline points={`59,${corridorY + 30} 53,${corridorY + 34} 59,${corridorY + 38}`} fill="none" stroke="#38BDF8" strokeWidth="1.2" />
            <text x="76" y={corridorY + 26} fontSize="7.5" fontWeight="800" fill="#38BDF8" textAnchor="middle">
              LÊN ▲
            </text>

            {/* Khe hở kỹ thuật / Giếng thang & Tay vịn ở giữa */}
            <rect x="48" y={corridorY + 66} width="58" height="14" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />

            {/* Vế thang Nam (Vế Đi Xuống — DOWN Flight) */}
            <rect x="48" y={corridorY + 80} width="58" height="62" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[55, 62, 69, 76, 83, 90, 97].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 80} x2={tx} y2={corridorY + 142} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Xuống */}
            <line x1="54" y1={corridorY + 110} x2="98" y2={corridorY + 110} stroke="#10B981" strokeWidth="1.2" />
            <polyline points={`93,${corridorY + 106} 99,${corridorY + 110} 93,${corridorY + 114}`} fill="none" stroke="#10B981" strokeWidth="1.2" />
            <text x="76" y={corridorY + 104} fontSize="7.5" fontWeight="800" fill="#10B981" textAnchor="middle">
              ▼ XUỐNG
            </text>

            {/* Cửa chống cháy tự đóng mở vào sảnh (Fire Door) */}
            <line x1="108" y1={corridorY + 28} x2="108" y2={corridorY + 118} stroke="#10B981" strokeWidth="3" strokeDasharray="5 3" />
            {/* Ký hiệu mở cửa thoát nạn hướng vào thang */}
            <path d={`M 108 ${corridorY + 48} A 22 22 0 0 0 86 ${corridorY + 70}`} fill="none" stroke="#10B981" strokeWidth="1.2" strokeDasharray="2 2" />

            <text x="64" y={corridorY - 6} fontFamily="var(--font-sans)" fontSize="7.5" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">
              THANG TÂY (THOÁT HIỂM)
            </text>
          </g>

          {/* ==============================================================
              EAST STAIRWELL CORE — BUỒNG THANG BỘ 2 VẾ THUẬN TRỤC HÀNH LANG (ĐÔNG)
              Chuẩn QCVN 06:2022/BXD: Đối xứng hoàn hảo đầu hồi phía Đông
              ============================================================== */}
          <g id="east-stairwell">
            {/* Buồng thang kín bao quanh */}
            <rect
              x={canvasW - 108}
              y={corridorY}
              width="88"
              height={corridorH}
              fill="var(--canvas-subtle)"
              stroke="var(--hairline-medium)"
              strokeWidth="1.2"
              rx="4"
            />

            {/* Vế thang Bắc (Vế Đi Lên — UP Flight) */}
            <rect x={canvasW - 106} y={corridorY + 4} width="58" height="62" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[canvasW - 99, canvasW - 92, canvasW - 85, canvasW - 78, canvasW - 71, canvasW - 64, canvasW - 57].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 4} x2={tx} y2={corridorY + 66} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Lên */}
            <line x1={canvasW - 100} y1={corridorY + 34} x2={canvasW - 56} y2={corridorY + 34} stroke="#38BDF8" strokeWidth="1.2" />
            <polyline points={`${canvasW - 61},${corridorY + 30} ${canvasW - 55},${corridorY + 34} ${canvasW - 61},${corridorY + 38}`} fill="none" stroke="#38BDF8" strokeWidth="1.2" />
            <text x={canvasW - 78} y={corridorY + 26} fontSize="7.5" fontWeight="800" fill="#38BDF8" textAnchor="middle">
              LÊN ▲
            </text>

            {/* Khe hở kỹ thuật / Giếng thang & Tay vịn ở giữa */}
            <rect x={canvasW - 106} y={corridorY + 66} width="58" height="14" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />

            {/* Vế thang Nam (Vế Đi Xuống — DOWN Flight) */}
            <rect x={canvasW - 106} y={corridorY + 80} width="58" height="62" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[canvasW - 99, canvasW - 92, canvasW - 85, canvasW - 78, canvasW - 71, canvasW - 64, canvasW - 57].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 80} x2={tx} y2={corridorY + 142} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Xuống */}
            <line x1={canvasW - 56} y1={corridorY + 110} x2={canvasW - 100} y2={corridorY + 110} stroke="#10B981" strokeWidth="1.2" />
            <polyline points={`${canvasW - 95},${corridorY + 106} ${canvasW - 101},${corridorY + 110} ${canvasW - 95},${corridorY + 114}`} fill="none" stroke="#10B981" strokeWidth="1.2" />
            <text x={canvasW - 78} y={corridorY + 104} fontSize="7.5" fontWeight="800" fill="#10B981" textAnchor="middle">
              ▼ XUỐNG
            </text>

            {/* Chiếu nghỉ giữa tầng (Mid-landing) sát tường ngoài Đông lấy sáng */}
            <rect
              x={canvasW - 48}
              y={corridorY}
              width="28"
              height={corridorH}
              fill="var(--surface-panel)"
              stroke="var(--hairline-soft)"
              strokeWidth="0.8"
            />
            {/* Kính lấy sáng mặt ngoài Đông */}
            <line x1={canvasW - 20} y1={corridorY + 20} x2={canvasW - 20} y2={corridorY + 56} stroke="#38BDF8" strokeWidth="2.5" />
            <line x1={canvasW - 20} y1={corridorY + 90} x2={canvasW - 20} y2={corridorY + 126} stroke="#38BDF8" strokeWidth="2.5" />
            <text
              x={canvasW - 34}
              y={corridorY + corridorH / 2}
              fontFamily="var(--font-sans)"
              fontSize="7.5"
              fontWeight="700"
              fill="var(--ink-muted)"
              textAnchor="middle"
              transform={`rotate(90, ${canvasW - 34}, ${corridorY + corridorH / 2})`}
              style={{ letterSpacing: '0.08em' }}
            >
              CHIẾU NGHỈ
            </text>

            {/* Cửa chống cháy tự đóng mở vào sảnh (Fire Door) */}
            <line x1={canvasW - 108} y1={corridorY + 28} x2={canvasW - 108} y2={corridorY + 118} stroke="#10B981" strokeWidth="3" strokeDasharray="5 3" />
            {/* Ký hiệu mở cửa thoát nạn hướng vào thang */}
            <path d={`M ${canvasW - 108} ${corridorY + 48} A 22 22 0 0 1 ${canvasW - 86} ${corridorY + 70}`} fill="none" stroke="#10B981" strokeWidth="1.2" strokeDasharray="2 2" />

            <text x={canvasW - 64} y={corridorY - 6} fontFamily="var(--font-sans)" fontSize="7.5" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">
              THANG ĐÔNG (THOÁT HIỂM)
            </text>
          </g>

          {/* ==============================================================
              4. TOP ROW ROOMS — NẰM DỌC SÁT MÉP BẮC TÒA NHÀ
              ============================================================== */}
          {topPlacedRooms.map((room, idx) => {
            const rx = room.x;
            const rw = room.width;
            const ry = topRoomY;
            const rh = roomHeight;
            const catColor = getCategoryColor(room.category);
            const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
            const isSelected = selectedRoom?.code === room.code;
            const { doorX, doorW } = getRoomDoorProps(room, idx, topPlacedRooms.length);

            return (
              <g
                key={room.id}
                onClick={() => onSelectRoom && onSelectRoom(room)}
                style={{ cursor: 'pointer' }}
              >
                <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

                {/* Room Outer Boundary Box */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx="4"
                  fill={isSelected ? 'var(--surface-panel)' : 'var(--canvas-subtle)'}
                  stroke={isSelected ? catColor : 'var(--hairline-medium)'}
                  strokeWidth={isSelected ? '2.4' : '1.1'}
                  style={{
                    transition: 'all 0.15s ease',
                    filter: isSelected ? `drop-shadow(0 3px 10px ${catColor}40)` : 'none'
                  }}
                />

                {/* Left Category Accent Line */}
                <rect
                  x={rx + 6}
                  y={ry + 8}
                  width="4"
                  height={rh - 16}
                  rx="2"
                  fill={catColor}
                />

                {/* Status Dot in Top Right */}
                <circle
                  cx={rx + rw - 13}
                  cy={ry + 13}
                  r="4"
                  fill={sim.color}
                />

                {/* Door Opening & Threshold (Khoảng mở tường & Khuôn cửa) */}
                <line x1={doorX} y1={ry + rh} x2={doorX + doorW} y2={ry + rh} stroke="var(--canvas-subtle)" strokeWidth="3" />
                {/* Door leaf swinging 90 deg inward into room */}
                <line x1={doorX} y1={ry + rh} x2={doorX} y2={ry + rh - 22} stroke={catColor} strokeWidth="1.6" />
                <path
                  d={`M ${doorX} ${ry + rh - 22} A 22 22 0 0 1 ${doorX + 22} ${ry + rh}`}
                  fill="none"
                  stroke={catColor}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Room Name & Info */}
                {renderRoomLabels(room, rx, ry, rw, rh)}
              </g>
            );
          })}

          {/* ==============================================================
              5. BOTTOM ROW ROOMS — NẰM DỌC SÁT MÉP NAM TÒA NHÀ
              ============================================================== */}
          {bottomPlacedRooms.map((room, idx) => {
            const rx = room.x;
            const rw = room.width;
            const ry = bottomRoomY;
            const rh = roomHeight;
            const catColor = getCategoryColor(room.category);
            const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
            const isSelected = selectedRoom?.code === room.code;
            const { doorX, doorW } = getRoomDoorProps(room, idx, bottomPlacedRooms.length);

            return (
              <g
                key={room.id}
                onClick={() => onSelectRoom && onSelectRoom(room)}
                style={{ cursor: 'pointer' }}
              >
                <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

                {/* Room Outer Boundary Box */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx="4"
                  fill={isSelected ? 'var(--surface-panel)' : 'var(--canvas-subtle)'}
                  stroke={isSelected ? catColor : 'var(--hairline-medium)'}
                  strokeWidth={isSelected ? '2.4' : '1.1'}
                  style={{
                    transition: 'all 0.15s ease',
                    filter: isSelected ? `drop-shadow(0 3px 10px ${catColor}40)` : 'none'
                  }}
                />

                {/* Left Category Accent Line */}
                <rect
                  x={rx + 6}
                  y={ry + 8}
                  width="4"
                  height={rh - 16}
                  rx="2"
                  fill={catColor}
                />

                {/* Status Dot in Top Right */}
                <circle
                  cx={rx + rw - 13}
                  cy={ry + 13}
                  r="4"
                  fill={sim.color}
                />

                {/* Door Opening & Threshold (Khoảng mở tường & Khuôn cửa) */}
                <line x1={doorX} y1={ry} x2={doorX + doorW} y2={ry} stroke="var(--canvas-subtle)" strokeWidth="3" />
                {/* Door leaf swinging 90 deg inward into room */}
                <line x1={doorX} y1={ry} x2={doorX} y2={ry + 22} stroke={catColor} strokeWidth="1.6" />
                <path
                  d={`M ${doorX} ${ry + 22} A 22 22 0 0 0 ${doorX + 22} ${ry}`}
                  fill="none"
                  stroke={catColor}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Room Name & Info */}
                {renderRoomLabels(room, rx, ry, rw, rh)}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ==============================================================
          3. CATEGORY LEGEND BAR (CHÚ THÍCH MÀU DANH MỤC GỌN GÀNG)
          ============================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--surface-panel)',
          padding: '10px 18px',
          borderRadius: '12px',
          border: '1px solid var(--hairline-soft)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '12px' }}>
          {Object.values(ROOM_CATEGORIES).map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2.5px',
                  background: cat.color
                }}
              />
              <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{cat.name}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
          💡 Nhấp vào bất kỳ phòng nào để xem trang thiết bị & đặt phòng bên phải
        </div>
      </div>
    </div>
  );
};
