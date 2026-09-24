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
  const canvasH = 390;

  // Perimeter bounds for rooms (Mở rộng toàn bộ mép Tây & Đông để lấp kín 4 khoảng trống quanh cầu thang)
  const perimeterLeft = 20;
  const perimeterRight = 940;
  const availableWidth = perimeterRight - perimeterLeft; // 920px

  const topRoomY = 18;
  const roomHeight = 118;
  const bottomRoomY = 252;

  const corridorY = 140;
  const corridorH = 108;

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
            Sơ đồ mặt bằng 2D: Phòng nằm ở mép ngoài • Hành lang trung tâm kết nối
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
          2. MINIMALIST 2D ARCHITECTURAL FLOOR PLAN (TỐI GIẢN & THOÁNG ĐÃNG)
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
          {/* Outer Perimeter Wall of Building (Tường bao mép ngoài tòa nhà) */}
          <rect
            x="16"
            y="12"
            width={canvasW - 32}
            height={canvasH - 24}
            fill="none"
            stroke="var(--hairline-medium)"
            strokeWidth="2"
            rx="10"
          />

          {/* Exterior Window Lines on North & South Facades */}
          {[40, 150, 260, 370, 480, 590, 700, 810].map((wx) => (
            <g key={wx} stroke="#38BDF8" strokeWidth="2.5" opacity="0.6">
              <line x1={wx} y1="12" x2={wx + 65} y2="12" />
              <line x1={wx} y1={canvasH - 12} x2={wx + 65} y2={canvasH - 12} />
            </g>
          ))}

          {/* Exterior Fire Exit Door Lines on West & East Facades */}
          <line x1="16" y1={corridorY + 36} x2="16" y2={corridorY + 72} stroke="#10B981" strokeWidth="3.5" />
          <line x1={canvasW - 16} y1={corridorY + 36} x2={canvasW - 16} y2={corridorY + 72} stroke="#10B981" strokeWidth="3.5" />

          {/* ==============================================================
              3. CENTRAL CORRIDOR & UTILITY CORE (HÀNH LANG TRUNG TÂM)
              ============================================================== */}
          <rect
            x="108"
            y={corridorY}
            width={canvasW - 216}
            height={corridorH}
            fill="var(--surface-panel)"
            stroke="var(--hairline-soft)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {/* Corridor Directional Label */}
          <text
            x={canvasW / 2}
            y={corridorY + 20}
            fontFamily="var(--font-sans)"
            fontSize="10"
            fontWeight="800"
            letterSpacing="0.08em"
            fill="var(--ink-muted)"
            textAnchor="middle"
            style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
          >
            ◄ TRỤC HÀNH LANG CHÍNH (RỘNG 3.5M) • THOÁT NẠN 2 ĐẦU HỒI ►
          </text>

          {/* Center Elevators & Atrium Lounge (Cụm Thang Máy & Giếng Trời) */}
          <g transform={`translate(${canvasW / 2 - 120}, ${corridorY + 34})`}>
            {/* Elevator A */}
            <rect x="0" y="0" width="46" height="50" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1" rx="4" />
            <line x1="0" y1="0" x2="46" y2="50" stroke="var(--hairline-soft)" strokeWidth="0.8" />
            <line x1="46" y1="0" x2="0" y2="50" stroke="var(--hairline-soft)" strokeWidth="0.8" />
            <text x="23" y="30" fontSize="8" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">THANG A</text>

            {/* Elevator B */}
            <rect x="54" y="0" width="46" height="50" fill="var(--canvas-subtle)" stroke="var(--hairline-medium)" strokeWidth="1" rx="4" />
            <line x1="54" y1="0" x2="100" y2="50" stroke="var(--hairline-soft)" strokeWidth="0.8" />
            <line x1="100" y1="0" x2="54" y2="50" stroke="var(--hairline-soft)" strokeWidth="0.8" />
            <text x="77" y="30" fontSize="8" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">THANG B</text>

            {/* Sảnh đệm thông tầng / Giếng trời gió tự nhiên */}
            <rect x="112" y="0" width="128" height="50" fill="rgba(56, 189, 248, 0.04)" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" strokeDasharray="3 2" rx="4" />
            <text x="176" y="22" fontSize="8" fontWeight="700" fill="var(--laser-cyan)" textAnchor="middle">GIẾNG TRỜI THÔNG TẦNG</text>
            <text x="176" y="36" fontSize="7" fontWeight="500" fill="var(--ink-muted)" textAnchor="middle">Sảnh Nghỉ • Gió Tự Nhiên</text>
          </g>

          {/* ==============================================================
              WEST STAIRWELL CORE — BUỒNG THANG BỘ 2 VẾ THUẬN TRỤC HÀNH LANG (TÂY)
              Chuẩn QCVN 06:2022/BXD: Đi thẳng từ hành lang vào sảnh đón, 2 vế ngược chiều
              ============================================================== */}
          <g id="west-stairwell">
            {/* Buồng thang kín bao quanh */}
            <rect
              x="20"
              y={corridorY}
              width="86"
              height={corridorH}
              fill="var(--canvas-subtle)"
              stroke="var(--hairline-medium)"
              strokeWidth="1.2"
              rx="6"
            />

            {/* Chiếu nghỉ giữa tầng (Mid-landing) sát tường ngoài Tây lấy sáng */}
            <rect
              x="20"
              y={corridorY}
              width="26"
              height={corridorH}
              fill="var(--surface-panel)"
              stroke="var(--hairline-soft)"
              strokeWidth="0.8"
              rx="5"
            />
            {/* Kính lấy sáng mặt ngoài Tây */}
            <line x1="20" y1={corridorY + 16} x2="20" y2={corridorY + 44} stroke="#38BDF8" strokeWidth="2.5" />
            <line x1="20" y1={corridorY + 64} x2="20" y2={corridorY + 92} stroke="#38BDF8" strokeWidth="2.5" />
            <text
              x="33"
              y={corridorY + corridorH / 2}
              fontFamily="var(--font-sans)"
              fontSize="7"
              fontWeight="700"
              fill="var(--ink-muted)"
              textAnchor="middle"
              transform={`rotate(-90, 33, ${corridorY + corridorH / 2})`}
              style={{ letterSpacing: '0.08em' }}
            >
              CHIẾU NGHỈ
            </text>

            {/* Vế thang Bắc (Vế Đi Lên — UP Flight) */}
            <rect x="46" y={corridorY + 3} width="58" height="47" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[53, 60, 67, 74, 81, 88, 95].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 3} x2={tx} y2={corridorY + 50} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Lên */}
            <line x1="96" y1={corridorY + 26} x2="52" y2={corridorY + 26} stroke="#38BDF8" strokeWidth="1.2" />
            <polyline points={`57,${corridorY + 22} 51,${corridorY + 26} 57,${corridorY + 30}`} fill="none" stroke="#38BDF8" strokeWidth="1.2" />
            <text x="74" y={corridorY + 20} fontSize="7" fontWeight="800" fill="#38BDF8" textAnchor="middle">
              LÊN ▲
            </text>

            {/* Khe hở kỹ thuật / Giếng thang & Tay vịn ở giữa */}
            <rect x="46" y={corridorY + 50} width="58" height="8" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />

            {/* Vế thang Nam (Vế Đi Xuống — DOWN Flight) */}
            <rect x="46" y={corridorY + 58} width="58" height="47" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[53, 60, 67, 74, 81, 88, 95].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 58} x2={tx} y2={corridorY + 105} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Xuống */}
            <line x1="52" y1={corridorY + 82} x2="96" y2={corridorY + 82} stroke="#10B981" strokeWidth="1.2" />
            <polyline points={`91,${corridorY + 78} 97,${corridorY + 82} 91,${corridorY + 86}`} fill="none" stroke="#10B981" strokeWidth="1.2" />
            <text x="74" y={corridorY + 77} fontSize="7" fontWeight="800" fill="#10B981" textAnchor="middle">
              ▼ XUỐNG
            </text>

            {/* Cửa chống cháy tự đóng mở vào hành lang (Fire Door) */}
            <line x1="106" y1={corridorY + 18} x2="106" y2={corridorY + 90} stroke="#10B981" strokeWidth="2.5" strokeDasharray="5 3" />
            {/* Ký hiệu mở cửa thoát nạn hướng vào thang */}
            <path d={`M 106 ${corridorY + 36} A 16 16 0 0 0 92 ${corridorY + 52}`} fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />

            <text x="63" y={corridorY - 4} fontFamily="var(--font-sans)" fontSize="7.5" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">
              THANG TÂY (2 VẾ)
            </text>
          </g>

          {/* ==============================================================
              EAST STAIRWELL CORE — BUỒNG THANG BỘ 2 VẾ THUẬN TRỤC HÀNH LANG (ĐÔNG)
              Chuẩn QCVN 06:2022/BXD: Đối xứng hoàn hảo đầu hồi phía Đông
              ============================================================== */}
          <g id="east-stairwell">
            {/* Buồng thang kín bao quanh */}
            <rect
              x={canvasW - 106}
              y={corridorY}
              width="86"
              height={corridorH}
              fill="var(--canvas-subtle)"
              stroke="var(--hairline-medium)"
              strokeWidth="1.2"
              rx="6"
            />

            {/* Vế thang Bắc (Vế Đi Lên — UP Flight) */}
            <rect x={canvasW - 104} y={corridorY + 3} width="58" height="47" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[canvasW - 97, canvasW - 90, canvasW - 83, canvasW - 76, canvasW - 69, canvasW - 62, canvasW - 55].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 3} x2={tx} y2={corridorY + 50} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Lên */}
            <line x1={canvasW - 98} y1={corridorY + 26} x2={canvasW - 54} y2={corridorY + 26} stroke="#38BDF8" strokeWidth="1.2" />
            <polyline points={`${canvasW - 59},${corridorY + 22} ${canvasW - 53},${corridorY + 26} ${canvasW - 59},${corridorY + 30}`} fill="none" stroke="#38BDF8" strokeWidth="1.2" />
            <text x={canvasW - 76} y={corridorY + 20} fontSize="7" fontWeight="800" fill="#38BDF8" textAnchor="middle">
              LÊN ▲
            </text>

            {/* Khe hở kỹ thuật / Giếng thang & Tay vịn ở giữa */}
            <rect x={canvasW - 104} y={corridorY + 50} width="58" height="8" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />

            {/* Vế thang Nam (Vế Đi Xuống — DOWN Flight) */}
            <rect x={canvasW - 104} y={corridorY + 58} width="58" height="47" fill="var(--canvas-subtle)" stroke="var(--hairline-soft)" strokeWidth="0.6" />
            {[canvasW - 97, canvasW - 90, canvasW - 83, canvasW - 76, canvasW - 69, canvasW - 62, canvasW - 55].map((tx) => (
              <line key={tx} x1={tx} y1={corridorY + 58} x2={tx} y2={corridorY + 105} stroke="var(--hairline-medium)" strokeWidth="0.8" />
            ))}
            {/* Mũi tên dẫn hướng Vế Xuống */}
            <line x1={canvasW - 54} y1={corridorY + 82} x2={canvasW - 98} y2={corridorY + 82} stroke="#10B981" strokeWidth="1.2" />
            <polyline points={`${canvasW - 93},${corridorY + 78} ${canvasW - 99},${corridorY + 82} ${canvasW - 93},${corridorY + 86}`} fill="none" stroke="#10B981" strokeWidth="1.2" />
            <text x={canvasW - 76} y={corridorY + 77} fontSize="7" fontWeight="800" fill="#10B981" textAnchor="middle">
              ▼ XUỐNG
            </text>

            {/* Chiếu nghỉ giữa tầng (Mid-landing) sát tường ngoài Đông lấy sáng */}
            <rect
              x={canvasW - 46}
              y={corridorY}
              width="26"
              height={corridorH}
              fill="var(--surface-panel)"
              stroke="var(--hairline-soft)"
              strokeWidth="0.8"
              rx="5"
            />
            {/* Kính lấy sáng mặt ngoài Đông */}
            <line x1={canvasW - 20} y1={corridorY + 16} x2={canvasW - 20} y2={corridorY + 44} stroke="#38BDF8" strokeWidth="2.5" />
            <line x1={canvasW - 20} y1={corridorY + 64} x2={canvasW - 20} y2={corridorY + 92} stroke="#38BDF8" strokeWidth="2.5" />
            <text
              x={canvasW - 33}
              y={corridorY + corridorH / 2}
              fontFamily="var(--font-sans)"
              fontSize="7"
              fontWeight="700"
              fill="var(--ink-muted)"
              textAnchor="middle"
              transform={`rotate(90, ${canvasW - 33}, ${corridorY + corridorH / 2})`}
              style={{ letterSpacing: '0.08em' }}
            >
              CHIẾU NGHỈ
            </text>

            {/* Cửa chống cháy tự đóng mở vào hành lang (Fire Door) */}
            <line x1={canvasW - 106} y1={corridorY + 18} x2={canvasW - 106} y2={corridorY + 90} stroke="#10B981" strokeWidth="2.5" strokeDasharray="5 3" />
            {/* Ký hiệu mở cửa thoát nạn hướng vào thang */}
            <path d={`M ${canvasW - 106} ${corridorY + 36} A 16 16 0 0 1 ${canvasW - 92} ${corridorY + 52}`} fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />

            <text x={canvasW - 63} y={corridorY - 4} fontFamily="var(--font-sans)" fontSize="7.5" fontWeight="800" fill="var(--ink-muted)" textAnchor="middle">
              THANG ĐÔNG (2 VẾ)
            </text>
          </g>

          {/* ==============================================================
              4. TOP ROW ROOMS — NẰM DỌC SÁT MÉP BẮC TÒA NHÀ
              ============================================================== */}
          {topPlacedRooms.map((room) => {
            const rx = room.x;
            const rw = room.width;
            const ry = topRoomY;
            const rh = roomHeight;
            const catColor = getCategoryColor(room.category);
            const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
            const isSelected = selectedRoom?.code === room.code;

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
                  rx="7"
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

                {/* Door Opening into Corridor (Bottom Edge) */}
                <rect x={rx + rw / 2 - 12} y={ry + rh - 2} width="24" height="3" fill="var(--surface-panel)" />
                <path
                  d={`M ${rx + rw / 2 - 12} ${ry + rh} A 12 12 0 0 1 ${rx + rw / 2} ${ry + rh + 8}`}
                  fill="none"
                  stroke={catColor}
                  strokeWidth="1.1"
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
          {bottomPlacedRooms.map((room) => {
            const rx = room.x;
            const rw = room.width;
            const ry = bottomRoomY;
            const rh = roomHeight;
            const catColor = getCategoryColor(room.category);
            const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
            const isSelected = selectedRoom?.code === room.code;

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
                  rx="7"
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

                {/* Door Opening into Corridor (Top Edge) */}
                <rect x={rx + rw / 2 - 12} y={ry - 1} width="24" height="3" fill="var(--surface-panel)" />
                <path
                  d={`M ${rx + rw / 2 - 12} ${ry} A 12 12 0 0 0 ${rx + rw / 2} ${ry - 8}`}
                  fill="none"
                  stroke={catColor}
                  strokeWidth="1.1"
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
