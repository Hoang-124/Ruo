import React from 'react';
import { Icons } from './SvgIcons';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';

/**
 * FloorPlan2D
 * Sơ đồ mặt bằng kiến trúc 2D tòa nhà đại học RUO:
 * 
 * - TẦNG 1: Mặt bằng kiến trúc Hình Vuông có Giếng Trời Trung Tâm (GT), Sân Cổng Vào (CV),
 *   Thư viện Bắc (PTV), Khối phòng học & tự học cánh Tây (gộp PH & PTH 1), 2 Cụm Thang bộ
 *   đối xứng 100%, 2 Khu vệ sinh Nam/Nữ bằng nhau, Kho phụ và 2 Đại sảnh lớn ở đáy (PTH 2 & PH Đông Nam).
 * - TẦNG 2 - 5: Mặt bằng kiến trúc giảng đường, phòng lab và hội trường tiêu chuẩn.
 * 
 * Strict Native SVG Only — Zero external icon dependencies.
 */
export const FloorPlan2D = ({
  selectedFloor = 1,
  onChangeFloor,
  selectedRoom = null,
  onSelectRoom,
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

  // ==============================================================
  // RENDER DEDICATED ARCHITECTURAL FLOOR 1 COURTYARD PLAN
  // ==============================================================
  const renderFloor1Plan = () => {
    const f1W = 960;
    const f1H = 550;

    // Retrieve exact room objects from mock data
    const roomPHTB = currentFloorData.topRooms?.find(r => r.code === 'A1-PH-TB');
    const roomPTV = currentFloorData.topRooms?.find(r => r.code === 'A1-PTV');
    const roomK1 = currentFloorData.topRooms?.find(r => r.code === 'A1-K1');
    const roomK2 = currentFloorData.topRooms?.find(r => r.code === 'A1-K2');

    const roomPTH2 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-PTH2');
    const roomKHOTAY = currentFloorData.bottomRooms?.find(r => r.code === 'A1-KHO-TAY');
    const roomCV = currentFloorData.bottomRooms?.find(r => r.code === 'A1-CV');
    const roomWCNAM = currentFloorData.bottomRooms?.find(r => r.code === 'A1-WC-NAM');
    const roomWCNU = currentFloorData.bottomRooms?.find(r => r.code === 'A1-WC-NU');
    const roomPHDN = currentFloorData.bottomRooms?.find(r => r.code === 'A1-PH-DN');

    // Optimized Minimalist Room Box Renderer for Floor 1
    const renderF1RoomCard = ({
      room,
      x,
      y,
      w,
      h,
      title,
      subTitle,
      doorSide = 'none',
      doorOffset = 20,
      doorWidth = 24
    }) => {
      if (!room) return null;
      const isSelected = selectedRoom?.code === room.code;
      const catInfo = ROOM_CATEGORIES[room.category] || {};
      const catColor = catInfo.color || '#94A3B8';
      const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };

      // Unified standardized typographic scale: 12.5px for all primary titles
      const titleSize = '12.5';
      const textY = subTitle ? y + Math.floor(h / 2) - 4 : y + Math.floor(h / 2) + 5;

      return (
        <g
          key={room.code || room.id}
          onClick={() => onSelectRoom && onSelectRoom(room)}
          style={{ cursor: 'pointer' }}
        >
          <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

          {/* Room Base Rectangle - Distinctive architectural category tint */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="6"
            fill={isSelected ? 'var(--surface-panel)' : (catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)')}
            stroke={isSelected ? catColor : (catInfo.border || 'rgba(148, 163, 184, 0.5)')}
            strokeWidth={isSelected ? '2.5' : '1.6'}
            style={{
              transition: 'all 0.15s ease',
              filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
            }}
          />

          {/* Left Category Accent Line - Saturated & prominent */}
          <rect
            x={x + 5}
            y={y + 6}
            width="5"
            height={Math.max(16, h - 12)}
            rx="2.5"
            fill={catColor}
          />

          {/* Status Indicator Dot - Elevated with crisp panel halo ring */}
          <circle
            cx={x + w - 14}
            cy={y + 14}
            r="4.5"
            fill={sim.color}
            stroke="var(--surface-panel)"
            strokeWidth="1.5"
          />

          {/* Architectural Door Swing Indicator */}
          {doorSide === 'bottom' && (
            <g>
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset + doorWidth} y2={y + h} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset} y2={y + h - 16} stroke={catColor} strokeWidth="1.5" />
              <path
                d={`M ${x + doorOffset} ${y + h - 16} A 16 16 0 0 1 ${x + doorOffset + 16} ${y + h}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'top' && (
            <g>
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset + doorWidth} y2={y} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset} y2={y + 16} stroke={catColor} strokeWidth="1.5" />
              <path
                d={`M ${x + doorOffset} ${y + 16} A 16 16 0 0 0 ${x + doorOffset + 16} ${y}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'right' && (
            <g>
              <line x1={x + w} y1={y + doorOffset} x2={x + w} y2={y + doorOffset + doorWidth} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + w} y1={y + doorOffset} x2={x + w - 16} y2={y + doorOffset} stroke={catColor} strokeWidth="1.5" />
              <path
                d={`M ${x + w - 16} ${y + doorOffset} A 16 16 0 0 1 ${x + w} ${y + doorOffset + 16}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'left' && (
            <g>
              <line x1={x} y1={y + doorOffset} x2={x} y2={y + doorOffset + doorWidth} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x} y1={y + doorOffset} x2={x + 16} y2={y + doorOffset} stroke={catColor} strokeWidth="1.5" />
              <path
                d={`M ${x + 16} ${y + doorOffset} A 16 16 0 0 1 ${x} ${y + doorOffset + 16}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Concise, high-contrast typography */}
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={x + 18}
              y={textY}
              fontFamily="var(--font-sans)"
              fontSize={titleSize}
              fontWeight="800"
              fill="var(--ink-pure)"
            >
              {title || room.name}
            </text>

            {subTitle && (
              <text
                x={x + 18}
                y={textY + 16}
                fontFamily="var(--font-sans)"
                fontSize="10.5"
                fontWeight="500"
                fill="var(--ink-muted)"
              >
                {subTitle}
              </text>
            )}
          </g>
        </g>
      );
    };

    return (
      <svg
        viewBox="14 10 932 530"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: 'min(650px, 75vh)',
          minWidth: '680px',
          display: 'block',
          fontFamily: 'var(--font-sans)'
        }}
        xmlns="http://www.w3.org/2000/svg"
      >

        {/* ==============================================================
            1. KHUNG TƯỜNG NGOÀI HÌNH VUÔNG TÒA NHÀ (SQUARE PERIMETER)
            ============================================================== */}
        <rect
          x="16"
          y="12"
          width={f1W - 32}
          height={f1H - 24}
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="3"
          rx="8"
        />

        {/* Cửa sổ đón sáng tự nhiên dãy Bắc - Luminous cyan windows */}
        {[60, 180, 320, 460, 600, 740, 860].map((wx) => (
          <g key={`win-north-${wx}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1={wx} y1="12" x2={wx + 50} y2="12" />
          </g>
        ))}

        {/* Cửa sổ đón sáng tự nhiên cánh Tây & Đông */}
        {[80, 180, 360, 460].map((wy) => (
          <g key={`win-we-${wy}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1="16" y1={wy} x2="16" y2={wy + 45} />
            <line x1={f1W - 16} y1={wy} x2={f1W - 16} y2={wy + 45} />
          </g>
        ))}

        {/* ==============================================================
            2. CÁNH TÂY - PHÒNG HỌC & TỰ HỌC TÂY BẮC (GỘP PH & PTH 1 DÀI LIÊN HOÀN)
            ============================================================== */}
        {renderF1RoomCard({
          room: roomPHTB,
          x: 24,
          y: 18,
          w: 140,
          h: 222,
          title: 'PH',
          subTitle: 'Phòng Học & Tự Học',
          doorSide: 'right',
          doorOffset: 65,
          doorWidth: 24
        })}

        {/* ==============================================================
            3. HÀNH LANG THÔNG (BẮC KẾT NỐI GIẾNG TRỜI TRUNG TÂM)
            ============================================================== */}
        <g id="f1-north-corridor">
          <rect
            x="168"
            y="18"
            width="76"
            height="102"
            fill="rgba(56, 189, 248, 0.08)"
            stroke="rgba(56, 189, 248, 0.40)"
            strokeWidth="1.4"
            rx="4"
          />
          <line x1="168" y1="120" x2="244" y2="120" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="3" />
          <text
            x="206"
            y="62"
            fontFamily="var(--font-sans)"
            fontSize="11"
            fontWeight="800"
            fill="#0369A1"
            textAnchor="middle"
          >
            HÀNH LANG
          </text>
          <text
            x="206"
            y="76"
            fontFamily="var(--font-sans)"
            fontSize="11"
            fontWeight="800"
            fill="#0369A1"
            textAnchor="middle"
          >
            THÔNG
          </text>
        </g>

        {/* ==============================================================
            4. PTV (PHÒNG THƯ VIỆN TRUNG TÂM RỘNG LỚN)
            ============================================================== */}
        {renderF1RoomCard({
          room: roomPTV,
          x: 248,
          y: 18,
          w: 468,
          h: 102,
          title: 'PTV • THƯ VIỆN TRUNG TÂM',
          subTitle: '250 chỗ ngồi • Không gian đọc mở',
          doorSide: 'bottom',
          doorOffset: 120,
          doorWidth: 32
        })}
        {/* Cửa phụ thứ 2 của thư viện */}
        <g>
          <line x1={248 + 320} y1={120} x2={248 + 352} y2={120} stroke="rgba(20, 184, 166, 0.18)" strokeWidth="3" />
          <line x1={248 + 320} y1={120} x2={248 + 320} y2={104} stroke="#14B8A6" strokeWidth="1.5" />
          <path d={`M ${248 + 320} 104 A 16 16 0 0 1 ${248 + 336} 120`} fill="none" stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="2 2" />
        </g>

        {/* ==============================================================
            5. GÓC ĐÔNG BẮC: KHO 1 & KHO 2
            ============================================================== */}
        {renderF1RoomCard({
          room: roomK1,
          x: 720,
          y: 18,
          w: 108,
          h: 102,
          title: 'KHO 1',
          subTitle: 'Kho thiết bị',
          doorSide: 'bottom',
          doorOffset: 25,
          doorWidth: 20
        })}

        {renderF1RoomCard({
          room: roomK2,
          x: 832,
          y: 18,
          w: 104,
          h: 102,
          title: 'KHO 2',
          subTitle: 'Kho vật tư',
          doorSide: 'bottom',
          doorOffset: 25,
          doorWidth: 20
        })}

        {/* ==============================================================
            6. CÁNH ĐÔNG PHÍA TRÊN: HÀNH LANG NHỎ & NVS NỮ
            ============================================================== */}
        {/* Hành lang nhỏ rẽ vào khu WC */}
        <g id="f1-east-corridor">
          <rect
            x="796"
            y="126"
            width="140"
            height="40"
            fill="rgba(148, 163, 184, 0.12)"
            stroke="rgba(100, 116, 139, 0.40)"
            strokeWidth="1.4"
            rx="4"
          />
          <line x1="796" y1="126" x2="796" y2="166" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="3" />
          <text
            x="866"
            y="150"
            fontFamily="var(--font-sans)"
            fontSize="11"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            HÀNH LANG NHỎ
          </text>
        </g>

        {/* NVS NỮ (WC Nữ) - Đúng 68px chiều cao */}
        {renderF1RoomCard({
          room: roomWCNU,
          x: 796,
          y: 172,
          w: 140,
          h: 68,
          title: 'NVS NỮ',
          subTitle: 'Khu vệ sinh nữ',
          doorSide: 'top',
          doorOffset: 30,
          doorWidth: 22
        })}

        {/* ==============================================================
            7. HAI CỤM CẦU THANG BỘ ĐỐI XỨNG TUYỆT ĐỐI (13x3 ĐỀU NHAU 100%)
            y = 246, h = 86, width = 140 trên cả 2 cánh Tây & Đông
            ============================================================== */}
        {/* CẦU THANG TÂY */}
        <g id="f1-west-stairwell">
          <rect
            x="24"
            y="246"
            width="140"
            height="86"
            fill="var(--surface-panel)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Chiếu nghỉ sát tường ngoài Tây */}
          <rect x="24" y="246" width="30" height="86" fill="rgba(148, 163, 184, 0.22)" stroke="#64748B" strokeWidth="1" />
          {/* Vế thang UP */}
          <rect x="56" y="249" width="104" height="36" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`tx-w-up-${tx}`} x1={tx} y1="249" x2={tx} y2="285" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="150" y1="267" x2="65" y2="267" stroke="#0284C7" strokeWidth="1.8" />
          <polygon points="73,263 64,267 73,271" fill="#0284C7" />

          {/* Khe giữa thang & Nhãn - Cỡ chữ 10.5px đồng đều */}
          <rect x="56" y="281" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="108"
            y="293"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="var(--ink-pure)"
            textAnchor="middle"
          >
            THANG TÂY ▲
          </text>

          {/* Vế thang DOWN */}
          <rect x="56" y="293" width="104" height="36" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`tx-w-dn-${tx}`} x1={tx} y1="293" x2={tx} y2="329" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="65" y1="311" x2="150" y2="311" stroke="#059669" strokeWidth="1.8" />
          <polygon points="142,307 151,311 142,315" fill="#059669" />
        </g>

        {/* CẦU THANG ĐÔNG (ĐỐI XỨNG CHÍNH XÁC VỚI THANG TÂY) */}
        <g id="f1-east-stairwell">
          <rect
            x="796"
            y="246"
            width="140"
            height="86"
            fill="var(--surface-panel)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Vế thang UP */}
          <rect x="798" y="249" width="104" height="36" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`tx-e-up-${tx}`} x1={tx} y1="249" x2={tx} y2="285" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="808" y1="267" x2="893" y2="267" stroke="#0284C7" strokeWidth="1.8" />
          <polygon points="885,263 894,267 885,271" fill="#0284C7" />

          {/* Khe giữa thang & Nhãn - Cỡ chữ 10.5px đồng đều */}
          <rect x="798" y="281" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="850"
            y="293"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="var(--ink-pure)"
            textAnchor="middle"
          >
            ▲ THANG ĐÔNG
          </text>

          {/* Vế thang DOWN */}
          <rect x="798" y="293" width="104" height="36" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`tx-e-dn-${tx}`} x1={tx} y1="293" x2={tx} y2="329" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="893" y1="311" x2="808" y2="311" stroke="#059669" strokeWidth="1.8" />
          <polygon points="816,307 807,311 816,315" fill="#059669" />

          {/* Chiếu nghỉ sát tường ngoài Đông */}
          <rect x="906" y="246" width="30" height="86" fill="rgba(148, 163, 184, 0.22)" stroke="#64748B" strokeWidth="1" />
        </g>

        {/* ==============================================================
            8. PHÒNG DƯỚI THANG: KHO (TÂY) & NVS NAM (ĐÔNG) - CAO ĐÚNG 68PX
            ============================================================== */}
        {/* KHO (Kho phụ gầm thang Tây) */}
        {renderF1RoomCard({
          room: roomKHOTAY,
          x: 24,
          y: 338,
          w: 140,
          h: 68,
          title: 'KHO',
          subTitle: 'Kho phụ',
          doorSide: 'right',
          doorOffset: 20,
          doorWidth: 20
        })}

        {/* NVS NAM (WC Nam) - Bằng chằn chặn NVS Nữ (cao đúng 68px) */}
        {renderF1RoomCard({
          room: roomWCNAM,
          x: 796,
          y: 338,
          w: 140,
          h: 68,
          title: 'NVS NAM',
          subTitle: 'Khu vệ sinh nam',
          doorSide: 'top',
          doorOffset: 30,
          doorWidth: 22
        })}

        {/* ==============================================================
            9. GIẾNG TRỜI TRUNG TÂM (GT) — KHÔNG GIAN THÔNG TẦNG THOÁNG ĐÃNG
            ============================================================== */}
        <g id="f1-central-courtyard">
          {/* Khuôn viên giếng trời - Nền trắng sạch, viền chuẩn kiến trúc */}
          <rect
            x="248"
            y="126"
            width="468"
            height="206"
            fill="var(--surface-panel)"
            stroke="var(--hairline-medium)"
            strokeWidth="1.2"
            rx="6"
          />

          {/* Bảng hiệu Giếng trời trung tâm - Cỡ chữ 12.5px chuẩn cấp 1 */}
          <g transform="translate(372, 212)">
            <rect
              x="0"
              y="0"
              width="220"
              height="34"
              rx="17"
              fill="var(--surface-panel)"
              stroke="var(--hairline-medium)"
              strokeWidth="1"
            />
            <text
              x="110"
              y="22"
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              GIẾNG TRỜI TRUNG TÂM
            </text>
          </g>
        </g>

        {/* ==============================================================
            10. CV (SÂN CỔNG VÀO CHÍNH & SẢNH ĐÓN TIẾP)
            ============================================================== */}
        <g
          id="f1-entrance-plaza"
          onClick={() => onSelectRoom && onSelectRoom(roomCV)}
          style={{ cursor: 'pointer' }}
        >
          <title>CV • Sân Cổng Vào Chính (Bấm để xem chi tiết)</title>
          <rect
            x="248"
            y="338"
            width="468"
            height="136"
            fill="var(--surface-panel)"
            stroke={selectedRoom?.code === 'A1-CV' ? '#38BDF8' : 'var(--hairline-medium)'}
            strokeWidth={selectedRoom?.code === 'A1-CV' ? '2.4' : '1.2'}
            rx="6"
            style={{
              transition: 'all 0.15s ease',
              filter: selectedRoom?.code === 'A1-CV' ? 'drop-shadow(0 4px 12px rgba(56, 189, 248, 0.35))' : 'none'
            }}
          />

          {/* Bảng tên sảnh đón tiếp - Cỡ chữ 12.5px chuẩn cấp 1 */}
          <g transform="translate(372, 390)">
            <rect
              x="0"
              y="0"
              width="220"
              height="32"
              rx="16"
              fill="var(--surface-panel)"
              stroke="var(--hairline-soft)"
              strokeWidth="1"
            />
            <text
              x="110"
              y="21"
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              SÂN CỔNG VÀO (CV)
            </text>
          </g>
        </g>

        {/* ==============================================================
            11. TẦNG ĐÁY: 2 ĐẠI SẢNH LỚN BẰNG NHAU 1:1 (W = 220, H = 108)
            ============================================================== */}
        {/* PTH 2 (Phòng Tự Học Lớn - Góc Tây Nam) */}
        {renderF1RoomCard({
          room: roomPTH2,
          x: 24,
          y: 412,
          w: 220,
          h: 108,
          title: 'PTH 2',
          subTitle: 'Phòng Tự Học Lớn • 120 chỗ',
          doorSide: 'top',
          doorOffset: 120,
          doorWidth: 32
        })}

        {/* PH (Phòng Học Lớn - Góc Đông Nam - To bằng PTH 2) */}
        {renderF1RoomCard({
          room: roomPHDN,
          x: 720,
          y: 412,
          w: 220,
          h: 108,
          title: 'PH',
          subTitle: 'Phòng Học Lớn • 120 chỗ',
          doorSide: 'top',
          doorOffset: 45,
          doorWidth: 32
        })}

        {/* ==============================================================
            12. CỤM 3 CỔNG VÀO CHÍNH/PHỤ Ở CHÂN TÒA NHÀ (y = 478..520)
            ============================================================== */}
        <g id="f1-entrance-gates">
          {/* CỔNG PHỤ (Trái) */}
          <g transform="translate(248, 478)">
            <rect x="0" y="0" width="110" height="42" rx="4" fill="rgba(148, 163, 184, 0.16)" stroke="rgba(100, 116, 139, 0.45)" strokeWidth="1.4" />
            <text
              x="55"
              y="26"
              fontFamily="var(--font-sans)"
              fontSize="11"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              CỔNG PHỤ (Trái)
            </text>
          </g>

          {/* CỔNG CHÍNH - Portal rực rỡ, sắc nét */}
          <g transform="translate(364, 478)">
            <rect
              x="0"
              y="0"
              width="236"
              height="42"
              rx="6"
              fill="rgba(2, 132, 199, 0.18)"
              stroke="#0284C7"
              strokeWidth="2.2"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.25))' }}
            />
            <text
              x="118"
              y="26"
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="900"
              fill="#0284C7"
              textAnchor="middle"
              letterSpacing="0.8"
            >
              ✦ CỔNG CHÍNH ✦
            </text>
          </g>

          {/* CỔNG PHỤ (Phải) */}
          <g transform="translate(606, 478)">
            <rect x="0" y="0" width="110" height="42" rx="4" fill="rgba(148, 163, 184, 0.16)" stroke="rgba(100, 116, 139, 0.45)" strokeWidth="1.4" />
            <text
              x="55"
              y="26"
              fontFamily="var(--font-sans)"
              fontSize="11"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              CỔNG PHỤ (Phải)
            </text>
          </g>
        </g>
      </svg>
    );
  };

  // ==============================================================
  // RENDER DEDICATED ARCHITECTURAL FLOOR 2 PLAN (LÝ THUYẾT & THÔNG TẦNG)
  // ==============================================================
  const renderFloor2Plan = () => {
    const f2W = 960;
    const f2H = 550;

    // Retrieve exact room objects from mock data
    const room201 = currentFloorData.topRooms?.find(r => r.code === 'A1-201');
    const room202 = currentFloorData.topRooms?.find(r => r.code === 'A1-202');
    const room203 = currentFloorData.topRooms?.find(r => r.code === 'A1-203');
    const room207 = currentFloorData.topRooms?.find(r => r.code === 'A1-207');
    const room208 = currentFloorData.topRooms?.find(r => r.code === 'A1-208');
    const room209 = currentFloorData.topRooms?.find(r => r.code === 'A1-209');
    const room210 = currentFloorData.topRooms?.find(r => r.code === 'A1-210');
    const room211 = currentFloorData.topRooms?.find(r => r.code === 'A1-211');
    const room212 = currentFloorData.topRooms?.find(r => r.code === 'A1-212');
    const roomNC1 = currentFloorData.topRooms?.find(r => r.code === 'A1-NC-01') || {
      code: 'A1-NC-01',
      name: 'Phòng Nghiên Cứu 1',
      category: 'admin',
      capacity: 45
    };
    const roomWCNU = currentFloorData.topRooms?.find(r => r.code === 'A1-WC-NU-T2');

    const room204 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-204');
    const room205 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-205');
    const room206 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-206');
    const room215 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-215');
    const room216 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-216');
    const room217 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-217');
    const room218 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-218');
    const roomNC2 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-NC-02') || {
      code: 'A1-NC-02',
      name: 'Phòng Nghiên Cứu 2',
      category: 'admin',
      capacity: 45
    };
    const room213 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-213');
    const room214 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-214');
    const roomWCNAM = currentFloorData.bottomRooms?.find(r => r.code === 'A1-WC-NAM-T2');

    // High-precision Room Box Renderer for Floor 2
    const renderF2RoomCard = ({
      room,
      x,
      y,
      w,
      h,
      title,
      subTitle,
      doorSide = 'none',
      doorOffset = 14,
      doorWidth = 18
    }) => {
      if (!room) return null;
      const isSelected = selectedRoom?.code === room.code;
      const catInfo = ROOM_CATEGORIES[room.category] || {};
      let catColor = catInfo.color || '#94A3B8';
      let badgeBg = catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)';
      let border = catInfo.border || 'rgba(148, 163, 184, 0.5)';

      // Custom high-contrast distinction for Restrooms
      if (room.code === 'A1-WC-NU-T2') {
        catColor = '#F43F5E';
        badgeBg = 'rgba(244, 63, 94, 0.12)';
        border = 'rgba(244, 63, 94, 0.45)';
      } else if (room.code === 'A1-WC-NAM-T2') {
        catColor = '#2563EB';
        badgeBg = 'rgba(37, 99, 235, 0.12)';
        border = 'rgba(37, 99, 235, 0.45)';
      }

      const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };

      const isCompact = h < 55;
      const isLarge = h > 80;
      const titleSize = isCompact ? '11' : (isLarge ? '13' : '12');
      const subTitleSize = isCompact ? '9' : (isLarge ? '10.5' : '9.5');
      const textY = isCompact
        ? (subTitle ? y + 19 : y + 26)
        : (isLarge ? y + 36 : (subTitle ? y + Math.floor(h / 2) - 4 : y + Math.floor(h / 2) + 5));
      const textX = (doorSide === 'left') ? x + 16 : x + 14;

      return (
        <g
          key={room.code || room.id}
          onClick={() => onSelectRoom && onSelectRoom(room)}
          style={{ cursor: 'pointer' }}
        >
          <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

          {/* Room Base Rectangle */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="5"
            fill={isSelected ? 'var(--surface-panel)' : badgeBg}
            stroke={isSelected ? catColor : border}
            strokeWidth={isSelected ? '2.5' : '1.5'}
            style={{
              transition: 'all 0.15s ease',
              filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
            }}
          />

          {/* Left Category Accent Line */}
          <rect
            x={x + 4}
            y={y + 4}
            width="4"
            height={Math.max(12, h - 8)}
            rx="2"
            fill={catColor}
          />

          {/* Status Indicator Dot */}
          <circle
            cx={x + w - 12}
            cy={y + 11}
            r={isCompact ? 3.5 : (isLarge ? 5 : 4)}
            fill={sim.color}
            stroke="var(--surface-panel)"
            strokeWidth="1.2"
          />

          {/* Architectural Door Swings */}
          {doorSide === 'left' && (
            <g>
              <line x1={x} y1={y + doorOffset} x2={x} y2={y + doorOffset + doorWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x} y1={y + doorOffset} x2={x + 14} y2={y + doorOffset} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + 14} ${y + doorOffset} A 14 14 0 0 1 ${x} ${y + doorOffset + 14}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'right' && (
            <g>
              <line x1={x + w} y1={y + doorOffset} x2={x + w} y2={y + doorOffset + doorWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + w} y1={y + doorOffset} x2={x + w - 14} y2={y + doorOffset} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + w - 14} ${y + doorOffset} A 14 14 0 0 1 ${x + w} ${y + doorOffset + 14}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'top' && (
            <g>
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset + doorWidth} y2={y} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset} y2={y + 14} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + doorOffset} ${y + 14} A 14 14 0 0 0 ${x + doorOffset + 14} ${y}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'bottom' && (
            <g>
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset + doorWidth} y2={y + h} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset} y2={y + h - 14} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + doorOffset} ${y + h - 14} A 14 14 0 0 1 ${x + doorOffset + 14} ${y + h}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Typography */}
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={textX}
              y={textY}
              fontFamily="var(--font-sans)"
              fontSize={titleSize}
              fontWeight="800"
              fill="var(--ink-pure)"
              letterSpacing="-0.2px"
            >
              {title || room.code}
            </text>

            {subTitle && (
              <text
                x={textX}
                y={isCompact ? textY + 14 : (isLarge ? textY + 18 : textY + 16)}
                fontFamily="var(--font-sans)"
                fontSize={subTitleSize}
                fontWeight="500"
                fill="var(--ink-muted)"
              >
                {subTitle}
              </text>
            )}
          </g>
        </g>
      );
    };

    return (
      <svg
        viewBox="14 10 932 530"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          margin: 0,
          background: 'var(--canvas-subtle)'
        }}
      >
        {/* ==============================================================
            1. KHUNG VỎ KIẾN TRÚC TOÀN KHU TẦNG 2
            ============================================================== */}
        <rect
          x="16"
          y="12"
          width={f2W - 32}
          height={f2H - 24}
          rx="6"
          fill="none"
          stroke="var(--ink-pure)"
          strokeWidth="2.2"
        />
        <rect
          x="20"
          y="16"
          width={f2W - 40}
          height={f2H - 32}
          rx="5"
          fill="none"
          stroke="var(--hairline-medium)"
          strokeWidth="0.8"
        />

        {/* Cửa sổ đón sáng tự nhiên cánh Tây & Đông */}
        {[60, 190, 360, 480].map((wy) => (
          <g key={`win-we-f2-${wy}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1="16" y1={wy} x2="16" y2={wy + 42} />
            <line x1={f2W - 16} y1={wy} x2={f2W - 16} y2={wy + 42} />
          </g>
        ))}

        {/* Cửa sổ đón sáng tự nhiên hướng Bắc & Nam */}
        {[60, 100, 260, 310, 420, 520, 630, 680, 830, 890].map((wx) => (
          <g key={`win-ns-f2-${wx}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1={wx} y1="12" x2={wx + 36} y2="12" />
            <line x1={wx} y1={f2H - 12} x2={wx + 36} y2={f2H - 12} />
          </g>
        ))}

        {/* ==============================================================
            2. CÁNH TÂY NGOÀI (x = 24..164, w = 140)
            ============================================================== */}
        {/* Góc Tây Bắc: Cụm 2 phòng học Lý Thuyết [ PH 201 / PH 202 ] (Xanh Dương) */}
        <g id="f2-corner-northwest">
          {renderF2RoomCard({
            room: room201,
            x: 24,
            y: 18,
            w: 140,
            h: 45,
            title: 'PH 201',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="24" y="63" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room202,
            x: 24,
            y: 67,
            w: 140,
            h: 45,
            title: 'PH 202',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* Cánh Tây Giữa: Lab Tin Học & AI (Xanh Lục Emerald) + Thang Tây */}
        {/* PH 203 (trên Thang Tây - Lab Tin Học) */}
        {renderF2RoomCard({
          room: room203,
          x: 24,
          y: 162,
          w: 140,
          h: 66,
          title: 'PH 203',
          subTitle: 'Lab Tin Học • 60 chỗ',
          doorSide: 'right',
          doorOffset: 20
        })}

        {/* CẦU THANG TÂY (GIỮ NGUYÊN VỊ TRÍ & VẾ THANG CHUẨN TẦNG 1) */}
        <g id="f2-west-stairwell">
          <rect
            x="24"
            y="232"
            width="140"
            height="88"
            fill="rgba(248, 250, 252, 0.95)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Chiếu nghỉ sát tường ngoài Tây */}
          <rect x="24" y="232" width="30" height="88" fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
          {/* Vế thang UP */}
          <rect x="56" y="235" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`f2-tx-w-up-${tx}`} x1={tx} y1="235" x2={tx} y2="272" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="150" y1="253" x2="65" y2="253" stroke="#2563EB" strokeWidth="1.8" />
          <polygon points="73,249 64,253 73,257" fill="#2563EB" />

          {/* Khe giữa thang & Nhãn */}
          <rect x="56" y="268" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="108"
            y="280"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            THANG TÂY ▲
          </text>

          {/* Vế thang DOWN */}
          <rect x="56" y="280" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`f2-tx-w-dn-${tx}`} x1={tx} y1="280" x2={tx} y2="317" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="65" y1="298" x2="150" y2="298" stroke="#059669" strokeWidth="1.8" />
          <polygon points="142,294 151,298 142,302" fill="#059669" />
        </g>

        {/* PH 204 (dưới Thang Tây - Lab Multimedia) */}
        {renderF2RoomCard({
          room: room204,
          x: 24,
          y: 324,
          w: 140,
          h: 66,
          title: 'PH 204',
          subTitle: 'Lab Multimedia • 60 chỗ',
          doorSide: 'right',
          doorOffset: 20
        })}

        {/* Góc Tây Nam: Cụm 2 phòng Nghiên cứu & Tự học [ PH 205 / PH 206 ] (Tím Violet) */}
        <g id="f2-corner-southwest">
          {renderF2RoomCard({
            room: room205,
            x: 24,
            y: 438,
            w: 140,
            h: 45,
            title: 'PH 205',
            subTitle: 'Nghiên cứu • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="24" y="483" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room206,
            x: 24,
            y: 487,
            w: 140,
            h: 45,
            title: 'PH 206',
            subTitle: 'Tự học • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            3. TRỤC HÀNH LANG DỌC TÂY (x = 168..232, w = 64) - NỀN GẠCH KIẾN TRÚC TRUNG TÍNH
            ============================================================== */}
        <g id="f2-corridor-west">
          <rect
            x="168"
            y="18"
            width="64"
            height="514"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="200" y1="28" x2="200" y2="522" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="6 4" />
          
          <g transform="translate(172, 60)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL TÂY
            </text>
          </g>

          <g transform="translate(172, 270)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC TÂY
            </text>
          </g>

          <g transform="translate(172, 480)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL TÂY
            </text>
          </g>
        </g>

        {/* ==============================================================
            4. CỘT TRONG TÂY: CỤM PHÒNG BẮC TRONG & NAM TRONG (x = 236..356, w = 120)
            ============================================================== */}
        {/* Dãy Bắc Trong (Trái): Phòng Hội Thảo & Seminar [ PH 207 / PH 208 ] (Hổ Phách/Cam) */}
        <g id="f2-block-north-left">
          {renderF2RoomCard({
            room: room207,
            x: 236,
            y: 18,
            w: 120,
            h: 45,
            title: 'PH 207',
            subTitle: 'Seminar • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="236" y="63" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room208,
            x: 236,
            y: 67,
            w: 120,
            h: 45,
            title: 'PH 208',
            subTitle: 'Đồ án • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* Dãy Nam Trong (Trái): Smart Classroom [ PH 215 / PH 216 ] (Xanh Mòng Két Teal) */}
        <g id="f2-block-south-left">
          {renderF2RoomCard({
            room: room215,
            x: 236,
            y: 438,
            w: 120,
            h: 45,
            title: 'PH 215',
            subTitle: 'Smart Room 1',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="236" y="483" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room216,
            x: 236,
            y: 487,
            w: 120,
            h: 45,
            title: 'PH 216',
            subTitle: 'Smart Room 2',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            5. PHÒNG NGHIÊN CỨU 1 (BẮC) & PHÒNG NGHIÊN CỨU 2 (NAM)
            (THEO ĐÚNG BẢN VẼ PHÁC THẢO: 2 PHÒNG NGHIÊN CỨU LỚN Ở GIỮA)
            ============================================================== */}
        {/* Phòng Nghiên Cứu 1 (Bắc: x = 364..596, y = 18..112, w = 232, h = 94) */}
        <g id="f2-research-room-north">
          {renderF2RoomCard({
            room: roomNC1,
            x: 364,
            y: 18,
            w: 232,
            h: 94,
            title: 'PHÒNG NGHIÊN CỨU 1',
            subTitle: 'Viện Nghiên Cứu & Phát Triển • 45 chỗ',
            doorSide: 'bottom',
            doorOffset: 35,
            doorWidth: 26
          })}
          {/* Subtle architectural research workstation benches */}
          <g opacity="0.3" pointerEvents="none">
            <rect x="440" y="32" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
            <rect x="518" y="32" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        </g>

        {/* Phòng Nghiên Cứu 2 (Nam: x = 364..596, y = 438..532, w = 232, h = 94) */}
        <g id="f2-research-room-south">
          {renderF2RoomCard({
            room: roomNC2,
            x: 364,
            y: 438,
            w: 232,
            h: 94,
            title: 'PHÒNG NGHIÊN CỨU 2',
            subTitle: 'Trung Tâm Nghiên Cứu Ứng Dụng • 45 chỗ',
            doorSide: 'top',
            doorOffset: 35,
            doorWidth: 26
          })}
          {/* Subtle architectural research workstation benches */}
          <g opacity="0.3" pointerEvents="none">
            <rect x="440" y="474" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
            <rect x="518" y="474" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        </g>

        {/* ==============================================================
            6. HÀNH LANG NGANG BẮC & NAM (GIAO THÔNG KIẾN TRÚC TRUNG TÍNH)
            ============================================================== */}
        {/* Hành lang ngang Bắc (y = 118..158, h = 40) */}
        <g id="f2-corridor-north">
          <rect
            x="24"
            y="118"
            width="912"
            height="40"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="32" y1="138" x2="928" y2="138" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="8 5" />
          <text
            x="480"
            y="143"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#475569"
            textAnchor="middle"
          >
            HÀNH LANG TRỤC BẮC (TÂY — ĐÔNG)
          </text>
        </g>

        {/* Hành lang ngang Nam (y = 394..434, h = 40) */}
        <g id="f2-corridor-south">
          <rect
            x="24"
            y="394"
            width="912"
            height="40"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="32" y1="414" x2="928" y2="414" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="8 5" />
          <text
            x="480"
            y="419"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#475569"
            textAnchor="middle"
          >
            HÀNH LANG TRỤC NAM (TÂY — ĐÔNG)
          </text>
        </g>

        {/* ==============================================================
            7. GIẾNG TRỜI TRUNG TÂM (KHỐI THÔNG TẦNG THOÁNG ĐÃNG)
            ============================================================== */}
        <g id="f2-central-atrium-void">
          {/* Khung sàn thông tầng trung tâm (x = 236..724, y = 162..390) */}
          <rect
            x="236"
            y="162"
            width="488"
            height="228"
            rx="6"
            fill="rgba(248, 250, 252, 0.85)"
            stroke="rgba(148, 163, 184, 0.55)"
            strokeWidth="1.6"
          />

          {/* Lan can kính cường lực CAD viền quanh mép giếng trời */}
          <rect
            x="242"
            y="168"
            width="476"
            height="216"
            rx="4"
            fill="none"
            stroke="rgba(2, 132, 199, 0.55)"
            strokeWidth="1.4"
            strokeDasharray="5 3"
          />

          {/* Đường chéo kỹ thuật kiến trúc biểu thị khoảng thông tầng */}
          <line x1="242" y1="168" x2="718" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="718" y1="168" x2="242" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Bảng hiệu nổi bật: GIẾNG TRỜI TRUNG TÂM */}
          <g transform="translate(372, 248)">
            <rect
              x="0"
              y="0"
              width="216"
              height="58"
              rx="8"
              fill="var(--surface-panel)"
              stroke="rgba(2, 132, 199, 0.5)"
              strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 2px 10px rgba(2, 132, 199, 0.15))' }}
            />
            <text
              x="108"
              y="22"
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              GIẾNG TRỜI TRUNG TÂM
            </text>
            <text
              x="108"
              y="38"
              fontFamily="var(--font-sans)"
              fontSize="11"
              fontWeight="800"
              fill="#0284C7"
              textAnchor="middle"
              letterSpacing="0.4"
            >
              THÔNG TẦNG XUỐNG TẦNG 1
            </text>
            <text
              x="108"
              y="50"
              fontFamily="var(--font-sans)"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--ink-muted)"
              textAnchor="middle"
            >
              Lan can kính an toàn • Nhìn xuống đại sảnh
            </text>
          </g>
        </g>

        {/* ==============================================================
            8. CỘT TRONG ĐÔNG: CỤM PHÒNG BẮC TRONG & NAM TRONG (x = 604..724, w = 120)
            ============================================================== */}
        {/* Dãy Bắc Trong (Phải): Diễn đàn & Workshop [ PH 209 / PH 210 ] (Hổ Phách/Cam) */}
        <g id="f2-block-north-right">
          {renderF2RoomCard({
            room: room209,
            x: 604,
            y: 18,
            w: 120,
            h: 45,
            title: 'PH 209',
            subTitle: 'Diễn đàn • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="604" y="63" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room210,
            x: 604,
            y: 67,
            w: 120,
            h: 45,
            title: 'PH 210',
            subTitle: 'Workshop • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* Dãy Nam Trong (Phải): Phòng Học Tương Tác [ PH 217 / PH 218 ] (Xanh Mòng Két Teal) */}
        <g id="f2-block-south-right">
          {renderF2RoomCard({
            room: room217,
            x: 604,
            y: 438,
            w: 120,
            h: 45,
            title: 'PH 217',
            subTitle: 'Tương tác 1',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="604" y="483" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room218,
            x: 604,
            y: 487,
            w: 120,
            h: 45,
            title: 'PH 218',
            subTitle: 'Tương tác 2',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            9. TRỤC HÀNH LANG DỌC ĐÔNG (x = 728..792, w = 64) - NỀN GẠCH KIẾN TRÚC TRUNG TÍNH
            ============================================================== */}
        <g id="f2-corridor-east">
          <rect
            x="728"
            y="18"
            width="64"
            height="514"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="760" y1="28" x2="760" y2="522" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="6 4" />

          <g transform="translate(732, 60)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL ĐÔNG
            </text>
          </g>

          <g transform="translate(732, 270)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC ĐÔNG
            </text>
          </g>

          <g transform="translate(732, 480)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL ĐÔNG
            </text>
          </g>
        </g>

        {/* ==============================================================
            10. CÁNH ĐÔNG NGOÀI (x = 796..936, w = 140)
            ============================================================== */}
        {/* Góc Đông Bắc: Cụm 2 phòng học Lý Thuyết [ PH 211 / PH 212 ] (Xanh Dương) */}
        <g id="f2-corner-northeast">
          {renderF2RoomCard({
            room: room211,
            x: 796,
            y: 18,
            w: 140,
            h: 45,
            title: 'PH 211',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="796" y="63" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room212,
            x: 796,
            y: 67,
            w: 140,
            h: 45,
            title: 'PH 212',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* Cánh Đông Giữa: NVS NỮ (Hồng Rose), THANG ĐÔNG, NVS NAM (Xanh Cobalt) */}
        {/* NVS NỮ (GIỮ NGUYÊN VỊ TRÍ CHUẨN TẦNG 1 - TONE HỒNG TINH TẾ) */}
        {renderF2RoomCard({
          room: roomWCNU,
          x: 796,
          y: 162,
          w: 140,
          h: 66,
          title: 'NVS NỮ',
          subTitle: 'Khu vệ sinh nữ',
          doorSide: 'left',
          doorOffset: 20
        })}

        {/* CẦU THANG ĐÔNG (GIỮ NGUYÊN VỊ TRÍ & VẾ THANG CHUẨN TẦNG 1) */}
        <g id="f2-east-stairwell">
          <rect
            x="796"
            y="232"
            width="140"
            height="88"
            fill="rgba(248, 250, 252, 0.95)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Vế thang UP */}
          <rect x="798" y="235" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`f2-tx-e-up-${tx}`} x1={tx} y1="235" x2={tx} y2="272" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="808" y1="253" x2="893" y2="253" stroke="#2563EB" strokeWidth="1.8" />
          <polygon points="885,249 894,253 885,257" fill="#2563EB" />

          {/* Khe giữa thang & Nhãn */}
          <rect x="798" y="268" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="850"
            y="280"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            THANG ĐÔNG ▲
          </text>

          {/* Vế thang DOWN */}
          <rect x="798" y="280" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`f2-tx-e-dn-${tx}`} x1={tx} y1="280" x2={tx} y2="317" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="893" y1="298" x2="808" y2="298" stroke="#059669" strokeWidth="1.8" />
          <polygon points="816,294 807,298 816,302" fill="#059669" />

          {/* Chiếu nghỉ sát tường ngoài Đông */}
          <rect x="906" y="232" width="30" height="88" fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
        </g>

        {/* NVS NAM (GIỮ NGUYÊN VỊ TRÍ CHUẨN TẦNG 1 - TONE XANH COBALT LỊCH LÃM) */}
        {renderF2RoomCard({
          room: roomWCNAM,
          x: 796,
          y: 324,
          w: 140,
          h: 66,
          title: 'NVS NAM',
          subTitle: 'Khu vệ sinh nam',
          doorSide: 'left',
          doorOffset: 20
        })}

        {/* Góc Đông Nam: Cụm 2 phòng Đồ Án & Sáng Tạo [ PH 213 / PH 214 ] (Tím Violet) */}
        <g id="f2-corner-southeast">
          {renderF2RoomCard({
            room: room213,
            x: 796,
            y: 438,
            w: 140,
            h: 45,
            title: 'PH 213',
            subTitle: 'Đồ án • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="796" y="483" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF2RoomCard({
            room: room214,
            x: 796,
            y: 487,
            w: 140,
            h: 45,
            title: 'PH 214',
            subTitle: 'Sáng tạo • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>
      </svg>
    );
  };

  // ==============================================================
  // RENDER DEDICATED ARCHITECTURAL FLOOR 3 PLAN (GIẢNG ĐƯỜNG, PHÒNG Y TẾ & GIẾNG TRỜI)
  // ==============================================================
  const renderFloor3Plan = () => {
    const f3W = 960;
    const f3H = 550;

    // Retrieve exact room objects from mock data
    const room301 = currentFloorData.topRooms?.find(r => r.code === 'A1-301');
    const room302 = currentFloorData.topRooms?.find(r => r.code === 'A1-302');
    const room303 = currentFloorData.topRooms?.find(r => r.code === 'A1-303');
    const room307 = currentFloorData.topRooms?.find(r => r.code === 'A1-307');
    const room308 = currentFloorData.topRooms?.find(r => r.code === 'A1-308');
    const roomNC1 = currentFloorData.topRooms?.find(r => r.code === 'A1-NC-T3') || {
      code: 'A1-NC-T3',
      name: 'Phòng Nghiên Cứu 1',
      category: 'admin',
      capacity: 45
    };
    const room309 = currentFloorData.topRooms?.find(r => r.code === 'A1-309');
    const room310 = currentFloorData.topRooms?.find(r => r.code === 'A1-310');
    const room311 = currentFloorData.topRooms?.find(r => r.code === 'A1-311');
    const room312 = currentFloorData.topRooms?.find(r => r.code === 'A1-312');
    const roomWCNU = currentFloorData.topRooms?.find(r => r.code === 'A1-WC-NU-T3');

    const room304 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-304');
    const room305 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-305');
    const room306 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-306');
    const room315 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-315');
    const room316 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-316');
    const roomYTE = currentFloorData.bottomRooms?.find(r => r.code === 'A1-YT-T3') || {
      code: 'A1-YT-T3',
      name: 'Phòng Y Tế',
      category: 'utility',
      capacity: 15
    };
    const room319 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-319') || {
      code: 'A1-319',
      name: 'PH 319 (Phòng Học)',
      category: 'academic',
      capacity: 45
    };
    const room317 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-317');
    const room318 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-318');
    const room313 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-313');
    const room314 = currentFloorData.bottomRooms?.find(r => r.code === 'A1-314');
    const roomWCNAM = currentFloorData.bottomRooms?.find(r => r.code === 'A1-WC-NAM-T3');

    // High-precision Room Box Renderer for Floor 3
    const renderF3RoomCard = ({
      room,
      x,
      y,
      w,
      h,
      title,
      subTitle,
      doorSide = 'none',
      doorOffset = 14,
      doorWidth = 18,
      isMedical = false
    }) => {
      if (!room) return null;
      const isSelected = selectedRoom?.code === room.code;
      const catInfo = ROOM_CATEGORIES[room.category] || {};
      let catColor = catInfo.color || '#94A3B8';
      let badgeBg = catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)';
      let border = catInfo.border || 'rgba(148, 163, 184, 0.5)';

      // Custom high-contrast distinction for Restrooms & Medical room
      if (room.code === 'A1-WC-NU-T3') {
        catColor = '#F43F5E';
        badgeBg = 'rgba(244, 63, 94, 0.12)';
        border = 'rgba(244, 63, 94, 0.45)';
      } else if (room.code === 'A1-WC-NAM-T3') {
        catColor = '#2563EB';
        badgeBg = 'rgba(37, 99, 235, 0.12)';
        border = 'rgba(37, 99, 235, 0.45)';
      } else if (isMedical || room.code === 'A1-YT-T3') {
        catColor = '#EF4444';
        badgeBg = 'rgba(239, 68, 68, 0.12)';
        border = 'rgba(239, 68, 68, 0.5)';
      }

      const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };

      const isCompact = h < 55;
      const isLarge = h > 80;
      const titleSize = isCompact ? '11' : (isLarge ? '13' : '12');
      const subTitleSize = isCompact ? '9' : (isLarge ? '10.5' : '9.5');
      const textY = isCompact
        ? (subTitle ? y + 19 : y + 26)
        : (isLarge ? y + 36 : (subTitle ? y + Math.floor(h / 2) - 4 : y + Math.floor(h / 2) + 5));
      const textX = (doorSide === 'left') ? x + 16 : x + 14;

      return (
        <g
          key={room.code || room.id}
          onClick={() => onSelectRoom && onSelectRoom(room)}
          style={{ cursor: 'pointer' }}
        >
          <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

          {/* Room Base Rectangle */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="5"
            fill={isSelected ? 'var(--surface-panel)' : badgeBg}
            stroke={isSelected ? catColor : border}
            strokeWidth={isSelected ? '2.5' : '1.5'}
            style={{
              transition: 'all 0.15s ease',
              filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
            }}
          />

          {/* Left Category Accent Line */}
          <rect
            x={x + 4}
            y={y + 4}
            width="4"
            height={Math.max(12, h - 8)}
            rx="2"
            fill={catColor}
          />

          {/* Status Indicator Dot */}
          <circle
            cx={x + w - 12}
            cy={y + 11}
            r={isCompact ? 3.5 : (isLarge ? 5 : 4)}
            fill={sim.color}
            stroke="var(--surface-panel)"
            strokeWidth="1.2"
          />

          {/* Medical Red Cross Icon Badge (If medical room) */}
          {(isMedical || room.code === 'A1-YT-T3') && (
            <g transform={`translate(${x + w - 34}, ${y + 6})`}>
              <rect x="3.5" y="0" width="3" height="10" rx="1" fill="#EF4444" />
              <rect x="0" y="3.5" width="10" height="3" rx="1" fill="#EF4444" />
            </g>
          )}

          {/* Architectural Door Swings */}
          {doorSide === 'left' && (
            <g>
              <line x1={x} y1={y + doorOffset} x2={x} y2={y + doorOffset + doorWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x} y1={y + doorOffset} x2={x + 14} y2={y + doorOffset} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + 14} ${y + doorOffset} A 14 14 0 0 1 ${x} ${y + doorOffset + 14}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'right' && (
            <g>
              <line x1={x + w} y1={y + doorOffset} x2={x + w} y2={y + doorOffset + doorWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + w} y1={y + doorOffset} x2={x + w - 14} y2={y + doorOffset} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + w - 14} ${y + doorOffset} A 14 14 0 0 1 ${x + w} ${y + doorOffset + 14}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'top' && (
            <g>
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset + doorWidth} y2={y} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y} x2={x + doorOffset} y2={y + 14} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + doorOffset} ${y + 14} A 14 14 0 0 0 ${x + doorOffset + 14} ${y}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {doorSide === 'bottom' && (
            <g>
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset + doorWidth} y2={y + h} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={x + doorOffset} y1={y + h} x2={x + doorOffset} y2={y + h - 14} stroke={catColor} strokeWidth="1.4" />
              <path
                d={`M ${x + doorOffset} ${y + h - 14} A 14 14 0 0 1 ${x + doorOffset + 14} ${y + h}`}
                fill="none"
                stroke={catColor}
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Typography */}
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={textX}
              y={textY}
              fontFamily="var(--font-sans)"
              fontSize={titleSize}
              fontWeight="800"
              fill="var(--ink-pure)"
              letterSpacing="-0.2px"
            >
              {title || room.code}
            </text>

            {subTitle && (
              <text
                x={textX}
                y={isCompact ? textY + 14 : (isLarge ? textY + 18 : textY + 16)}
                fontFamily="var(--font-sans)"
                fontSize={subTitleSize}
                fontWeight="500"
                fill="var(--ink-muted)"
              >
                {subTitle}
              </text>
            )}
          </g>
        </g>
      );
    };

    return (
      <svg
        viewBox="14 10 932 530"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          margin: 0,
          background: 'var(--canvas-subtle)'
        }}
      >
        {/* ==============================================================
            1. KHUNG VỎ KIẾN TRÚC TOÀN KHU TẦNG 3
            ============================================================== */}
        <rect
          x="16"
          y="12"
          width={f3W - 32}
          height={f3H - 24}
          rx="6"
          fill="none"
          stroke="var(--ink-pure)"
          strokeWidth="2.2"
        />
        <rect
          x="20"
          y="16"
          width={f3W - 40}
          height={f3H - 32}
          rx="5"
          fill="none"
          stroke="var(--hairline-medium)"
          strokeWidth="0.8"
        />

        {/* Cửa sổ đón sáng tự nhiên cánh Tây & Đông */}
        {[60, 190, 360, 480].map((wy) => (
          <g key={`win-we-f3-${wy}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1="16" y1={wy} x2="16" y2={wy + 42} />
            <line x1={f3W - 16} y1={wy} x2={f3W - 16} y2={wy + 42} />
          </g>
        ))}

        {/* Cửa sổ đón sáng tự nhiên hướng Bắc & Nam */}
        {[60, 100, 260, 310, 420, 520, 630, 680, 830, 890].map((wx) => (
          <g key={`win-ns-f3-${wx}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1={wx} y1="12" x2={wx + 36} y2="12" />
            <line x1={wx} y1={f3H - 12} x2={wx + 36} y2={f3H - 12} />
          </g>
        ))}

        {/* ==============================================================
            2. CÁNH TÂY NGOÀI (x = 24..164, w = 140)
            ============================================================== */}
        {/* Góc Tây Bắc: Cụm 2 phòng học Lý Thuyết [ PH 301 / PH 302 ] (Xanh Dương) */}
        <g id="f3-corner-northwest">
          {renderF3RoomCard({
            room: room301,
            x: 24,
            y: 18,
            w: 140,
            h: 45,
            title: 'PH 301',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="24" y="63" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room302,
            x: 24,
            y: 67,
            w: 140,
            h: 45,
            title: 'PH 302',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* Cánh Tây Giữa: Lab Tin Học & PTN (Xanh Lục Emerald) + Thang Tây */}
        {/* PH 303 (trên Thang Tây - Lab Máy Tính & PTN) */}
        {renderF3RoomCard({
          room: room303,
          x: 24,
          y: 162,
          w: 140,
          h: 66,
          title: 'PH 303',
          subTitle: 'Lab Tin Học • 60 chỗ',
          doorSide: 'right',
          doorOffset: 20
        })}

        {/* CẦU THANG TÂY (GIỮ NGUYÊN VỊ TRÍ & VẾ THANG CHUẨN TẦNG 1 & 2) */}
        <g id="f3-west-stairwell">
          <rect
            x="24"
            y="232"
            width="140"
            height="88"
            fill="rgba(248, 250, 252, 0.95)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Chiếu nghỉ sát tường ngoài Tây */}
          <rect x="24" y="232" width="30" height="88" fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
          {/* Vế thang UP */}
          <rect x="56" y="235" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`f3-tx-w-up-${tx}`} x1={tx} y1="235" x2={tx} y2="272" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="150" y1="253" x2="65" y2="253" stroke="#2563EB" strokeWidth="1.8" />
          <polygon points="73,249 64,253 73,257" fill="#2563EB" />

          {/* Khe giữa thang & Nhãn */}
          <rect x="56" y="268" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="108"
            y="280"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            THANG TÂY ▲
          </text>

          {/* Vế thang DOWN */}
          <rect x="56" y="280" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[68, 80, 92, 104, 116, 128, 140, 152].map((tx) => (
            <line key={`f3-tx-w-dn-${tx}`} x1={tx} y1="280" x2={tx} y2="317" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="65" y1="298" x2="150" y2="298" stroke="#059669" strokeWidth="1.8" />
          <polygon points="142,294 151,298 142,302" fill="#059669" />
        </g>

        {/* PH 304 (dưới Thang Tây - Lab Multimedia & AI) */}
        {renderF3RoomCard({
          room: room304,
          x: 24,
          y: 324,
          w: 140,
          h: 66,
          title: 'PH 304',
          subTitle: 'Lab Multimedia • 60 chỗ',
          doorSide: 'right',
          doorOffset: 20
        })}

        {/* Góc Tây Nam: Cụm 2 phòng Nghiên cứu & Tự học [ PH 305 / PH 306 ] (Tím Violet) */}
        <g id="f3-corner-southwest">
          {renderF3RoomCard({
            room: room305,
            x: 24,
            y: 438,
            w: 140,
            h: 45,
            title: 'PH 305',
            subTitle: 'Nghiên cứu • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="24" y="483" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room306,
            x: 24,
            y: 487,
            w: 140,
            h: 45,
            title: 'PH 306',
            subTitle: 'Tự học • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            3. TRỤC HÀNH LANG DỌC TÂY (x = 168..232, w = 64) - NỀN GẠCH KIẾN TRÚC TRUNG TÍNH
            ============================================================== */}
        <g id="f3-corridor-west">
          <rect
            x="168"
            y="18"
            width="64"
            height="514"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="200" y1="28" x2="200" y2="522" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="6 4" />
          
          <g transform="translate(172, 60)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL TÂY
            </text>
          </g>

          <g transform="translate(172, 270)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC TÂY
            </text>
          </g>

          <g transform="translate(172, 480)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL TÂY
            </text>
          </g>
        </g>

        {/* ==============================================================
            4. CỘT TRONG TÂY: CỤM PHÒNG BẮC TRONG & NAM TRONG (x = 236..356, w = 120)
            ============================================================== */}
        {/* Dãy Bắc Trong (Trái): Phòng Hội Thảo & Seminar [ PH 307 / PH 308 ] (Hổ Phách/Cam) */}
        <g id="f3-block-north-left">
          {renderF3RoomCard({
            room: room307,
            x: 236,
            y: 18,
            w: 120,
            h: 45,
            title: 'PH 307',
            subTitle: 'Seminar • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="236" y="63" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room308,
            x: 236,
            y: 67,
            w: 120,
            h: 45,
            title: 'PH 308',
            subTitle: 'Đồ án • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* Dãy Nam Trong (Trái): Smart Classroom [ PH 315 / PH 316 ] (Xanh Mòng Két Teal) */}
        <g id="f3-block-south-left">
          {renderF3RoomCard({
            room: room315,
            x: 236,
            y: 438,
            w: 120,
            h: 45,
            title: 'PH 315',
            subTitle: 'Smart Room 1',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="236" y="483" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room316,
            x: 236,
            y: 487,
            w: 120,
            h: 45,
            title: 'PH 316',
            subTitle: 'Smart Room 2',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            5. PHÒNG NGHIÊN CỨU 1 (BẮC: x = 364..596, w = 232)
            ============================================================== */}
        <g id="f3-research-room-north">
          {renderF3RoomCard({
            room: roomNC1,
            x: 364,
            y: 18,
            w: 232,
            h: 94,
            title: 'PHÒNG NGHIÊN CỨU 1',
            subTitle: 'Viện Nghiên Cứu & Phát Triển • 45 chỗ',
            doorSide: 'bottom',
            doorOffset: 35,
            doorWidth: 26
          })}
          {/* Subtle architectural research workstation benches */}
          <g opacity="0.3" pointerEvents="none">
            <rect x="440" y="32" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
            <rect x="518" y="32" width="64" height="24" rx="3" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        </g>

        {/* ==============================================================
            6. DÃY TRUNG TÂM NAM: PHÒNG Y TẾ (TRÁI) & PHÒNG HỌC (PHẢI)
            (THAY THẾ PHÒNG NGHIÊN CỨU 2 THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG)
            ============================================================== */}
        <g id="f3-medical-and-classroom-south">
          {/* PHÒNG Y TẾ (x = 364..478, y = 438..532, w = 114, h = 94) */}
          {renderF3RoomCard({
            room: roomYTE,
            x: 364,
            y: 438,
            w: 114,
            h: 94,
            title: 'PHÒNG Y TẾ',
            subTitle: 'Sơ cấp cứu • 15 chỗ',
            doorSide: 'top',
            doorOffset: 16,
            doorWidth: 18,
            isMedical: true
          })}
          {/* Subtle architectural medical examination bed */}
          <g opacity="0.35" pointerEvents="none">
            <rect x="380" y="492" width="34" height="22" rx="3" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="390" cy="503" r="3.5" fill="none" stroke="#EF4444" strokeWidth="1" />
          </g>

          {/* Vách ngăn cách âm giữa Phòng Y Tế và Phòng Học */}
          <rect
            x="478"
            y="438"
            width="4"
            height="94"
            fill="rgba(148, 163, 184, 0.4)"
            stroke="#64748B"
            strokeWidth="0.6"
          />

          {/* PHÒNG HỌC (PH 319) (x = 482..596, y = 438..532, w = 114, h = 94) */}
          {renderF3RoomCard({
            room: room319,
            x: 482,
            y: 438,
            w: 114,
            h: 94,
            title: 'PHÒNG HỌC',
            subTitle: 'Lý thuyết • 45 chỗ',
            doorSide: 'top',
            doorOffset: 16,
            doorWidth: 18
          })}
          {/* Subtle architectural classroom desks */}
          <g opacity="0.35" pointerEvents="none">
            <rect x="498" y="494" width="34" height="14" rx="2" fill="none" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 2" />
            <rect x="548" y="494" width="34" height="14" rx="2" fill="none" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 2" />
          </g>
        </g>

        {/* ==============================================================
            7. HÀNH LANG NGANG BẮC & NAM (GIAO THÔNG KIẾN TRÚC TRUNG TÍNH)
            ============================================================== */}
        {/* Hành lang ngang Bắc (y = 118..158, h = 40) */}
        <g id="f3-corridor-north">
          <rect
            x="24"
            y="118"
            width="912"
            height="40"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="32" y1="138" x2="928" y2="138" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="8 5" />
          <text
            x="480"
            y="143"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#475569"
            textAnchor="middle"
          >
            HÀNH LANG TRỤC BẮC (TÂY — ĐÔNG)
          </text>
        </g>

        {/* Hành lang ngang Nam (y = 394..434, h = 40) */}
        <g id="f3-corridor-south">
          <rect
            x="24"
            y="394"
            width="912"
            height="40"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="32" y1="414" x2="928" y2="414" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="8 5" />
          <text
            x="480"
            y="419"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#475569"
            textAnchor="middle"
          >
            HÀNH LANG TRỤC NAM (TÂY — ĐÔNG)
          </text>
        </g>

        {/* ==============================================================
            8. GIẾNG TRỜI TRUNG TÂM (KHỐI THÔNG TẦNG XUỐNG TẦNG 2 & 1)
            ============================================================== */}
        <g id="f3-central-atrium-void">
          {/* Khung sàn thông tầng trung tâm (x = 236..724, y = 162..390) */}
          <rect
            x="236"
            y="162"
            width="488"
            height="228"
            rx="6"
            fill="rgba(248, 250, 252, 0.85)"
            stroke="rgba(148, 163, 184, 0.55)"
            strokeWidth="1.6"
          />

          {/* Lan can kính cường lực CAD viền quanh mép giếng trời */}
          <rect
            x="242"
            y="168"
            width="476"
            height="216"
            rx="4"
            fill="none"
            stroke="rgba(2, 132, 199, 0.55)"
            strokeWidth="1.4"
            strokeDasharray="5 3"
          />

          {/* Đường chéo kỹ thuật kiến trúc biểu thị khoảng thông tầng */}
          <line x1="242" y1="168" x2="718" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="718" y1="168" x2="242" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Bảng hiệu nổi bật: GIẾNG TRỜI TRUNG TÂM */}
          <g transform="translate(372, 248)">
            <rect
              x="0"
              y="0"
              width="216"
              height="58"
              rx="8"
              fill="var(--surface-panel)"
              stroke="rgba(2, 132, 199, 0.5)"
              strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 2px 10px rgba(2, 132, 199, 0.15))' }}
            />
            <text
              x="108"
              y="22"
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              GIẾNG TRỜI TRUNG TÂM
            </text>
            <text
              x="108"
              y="38"
              fontFamily="var(--font-sans)"
              fontSize="11"
              fontWeight="800"
              fill="#0284C7"
              textAnchor="middle"
              letterSpacing="0.4"
            >
              THÔNG TẦNG XUỐNG TẦNG 2 & TẦNG 1
            </text>
            <text
              x="108"
              y="50"
              fontFamily="var(--font-sans)"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--ink-muted)"
              textAnchor="middle"
            >
              Lan can kính an toàn • Nhìn xuống đại sảnh
            </text>
          </g>
        </g>

        {/* ==============================================================
            9. CỘT TRONG ĐÔNG: CỤM PHÒNG BẮC TRONG & NAM TRONG (x = 604..724, w = 120)
            ============================================================== */}
        {/* Dãy Bắc Trong (Phải): Diễn đàn & Workshop [ PH 309 / PH 310 ] (Hổ Phách/Cam) */}
        <g id="f3-block-north-right">
          {renderF3RoomCard({
            room: room309,
            x: 604,
            y: 18,
            w: 120,
            h: 45,
            title: 'PH 309',
            subTitle: 'Diễn đàn • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="604" y="63" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room310,
            x: 604,
            y: 67,
            w: 120,
            h: 45,
            title: 'PH 310',
            subTitle: 'Workshop • 50 chỗ',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* Dãy Nam Trong (Phải): Phòng Học Tương Tác [ PH 317 / PH 318 ] (Xanh Mòng Két Teal) */}
        <g id="f3-block-south-right">
          {renderF3RoomCard({
            room: room317,
            x: 604,
            y: 438,
            w: 120,
            h: 45,
            title: 'PH 317',
            subTitle: 'Tương tác 1',
            doorSide: 'right',
            doorOffset: 12
          })}
          <rect x="604" y="483" width="120" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room318,
            x: 604,
            y: 487,
            w: 120,
            h: 45,
            title: 'PH 318',
            subTitle: 'Tương tác 2',
            doorSide: 'right',
            doorOffset: 12
          })}
        </g>

        {/* ==============================================================
            10. TRỤC HÀNH LANG DỌC ĐÔNG (x = 728..792, w = 64) - NỀN GẠCH KIẾN TRÚC TRUNG TÍNH
            ============================================================== */}
        <g id="f3-corridor-east">
          <rect
            x="728"
            y="18"
            width="64"
            height="514"
            fill="rgba(241, 245, 249, 0.75)"
            stroke="rgba(203, 213, 225, 0.85)"
            strokeWidth="1.2"
            rx="4"
          />
          <line x1="760" y1="28" x2="760" y2="522" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="6 4" />

          <g transform="translate(732, 60)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL ĐÔNG
            </text>
          </g>

          <g transform="translate(732, 270)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC ĐÔNG
            </text>
          </g>

          <g transform="translate(732, 480)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="#475569" textAnchor="middle">
              HL ĐÔNG
            </text>
          </g>
        </g>

        {/* ==============================================================
            11. CÁNH ĐÔNG NGOÀI (x = 796..936, w = 140)
            ============================================================== */}
        {/* Góc Đông Bắc: Cụm 2 phòng học Lý Thuyết [ PH 311 / PH 312 ] (Xanh Dương) */}
        <g id="f3-corner-northeast">
          {renderF3RoomCard({
            room: room311,
            x: 796,
            y: 18,
            w: 140,
            h: 45,
            title: 'PH 311',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="796" y="63" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room312,
            x: 796,
            y: 67,
            w: 140,
            h: 45,
            title: 'PH 312',
            subTitle: 'Lý thuyết • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>

        {/* Cánh Đông Giữa: NVS NỮ (Hồng Rose), THANG ĐÔNG, NVS NAM (Xanh Cobalt) */}
        {/* NVS NỮ (GIỮ NGUYÊN VỊ TRÍ CHUẨN TẦNG 1 & 2 - TONE HỒNG TINH TẾ) */}
        {renderF3RoomCard({
          room: roomWCNU,
          x: 796,
          y: 162,
          w: 140,
          h: 66,
          title: 'NVS NỮ',
          subTitle: 'Khu vệ sinh nữ',
          doorSide: 'left',
          doorOffset: 20
        })}

        {/* CẦU THANG ĐÔNG (GIỮ NGUYÊN VỊ TRÍ & VẾ THANG CHUẨN TẦNG 1 & 2) */}
        <g id="f3-east-stairwell">
          <rect
            x="796"
            y="232"
            width="140"
            height="88"
            fill="rgba(248, 250, 252, 0.95)"
            stroke="#475569"
            strokeWidth="1.8"
            rx="4"
          />
          {/* Vế thang UP */}
          <rect x="798" y="235" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`f3-tx-e-up-${tx}`} x1={tx} y1="235" x2={tx} y2="272" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="808" y1="253" x2="893" y2="253" stroke="#2563EB" strokeWidth="1.8" />
          <polygon points="885,249 894,253 885,257" fill="#2563EB" />

          {/* Khe giữa thang & Nhãn */}
          <rect x="798" y="268" width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
          <text
            x="850"
            y="280"
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            THANG ĐÔNG ▲
          </text>

          {/* Vế thang DOWN */}
          <rect x="798" y="280" width="104" height="37" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[810, 822, 834, 846, 858, 870, 882, 894].map((tx) => (
            <line key={`f3-tx-e-dn-${tx}`} x1={tx} y1="280" x2={tx} y2="317" stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="893" y1="298" x2="808" y2="298" stroke="#059669" strokeWidth="1.8" />
          <polygon points="816,294 807,298 816,302" fill="#059669" />

          {/* Chiếu nghỉ sát tường ngoài Đông */}
          <rect x="906" y="232" width="30" height="88" fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
        </g>

        {/* NVS NAM (GIỮ NGUYÊN VỊ TRÍ CHUẨN TẦNG 1 & 2 - TONE XANH COBALT LỊCH LÃM) */}
        {renderF3RoomCard({
          room: roomWCNAM,
          x: 796,
          y: 324,
          w: 140,
          h: 66,
          title: 'NVS NAM',
          subTitle: 'Khu vệ sinh nam',
          doorSide: 'left',
          doorOffset: 20
        })}

        {/* Góc Đông Nam: Cụm 2 phòng Đồ Án & Sáng Tạo [ PH 313 / PH 314 ] (Tím Violet) */}
        <g id="f3-corner-southeast">
          {renderF3RoomCard({
            room: room313,
            x: 796,
            y: 438,
            w: 140,
            h: 45,
            title: 'PH 313',
            subTitle: 'Đồ án • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
          <rect x="796" y="483" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderF3RoomCard({
            room: room314,
            x: 796,
            y: 487,
            w: 140,
            h: 45,
            title: 'PH 314',
            subTitle: 'Sáng tạo • 50 chỗ',
            doorSide: 'left',
            doorOffset: 12
          })}
        </g>
      </svg>
    );
  };

  // ==============================================================
  // RENDER STANDARD CORRIDOR PLAN FOR FLOORS 4, 5
  // ==============================================================
  const renderStandardFloorPlan = () => {
    // Dimensions of SVG architectural canvas
    const canvasW = 960;
    const canvasH = 412;

    const perimeterLeft = 20;
    const perimeterRight = 940;
    const availableWidth = perimeterRight - perimeterLeft;

    const topRoomY = 16;
    const roomHeight = 114;
    const bottomRoomY = 276;

    const corridorY = 130;
    const corridorH = 146;

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

    const getRoomDoorProps = (room, index, totalRooms) => {
      const rx = room.x;
      const rw = room.width;
      let doorX;

      if (index === 0) {
        doorX = Math.min(rx + rw - 30, Math.max(rx + 16, 132));
      } else if (index === totalRooms - 1) {
        doorX = Math.max(rx + 12, Math.min(rx + rw - 36, 808));
      } else {
        doorX = rx + Math.min(22, rw / 3);
      }

      return {
        doorX,
        doorW: 22
      };
    };

    const structuralColumns = [20, 108, 210, 340, 480, 620, 750, 852, 940];

    const renderRoomLabels = (room, rx, ry, rw, rh) => {
      const rawName = room.name || '';
      const maxSingleLineChars = Math.floor((rw - 30) / 6.8);
      const words = rawName.split(/[\s/]+/);

      if (rawName.length <= maxSingleLineChars || words.length <= 1) {
        return (
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={rx + 16}
              y={ry + rh / 2 - 3}
              fontFamily="var(--font-sans)"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--ink-pure)"
            >
              {rawName}
            </text>
            <text
              x={rx + 16}
              y={ry + rh / 2 + 15}
              fontFamily="var(--font-sans)"
              fontSize="10.5"
              fill="var(--ink-muted)"
              fontWeight="500"
            >
              {room.capacity ? `${room.capacity} chỗ` : getCategoryShortName(room.category)}
            </text>
          </g>
        );
      }

      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');

      return (
        <g style={{ pointerEvents: 'none' }}>
          <text
            x={rx + 16}
            y={ry + rh / 2 - 12}
            fontFamily="var(--font-sans)"
            fontSize="12"
            fontWeight="800"
            fill="var(--ink-pure)"
          >
            {line1}
          </text>
          <text
            x={rx + 16}
            y={ry + rh / 2 + 3}
            fontFamily="var(--font-sans)"
            fontSize="12"
            fontWeight="800"
            fill="var(--ink-pure)"
          >
            {line2}
          </text>
          <text
            x={rx + 16}
            y={ry + rh / 2 + 19}
            fontFamily="var(--font-sans)"
            fontSize="10.5"
            fill="var(--ink-muted)"
            fontWeight="500"
          >
            {room.capacity ? `${room.capacity} chỗ` : getCategoryShortName(room.category)}
          </text>
        </g>
      );
    };

    return (
      <svg
        viewBox="14 10 932 370"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: 'min(480px, 55vh)',
          minWidth: '660px',
          display: 'block',
          fontFamily: 'var(--font-sans)'
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="corridor-tiles" width="18" height="18" patternUnits="userSpaceOnUse">
            <rect width="18" height="18" fill="var(--surface-panel)" />
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="var(--hairline-soft)" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        </defs>

        {/* Outer Perimeter Wall */}
        <rect
          x="16"
          y="12"
          width={canvasW - 32}
          height={canvasH - 24}
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="3"
          rx="8"
        />

        {/* Exterior Window Lines */}
        {[40, 150, 260, 370, 480, 590, 700, 810].map((wx) => (
          <g key={wx} stroke="#0284C7" strokeWidth="3" opacity="0.95">
            <line x1={wx} y1="12" x2={wx + 65} y2="12" />
            <line x1={wx} y1={canvasH - 12} x2={wx + 65} y2={canvasH - 12} />
          </g>
        ))}

        {/* Corridor Zone */}
        <rect
          x="108"
          y={corridorY}
          width={canvasW - 216}
          height={corridorH}
          fill="url(#corridor-tiles)"
          stroke="none"
        />

        <line x1="108" y1={corridorY} x2={canvasW - 108} y2={corridorY} stroke="var(--hairline-strong)" strokeWidth="2.5" />
        <line x1="108" y1={corridorY + corridorH} x2={canvasW - 108} y2={corridorY + corridorH} stroke="var(--hairline-strong)" strokeWidth="2.5" />

        <line x1="20" y1={corridorY} x2="108" y2={corridorY} stroke="var(--ink-muted)" strokeWidth="3.5" />
        <line x1="20" y1={corridorY + corridorH} x2="108" y2={corridorY + corridorH} stroke="var(--ink-muted)" strokeWidth="3.5" />
        <line x1={canvasW - 108} y1={corridorY} x2={canvasW - 20} y2={corridorY} stroke="var(--ink-muted)" strokeWidth="3.5" />
        <line x1={canvasW - 108} y1={corridorY + corridorH} x2={canvasW - 20} y2={corridorY + corridorH} stroke="var(--ink-muted)" strokeWidth="3.5" />

        <line x1="140" y1={corridorY + 18} x2={canvasW - 140} y2={corridorY + 18} stroke="#0284C7" strokeWidth="1.2" strokeDasharray="4 3" />
        <line x1="140" y1={corridorY + corridorH - 18} x2={canvasW - 140} y2={corridorY + corridorH - 18} stroke="#0284C7" strokeWidth="1.2" strokeDasharray="4 3" />

        {/* Central Core Skylight */}
        <g id="central-core">
          <g transform={`translate(${(canvasW - 180) / 2}, ${corridorY + 36})`}>
            <rect
              x="0"
              y="0"
              width="180"
              height="74"
              fill="var(--surface-panel)"
              stroke="var(--hairline-medium)"
              strokeWidth="1"
              strokeDasharray="4 2"
              rx="6"
            />
            <text
              x="90"
              y="34"
              fontFamily="var(--font-sans)"
              fontSize="10.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
            >
              GIẾNG TRỜI THÔNG TẦNG
            </text>
            <text
              x="90"
              y="50"
              fontFamily="var(--font-sans)"
              fontSize="8.5"
              fontWeight="500"
              fill="var(--ink-muted)"
              textAnchor="middle"
            >
              Đón Gió Tự Nhiên • Chiếu Sáng
            </text>
          </g>
        </g>

        {/* Structural Columns */}
        {structuralColumns.map((cx) => (
          <g key={`col-${cx}`}>
            <rect x={cx - 4.5} y={corridorY - 4.5} width="9" height="9" fill="var(--ink-muted)" stroke="var(--hairline-strong)" strokeWidth="0.8" rx="1" />
            <rect x={cx - 4.5} y={corridorY + corridorH - 4.5} width="9" height="9" fill="var(--ink-muted)" stroke="var(--hairline-strong)" strokeWidth="0.8" rx="1" />
          </g>
        ))}

        {/* West Stairwell Core */}
        <g id="west-stairwell">
          <rect x="20" y={corridorY} width="88" height={corridorH} fill="var(--surface-panel)" stroke="#475569" strokeWidth="1.8" rx="4" />
          <rect x="20" y={corridorY} width="28" height={corridorH} fill="rgba(148, 163, 184, 0.22)" stroke="#64748B" strokeWidth="1" />
          <line x1="20" y1={corridorY + 20} x2="20" y2={corridorY + 56} stroke="#0284C7" strokeWidth="2.5" />
          <line x1="20" y1={corridorY + 90} x2="20" y2={corridorY + 126} stroke="#0284C7" strokeWidth="2.5" />

          <rect x="48" y={corridorY + 4} width="58" height="62" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[55, 62, 69, 76, 83, 90, 97].map((tx) => (
            <line key={tx} x1={tx} y1={corridorY + 4} x2={tx} y2={corridorY + 66} stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="98" y1={corridorY + 34} x2="54" y2={corridorY + 34} stroke="#0284C7" strokeWidth="1.8" />
          <polygon points={`59,${corridorY + 30} 53,${corridorY + 34} 59,${corridorY + 38}`} fill="#0284C7" />

          <rect x="48" y={corridorY + 65.5} width="58" height="15" fill="rgba(148, 163, 184, 0.25)" stroke="#64748B" strokeWidth="0.8" />
          <text
            x="77"
            y={corridorY + 76.5}
            fontFamily="var(--font-sans)"
            fontSize="8"
            fontWeight="900"
            fill="var(--ink-pure)"
            textAnchor="middle"
          >
            THANG TÂY
          </text>

          <rect x="48" y={corridorY + 80} width="58" height="62" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[55, 62, 69, 76, 83, 90, 97].map((tx) => (
            <line key={tx} x1={tx} y1={corridorY + 80} x2={tx} y2={corridorY + 142} stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1="54" y1={corridorY + 110} x2="98" y2={corridorY + 110} stroke="#059669" strokeWidth="1.8" />
          <polygon points={`93,${corridorY + 106} 99,${corridorY + 110} 93,${corridorY + 114}`} fill="#059669" />
        </g>

        {/* East Stairwell Core */}
        <g id="east-stairwell">
          <rect x={canvasW - 108} y={corridorY} width="88" height={corridorH} fill="var(--surface-panel)" stroke="#475569" strokeWidth="1.8" rx="4" />
          <rect x={canvasW - 106} y={corridorY + 4} width="58" height="62" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[canvasW - 99, canvasW - 92, canvasW - 85, canvasW - 78, canvasW - 71, canvasW - 64, canvasW - 57].map((tx) => (
            <line key={tx} x1={tx} y1={corridorY + 4} x2={tx} y2={corridorY + 66} stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1={canvasW - 100} y1={corridorY + 34} x2={canvasW - 56} y2={corridorY + 34} stroke="#0284C7" strokeWidth="1.8" />
          <polygon points={`${canvasW - 61},${corridorY + 30} ${canvasW - 55},${corridorY + 34} ${canvasW - 61},${corridorY + 38}`} fill="#0284C7" />

          <rect x={canvasW - 106} y={corridorY + 65.5} width="58" height="15" fill="rgba(148, 163, 184, 0.25)" stroke="#64748B" strokeWidth="0.8" />
          <text
            x={canvasW - 77}
            y={corridorY + 76.5}
            fontFamily="var(--font-sans)"
            fontSize="8"
            fontWeight="900"
            fill="var(--ink-pure)"
            textAnchor="middle"
          >
            THANG ĐÔNG
          </text>

          <rect x={canvasW - 106} y={corridorY + 80} width="58" height="62" fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
          {[canvasW - 99, canvasW - 92, canvasW - 85, canvasW - 78, canvasW - 71, canvasW - 64, canvasW - 57].map((tx) => (
            <line key={tx} x1={tx} y1={corridorY + 80} x2={tx} y2={corridorY + 142} stroke="#64748B" strokeWidth="1" />
          ))}
          <line x1={canvasW - 56} y1={corridorY + 110} x2={canvasW - 100} y2={corridorY + 110} stroke="#059669" strokeWidth="1.8" />
          <polygon points={`${canvasW - 95},${corridorY + 106} ${canvasW - 101},${corridorY + 110} ${canvasW - 95},${corridorY + 114}`} fill="#059669" />

          <rect x={canvasW - 48} y={corridorY} width="28" height={corridorH} fill="rgba(148, 163, 184, 0.22)" stroke="#64748B" strokeWidth="1" />
          <line x1={canvasW - 20} y1={corridorY + 20} x2={canvasW - 20} y2={corridorY + 56} stroke="#0284C7" strokeWidth="2.5" />
          <line x1={canvasW - 20} y1={corridorY + 90} x2={canvasW - 20} y2={corridorY + 126} stroke="#0284C7" strokeWidth="2.5" />
        </g>

        {/* Top Placed Rooms */}
        {topPlacedRooms.map((room, idx) => {
          const rx = room.x;
          const rw = room.width;
          const ry = topRoomY;
          const rh = roomHeight;
          const catInfo = ROOM_CATEGORIES[room.category] || {};
          const catColor = catInfo.color || '#94A3B8';
          const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
          const isSelected = selectedRoom?.code === room.code;
          const { doorX, doorW } = getRoomDoorProps(room, idx, topPlacedRooms.length);

          return (
            <g key={room.id} onClick={() => onSelectRoom && onSelectRoom(room)} style={{ cursor: 'pointer' }}>
              <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                rx="6"
                fill={isSelected ? 'var(--surface-panel)' : (catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)')}
                stroke={isSelected ? catColor : (catInfo.border || 'rgba(148, 163, 184, 0.5)')}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                style={{
                  transition: 'all 0.15s ease',
                  filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
                }}
              />
              <rect x={rx + 6} y={ry + 8} width="5" height={rh - 16} rx="2.5" fill={catColor} />
              <circle cx={rx + rw - 13} cy={ry + 13} r="4.5" fill={sim.color} stroke="var(--surface-panel)" strokeWidth="1.5" />
              <line x1={doorX} y1={ry + rh} x2={doorX + doorW} y2={ry + rh} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={doorX} y1={ry + rh} x2={doorX} y2={ry + rh - 16} stroke={catColor} strokeWidth="1.5" />
              <path d={`M ${doorX} ${ry + rh - 16} A 16 16 0 0 1 ${doorX + 16} ${ry + rh}`} fill="none" stroke={catColor} strokeWidth="1.2" strokeDasharray="2 2" />
              {renderRoomLabels(room, rx, ry, rw, rh)}
            </g>
          );
        })}

        {/* Bottom Placed Rooms */}
        {bottomPlacedRooms.map((room, idx) => {
          const rx = room.x;
          const rw = room.width;
          const ry = bottomRoomY;
          const rh = roomHeight;
          const catInfo = ROOM_CATEGORIES[room.category] || {};
          const catColor = catInfo.color || '#94A3B8';
          const sim = getRoomSimulatedStatus ? getRoomSimulatedStatus(room) : { status: 'available', color: '#10B981', label: 'Trống' };
          const isSelected = selectedRoom?.code === room.code;
          const { doorX, doorW } = getRoomDoorProps(room, idx, bottomPlacedRooms.length);

          return (
            <g key={room.id} onClick={() => onSelectRoom && onSelectRoom(room)} style={{ cursor: 'pointer' }}>
              <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                rx="6"
                fill={isSelected ? 'var(--surface-panel)' : (catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)')}
                stroke={isSelected ? catColor : (catInfo.border || 'rgba(148, 163, 184, 0.5)')}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                style={{
                  transition: 'all 0.15s ease',
                  filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
                }}
              />
              <rect x={rx + 6} y={ry + 8} width="5" height={rh - 16} rx="2.5" fill={catColor} />
              <circle cx={rx + rw - 13} cy={ry + 13} r="4.5" fill={sim.color} stroke="var(--surface-panel)" strokeWidth="1.5" />
              <line x1={doorX} y1={ry} x2={doorX + doorW} y2={ry} stroke={catInfo.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
              <line x1={doorX} y1={ry} x2={doorX} y2={ry + 16} stroke={catColor} strokeWidth="1.5" />
              <path d={`M ${doorX} ${ry + 16} A 16 16 0 0 0 ${doorX + 16} ${ry}`} fill="none" stroke={catColor} strokeWidth="1.2" strokeDasharray="2 2" />
              {renderRoomLabels(room, rx, ry, rw, rh)}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* ==============================================================
          1. HEADER CONTROLS & FLOOR LEVEL SELECTOR
          ============================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: 'var(--surface-panel)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--hairline-soft)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 800,
              color: '#38BDF8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '2px 7px',
              borderRadius: '5px'
            }}
          >
            {currentFloorData.floorCode}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)' }}>
            {currentFloorData.title}
          </span>
        </div>

        {/* 5-Story Floor Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {[1, 2, 3, 4, 5].map((fl) => {
            const isActive = selectedFloor === fl;
            const flData = CAMPUS_FLOORS[fl];
            return (
              <button
                key={fl}
                type="button"
                onClick={() => onChangeFloor && onChangeFloor(fl)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: isActive ? '1.5px solid #38BDF8' : '1px solid var(--hairline-medium)',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'var(--canvas-subtle)',
                  color: isActive ? '#38BDF8' : 'var(--ink-primary)',
                  fontSize: '11px',
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
          2. ARCHITECTURAL 2D FLOOR PLAN
          ============================================================== */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          background: 'var(--surface-card)',
          borderRadius: '8px',
          border: '1px solid var(--hairline-medium)',
          padding: '0px',
          boxShadow: 'none'
        }}
      >
        {selectedFloor === 1 ? renderFloor1Plan() : selectedFloor === 2 ? renderFloor2Plan() : selectedFloor === 3 ? renderFloor3Plan() : renderStandardFloorPlan()}
      </div>

      {/* ==============================================================
          3. CATEGORY LEGEND BAR
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
          💡 Nhấp vào bất kỳ phòng nào trên sơ đồ để xem trang thiết bị, tình trạng vận hành & điều chuyển
        </div>
      </div>
    </div>
  );
};
