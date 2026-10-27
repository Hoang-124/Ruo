import React, { useMemo } from 'react';
import { RoomPodCard } from './RoomPodCard';
import { getRoomPod } from './roomPod';
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

/**
 * Cấu hình chuyên biệt cho các tầng chuẩn khung lưới Giếng Trời (Tầng 2, Tầng 3, Tầng 4).
 * Giữ nguyên 100% tọa độ kiến trúc, công năng và mã phòng của từng tầng.
 */
const UPPER_GRID_FLOOR_SPECS = {
  2: {
    prefix: '2',
    wcNuCode: 'A1-WC-NU-T2',
    wcNamCode: 'A1-WC-NAM-T2',
    sub: {
      '01': 'Lý thuyết • 50 chỗ',
      '02': 'Lý thuyết • 50 chỗ',
      '03': 'Lab Tin Học • 60 chỗ',
      '04': 'Lab Multimedia • 60 chỗ',
      '05': 'Nghiên cứu • 50 chỗ',
      '06': 'Tự học • 50 chỗ',
      '07': 'Seminar • 50 chỗ',
      '08': 'Đồ án • 50 chỗ',
      '09': 'Diễn đàn • 50 chỗ',
      '10': 'Workshop • 50 chỗ',
      '11': 'Lý thuyết • 50 chỗ',
      '12': 'Lý thuyết • 50 chỗ',
      '13': 'Đồ án • 50 chỗ',
      '14': 'Sáng tạo • 50 chỗ',
      '15': 'Smart Room 1',
      '16': 'Smart Room 2',
      '17': 'Tương tác 1',
      '18': 'Tương tác 2'
    },
    northCenter: {
      code: 'A1-NC-01',
      title: 'PHÒNG NGHIÊN CỨU 1',
      subTitle: 'Viện Nghiên Cứu & Phát Triển • 45 chỗ',
      hasBench: true
    },
    southCenterMode: 'single',
    southSingle: {
      code: 'A1-NC-02',
      title: 'PHÒNG NGHIÊN CỨU 2',
      subTitle: 'Trung Tâm Nghiên Cứu Ứng Dụng • 45 chỗ',
      hasBench: true
    }
  },
  3: {
    prefix: '3',
    wcNuCode: 'A1-WC-NU-T3',
    wcNamCode: 'A1-WC-NAM-T3',
    sub: {
      '01': 'Lý thuyết • 50 chỗ',
      '02': 'Lý thuyết • 50 chỗ',
      '03': 'Lab Tin Học • 60 chỗ',
      '04': 'Lab Multimedia • 60 chỗ',
      '05': 'Nghiên cứu • 50 chỗ',
      '06': 'Tự học • 50 chỗ',
      '07': 'Seminar • 50 chỗ',
      '08': 'Đồ án • 50 chỗ',
      '09': 'Diễn đàn • 50 chỗ',
      '10': 'Workshop • 50 chỗ',
      '11': 'Lý thuyết • 50 chỗ',
      '12': 'Lý thuyết • 50 chỗ',
      '13': 'Đồ án • 50 chỗ',
      '14': 'Sáng tạo • 50 chỗ',
      '15': 'Smart Room 1',
      '16': 'Smart Room 2',
      '17': 'Tương tác 1',
      '18': 'Tương tác 2'
    },
    northCenter: {
      code: 'A1-NC-T3',
      title: 'PHÒNG NGHIÊN CỨU 1',
      subTitle: 'Viện Nghiên Cứu & Phát Triển • 45 chỗ',
      hasBench: true
    },
    southCenterMode: 'pair',
    southPairLeft: {
      code: 'A1-YT-T3',
      title: 'PHÒNG Y TẾ',
      subTitle: 'Sơ cấp cứu • 15 chỗ',
      isMedical: true
    },
    southPairRight: {
      code: 'A1-319',
      title: 'PHÒNG HỌC',
      subTitle: 'Lý thuyết • 45 chỗ'
    }
  },
  4: {
    prefix: '4',
    wcNuCode: 'A1-WC-NU-T4',
    wcNamCode: 'A1-WC-NAM-T4',
    sub: {
      '01': 'Lý thuyết • 50 chỗ',
      '02': 'Lý thuyết • 50 chỗ',
      '03': 'Lab Mạng • 60 chỗ',
      '04': 'Lab ATTT • 60 chỗ',
      '05': 'VP Khoa CNTT',
      '06': 'VP Khoa Kinh tế',
      '07': 'Seminar • 50 chỗ',
      '08': 'Khóa luận TN',
      '09': 'Họp Khoa • 40 chỗ',
      '10': 'Hội đồng • 40 chỗ',
      '11': 'Lý thuyết • 50 chỗ',
      '12': 'Lý thuyết • 50 chỗ',
      '13': 'VP Khoa Ngoại ngữ',
      '14': 'Khảo thí • 25 chỗ',
      '15': 'Tiếp SV 1',
      '16': 'Tiếp SV 2',
      '17': 'Tư vấn học vụ',
      '18': 'Phòng Tài vụ'
    },
    northCenter: {
      code: 'A1-PĐT',
      title: 'PHÒNG ĐÀO TẠO',
      subTitle: 'Quản lý Học vụ & Khảo thí • 40 chỗ',
      hasBench: true
    },
    southCenterMode: 'single',
    southSingle: {
      code: 'A1-PHT',
      title: 'PHÒNG HỘI THẢO',
      subTitle: 'Hội thảo Khoa học Quốc tế • 90 chỗ',
      hasBench: true
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
      stroke="var(--ink-pure)"
      strokeWidth="2.2"
    />
    <rect
      x="20"
      y="16"
      width={CAD_W - 40}
      height={CAD_H - 32}
      rx="5"
      fill="none"
      stroke="var(--hairline-medium)"
      strokeWidth="0.8"
    />

    {westEastWinY.map((wy) => (
      <g key={`${idPrefix}-win-we-${wy}`} stroke="#0284C7" strokeWidth="3" opacity="0.95">
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
        stroke="#0284C7"
        strokeWidth="3"
        opacity="0.95"
      />
    ))}

    {southWinX.map((wx) => (
      <line
        key={`${idPrefix}-win-s-${wx}`}
        x1={wx}
        y1={CAD_H - 12}
        x2={wx + southWinLen}
        y2={CAD_H - 12}
        stroke="#0284C7"
        strokeWidth="3"
        opacity="0.95"
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
          fill="rgba(248, 250, 252, 0.95)"
          stroke="#475569"
          strokeWidth="1.8"
          rx="4"
        />
        <rect x="24" y={y} width="30" height={h} fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
        <rect x="56" y={upTopY} width="104" height={flightH} fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
        {STAIR_TICKS_WEST.map((tx) => (
          <line key={`${idPrefix}-tx-w-up-${tx}`} x1={tx} y1={upTopY} x2={tx} y2={upBotY} stroke="#64748B" strokeWidth="1" />
        ))}
        <line x1="150" y1={upMidY} x2="65" y2={upMidY} stroke="#2563EB" strokeWidth="1.8" />
        <polygon points={`73,${upMidY - 4} 64,${upMidY} 73,${upMidY + 4}`} fill="#2563EB" />

        <rect x="56" y={labelY} width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
        <text
          x="108"
          y={labelY + 12}
          fontFamily="var(--font-sans)"
          fontSize="10.5"
          fontWeight="800"
          fill="#334155"
          textAnchor="middle"
        >
          THANG TÂY ▲
        </text>

        <rect x="56" y={dnTopY} width="104" height={flightH} fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
        {STAIR_TICKS_WEST.map((tx) => (
          <line key={`${idPrefix}-tx-w-dn-${tx}`} x1={tx} y1={dnTopY} x2={tx} y2={dnBotY} stroke="#64748B" strokeWidth="1" />
        ))}
        <line x1="65" y1={dnMidY} x2="150" y2={dnMidY} stroke="#059669" strokeWidth="1.8" />
        <polygon points={`142,${dnMidY - 4} 151,${dnMidY} 142,${dnMidY + 4}`} fill="#059669" />
      </g>

      {/* CẦU THANG ĐÔNG (x = 796..936, w = 140) */}
      <g id={`${idPrefix}-east-stairwell`}>
        <rect
          x="796"
          y={y}
          width="140"
          height={h}
          fill="rgba(248, 250, 252, 0.95)"
          stroke="#475569"
          strokeWidth="1.8"
          rx="4"
        />
        <rect x="798" y={upTopY} width="104" height={flightH} fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
        {STAIR_TICKS_EAST.map((tx) => (
          <line key={`${idPrefix}-tx-e-up-${tx}`} x1={tx} y1={upTopY} x2={tx} y2={upBotY} stroke="#64748B" strokeWidth="1" />
        ))}
        <line x1="808" y1={upMidY} x2="893" y2={upMidY} stroke="#2563EB" strokeWidth="1.8" />
        <polygon points={`885,${upMidY - 4} 894,${upMidY} 885,${upMidY + 4}`} fill="#2563EB" />

        <rect x="798" y={labelY} width="104" height="16" rx="3" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="0.8" />
        <text
          x="850"
          y={labelY + 12}
          fontFamily="var(--font-sans)"
          fontSize="10.5"
          fontWeight="800"
          fill="#334155"
          textAnchor="middle"
        >
          THANG ĐÔNG ▲
        </text>

        <rect x="798" y={dnTopY} width="104" height={flightH} fill="var(--surface-panel)" stroke="#CBD5E1" strokeWidth="0.8" />
        {STAIR_TICKS_EAST.map((tx) => (
          <line key={`${idPrefix}-tx-e-dn-${tx}`} x1={tx} y1={dnTopY} x2={tx} y2={dnBotY} stroke="#64748B" strokeWidth="1" />
        ))}
        <line x1="893" y1={dnMidY} x2="808" y2={dnMidY} stroke="#059669" strokeWidth="1.8" />
        <polygon points={`816,${dnMidY - 4} 807,${dnMidY} 816,${dnMidY + 4}`} fill="#059669" />

        <rect x="906" y={y} width="30" height={h} fill="rgba(203, 213, 225, 0.45)" stroke="#64748B" strokeWidth="1" />
      </g>
    </g>
  );
};

/**
 * Giếng Trời Trung Tâm thông tầng chuẩn CAD (x = 236..724, y = 162..390) cho Tầng 2 – 5.
 */
const CentralAtriumVoid = ({ idPrefix }) => (
  <g id={`${idPrefix}-central-atrium-void`}>
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
    <line x1="242" y1="168" x2="718" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="718" y1="168" x2="242" y2="384" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1" strokeDasharray="4 4" />

    <g transform="translate(376, 258)">
      <rect
        x="0"
        y="0"
        width="208"
        height="36"
        rx="8"
        fill="var(--surface-panel)"
        stroke="rgba(2, 132, 199, 0.5)"
        strokeWidth="1.4"
        style={{ filter: 'drop-shadow(0 2px 10px rgba(2, 132, 199, 0.15))' }}
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
      fill="rgba(241, 245, 249, 0.78)"
      stroke="rgba(203, 213, 225, 0.9)"
      strokeWidth="1.2"
    />

    {/* Đường tim trục giao thông đứt nét (tách khoảng sạch quanh nhãn chữ) */}
    <g stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="7 5">
      <line x1="200" y1="26" x2="200" y2="256" />
      <line x1="200" y1="296" x2="200" y2="524" />
      <line x1="760" y1="26" x2="760" y2="256" />
      <line x1="760" y1="296" x2="760" y2="524" />

      <line x1="32" y1="138" x2="366" y2="138" />
      <line x1="594" y1="138" x2="928" y2="138" />
      <line x1="32" y1="414" x2="366" y2="414" />
      <line x1="594" y1="414" x2="928" y2="414" />
    </g>

    <text
      x="480"
      y="142"
      fontFamily="var(--font-sans)"
      fontSize="10.5"
      fontWeight="800"
      fill="#475569"
      textAnchor="middle"
    >
      HÀNH LANG TRỤC BẮC (TÂY — ĐÔNG)
    </text>

    <text
      x="480"
      y="418"
      fontFamily="var(--font-sans)"
      fontSize="10.5"
      fontWeight="800"
      fill="#475569"
      textAnchor="middle"
    >
      HÀNH LANG TRỤC NAM (TÂY — ĐÔNG)
    </text>

    <g transform="translate(172, 264)">
      <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
      <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
        TRỤC TÂY
      </text>
    </g>

    <g transform="translate(732, 264)">
      <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
      <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
        TRỤC ĐÔNG
      </text>
    </g>
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
  getRoomSimulatedStatus,
  roomPods = {}
}) => {
  const { currentFloorData, roomByCode, unmappedRooms } = useMemo(() => {
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
    const mappedCodes = new Set(
      allFloorRooms.map((r) => getRoomPod(roomPods, r.code)?.code).filter(Boolean)
    );
    const unmapped = Object.values(roomPods).filter(
      (r) => !mappedCodes.has(r.code) && (!r.floor || r.floor === selectedFloor)
    );

    return {
      currentFloorData: { ...template, topRooms, bottomRooms },
      roomByCode: byCode,
      unmappedRooms: unmapped
    };
  }, [selectedFloor, roomPods]);

  const getCategoryName = (categoryKey) => ROOM_CATEGORIES[categoryKey]?.name || 'Tiện ích';

  const renderRoomPod = (room, x, y, w, h) => (
    <RoomPodCard room={room} pod={getRoomPod(roomPods, room?.code)} x={x} y={y} w={w} h={h} />
  );

  /**
   * Bộ vẽ ô phòng chuẩn CAD dùng chung cho cả 5 tầng:
   * - Tự động tách thanh màu danh mục khi cửa mở ở vách trái (không bị nét cửa đè chữ thập).
   * - Tự động dịch chấm trạng thái & thu bán kính cánh cửa ở phòng hẹp có cửa bên phải (không đè pod / chấm xanh).
   * - Tự động căn baseline tiêu đề / phụ đề để không chạm chip thiết bị góc dưới phải.
   */
  const renderCadRoom = ({
    room,
    x,
    y,
    w,
    h,
    title,
    titleLine2,
    subTitle,
    doorSide = 'none',
    doorOffset,
    doorWidth,
    doorArc,
    isMedical = false
  }) => {
    if (!room) return null;
    const isSelected = selectedRoom?.code === room.code;
    const catInfo = ROOM_CATEGORIES[room.category] || {};
    let catColor = catInfo.color || '#94A3B8';
    let badgeBg = catInfo.badgeBg || 'rgba(148, 163, 184, 0.15)';
    let border = catInfo.border || 'rgba(148, 163, 184, 0.5)';

    if (FEMALE_WC_CODES.has(room.code)) {
      catColor = '#F43F5E';
      badgeBg = 'rgba(244, 63, 94, 0.12)';
      border = 'rgba(244, 63, 94, 0.45)';
    } else if (MALE_WC_CODES.has(room.code)) {
      catColor = '#2563EB';
      badgeBg = 'rgba(37, 99, 235, 0.12)';
      border = 'rgba(37, 99, 235, 0.45)';
    } else if (isMedical || room.code === 'A1-YT-T3') {
      catColor = '#EF4444';
      badgeBg = 'rgba(239, 68, 68, 0.12)';
      border = 'rgba(239, 68, 68, 0.5)';
    }

    const sim = getRoomSimulatedStatus
      ? getRoomSimulatedStatus(room)
      : { status: 'available', color: '#10B981', label: 'Trống' };

    const isCompact = h < 55;
    const isMedium66 = h >= 55 && h < 69;
    const isMedium70 = h >= 69 && h <= 80;
    const isLarge = h > 80;
    const isNarrowLarge = isLarge && w < 145;
    const isNarrowMedium = isMedium70 && w < 200;

    // Smart door geometry defaults preventing status-dot & pod collisions
    const compactRightDoor = isCompact && doorSide === 'right';
    const dOffset = doorOffset ?? (compactRightDoor ? 8 : (isCompact ? 11 : 16));
    const dWidth = doorWidth ?? (compactRightDoor ? 12 : (isCompact ? 14 : 18));
    const dArc = doorArc ?? (compactRightDoor ? 10 : Math.min(dWidth, isCompact ? 11 : 14));

    // Typography sizing & baseline placement
    const titleSize = isCompact
      ? '11'
      : isNarrowLarge || isNarrowMedium
        ? '11.5'
        : isLarge
          ? '12.5'
          : isMedium70
            ? '12.5'
            : '12';

    const subTitleSize = isCompact
      ? (w <= 125 ? '8.6' : '9')
      : isNarrowLarge || isNarrowMedium
        ? '9.2'
        : isLarge
          ? '10'
          : '9.5';

    const textY = isCompact
      ? (subTitle ? y + 19 : y + 26)
      : isMedium66
        ? (subTitle ? y + 25 : y + 36)
        : isMedium70
          ? y + 27
          : h > 160
            ? y + Math.floor(h / 2) - 4
            : y + 36;

    const textX = isNarrowLarge ? x + 13 : (doorSide === 'left' ? x + 15 : x + 14);
    const dotCx = compactRightDoor ? x + w - 22 : x + w - 12;
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
          fill={isSelected ? 'var(--surface-panel)' : badgeBg}
          stroke={isSelected ? catColor : border}
          strokeWidth={isSelected ? '2.5' : '1.5'}
          style={{
            transition: 'all 0.15s ease',
            filter: isSelected ? `drop-shadow(0 4px 14px ${catColor}55)` : 'none'
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

        <circle
          cx={dotCx}
          cy={dotCy}
          r={isCompact ? 3.5 : (isLarge ? 4.8 : 4)}
          fill={sim.color}
          stroke="var(--surface-panel)"
          strokeWidth="1.2"
        />

        {(isMedical || room.code === 'A1-YT-T3') && (
          <g transform={`translate(${dotCx - 20}, ${y + 6})`} pointerEvents="none">
            <rect x="3.5" y="0" width="3" height="10" rx="1" fill="#EF4444" />
            <rect x="0" y="3.5" width="10" height="3" rx="1" fill="#EF4444" />
          </g>
        )}

        {doorSide === 'left' && (
          <g>
            <line x1={x} y1={y + dOffset} x2={x} y2={y + dOffset + dWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
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
            <line x1={x + w} y1={y + dOffset} x2={x + w} y2={y + dOffset + dWidth} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
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
            <line x1={x + dOffset} y1={y} x2={x + dOffset + dWidth} y2={y} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
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
            <line x1={x + dOffset} y1={y + h} x2={x + dOffset + dWidth} y2={y + h} stroke={badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
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
            x={textX}
            y={titleLine2 ? y + 23 : textY}
            fontFamily="var(--font-sans)"
            fontSize={titleSize}
            fontWeight="800"
            fill="var(--ink-pure)"
            letterSpacing="-0.2px"
          >
            {title || room.code}
          </text>

          {titleLine2 && (
            <text
              x={textX}
              y={y + 37}
              fontFamily="var(--font-sans)"
              fontSize={titleSize}
              fontWeight="800"
              fill="var(--ink-pure)"
              letterSpacing="-0.2px"
            >
              {titleLine2}
            </text>
          )}

          {subTitle && (
            <text
              x={textX}
              y={
                titleLine2
                  ? y + 52
                  : isCompact
                    ? textY + 14
                    : isMedium66 || isNarrowMedium
                      ? textY + 15
                      : isLarge
                        ? textY + 18
                        : textY + 16
              }
              fontFamily="var(--font-sans)"
              fontSize={subTitleSize}
              fontWeight="500"
              fill="var(--ink-muted)"
            >
              {subTitle}
            </text>
          )}
        </g>

        {renderRoomPod(room, x, y, w, h)}
      </g>
    );
  };

  // ==============================================================
  // TẦNG 1: SÂN CỔNG VÀO (CV), THƯ VIỆN TRUNG TÂM & GIẾNG TRỜI
  // ==============================================================
  const renderFloor1Plan = () => {
    const roomCV = roomByCode['A1-CV'];
    const cvSelected = selectedRoom?.code === 'A1-CV';
    const cvSim = roomCV && getRoomSimulatedStatus
      ? getRoomSimulatedStatus(roomCV)
      : { status: 'available', color: '#10B981', label: 'Trống' };

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
        <OuterCadShell
          idPrefix="f1"
          westEastWinY={[80, 180, 355, 450]}
          westEastWinLen={44}
          northWinX={[60, 180, 320, 460, 600, 748, 862]}
          northWinLen={48}
        />

        {/* PH Tây Bắc (Gộp PH & PTH 1) */}
        {renderCadRoom({
          room: roomByCode['A1-PH-TB'],
          x: 24,
          y: 18,
          w: 140,
          h: 222,
          title: 'PH',
          subTitle: 'Phòng Học & Tự Học',
          doorSide: 'right',
          doorOffset: 65,
          doorWidth: 24,
          doorArc: 16
        })}

        {/* Hành lang thông Bắc */}
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
          <text x="206" y="62" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="#0369A1" textAnchor="middle">
            HÀNH LANG
          </text>
          <text x="206" y="76" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="#0369A1" textAnchor="middle">
            THÔNG
          </text>
        </g>

        {/* PTV • Thư viện trung tâm */}
        {renderCadRoom({
          room: roomByCode['A1-PTV'],
          x: 248,
          y: 18,
          w: 468,
          h: 102,
          title: 'PTV • THƯ VIỆN TRUNG TÂM',
          subTitle: '250 chỗ ngồi • Không gian đọc mở',
          doorSide: 'bottom',
          doorOffset: 120,
          doorWidth: 32,
          doorArc: 16
        })}
        <g pointerEvents="none">
          <line x1={248 + 320} y1={120} x2={248 + 352} y2={120} stroke="rgba(13, 148, 136, 0.14)" strokeWidth="3" />
          <line x1={248 + 320} y1={120} x2={248 + 320} y2={104} stroke="#0D9488" strokeWidth="1.4" />
          <path d={`M ${248 + 320} 104 A 16 16 0 0 1 ${248 + 336} 120`} fill="none" stroke="#0D9488" strokeWidth="1.1" strokeDasharray="2 2" />
        </g>

        {/* Góc Đông Bắc: Kho 1 & Kho 2 */}
        {renderCadRoom({
          room: roomByCode['A1-K1'],
          x: 720,
          y: 18,
          w: 108,
          h: 102,
          title: 'KHO 1',
          subTitle: 'Kho thiết bị',
          doorSide: 'bottom',
          doorOffset: 24,
          doorWidth: 20,
          doorArc: 15
        })}
        {renderCadRoom({
          room: roomByCode['A1-K2'],
          x: 832,
          y: 18,
          w: 104,
          h: 102,
          title: 'KHO 2',
          subTitle: 'Kho vật tư',
          doorSide: 'bottom',
          doorOffset: 24,
          doorWidth: 20,
          doorArc: 15
        })}

        {/* Hành lang nhỏ Đông & NVS Nữ */}
        <g id="f1-east-corridor">
          <rect
            x="796"
            y="126"
            width="140"
            height="40"
            fill="rgba(241, 245, 249, 0.8)"
            stroke="rgba(148, 163, 184, 0.55)"
            strokeWidth="1.2"
            rx="4"
          />
          <text x="866" y="150" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="#334155" textAnchor="middle">
            HÀNH LANG NHỎ
          </text>
        </g>

        {renderCadRoom({
          room: roomByCode['A1-WC-NU'],
          x: 796,
          y: 172,
          w: 140,
          h: 68,
          title: 'NVS NỮ',
          subTitle: 'Khu vệ sinh nữ',
          doorSide: 'top',
          doorOffset: 30,
          doorWidth: 22,
          doorArc: 15
        })}

        {/* Hai cụm cầu thang bộ đối xứng */}
        <StairwellPair idPrefix="f1" y={246} h={86} />

        {/* Kho phụ Tây & NVS Nam Đông */}
        {renderCadRoom({
          room: roomByCode['A1-KHO-TAY'],
          x: 24,
          y: 338,
          w: 140,
          h: 68,
          title: 'KHO',
          subTitle: 'Kho phụ',
          doorSide: 'right',
          doorOffset: 18,
          doorWidth: 20,
          doorArc: 14
        })}
        {renderCadRoom({
          room: roomByCode['A1-WC-NAM'],
          x: 796,
          y: 338,
          w: 140,
          h: 68,
          title: 'NVS NAM',
          subTitle: 'Khu vệ sinh nam',
          doorSide: 'top',
          doorOffset: 30,
          doorWidth: 22,
          doorArc: 15
        })}

        {/* Giếng trời trung tâm Tầng 1 */}
        <g id="f1-central-courtyard">
          <rect
            x="248"
            y="126"
            width="468"
            height="206"
            rx="6"
            fill="rgba(248, 250, 252, 0.88)"
            stroke="rgba(148, 163, 184, 0.55)"
            strokeWidth="1.5"
          />
          <rect
            x="254"
            y="132"
            width="456"
            height="194"
            rx="4"
            fill="none"
            stroke="rgba(2, 132, 199, 0.45)"
            strokeWidth="1.2"
            strokeDasharray="5 3"
          />
          <g transform="translate(378, 211)">
            <rect
              x="0"
              y="0"
              width="208"
              height="36"
              rx="8"
              fill="var(--surface-panel)"
              stroke="rgba(2, 132, 199, 0.5)"
              strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 2px 10px rgba(2, 132, 199, 0.15))' }}
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

        {/* Sân Cổng Vào (CV) */}
        {roomCV && (
          <g
            id="f1-entrance-plaza"
            onClick={() => onSelectRoom && onSelectRoom(roomCV)}
            style={{ cursor: 'pointer' }}
          >
            <title>{roomCV.code} • {roomCV.name} ({roomCV.capacity} chỗ)</title>
            <rect
              x="248"
              y="338"
              width="468"
              height="136"
              fill={cvSelected ? 'var(--surface-panel)' : 'rgba(248, 250, 252, 0.92)'}
              stroke={cvSelected ? '#0284C7' : 'rgba(148, 163, 184, 0.55)'}
              strokeWidth={cvSelected ? '2.4' : '1.4'}
              rx="6"
              style={{
                transition: 'all 0.15s ease',
                filter: cvSelected ? 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.3))' : 'none'
              }}
            />
            <circle cx="704" cy="350" r="4.5" fill={cvSim.color} stroke="var(--surface-panel)" strokeWidth="1.2" />

            <g transform="translate(372, 390)" style={{ pointerEvents: 'none' }}>
              <rect x="0" y="0" width="220" height="32" rx="16" fill="var(--surface-panel)" stroke="var(--hairline-medium)" strokeWidth="1" />
              <text x="110" y="21" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="800" fill="var(--ink-pure)" textAnchor="middle">
                SÂN CỔNG VÀO (CV)
              </text>
            </g>

            {renderRoomPod(roomCV, 248, 338, 468, 136)}
          </g>
        )}

        {/* Hai Đại sảnh phía Nam: PTH 2 & PH Đông Nam */}
        {renderCadRoom({
          room: roomByCode['A1-PTH2'],
          x: 24,
          y: 412,
          w: 220,
          h: 118,
          title: 'PTH 2',
          subTitle: 'Phòng Tự Học Lớn • 120 chỗ',
          doorSide: 'top',
          doorOffset: 120,
          doorWidth: 32,
          doorArc: 16
        })}
        {renderCadRoom({
          room: roomByCode['A1-PH-DN'],
          x: 720,
          y: 412,
          w: 216,
          h: 118,
          title: 'PH',
          subTitle: 'Phòng Học Lớn • 120 chỗ',
          doorSide: 'top',
          doorOffset: 45,
          doorWidth: 32,
          doorArc: 16
        })}

        {/* Cụm 3 Cổng Vào Chính / Phụ */}
        <g id="f1-entrance-gates">
          <g transform="translate(248, 480)">
            <rect x="0" y="0" width="110" height="44" rx="5" fill="rgba(148, 163, 184, 0.16)" stroke="rgba(100, 116, 139, 0.45)" strokeWidth="1.4" />
            <text x="55" y="27" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="var(--ink-pure)" textAnchor="middle">
              CỔNG PHỤ (Trái)
            </text>
          </g>

          <g transform="translate(364, 480)">
            <rect
              x="0"
              y="0"
              width="236"
              height="44"
              rx="6"
              fill="rgba(2, 132, 199, 0.16)"
              stroke="#0284C7"
              strokeWidth="2.2"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.22))' }}
            />
            <text x="118" y="27" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="900" fill="#0284C7" textAnchor="middle" letterSpacing="0.8">
              ✦ CỔNG CHÍNH ✦
            </text>
          </g>

          <g transform="translate(606, 480)">
            <rect x="0" y="0" width="110" height="44" rx="5" fill="rgba(148, 163, 184, 0.16)" stroke="rgba(100, 116, 139, 0.45)" strokeWidth="1.4" />
            <text x="55" y="27" fontFamily="var(--font-sans)" fontSize="11" fontWeight="800" fill="var(--ink-pure)" textAnchor="middle">
              CỔNG PHỤ (Phải)
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
          subTitle: spec.sub[topSuffix],
          doorSide
        })}
        <rect x={x} y={yTop + 45} width={w} height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
        {renderCadRoom({
          room: roomByCode[`A1-${p}${botSuffix}`],
          x,
          y: yTop + 49,
          w,
          h: 45,
          title: `PH ${p}${botSuffix}`,
          subTitle: spec.sub[botSuffix],
          doorSide
        })}
      </g>
    );

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
          subTitle: spec.sub['03'],
          doorSide: 'right',
          doorOffset: 20
        })}
        {renderCadRoom({
          room: roomByCode[`A1-${p}04`],
          x: 24,
          y: 324,
          w: 140,
          h: 66,
          title: `PH ${p}04`,
          subTitle: spec.sub['04'],
          doorSide: 'right',
          doorOffset: 20
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
            subTitle: spec.northCenter.subTitle,
            doorSide: 'bottom',
            doorOffset: 35,
            doorWidth: 26,
            doorArc: 14
          })}
          {spec.northCenter.hasBench && (
            <rect
              x="518"
              y="25"
              width="56"
              height="16"
              rx="2.5"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.3"
              pointerEvents="none"
            />
          )}
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
              subTitle: spec.southSingle.subTitle,
              doorSide: 'top',
              doorOffset: 35,
              doorWidth: 26,
              doorArc: 14
            })}
            {spec.southSingle.hasBench && (
              <rect
                x="518"
                y="469"
                width="56"
                height="16"
                rx="2.5"
                fill="none"
                stroke="#7C3AED"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.3"
                pointerEvents="none"
              />
            )}
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
              subTitle: spec.southPairLeft.subTitle,
              doorSide: 'top',
              doorOffset: 16,
              doorWidth: 18,
              doorArc: 14,
              isMedical: spec.southPairLeft.isMedical
            })}
            <rect x="478" y="462" width="4" height="70" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
            {renderCadRoom({
              room: roomByCode[spec.southPairRight.code],
              x: 482,
              y: 462,
              w: 114,
              h: 70,
              title: spec.southPairRight.title,
              subTitle: spec.southPairRight.subTitle,
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
          subTitle: 'Khu vệ sinh nữ',
          doorSide: 'left',
          doorOffset: 20
        })}
        {renderCadRoom({
          room: roomByCode[spec.wcNamCode],
          x: 796,
          y: 324,
          w: 140,
          h: 66,
          title: 'NVS NAM',
          subTitle: 'Khu vệ sinh nam',
          doorSide: 'left',
          doorOffset: 20
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
    const sbcCat = ROOM_CATEGORIES[roomSBC?.category || 'public_service'] || {};
    const sbcColor = sbcCat.color || '#0D9488';
    const sbcSim = roomSBC && getRoomSimulatedStatus
      ? getRoomSimulatedStatus(roomSBC)
      : { status: 'available', color: '#10B981', label: 'Trống' };

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
            fill="rgba(241, 245, 249, 0.78)"
            stroke="rgba(203, 213, 225, 0.9)"
            strokeWidth="1.2"
          />

          {/* Đường tim trục hành lang chữ nhật (tách khoảng sạch quanh nhãn chữ) */}
          <g stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" strokeDasharray="7 5" fill="none">
            <path d="M 366 135.5 H 204 Q 200 135.5 200 139.5 V 258" />
            <path d="M 594 135.5 H 756 Q 760 135.5 760 139.5 V 258" />
            <path d="M 200 294 V 412.5 Q 200 416.5 204 416.5 H 366" />
            <path d="M 760 294 V 412.5 Q 760 416.5 756 416.5 H 594" />
          </g>

          <text x="480" y="139.5" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="#475569" textAnchor="middle">
            HÀNH LANG TRỤC BẮC (TÂY — ĐÔNG)
          </text>
          <text x="480" y="420.5" fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="800" fill="#475569" textAnchor="middle">
            HÀNH LANG TRỤC NAM (TÂY — ĐÔNG)
          </text>

          <g transform="translate(172, 264)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC TÂY
            </text>
          </g>
          <g transform="translate(732, 264)">
            <rect x="0" y="0" width="56" height="24" rx="4" fill="var(--surface-panel)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.8" />
            <text x="28" y="16" fontFamily="var(--font-sans)" fontSize="9.5" fontWeight="800" fill="#475569" textAnchor="middle">
              TRỤC ĐÔNG
            </text>
          </g>
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
            subTitle: 'Tụ tập nói chuyện sau giờ học',
            doorSide: 'bottom',
            doorOffset: 146,
            doorWidth: 16,
            doorArc: 12
          })}
          <rect x="260" y="18" width="4" height="91" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-507'],
            x: 264,
            y: 18,
            w: 116,
            h: 91,
            title: 'PH 507',
            subTitle: 'Đa năng • 60 chỗ',
            doorSide: 'bottom',
            doorOffset: 12,
            doorWidth: 18,
            doorArc: 14
          })}
          <rect x="380" y="18" width="4" height="91" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-PHL'],
            x: 384,
            y: 18,
            w: 336,
            h: 91,
            title: 'PHÒNG HỌC LỚN',
            subTitle: 'Giảng đường lớn • 180 chỗ',
            doorSide: 'bottom',
            doorOffset: 28,
            doorWidth: 26,
            doorArc: 14
          })}
          <rect x="720" y="18" width="4" height="70" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-HOP'],
            x: 724,
            y: 18,
            w: 112,
            h: 70,
            title: 'PHÒNG HỌP',
            subTitle: 'Họp chuyên môn',
            doorSide: 'bottom',
            doorOffset: 10,
            doorWidth: 16,
            doorArc: 11
          })}
          <rect x="836" y="18" width="4" height="70" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-PGV'],
            x: 840,
            y: 18,
            w: 96,
            h: 91,
            title: 'PHÒNG',
            titleLine2: 'GIÁO VIÊN',
            subTitle: 'VP GV • 35 chỗ',
            doorSide: 'left',
            doorOffset: 72,
            doorWidth: 15,
            doorArc: 11
          })}
        </g>

        {/* Cánh Tây sát vách */}
        <g id="f5-west-wing">
          <rect x="24" y="109" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderCadRoom({
            room: roomByCode['A1-503'],
            x: 24,
            y: 113,
            w: 140,
            h: 115,
            title: 'PH 503',
            subTitle: 'Studio • 30 chỗ',
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
            subTitle: 'Chiếu phim • 45 chỗ',
            doorSide: 'right',
            doorOffset: 56,
            doorWidth: 18,
            doorArc: 14
          })}
          <rect x="24" y="439" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
        </g>

        {/* Cánh Đông sát vách & đồng bộ WC 5 tầng */}
        <g id="f5-east-wing">
          <rect x="840" y="109" width="96" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
          {renderCadRoom({
            room: roomByCode['A1-XTC'],
            x: 796,
            y: 113,
            w: 140,
            h: 45,
            title: 'XƯỞNG THỦ CÔNG',
            subTitle: 'Thủ công • 25 chỗ',
            doorSide: 'left',
            doorOffset: 12,
            doorWidth: 16,
            doorArc: 12
          })}
          <rect x="796" y="158" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-WC-NU-T5'],
            x: 796,
            y: 162,
            w: 140,
            h: 66,
            title: 'NVS NỮ',
            subTitle: 'Khu vệ sinh nữ',
            doorSide: 'left',
            doorOffset: 20
          })}

          {renderCadRoom({
            room: roomByCode['A1-WC-NAM-T5'],
            x: 796,
            y: 324,
            w: 140,
            h: 66,
            title: 'NVS NAM',
            subTitle: 'Khu vệ sinh nam',
            doorSide: 'left',
            doorOffset: 20
          })}
          <rect x="796" y="390" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />

          {renderCadRoom({
            room: roomByCode['A1-KHO-T5'],
            x: 796,
            y: 394,
            w: 140,
            h: 45,
            title: 'PHÒNG KHO',
            subTitle: 'Kho vật tư Tầng 5',
            doorSide: 'left',
            doorOffset: 12,
            doorWidth: 16,
            doorArc: 12
          })}
          <rect x="796" y="439" width="140" height="4" fill="rgba(148, 163, 184, 0.4)" stroke="#64748B" strokeWidth="0.6" />
        </g>

        {/* Sảnh Ban Công phía Nam */}
        {roomSBC && (
          <g
            id="f5-south-balcony-terrace"
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
              fill={sbcSelected ? 'var(--surface-panel)' : (sbcCat.badgeBg || 'rgba(13, 148, 136, 0.12)')}
              stroke={sbcSelected ? sbcColor : (sbcCat.border || 'rgba(13, 148, 136, 0.45)')}
              strokeWidth={sbcSelected ? '2.5' : '1.5'}
              style={{
                transition: 'all 0.15s ease',
                filter: sbcSelected ? `drop-shadow(0 4px 14px ${sbcColor}55)` : 'none'
              }}
            />

            <rect x="28" y="447" width="4" height="81" rx="2" fill={sbcColor} />
            <circle cx="924" cy="454" r="4.8" fill={sbcSim.color} stroke="var(--surface-panel)" strokeWidth="1.2" />

            {[312, 622].map((dx) => (
              <g key={`f5-sbc-door-${dx}`}>
                <line x1={dx} y1="443" x2={dx + 26} y2="443" stroke={sbcCat.badgeBg || 'var(--surface-panel)'} strokeWidth="3" />
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

            <g opacity="0.55" pointerEvents="none">
              <line x1="40" y1="523" x2="844" y2="523" stroke="#0D9488" strokeWidth="1.2" />
              <line x1="40" y1="528" x2="844" y2="528" stroke="#0D9488" strokeWidth="1.5" />
              {Array.from({ length: 29 }, (_, idx) => 44 + idx * 28).map((bx) => (
                <line key={`f5-baluster-${bx}`} x1={bx} y1="523" x2={bx} y2="528" stroke="#0D9488" strokeWidth="1" />
              ))}
            </g>

            <g style={{ pointerEvents: 'none' }}>
              <text
                x="480"
                y="482"
                fontFamily="var(--font-sans)"
                fontSize="13.5"
                fontWeight="800"
                fill="var(--ink-pure)"
                textAnchor="middle"
                letterSpacing="0.3px"
              >
                SẢNH BAN CÔNG
              </text>
              <text
                x="480"
                y="500"
                fontFamily="var(--font-sans)"
                fontSize="10.5"
                fontWeight="500"
                fill="var(--ink-muted)"
                textAnchor="middle"
              >
                Không gian mở &amp; Thư giãn ngoài trời • 120 chỗ
              </text>
            </g>

            {renderRoomPod(roomSBC, 24, 443, 912, 89)}
          </g>
        )}
      </svg>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* 1. HEADER CONTROLS & FLOOR LEVEL SELECTOR */}
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
              color: 'var(--laser-cyan)',
              background: 'rgba(234, 88, 12, 0.12)',
              border: '1px solid rgba(234, 88, 12, 0.28)',
              padding: '2px 8px',
              borderRadius: '5px'
            }}
          >
            {currentFloorData.floorCode}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)' }}>
            {currentFloorData.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {[1, 2, 3, 4, 5].map((fl) => {
            const isActive = selectedFloor === fl;
            const flData = CAMPUS_FLOORS[fl];
            return (
              <button
                key={fl}
                type="button"
                className="ruo-rbac-toggle-pill"
                onClick={() => onChangeFloor && onChangeFloor(fl)}
                style={{
                  padding: '3.5px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1.5px solid var(--blueprint-600)' : '1px solid var(--hairline-medium)',
                  background: isActive ? 'var(--blueprint-600)' : 'var(--canvas-subtle)',
                  color: isActive ? '#FFFFFF' : 'var(--ink-primary)',
                  boxShadow: isActive ? '0 2px 8px rgba(234, 88, 12, 0.28)' : 'none',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer'
                }}
                title={flData?.title}
              >
                <span>Tầng {fl}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ARCHITECTURAL 2D FLOOR PLAN */}
      <div
        key={selectedFloor}
        className="ruo-floor-transition"
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
        {selectedFloor === 1
          ? renderFloor1Plan()
          : selectedFloor === 5
            ? renderFloor5Plan()
            : renderUpperGridFloor(selectedFloor)}
      </div>

      {unmappedRooms.length > 0 && (
        <section aria-label="Phòng chưa có vị trí trên bản vẽ">
          <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Phòng đã đăng ký, chưa có vị trí trên bản vẽ:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unmappedRooms.map((room) => (
              <button
                key={room.code}
                type="button"
                className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                onClick={() => onSelectRoom?.(room)}
                aria-pressed={selectedRoom?.code === room.code}
              >
                {room.code} · {room.name} · {room.equipmentCount} thiết bị · {room.brokenCount} hỏng
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. CATEGORY LEGEND BAR */}
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
          Nhấp vào bất kỳ phòng nào trên sơ đồ để xem trang thiết bị, tình trạng vận hành &amp; điều chuyển
        </div>
      </div>
    </div>
  );
};