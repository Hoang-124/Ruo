import React, { useMemo } from 'react';
import { getRoomPod, getRoomAlertDot } from './roomPod';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';

const CAD_W = 960;
const CAD_H = 550;

const FEMALE_WC_CODES = new Set([
  'A1-WC-NU',
  'A1-WC-NU-T2',
  'A1-WC-NU-T3',
  'A1-WC-NU-T4',
  'A1-WC-NU-T5'
]);

const MALE_WC_CODES = new Set([
  'A1-WC-NAM',
  'A1-WC-NAM-T2',
  'A1-WC-NAM-T3',
  'A1-WC-NAM-T4',
  'A1-WC-NAM-T5'
]);

const STAIR_TICKS_WEST = [68, 80, 92, 104, 116, 128, 140, 152];
const STAIR_TICKS_EAST = [810, 822, 834, 846, 858, 870, 882, 894];
const BALCONY_BALUSTER_X = Array.from({ length: 32 }, (_, idx) => 44 + idx * 28);
const FLOOR_NUMBERS = [1, 2, 3, 4, 5];

const CorridorAxisBadges = () => (
  <>
    <g transform="translate(172, 264)">
      <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
      <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
        TRỤC TÂY
      </text>
    </g>
    <g transform="translate(732, 264)">
      <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
      <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
        TRỤC ĐÔNG
      </text>
    </g>
  </>
);

/**
 * Cấu hình chuyên biệt cho các tầng chuẩn khung lưới Giếng Trời (Tầng 2, Tầng 3, Tầng 4).
 * Giữ nguyên 100% tọa độ kiến trúc, công năng và mã phòng của từng tầng.
 */
const UPPER_GRID_FLOOR_SPECS = {
  2: {
    prefix: '2',
    wcNuCode: 'A1-WC-NU-T2',
    wcNamCode: 'A1-WC-NAM-T2',
    northCenter: {
      code: 'A1-NC-01',
      title: 'PHÒNG NGHIÊN CỨU 1'
    },
    southCenterMode: 'single',
    southSingle: {
      code: 'A1-NC-02',
      title: 'PHÒNG NGHIÊN CỨU 2'
    }
  },
  3: {
    prefix: '3',
    wcNuCode: 'A1-WC-NU-T3',
    wcNamCode: 'A1-WC-NAM-T3',
    northCenter: {
      code: 'A1-NC-T3',
      title: 'PHÒNG NGHIÊN CỨU 1'
    },
    southCenterMode: 'pair',
    southPairLeft: {
      code: 'A1-YT-T3',
      title: 'PHÒNG Y TẾ',
      isMedical: true
    },
    southPairRight: {
      code: 'A1-319',
      title: 'PHÒNG HỌC'
    }
  },
  4: {
    prefix: '4',
    wcNuCode: 'A1-WC-NU-T4',
    wcNamCode: 'A1-WC-NAM-T4',
    northCenter: {
      code: 'A1-PĐT',
      title: 'PHÒNG ĐÀO TẠO'
    },
    southCenterMode: 'single',
    southSingle: {
      code: 'A1-PHT',
      title: 'PHÒNG HỘI THẢO'
    }
  }
};

/**
 * Khung vỏ tường bao CAD kép 960×550 & hệ thống cửa sổ lấy sáng tự nhiên.
 */
const OuterCadShell = ({
  idPrefix,
  westEastWinY = [],
  westEastWinLen = 42,
  northWinX = [],
  northWinLen = 36,
  southWinX = [],
  southWinLen = 36
}) => (
  <g id={`${idPrefix}-outer-shell`}>
    <rect
      x="16"
      y="12"
      width={CAD_W - 32}
      height={CAD_H - 24}
      rx="6"
      fill="none"
      stroke="var(--cad-shell-stroke)"
      strokeWidth="2.2"
    />
    <rect
      x="20"
      y="16"
      width={CAD_W - 40}
      height={CAD_H - 32}
      rx="5"
      fill="none"
      stroke="var(--cad-shell-inner)"
      strokeWidth="0.8"
    />

    {westEastWinY.map((wy) => (
      <g key={`${idPrefix}-win-we-${wy}`} stroke="var(--cad-window-stroke)" strokeWidth="3" opacity="0.82">
        <line x1="16" y1={wy} x2="16" y2={wy + westEastWinLen} />
        <line x1={CAD_W - 16} y1={wy} x2={CAD_W - 16} y2={wy + westEastWinLen} />
      </g>
    ))}

    {northWinX.map((wx) => (
      <line
        key={`${idPrefix}-win-n-${wx}`}
        x1={wx}
        y1="12"
        x2={wx + northWinLen}
        y2="12"
        stroke="var(--cad-window-stroke)"
        strokeWidth="3"
        opacity="0.82"
      />
    ))}

    {southWinX.map((wx) => (
      <line
        key={`${idPrefix}-win-s-${wx}`}
        x1={wx}
        y1={CAD_H - 12}
        x2={wx + southWinLen}
        y2={CAD_H - 12}
        stroke="var(--cad-window-stroke)"
        strokeWidth="3"
        opacity="0.82"
      />
    ))}
  </g>
);

/**
 * Hai cụm cầu thang bộ thoát hiểm Tây & Đông đối xứng 100% xuyên suốt 5 tầng.
 */
const StairwellPair = ({ idPrefix, y = 232, h = 88 }) => {
  const flightH = Math.floor((h - 14) / 2); // 37px for h=88, 36px for h=86
  const upTopY = y + 3;
  const upBotY = upTopY + flightH;
  const upMidY = Math.round((upTopY + upBotY) / 2);
  const labelY = y + Math.floor(h / 2) - 8;
  const dnTopY = labelY + 12;
  const dnBotY = dnTopY + flightH;
  const dnMidY = Math.round((dnTopY + dnBotY) / 2);

  return (
    <g id={`${idPrefix}-stairwells`}>
      {/* CẦU THANG TÂY (x = 24..164, w = 140) */}
      <g id={`${idPrefix}-west-stairwell`}>
        <rect
          x="24"
          y={y}
          width="140"
          height={h}
          fill="var(--cad-stair-bg)"
          stroke="var(--cad-wall-stroke)"
          strokeWidth="1.6"
          rx="4"
        />
        <rect x="24" y={y} width="30" height={h} fill="var(--cad-stair-landing)" stroke="var(--cad-corridor-stroke)" strokeWidth="1" />
        <rect x="56" y={upTopY} width="104" height={flightH} fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        {STAIR_TICKS_WEST.map((tx) => (
          <line key={`${idPrefix}-tx-w-up-${tx}`} x1={tx} y1={upTopY} x2={tx} y2={upBotY} stroke="var(--cad-stair-tread-stroke)" strokeWidth="1" />
        ))}
        <line x1="150" y1={upMidY} x2="65" y2={upMidY} stroke="var(--cad-stair-arrow-up)" strokeWidth="1.8" />
        <polygon points={`73,${upMidY - 4} 64,${upMidY} 73,${upMidY + 4}`} fill="var(--cad-stair-arrow-up)" />

        <rect x="56" y={labelY} width="104" height="16" rx="3" fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        <text
          x="108"
          y={labelY + 12}
          fontFamily="var(--font-sans)"
          fontSize="10.5"
          fontWeight="800"
          fill="var(--ink-secondary)"
          textAnchor="middle"
        >
          THANG TÂY ▲
        </text>

        <rect x="56" y={dnTopY} width="104" height={flightH} fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        {STAIR_TICKS_WEST.map((tx) => (
          <line key={`${idPrefix}-tx-w-dn-${tx}`} x1={tx} y1={dnTopY} x2={tx} y2={dnBotY} stroke="var(--cad-stair-tread-stroke)" strokeWidth="1" />
        ))}
        <line x1="65" y1={dnMidY} x2="150" y2={dnMidY} stroke="var(--cad-stair-arrow-down)" strokeWidth="1.8" />
        <polygon points={`142,${dnMidY - 4} 151,${dnMidY} 142,${dnMidY + 4}`} fill="var(--cad-stair-arrow-down)" />
      </g>

      {/* CẦU THANG ĐÔNG (x = 796..936, w = 140) */}
      <g id={`${idPrefix}-east-stairwell`}>
        <rect
          x="796"
          y={y}
          width="140"
          height={h}
          fill="var(--cad-stair-bg)"
          stroke="var(--cad-wall-stroke)"
          strokeWidth="1.6"
          rx="4"
        />
        <rect x="798" y={upTopY} width="104" height={flightH} fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        {STAIR_TICKS_EAST.map((tx) => (
          <line key={`${idPrefix}-tx-e-up-${tx}`} x1={tx} y1={upTopY} x2={tx} y2={upBotY} stroke="var(--cad-stair-tread-stroke)" strokeWidth="1" />
        ))}
        <line x1="808" y1={upMidY} x2="893" y2={upMidY} stroke="var(--cad-stair-arrow-up)" strokeWidth="1.8" />
        <polygon points={`885,${upMidY - 4} 894,${upMidY} 885,${upMidY + 4}`} fill="var(--cad-stair-arrow-up)" />

        <rect x="798" y={labelY} width="104" height="16" rx="3" fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        <text
          x="850"
          y={labelY + 12}
          fontFamily="var(--font-sans)"
          fontSize="10.5"
          fontWeight="800"
          fill="var(--ink-secondary)"
          textAnchor="middle"
        >
          THANG ĐÔNG ▲
        </text>

        <rect x="798" y={dnTopY} width="104" height={flightH} fill="var(--cad-room-bg)" stroke="var(--cad-corridor-stroke)" strokeWidth="0.8" />
        {STAIR_TICKS_EAST.map((tx) => (
          <line key={`${idPrefix}-tx-e-dn-${tx}`} x1={tx} y1={dnTopY} x2={tx} y2={dnBotY} stroke="var(--cad-stair-tread-stroke)" strokeWidth="1" />
        ))}
        <line x1="893" y1={dnMidY} x2="808" y2={dnMidY} stroke="var(--cad-stair-arrow-down)" strokeWidth="1.8" />
        <polygon points={`816,${dnMidY - 4} 807,${dnMidY} 816,${dnMidY + 4}`} fill="var(--cad-stair-arrow-down)" />

        <rect x="906" y={y} width="30" height={h} fill="var(--cad-stair-landing)" stroke="var(--cad-corridor-stroke)" strokeWidth="1" />
      </g>
    </g>
  );
};

/**
 * Giếng Trời Trung Tâm thông tầng chuẩn CAD (x = 236..724, y = 162..390) đồng bộ xuyên suốt cả 5 tầng (Tầng 1 – 5).
 */
const CentralAtriumVoid = ({ idPrefix }) => (
  <g id={`${idPrefix}-central-atrium-void`} data-testid="central-atrium-void">
    <rect
      data-testid="central-atrium-outer-rect"
      x="236"
      y="162"
      width="488"
      height="228"
      rx="6"
      fill="var(--cad-void-bg)"
      stroke="var(--cad-void-stroke)"
      strokeWidth="1.5"
    />
    <rect
      x="242"
      y="168"
      width="476"
      height="216"
      rx="4"
      fill="none"
      stroke="var(--cad-void-dash)"
      strokeWidth="1.3"
      strokeDasharray="5 3"
    />
    <line x1="242" y1="168" x2="718" y2="384" stroke="var(--cad-corridor-dash)" strokeWidth="1" strokeDasharray="4 4" opacity="0.55" />
    <line x1="718" y1="168" x2="242" y2="384" stroke="var(--cad-corridor-dash)" strokeWidth="1" strokeDasharray="4 4" opacity="0.55" />

    <g transform="translate(376, 258)">
      <rect
        x="0"
        y="0"
        width="208"
        height="36"
        rx="8"
        fill="var(--cad-room-bg)"
        stroke="var(--cad-room-border)"
        strokeWidth="1.4"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(28, 25, 23, 0.08))' }}
      />
      <text
        x="104"
        y="22.5"
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
);

/**
 * Hệ hành lang giao thông liền khối hình chữ '#' cho Tầng 2, 3, 4.
 * Vẽ bằng một <path fillRule="evenodd"> duy nhất để triệt tiêu toàn bộ vết chồng biên ở 4 ngã tư.
 */
const CrossCorridorNetwork = ({ idPrefix }) => (
  <g id={`${idPrefix}-corridor-network`}>
    <path
      d="M 168 18 H 232 V 118 H 728 V 18 H 792 V 118 H 936 V 158 H 792 V 394 H 936 V 434 H 792 V 532 H 728 V 434 H 232 V 532 H 168 V 434 H 24 V 394 H 168 V 158 H 24 V 118 H 168 Z M 232 158 H 728 V 394 H 232 Z"
      fillRule="evenodd"
      fill="var(--cad-corridor-bg)"
      stroke="var(--cad-corridor-stroke)"
      strokeWidth="1.2"
    />

    {/* Đường tim trục giao thông đứt nét (tách khoảng sạch quanh nhãn chữ) */}
    <g stroke="var(--cad-corridor-dash)" strokeWidth="1" strokeDasharray="7 5">
      <line x1="200" y1="26" x2="200" y2="256" />
      <line x1="200" y1="296" x2="200" y2="524" />
      <line x1="760" y1="26" x2="760" y2="256" />
      <line x1="760" y1="296" x2="760" y2="524" />

      <line x1="32" y1="138" x2="404" y2="138" />
      <line x1="556" y1="138" x2="928" y2="138" />
      <line x1="32" y1="414" x2="404" y2="414" />
      <line x1="556" y1="414" x2="928" y2="414" />
    </g>

    <text
      x="480"
      y="142"
      fontFamily="var(--font-sans)"
      fontSize="10.5"
      fontWeight="800"
      fill="var(--cad-corridor-ink)"
      textAnchor="middle"
    >
      HÀNH LANG TRỤC BẮC
    </text>

    <text
      x="480"
      y="418"
      fontFamily="var(--font-sans)"
      fontSize="10.5"
      fontWeight="800"
      fill="var(--cad-corridor-ink)"
      textAnchor="middle"
    >
      HÀNH LANG TRỤC NAM
    </text>

    <CorridorAxisBadges />
  </g>
);

/**
 * FloorPlan2D
 * Sơ đồ mặt bằng kiến trúc 2D tòa nhà đại học RUO (5 Tầng):
 * - TẦNG 1: Sân Cổng Vào (CV), Giếng Trời Trung Tâm, Thư viện Bắc (PTV), 2 cụm thang & 2 khu WC đối xứng.
 * - TẦNG 2 – 4: Lưới giảng đường chuẩn CAD 960×550 có Giếng Trời Trung Tâm thông tầng & hành lang chữ '#'.
 * - TẦNG 5: Hành lang vòng hình chữ nhật khép kín, các khối phòng lớn sát vách & Sảnh Ban Công phía Nam.
 *
 * Strict Native SVG Only — Zero external icon dependencies.
 */
export const FloorPlan2D = ({
  selectedFloor = 1,
  onChangeFloor,
  selectedRoom = null,
  onSelectRoom,
  roomPods = {},
  floorAlerts = {},
  headerActions = null
}) => {
  const { currentFloorData, roomByCode, unmappedRooms, selectedFloorAlertFallback } = useMemo(() => {
    const template = CAMPUS_FLOORS[selectedFloor] || CAMPUS_FLOORS[1];
    const mergeLiveRoom = (room) => ({
      ...room,
      ...getRoomPod(roomPods, room.code),
      code: room.code
    });

    const topRooms = (template.topRooms || []).map(mergeLiveRoom);
    const bottomRooms = (template.bottomRooms || []).map(mergeLiveRoom);
    const allFloorRooms = [...topRooms, ...bottomRooms];

    const byCode = Object.fromEntries(allFloorRooms.map((r) => [r.code, r]));
    const podsList = Object.values(roomPods);
    const mappedCodes = new Set(
      allFloorRooms.map((r) => getRoomPod(roomPods, r.code)?.code).filter(Boolean)
    );
    const unmapped = podsList.filter(
      (r) => !mappedCodes.has(r.code) && (!r.floor || r.floor === selectedFloor)
    );

    const localDots = podsList
      .filter((r) => !r.floor || r.floor === selectedFloor)
      .map((r) => getRoomAlertDot(r))
      .filter(Boolean);
    const fallbackSeverity = localDots.some((d) => d.severity === 'report')
      ? 'report'
      : (localDots.length > 0 ? 'maintenance' : null);

    return {
      currentFloorData: { ...template, topRooms, bottomRooms },
      roomByCode: byCode,
      unmappedRooms: unmapped,
      selectedFloorAlertFallback: { count: localDots.length, severity: fallbackSeverity }
    };
  }, [selectedFloor, roomPods]);

  const svgViewportStyle = {
    width: '100%',
    height: 'auto',
    maxHeight: unmappedRooms.length > 0 ? 'calc(100dvh - 256px)' : 'calc(100dvh - 216px)',
    minHeight: '240px',
    display: 'block',
    margin: 0,
    background: 'var(--cad-canvas-bg)'
  };

  const getCategoryName = (categoryKey) => ROOM_CATEGORIES[categoryKey]?.name || 'Tiện ích';

  /**
   * Bộ vẽ ô phòng chuẩn CAD dùng chung cho cả 5 tầng:
   * - Chỉ hiển thị tên phòng rõ nét, căn giữa chuẩn xác trong vùng an toàn của từng ô phòng.
   * - Tự động tách thanh màu danh mục khi cửa mở ở vách trái và tránh tuyệt đối vùng mở cánh cửa.
   * - Đồng bộ tọa độ chấm trạng thái góc trên phải xuyên suốt mọi phòng trên 5 tầng.
   */
  const renderCadRoom = ({
    room,
    x,
    y,
    w,
    h,
    title,
    titleLine2,
    doorSide = 'none',
    doorOffset,
    doorWidth,
    doorArc,
    isMedical = false
  }) => {
    if (!room) return null;
    const isSelected = selectedRoom?.code === room.code;
    const isUtilityRoom =
      room.category === 'utility' ||
      FEMALE_WC_CODES.has(room.code) ||
      MALE_WC_CODES.has(room.code);

    const catColor = isSelected
      ? 'var(--cad-room-accent)'
      : isUtilityRoom
        ? 'var(--cad-utility-accent)'
        : 'var(--cad-room-accent)';
    const roomFill = isSelected
      ? 'var(--cad-room-selected-bg)'
      : isUtilityRoom
        ? 'var(--cad-utility-bg)'
        : 'var(--cad-room-bg)';
    const border = isSelected
      ? 'var(--cad-room-accent)'
      : isUtilityRoom
        ? 'var(--cad-utility-border)'
        : 'var(--cad-room-border)';

    const alertDot = getRoomAlertDot(room);

    const isCompact = h < 55;
    const isMedium = h >= 55 && h <= 80;
    const isLarge = h > 80;
    const labelText = title || room.code || '';

    const dOffset = doorOffset ?? (isCompact ? 20 : 16);
    const dWidth = doorWidth ?? (isCompact ? 12 : 18);
    const dArc = doorArc ?? Math.min(dWidth, isCompact ? 10 : 14);

    const titleSize = isCompact
      ? (labelText.length >= 12 ? '10' : '11.5')
      : isMedium
        ? (w < 130 ? '11.5' : '12.5')
        : (w < 145 && (labelText.length >= 12 || w < 110) ? '11.5' : (w < 145 ? '12.5' : '13'));

    const doorNearMidY = Math.abs(dOffset + dArc / 2 - h / 2) < 22;
    const safeLeft = x + (doorSide === 'left' && doorNearMidY ? dArc + 3 : 9);
    const safeRight = x + w - (doorSide === 'right' && doorNearMidY ? dArc + 3 : 7);
    const textCenterX = Math.round(((safeLeft + safeRight) / 2) * 10) / 10;

    const textY = isCompact && labelText.length >= 12
      ? Math.round((y + h / 2 + 6.5) * 10) / 10
      : h <= 75 && doorSide === 'top'
        ? Math.round((y + h / 2 + 6.5) * 10) / 10
        : h <= 75 && doorSide === 'bottom'
          ? Math.round((y + h / 2 + 2.5) * 10) / 10
          : Math.round((y + h / 2 + 4) * 10) / 10;

    const dotCx = x + w - 11;
    const dotCy = y + 11;

    // Left category accent bar segments (cleanly split around left-side doorways)
    const accentTop = y + 4;
    const accentBot = y + h - 4;
    const accentSegments = [];
    if (doorSide === 'left') {
      const gapTop = y + dOffset - 1.5;
      const gapBot = y + dOffset + Math.max(dWidth, dArc) + 1.5;
      if (gapTop - accentTop >= 5) {
        accentSegments.push({ sy: accentTop, sh: gapTop - accentTop });
      }
      if (accentBot - gapBot >= 5) {
        accentSegments.push({ sy: gapBot, sh: accentBot - gapBot });
      }
    } else {
      accentSegments.push({ sy: accentTop, sh: Math.max(12, h - 8) });
    }

    return (
      <g
        key={room.code || room.id}
        data-testid={`cad-room-${room.code}`}
        onClick={() => onSelectRoom && onSelectRoom(room)}
        style={{ cursor: 'pointer' }}
      >
        <title>{room.code} • {room.name} ({room.capacity ? `${room.capacity} chỗ` : getCategoryName(room.category)})</title>

        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx="5"
          fill={roomFill}
          stroke={border}
          strokeWidth={isSelected ? '2.4' : '1.4'}
          style={{
            transition: 'all 0.15s ease',
            filter: isSelected ? 'drop-shadow(0 4px 14px var(--cad-room-selected-glow))' : 'none'
          }}
        />

        {accentSegments.map((seg, idx) => (
          <rect
            key={`${room.code}-acc-${idx}`}
            x={x + 4}
            y={seg.sy}
            width="4"
            height={seg.sh}
            rx="2"
            fill={catColor}
          />
        ))}

        {alertDot && (
          <g data-testid={`room-alert-dot-${room.code}`} pointerEvents="none">
            <circle
              cx={dotCx}
              cy={dotCy}
              r={(isCompact ? 3.5 : (isLarge ? 4.6 : 4)) + 3}
              fill={alertDot.ring}
            />
            <circle
              cx={dotCx}
              cy={dotCy}
              r={isCompact ? 3.5 : (isLarge ? 4.6 : 4)}
              fill={alertDot.color}
              stroke="var(--cad-room-bg)"
              strokeWidth="1.2"
            />
          </g>
        )}

        {(isMedical || room.code === 'A1-YT-T3') && (
          <g transform={`translate(${alertDot ? dotCx - 19 : dotCx - 5}, ${y + 7})`} pointerEvents="none">
            <rect x="2.75" y="0" width="2.5" height="8" rx="0.8" fill="var(--cad-room-accent)" />
            <rect x="0" y="2.75" width="8" height="2.5" rx="0.8" fill="var(--cad-room-accent)" />
          </g>
        )}

        {doorSide === 'left' && (
          <g>
            <line x1={x} y1={y + dOffset} x2={x} y2={y + dOffset + dWidth} stroke={roomFill} strokeWidth="3" />
            <line x1={x} y1={y + dOffset} x2={x + dArc} y2={y + dOffset} stroke={catColor} strokeWidth="1.4" />
            <path
              d={`M ${x + dArc} ${y + dOffset} A ${dArc} ${dArc} 0 0 1 ${x} ${y + dOffset + dArc}`}
              fill="none"
              stroke={catColor}
              strokeWidth="1.1"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {doorSide === 'right' && (
          <g>
            <line x1={x + w} y1={y + dOffset} x2={x + w} y2={y + dOffset + dWidth} stroke={roomFill} strokeWidth="3" />
            <line x1={x + w} y1={y + dOffset} x2={x + w - dArc} y2={y + dOffset} stroke={catColor} strokeWidth="1.4" />
            <path
              d={`M ${x + w - dArc} ${y + dOffset} A ${dArc} ${dArc} 0 0 1 ${x + w} ${y + dOffset + dArc}`}
              fill="none"
              stroke={catColor}
              strokeWidth="1.1"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {doorSide === 'top' && (
          <g>
            <line x1={x + dOffset} y1={y} x2={x + dOffset + dWidth} y2={y} stroke={roomFill} strokeWidth="3" />
            <line x1={x + dOffset} y1={y} x2={x + dOffset} y2={y + dArc} stroke={catColor} strokeWidth="1.4" />
            <path
              d={`M ${x + dOffset} ${y + dArc} A ${dArc} ${dArc} 0 0 0 ${x + dOffset + dArc} ${y}`}
              fill="none"
              stroke={catColor}
              strokeWidth="1.1"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {doorSide === 'bottom' && (
          <g>
            <line x1={x + dOffset} y1={y + h} x2={x + dOffset + dWidth} y2={y + h} stroke={roomFill} strokeWidth="3" />
            <line x1={x + dOffset} y1={y + h} x2={x + dOffset} y2={y + h - dArc} stroke={catColor} strokeWidth="1.4" />
            <path
              d={`M ${x + dOffset} ${y + h - dArc} A ${dArc} ${dArc} 0 0 1 ${x + dOffset + dArc} ${y + h}`}
              fill="none"
              stroke={catColor}
              strokeWidth="1.1"
              strokeDasharray="2 2"
            />
          </g>
        )}

        <g style={{ pointerEvents: 'none' }}>
          <text
            x={textCenterX}
            y={titleLine2 ? Math.round(y + h / 2 - 3) : textY}
            fontFamily="var(--font-sans)"
            fontSize={titleSize}
            fontWeight="800"
            fill="var(--ink-pure)"
            textAnchor="middle"
            letterSpacing="-0.2px"
          >
            {labelText}
          </text>

          {titleLine2 && (
            <text
              x={textCenterX}
              y={Math.round(y + h / 2 + 12)}
              fontFamily="var(--font-sans)"
              fontSize={titleSize}
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
              letterSpacing="-0.2px"
            >
              {titleLine2}
            </text>
          )}
        </g>
      </g>
    );
  };

  // ==============================================================
  // TẦNG 1: SÂN CỔNG VÀO, THƯ VIỆN TRUNG TÂM & GIẾNG TRỜI ĐỒNG TRỤC 5 TẦNG
  // ==============================================================
  const renderFloor1Plan = () => {
    const roomCV = roomByCode['A1-CV'];
    const cvSelected = selectedRoom?.code === 'A1-CV';
    const ptvSelected = selectedRoom?.code === 'A1-PTV';
    const cvAlertDot = getRoomAlertDot(roomCV);

    return (
      <svg
        viewBox="14 10 932 530"
        style={svgViewportStyle}
      >
        <OuterCadShell
          idPrefix="f1"
          westEastWinY={[56, 174, 336, 442]}
          westEastWinLen={42}
          northWinX={[70, 296, 456, 616, 755, 861]}
          northWinLen={48}
        />

        {/* Hệ hành lang sảnh trệt liền mạch bao quanh Giếng Trời (đồng trục với Tầng 2 – 5) */}
        <g id="f1-corridor-network">
          <path
            d="M 168 18 H 232 V 118 H 936 V 158 H 792 V 390 H 728 V 158 H 232 V 390 H 168 Z"
            fill="var(--cad-corridor-bg)"
            stroke="var(--cad-corridor-stroke)"
            strokeWidth="1.2"
          />
          <g stroke="var(--cad-corridor-dash)" strokeWidth="1" strokeDasharray="7 5">
            <line x1="200" y1="92" x2="200" y2="256" />
            <line x1="200" y1="296" x2="200" y2="384" />
            <line x1="760" y1="138" x2="760" y2="256" />
            <line x1="760" y1="296" x2="760" y2="384" />
            <line x1="200" y1="138" x2="404" y2="138" />
            <line x1="556" y1="138" x2="796" y2="138" />
          </g>

          <text x="200" y="62" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            HÀNH LANG
          </text>
          <text x="200" y="75" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            THÔNG
          </text>

          <text x="480" y="142" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            HÀNH LANG TRỤC BẮC
          </text>

          <text x="866" y="142" fontFamily="var(--font-sans)" fontSize="10" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            HÀNH LANG NHỎ
          </text>

          <CorridorAxisBadges />
        </g>

        {/* Giếng trời trung tâm thông tầng — đồng bộ 100% tọa độ (236, 162, 488, 228) với Tầng 2 – 5 */}
        <CentralAtriumVoid idPrefix="f1" />

        {/* Hai cụm cầu thang bộ Tây & Đông — đồng bộ 100% tọa độ (y = 232, h = 88) với Tầng 2 – 5 */}
        <StairwellPair idPrefix="f1" y={232} h={88} />

        {/* PH Tây Bắc */}
        {renderCadRoom({
          room: roomByCode['A1-PH-TB'],
          x: 24,
          y: 18,
          w: 140,
          h: 210,
          title: 'PH',
          doorSide: 'right',
          doorOffset: 65,
          doorWidth: 24,
          doorArc: 16
        })}

        {/* Thư viện trung tâm */}
        {renderCadRoom({
          room: roomByCode['A1-PTV'],
          x: 236,
          y: 18,
          w: 488,
          h: 96,
          title: 'THƯ VIỆN TRUNG TÂM',
          doorSide: 'bottom',
          doorOffset: 120,
          doorWidth: 28,
          doorArc: 15
        })}
        <g pointerEvents="none">
          <line
            x1={236 + 340}
            y1={114}
            x2={236 + 368}
            y2={114}
            stroke={ptvSelected ? 'var(--cad-room-selected-bg)' : 'var(--cad-room-bg)'}
            strokeWidth="3"
          />
          <line x1={236 + 340} y1={114} x2={236 + 340} y2={99} stroke="var(--cad-room-accent)" strokeWidth="1.4" />
          <path d={`M ${236 + 340} 99 A 15 15 0 0 1 ${236 + 355} 114`} fill="none" stroke="var(--cad-room-accent)" strokeWidth="1.1" strokeDasharray="2 2" />
        </g>

        {/* Góc Đông Bắc: Kho 1 & Kho 2 */}
        {renderCadRoom({
          room: roomByCode['A1-K1'],
          x: 728,
          y: 18,
          w: 102,
          h: 96,
          title: 'KHO 1',
          doorSide: 'bottom',
          doorOffset: 22,
          doorWidth: 20,
          doorArc: 15
        })}
        {renderCadRoom({
          room: roomByCode['A1-K2'],
          x: 834,
          y: 18,
          w: 102,
          h: 96,
          title: 'KHO 2',
          doorSide: 'bottom',
          doorOffset: 22,
          doorWidth: 20,
          doorArc: 15
        })}

        {/* Khu vệ sinh Nữ & Nam cánh Đông — đồng bộ 100% tọa độ trục kỹ thuật với Tầng 2 – 5 */}
        {renderCadRoom({
          room: roomByCode['A1-WC-NU'],
          x: 796,
          y: 162,
          w: 140,
          h: 66,
          title: 'NVS NỮ',
          doorSide: 'left',
          doorOffset: 24
        })}
        {renderCadRoom({
          room: roomByCode['A1-WC-NAM'],
          x: 796,
          y: 324,
          w: 140,
          h: 66,
          title: 'NVS NAM',
          doorSide: 'left',
          doorOffset: 24
        })}

        {/* Kho phụ Tây — đối xứng hoàn toàn với NVS Nam (y = 324, h = 66) */}
        {renderCadRoom({
          room: roomByCode['A1-KHO-TAY'],
          x: 24,
          y: 324,
          w: 140,
          h: 66,
          title: 'KHO',
          doorSide: 'right',
          doorOffset: 24
        })}

        {/* Sân Cổng Vào */}
        {roomCV && (
          <g
            id="f1-entrance-plaza"
            data-testid={`cad-room-${roomCV.code}`}
            onClick={() => onSelectRoom && onSelectRoom(roomCV)}
            style={{ cursor: 'pointer' }}
          >
            <title>{roomCV.code} • {roomCV.name} ({roomCV.capacity} chỗ)</title>
            <rect
              x="236"
              y="394"
              width="488"
              height="92"
              fill={cvSelected ? 'var(--cad-room-selected-bg)' : 'var(--cad-room-bg)'}
              stroke={cvSelected ? 'var(--cad-room-accent)' : 'var(--cad-room-border)'}
              strokeWidth={cvSelected ? '2.4' : '1.4'}
              rx="6"
              style={{
                transition: 'all 0.15s ease',
                filter: cvSelected ? 'drop-shadow(0 4px 12px var(--cad-room-selected-glow))' : 'none'
              }}
            />
            <rect x="240" y="399" width="4" height="82" rx="2" fill="var(--cad-room-accent)" />
            {cvAlertDot && (
              <g data-testid="room-alert-dot-A1-CV" pointerEvents="none">
                <circle cx="713" cy="405" r="7.6" fill={cvAlertDot.ring} />
                <circle cx="713" cy="405" r="4.6" fill={cvAlertDot.color} stroke="var(--cad-room-bg)" strokeWidth="1.2" />
              </g>
            )}

            <g transform="translate(382, 424)" style={{ pointerEvents: 'none' }}>
              <rect x="0" y="0" width="196" height="32" rx="16" fill="var(--cad-void-bg)" stroke="var(--cad-room-border)" strokeWidth="1" />
              <text x="98" y="21" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="800" fill="var(--ink-pure)" textAnchor="middle">
                SÂN CỔNG VÀO
              </text>
            </g>
          </g>
        )}

        {/* Hai Đại sảnh phía Nam đối xứng (w = 208): PTH 2 & PH Đông Nam */}
        {renderCadRoom({
          room: roomByCode['A1-PTH2'],
          x: 24,
          y: 394,
          w: 208,
          h: 138,
          title: 'PTH 2',
          doorSide: 'top',
          doorOffset: 152,
          doorWidth: 28,
          doorArc: 16
        })}
        {renderCadRoom({
          room: roomByCode['A1-PH-DN'],
          x: 728,
          y: 394,
          w: 208,
          h: 138,
          title: 'PH',
          doorSide: 'top',
          doorOffset: 28,
          doorWidth: 28,
          doorArc: 16
        })}

        {/* Cụm 3 Cổng Vào Chính / Phụ đồng trục trung tâm X = 480 */}
        <g id="f1-entrance-gates">
          <g transform="translate(236, 490)">
            <rect x="0" y="0" width="114" height="42" rx="5" fill="var(--cad-utility-bg)" stroke="var(--cad-utility-border)" strokeWidth="1.4" />
            <text x="57" y="25.5" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="var(--ink-secondary)" textAnchor="middle">
              CỔNG PHỤ
            </text>
          </g>

          <g transform="translate(356, 490)">
            <rect
              x="0"
              y="0"
              width="248"
              height="42"
              rx="6"
              fill="var(--cad-room-selected-bg)"
              stroke="var(--cad-room-accent)"
              strokeWidth="2.2"
              style={{ filter: 'drop-shadow(0 2px 8px var(--cad-room-selected-glow))' }}
            />
            <text x="124" y="26" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="900" fill="var(--cad-room-accent)" textAnchor="middle" letterSpacing="0.8">
              ✦ CỔNG CHÍNH ✦
            </text>
          </g>

          <g transform="translate(610, 490)">
            <rect x="0" y="0" width="114" height="42" rx="5" fill="var(--cad-utility-bg)" stroke="var(--cad-utility-border)" strokeWidth="1.4" />
            <text x="57" y="25.5" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="var(--ink-secondary)" textAnchor="middle">
              CỔNG PHỤ
            </text>
          </g>
        </g>
      </svg>
    );
  };

  // ==============================================================
  // TẦNG 2, TẦNG 3, TẦNG 4: LƯỚI GIẢNG ĐƯỜNG ĐỒNG BỘ QUANH GIẾNG TRỜI
  // ==============================================================
  const renderUpperGridFloor = (floorLevel) => {
    const spec = UPPER_GRID_FLOOR_SPECS[floorLevel];
    const p = spec.prefix;
    const idPrefix = `f${p}`;
    const winNS = [60, 100, 260, 310, 420, 520, 630, 680, 830, 890];

    const renderStackedPair = ({ topSuffix, botSuffix, x, yTop, w, doorSide }) => (
      <g>
        {renderCadRoom({
          room: roomByCode[`A1-${p}${topSuffix}`],
          x,
          y: yTop,
          w,
          h: 45,
          title: `PH ${p}${topSuffix}`,
          doorSide
        })}
        <rect x={x} y={yTop + 45} width={w} height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
        {renderCadRoom({
          room: roomByCode[`A1-${p}${botSuffix}`],
          x,
          y: yTop + 49,
          w,
          h: 45,
          title: `PH ${p}${botSuffix}`,
          doorSide
        })}
      </g>
    );

    return (
      <svg
        viewBox="14 10 932 530"
        style={svgViewportStyle}
      >
        <OuterCadShell
          idPrefix={idPrefix}
          westEastWinY={[60, 190, 360, 480]}
          northWinX={winNS}
          southWinX={winNS}
        />

        {/* Hành lang chữ '#' liền mạch không vết nối */}
        <CrossCorridorNetwork idPrefix={idPrefix} />

        {/* Giếng trời trung tâm thông tầng */}
        <CentralAtriumVoid idPrefix={idPrefix} />

        {/* Hai cụm cầu thang bộ Tây & Đông */}
        <StairwellPair idPrefix={idPrefix} y={232} h={88} />

        {/* Cánh Tây Ngoài (x = 24..164, w = 140) */}
        {renderStackedPair({ topSuffix: '01', botSuffix: '02', x: 24, yTop: 18, w: 140, doorSide: 'right' })}
        {renderCadRoom({
          room: roomByCode[`A1-${p}03`],
          x: 24,
          y: 162,
          w: 140,
          h: 66,
          title: `PH ${p}03`,
          doorSide: 'right',
          doorOffset: 24
        })}
        {renderCadRoom({
          room: roomByCode[`A1-${p}04`],
          x: 24,
          y: 324,
          w: 140,
          h: 66,
          title: `PH ${p}04`,
          doorSide: 'right',
          doorOffset: 24
        })}
        {renderStackedPair({ topSuffix: '05', botSuffix: '06', x: 24, yTop: 438, w: 140, doorSide: 'right' })}

        {/* Cột Trong Tây (x = 236..356, w = 120) */}
        {renderStackedPair({ topSuffix: '07', botSuffix: '08', x: 236, yTop: 18, w: 120, doorSide: 'left' })}
        {renderStackedPair({ topSuffix: '15', botSuffix: '16', x: 236, yTop: 438, w: 120, doorSide: 'left' })}

        {/* Khối Trung Tâm Bắc (x = 364..596, y = 18..88, w = 232, h = 70) */}
        <g id={`${idPrefix}-central-north`}>
          {renderCadRoom({
            room: roomByCode[spec.northCenter.code],
            x: 364,
            y: 18,
            w: 232,
            h: 70,
            title: spec.northCenter.title,
            doorSide: 'bottom',
            doorOffset: 35,
            doorWidth: 26,
            doorArc: 14
          })}
        </g>

        {/* Khối Trung Tâm Nam (x = 364..596, y = 462..532, h = 70) */}
        {spec.southCenterMode === 'single' ? (
          <g id={`${idPrefix}-central-south`}>
            {renderCadRoom({
              room: roomByCode[spec.southSingle.code],
              x: 364,
              y: 462,
              w: 232,
              h: 70,
              title: spec.southSingle.title,
              doorSide: 'top',
              doorOffset: 35,
              doorWidth: 26,
              doorArc: 14
            })}
          </g>
        ) : (
          <g id={`${idPrefix}-central-south-pair`}>
            {renderCadRoom({
              room: roomByCode[spec.southPairLeft.code],
              x: 364,
              y: 462,
              w: 114,
              h: 70,
              title: spec.southPairLeft.title,
              doorSide: 'top',
              doorOffset: 16,
              doorWidth: 18,
              doorArc: 14,
              isMedical: spec.southPairLeft.isMedical
            })}
            <rect x="478" y="462" width="4" height="70" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
            {renderCadRoom({
              room: roomByCode[spec.southPairRight.code],
              x: 482,
              y: 462,
              w: 114,
              h: 70,
              title: spec.southPairRight.title,
              doorSide: 'top',
              doorOffset: 16,
              doorWidth: 18,
              doorArc: 14
            })}
          </g>
        )}

        {/* Cột Trong Đông (x = 604..724, w = 120) */}
        {renderStackedPair({ topSuffix: '09', botSuffix: '10', x: 604, yTop: 18, w: 120, doorSide: 'right' })}
        {renderStackedPair({ topSuffix: '17', botSuffix: '18', x: 604, yTop: 438, w: 120, doorSide: 'right' })}

        {/* Cánh Đông Ngoài (x = 796..936, w = 140) */}
        {renderStackedPair({ topSuffix: '11', botSuffix: '12', x: 796, yTop: 18, w: 140, doorSide: 'left' })}
        {renderCadRoom({
          room: roomByCode[spec.wcNuCode],
          x: 796,
          y: 162,
          w: 140,
          h: 66,
          title: 'NVS NỮ',
          doorSide: 'left',
          doorOffset: 24
        })}
        {renderCadRoom({
          room: roomByCode[spec.wcNamCode],
          x: 796,
          y: 324,
          w: 140,
          h: 66,
          title: 'NVS NAM',
          doorSide: 'left',
          doorOffset: 24
        })}
        {renderStackedPair({ topSuffix: '13', botSuffix: '14', x: 796, yTop: 438, w: 140, doorSide: 'left' })}
      </svg>
    );
  };

  // ==============================================================
  // TẦNG 5: HÀNH LANG HÌNH CHỮ NHẬT KHÉP KÍN, PHÒNG SÁT VÁCH & SẢNH BAN CÔNG
  // ==============================================================
  const renderFloor5Plan = () => {
    const roomSBC = roomByCode['A1-SBC'];
    const sbcSelected = selectedRoom?.code === roomSBC?.code;
    const sbcColor = 'var(--cad-room-accent)';
    const sbcFill = sbcSelected ? 'var(--cad-room-selected-bg)' : 'var(--cad-room-bg)';
    const sbcBorder = sbcSelected ? 'var(--cad-room-accent)' : 'var(--cad-room-border)';
    const sbcAlertDot = getRoomAlertDot(roomSBC);

    return (
      <svg
        viewBox="14 10 932 530"
        style={svgViewportStyle}
      >
        <OuterCadShell
          idPrefix="f5"
          westEastWinY={[52, 160, 355]}
          northWinX={[65, 165, 301, 435, 535, 635, 759, 867]}
          northWinLen={42}
        />

        {/* Hành lang vòng hình chữ nhật khép kín quanh Giếng Trời (x = 168..792, y = 113..439) */}
        <g id="f5-rectangular-corridor-loop">
          <path
            d="M 168 113 H 792 V 439 H 168 Z M 232 158 V 394 H 728 V 158 Z"
            fillRule="evenodd"
            fill="var(--cad-corridor-bg)"
            stroke="var(--cad-corridor-stroke)"
            strokeWidth="1.2"
          />

          {/* Đường tim trục hành lang chữ nhật (tách khoảng sạch quanh nhãn chữ) */}
          <g stroke="var(--cad-corridor-dash)" strokeWidth="1" strokeDasharray="7 5" fill="none">
            <path d="M 404 135.5 H 204 Q 200 135.5 200 139.5 V 258" />
            <path d="M 556 135.5 H 756 Q 760 135.5 760 139.5 V 258" />
            <path d="M 200 294 V 412.5 Q 200 416.5 204 416.5 H 404" />
            <path d="M 760 294 V 412.5 Q 760 416.5 756 416.5 H 556" />
          </g>

          <text x="480" y="139.5" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            HÀNH LANG TRỤC BẮC
          </text>
          <text x="480" y="420.5" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="var(--cad-corridor-ink)" textAnchor="middle">
            HÀNH LANG TRỤC NAM
          </text>

          <CorridorAxisBadges />
        </g>

        {/* Giếng trời trung tâm & 2 cụm cầu thang đồng trục 100% */}
        <CentralAtriumVoid idPrefix="f5" />
        <StairwellPair idPrefix="f5" y={232} h={88} />

        {/* Dãy phòng phía Bắc sát vách nhau */}
        <g id="f5-north-contiguous-band">
          {renderCadRoom({
            room: roomByCode['A1-501'],
            x: 24,
            y: 18,
            w: 236,
            h: 91,
            title: 'PHÒNG SINH HOẠT',
            doorSide: 'bottom',
            doorOffset: 146,
            doorWidth: 16,
            doorArc: 12
          })}
          <rect x="260" y="18" width="4" height="91" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-507'],
            x: 264,
            y: 18,
            w: 116,
            h: 91,
            title: 'PH 507',
            doorSide: 'bottom',
            doorOffset: 12,
            doorWidth: 18,
            doorArc: 14
          })}
          <rect x="380" y="18" width="4" height="91" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-PHL'],
            x: 384,
            y: 18,
            w: 336,
            h: 91,
            title: 'PHÒNG HỌC LỚN',
            doorSide: 'bottom',
            doorOffset: 28,
            doorWidth: 26,
            doorArc: 14
          })}
          <rect x="720" y="18" width="4" height="70" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-HOP'],
            x: 724,
            y: 18,
            w: 112,
            h: 70,
            title: 'PHÒNG HỌP',
            doorSide: 'bottom',
            doorOffset: 10,
            doorWidth: 16,
            doorArc: 11
          })}
          <rect x="836" y="18" width="4" height="70" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-PGV'],
            x: 840,
            y: 18,
            w: 96,
            h: 91,
            title: 'PHÒNG',
            titleLine2: 'GIÁO VIÊN',
            doorSide: 'left',
            doorOffset: 72,
            doorWidth: 15,
            doorArc: 11
          })}
        </g>

        {/* Cánh Tây sát vách */}
        <g id="f5-west-wing">
          <rect x="24" y="109" width="140" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
          {renderCadRoom({
            room: roomByCode['A1-503'],
            x: 24,
            y: 113,
            w: 140,
            h: 115,
            title: 'PH 503',
            doorSide: 'right',
            doorOffset: 56,
            doorWidth: 18,
            doorArc: 14
          })}
          {renderCadRoom({
            room: roomByCode['A1-504'],
            x: 24,
            y: 324,
            w: 140,
            h: 115,
            title: 'RẠP CHIẾU PHIM',
            doorSide: 'right',
            doorOffset: 56,
            doorWidth: 18,
            doorArc: 14
          })}
          <rect x="24" y="439" width="140" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
        </g>

        {/* Cánh Đông sát vách & đồng bộ WC 5 tầng */}
        <g id="f5-east-wing">
          <rect x="840" y="109" width="96" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
          {renderCadRoom({
            room: roomByCode['A1-XTC'],
            x: 796,
            y: 113,
            w: 140,
            h: 45,
            title: 'XƯỞNG THỦ CÔNG',
            doorSide: 'left'
          })}
          <rect x="796" y="158" width="140" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-WC-NU-T5'],
            x: 796,
            y: 162,
            w: 140,
            h: 66,
            title: 'NVS NỮ',
            doorSide: 'left',
            doorOffset: 24
          })}

          {renderCadRoom({
            room: roomByCode['A1-WC-NAM-T5'],
            x: 796,
            y: 324,
            w: 140,
            h: 66,
            title: 'NVS NAM',
            doorSide: 'left',
            doorOffset: 24
          })}
          <rect x="796" y="390" width="140" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-KHO-T5'],
            x: 796,
            y: 394,
            w: 140,
            h: 45,
            title: 'PHÒNG KHO',
            doorSide: 'left'
          })}
          <rect x="796" y="439" width="140" height="4" fill="var(--cad-wall-fill)" stroke="var(--cad-wall-stroke)" strokeWidth="0.6" />
        </g>

        {/* Sảnh Ban Công phía Nam */}
        {roomSBC && (
          <g
            id="f5-south-balcony-terrace"
            data-testid={`cad-room-${roomSBC.code}`}
            onClick={() => onSelectRoom && onSelectRoom(roomSBC)}
            style={{ cursor: 'pointer' }}
          >
            <title>{roomSBC.code} • {roomSBC.name} ({roomSBC.capacity} chỗ)</title>

            <rect
              x="24"
              y="443"
              width="912"
              height="89"
              rx="5"
              fill={sbcFill}
              stroke={sbcBorder}
              strokeWidth={sbcSelected ? '2.4' : '1.4'}
              style={{
                transition: 'all 0.15s ease',
                filter: sbcSelected ? 'drop-shadow(0 4px 14px var(--cad-room-selected-glow))' : 'none'
              }}
            />

            <rect x="28" y="447" width="4" height="81" rx="2" fill={sbcColor} />
            {sbcAlertDot && (
              <g data-testid="room-alert-dot-A1-SBC" pointerEvents="none">
                <circle cx="925" cy="454" r="7.6" fill={sbcAlertDot.ring} />
                <circle cx="925" cy="454" r="4.6" fill={sbcAlertDot.color} stroke="var(--cad-room-bg)" strokeWidth="1.2" />
              </g>
            )}

            {[312, 622].map((dx) => (
              <g key={`f5-sbc-door-${dx}`}>
                <line x1={dx} y1="443" x2={dx + 26} y2="443" stroke={sbcFill} strokeWidth="3" />
                <line x1={dx} y1="443" x2={dx} y2="459" stroke={sbcColor} strokeWidth="1.4" />
                <path
                  d={`M ${dx} 459 A 16 16 0 0 0 ${dx + 16} 443`}
                  fill="none"
                  stroke={sbcColor}
                  strokeWidth="1.1"
                  strokeDasharray="2 2"
                />
              </g>
            ))}

            <g opacity="0.42" pointerEvents="none">
              <line x1="38" y1="523" x2="922" y2="523" stroke="var(--cad-room-accent)" strokeWidth="1.2" />
              <line x1="38" y1="528" x2="922" y2="528" stroke="var(--cad-room-accent)" strokeWidth="1.5" />
              {BALCONY_BALUSTER_X.map((bx) => (
                <line key={`f5-baluster-${bx}`} x1={bx} y1="523" x2={bx} y2="528" stroke="var(--cad-room-accent)" strokeWidth="1" />
              ))}
            </g>

            <text
              x="480"
              y="490"
              fontFamily="var(--font-sans)"
              fontSize="13.5"
              fontWeight="800"
              fill="var(--ink-pure)"
              textAnchor="middle"
              letterSpacing="0.3px"
              style={{ pointerEvents: 'none' }}
            >
              SẢNH BAN CÔNG
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {/* 1. UNIFIED HEADER CONTROLS & FLOOR LEVEL SELECTOR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: 'var(--surface-panel)',
          padding: '4px 10px',
          borderRadius: '8px',
          border: '1px solid var(--hairline-soft)',
          flexWrap: 'nowrap',
          minWidth: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 0%', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--laser-cyan)',
              background: 'rgba(234, 88, 12, 0.12)',
              border: '1px solid rgba(234, 88, 12, 0.28)',
              padding: '2px 8px',
              borderRadius: '5px',
              flexShrink: 0
            }}
          >
            {currentFloorData.floorCode}
          </span>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: 'var(--ink-pure)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0
            }}
            title={currentFloorData.title}
          >
            {currentFloorData.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {FLOOR_NUMBERS.map((fl) => {
            const isActive = selectedFloor === fl;
            const flData = CAMPUS_FLOORS[fl];
            const explicitAlert = floorAlerts?.[fl];
            const fallbackSeverity = isActive ? selectedFloorAlertFallback.severity : null;
            const hasFloorAlert = explicitAlert?.hasAlert ?? Boolean(fallbackSeverity);
            const floorSeverity = explicitAlert?.severity ?? fallbackSeverity;
            const floorDotColor = floorSeverity === 'report' ? '#E5484D' : '#F59E0B';
            const alertCount = explicitAlert?.alertRoomCount ?? (isActive ? selectedFloorAlertFallback.count : 0);
            const alertTitle = hasFloorAlert
              ? `${flData?.title || `Tầng ${fl}`} — Có ${alertCount} phòng đang có báo cáo/bảo trì`
              : flData?.title;

            return (
              <button
                key={fl}
                type="button"
                className="ruo-rbac-toggle-pill"
                onClick={() => onChangeFloor && onChangeFloor(fl)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: isActive ? '1.5px solid var(--blueprint-600)' : '1px solid var(--hairline-medium)',
                  background: isActive ? 'var(--blueprint-600)' : 'var(--canvas-subtle)',
                  color: isActive ? '#FFFFFF' : 'var(--ink-primary)',
                  boxShadow: isActive ? '0 2px 8px rgba(234, 88, 12, 0.28)' : 'none',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title={alertTitle}
              >
                <span>Tầng {fl}</span>
                {hasFloorAlert && (
                  <span
                    data-testid={`floor-alert-dot-${fl}`}
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: floorDotColor,
                      boxShadow: isActive ? '0 0 0 1.5px #FFFFFF' : `0 0 0 2px ${floorSeverity === 'report' ? 'rgba(229, 72, 77, 0.22)' : 'rgba(245, 158, 11, 0.22)'}`,
                      flexShrink: 0
                    }}
                  />
                )}
              </button>
            );
          })}
          {headerActions && (
            <>
              <span style={{ width: '1px', height: '16px', background: 'var(--hairline-soft)', margin: '0 2px' }} aria-hidden="true" />
              {headerActions}
            </>
          )}
        </div>
      </div>

      {/* 2. ARCHITECTURAL 2D FLOOR PLAN */}
      <div
        key={selectedFloor}
        className="ruo-floor-transition"
        style={{
          width: '100%',
          overflow: 'hidden',
          background: 'var(--cad-canvas-bg)',
          borderRadius: '8px',
          border: '1px solid var(--hairline-medium)',
          padding: '0px',
          boxShadow: 'none'
        }}
      >
        {selectedFloor === 1
          ? renderFloor1Plan()
          : selectedFloor === 5
            ? renderFloor5Plan()
            : renderUpperGridFloor(selectedFloor)}
      </div>

      {unmappedRooms.length > 0 && (
        <section
          aria-label="Phòng chưa có vị trí trên bản vẽ"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--surface-panel)',
            borderRadius: '7px',
            border: '1px solid var(--hairline-soft)'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>Phòng ngoài sơ đồ:</span>
          {unmappedRooms.map((room) => {
            const unmappedAlert = getRoomAlertDot(room);
            return (
              <button
                key={room.code}
                type="button"
                className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                style={{ height: '22px', padding: '0 8px', fontSize: '10.5px', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => onSelectRoom?.(room)}
                aria-pressed={selectedRoom?.code === room.code}
              >
                {unmappedAlert && (
                  <span
                    data-testid={`room-alert-dot-${room.code}`}
                    style={{
                      width: '6.5px',
                      height: '6.5px',
                      borderRadius: '50%',
                      background: unmappedAlert.color,
                      flexShrink: 0
                    }}
                  />
                )}
                <span>{room.code} · {room.name} · {room.equipmentCount} thiết bị · {room.brokenCount} hỏng</span>
              </button>
            );
          })}
        </section>
      )}

      {/* 3. ARCHITECTURAL & OPERATIONAL LEGEND BAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '8px',
          background: 'var(--surface-panel)',
          padding: '5px 10px',
          borderRadius: '8px',
          border: '1px solid var(--hairline-soft)',
          minWidth: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '10px', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '3px',
                background: 'var(--cad-room-bg)',
                border: '1.5px solid var(--cad-room-border)',
                borderLeft: '3.5px solid var(--cad-room-accent)'
              }}
            />
            <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>Phòng chức năng</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '3px',
                background: 'var(--cad-utility-bg)',
                border: '1.5px solid var(--cad-utility-border)',
                borderLeft: '3.5px solid var(--cad-utility-accent)'
              }}
            />
            <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>Phụ trợ (NVS • Kho)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '3px',
                background: 'var(--cad-corridor-bg)',
                border: '1px solid var(--cad-corridor-stroke)'
              }}
            />
            <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>Hành lang</span>
          </div>

          <span style={{ width: '1px', height: '12px', background: 'var(--hairline-medium)' }} aria-hidden="true" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7.5px', height: '7.5px', borderRadius: '50%', background: '#E5484D', boxShadow: '0 0 0 2px rgba(229, 72, 77, 0.2)' }} />
            <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>Có báo cáo / TB hỏng</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7.5px', height: '7.5px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)' }} />
            <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>Đang bảo trì</span>
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0
          }}
        >
          Chọn phòng để xem chi tiết thiết bị
        </div>
      </div>
    </div>
  );
};
