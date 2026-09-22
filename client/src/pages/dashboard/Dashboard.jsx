import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/common/SvgIcons';
import { ROOMS } from '../../mock/mockData';

// Architecture Scope: Tòa Nhà A1 (5 Tầng)
const BUILDING_INFO = {
  id: 'Tòa A1',
  name: 'Tòa Nhà A1 • Giảng Đường & Trung Tâm Đào Tạo',
  totalFloors: 5,
  rooms: 108,
  zone: 'Khuôn Viên Trung Tâm'
};

export const Dashboard = ({ onNavigateTab, onOpenBookingModal, onOpenQRModal }) => {
  const { theme } = useAuth();
  // Navigation & Floor State
  const [selectedBuilding, setSelectedBuilding] = useState('Tòa A1');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Time-travel simulator state (Default to 11:15 matching user photo: 11*60 + 15 = 675)
  const [timeValue, setTimeValue] = useState(675);
  const [isPlayingTime, setIsPlayingTime] = useState(false);

  // Time-travel simulator playback
  useEffect(() => {
    let interval;
    if (isPlayingTime) {
      interval = setInterval(() => {
        setTimeValue((prev) => {
          if (prev >= 1260) return 420; // Loop from 07:00 to 21:00
          return prev + 15;
        });
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlayingTime]);

  const formatMinutesToTime = useCallback((mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, []);

  const currentTimeString = formatMinutesToTime(timeValue);

  // 6 rooms on current floor matching the exact layout in the user's photo
  const floorRooms = useMemo(() => {
    const bldgCode = selectedBuilding.replace('Tòa ', '').trim();
    return [
      {
        id: `R_${selectedFloor}01`,
        code: `${bldgCode}-${selectedFloor}01`,
        name: 'Phòng Giảng Chuyên Đề A',
        capacity: 40,
        area: 55,
        type: 'theory',
        powerKw: 2.1,
        temp: 24.2,
        occupiedAt: [
          { start: 450, end: 570, title: 'Cơ Sở Dữ Liệu Nâng Cao', user: 'TS. Phạm Hùng' },
          { start: 780, end: 900, title: 'Học Nhóm Đồ Án K67', user: 'SV Nhóm 4' }
        ]
      },
      {
        id: `R_${selectedFloor}02`,
        code: `${bldgCode}-${selectedFloor}02`,
        name: 'Phòng Học Lý Thuyết Đa Phương Tiện',
        capacity: 45,
        area: 60,
        type: 'theory',
        powerKw: 2.8,
        temp: 23.8,
        occupiedAt: [
          { start: 450, end: 690, title: 'Lập Trình Web Nâng Cao', user: 'TS. Nguyễn Văn Nam • 07:30 - 11:30' },
          { start: 780, end: 900, title: 'Học Nhóm Đồ Án K67', user: 'SV Trần Bảo Hoàng' }
        ]
      },
      {
        id: `R_${selectedFloor}03`,
        code: `${bldgCode}-${selectedFloor}03`,
        name: 'Phòng Thảo Luận Nhóm & Seminar',
        capacity: 25,
        area: 38,
        type: 'seminar',
        powerKw: 1.4,
        temp: 25.1,
        occupiedAt: [
          { start: 540, end: 660, title: 'Bảo Vệ Bài Tập Lớn', user: 'Khoa CNTT' }
        ]
      },
      {
        id: `R_${selectedFloor}04`,
        code: `${bldgCode}-${selectedFloor}04`,
        name: 'Phòng Học Tương Tác Thông Minh',
        capacity: 50,
        area: 68,
        type: 'smart',
        powerKw: 3.2,
        temp: 24.0,
        occupiedAt: [
          { start: 800, end: 960, title: 'Trí Tuệ Nhân Tạo & Học Máy', user: 'PGS. TS. Lê Minh' }
        ]
      },
      {
        id: `R_${selectedFloor}05`,
        code: `${bldgCode}-${selectedFloor}05`,
        name: 'Phòng Lab Thiết Bị Thực Nghiệm',
        capacity: 35,
        area: 75,
        type: 'lab',
        statusOverride: 'maintenance',
        powerKw: 0.6,
        temp: 26.5,
        occupiedAt: []
      },
      {
        id: `R_${selectedFloor}06`,
        code: `${bldgCode}-${selectedFloor}06`,
        name: 'Phòng Giảng Đường Bậc Thang',
        capacity: 80,
        area: 110,
        type: 'lecture',
        powerKw: 4.5,
        temp: 23.5,
        occupiedAt: [
          { start: 450, end: 690, title: 'Toán Rời Rạc & Giải Thuật', user: 'TS. Trần Văn • 07:30 - 11:30' }
        ]
      }
    ];
  }, [selectedBuilding, selectedFloor]);

  // Determine room status dynamically based on time scrubber and active theme
  const getRoomSimulatedStatus = useCallback((room) => {
    const isLight = theme === 'light';

    if (room.statusOverride === 'maintenance') {
      return {
        status: 'maintenance',
        label: 'BẢO TRÌ',
        color: isLight ? '#D97706' : '#F59E0B',
        stroke: '#F59E0B',
        innerFill: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.05)',
        innerStroke: isLight ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.3)'
      };
    }
    const activeSlot = room.occupiedAt?.find(slot => timeValue >= slot.start && timeValue <= slot.end);
    if (activeSlot) {
      return {
        status: 'occupied',
        label: 'ĐANG HỌC',
        color: isLight ? '#2563EB' : '#3B82F6',
        stroke: '#3B82F6',
        innerFill: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.05)',
        innerStroke: isLight ? 'rgba(37, 99, 235, 0.28)' : 'rgba(59, 130, 246, 0.3)',
        slot: activeSlot
      };
    }
    return {
      status: 'available',
      label: 'TRỐNG KHẢ DỤNG',
      color: isLight ? '#059669' : '#10B981',
      stroke: '#10B981',
      innerFill: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.05)',
      innerStroke: isLight ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.3)'
    };
  }, [timeValue, theme]);

  // Handle clicking a room pod to open the inspection drawer
  const handleRoomClick = useCallback((room) => {
    const fullRoom = ROOMS.find(r => r.code === room.code) || {
      ...room,
      building: selectedBuilding,
      floor: selectedFloor,
      status: room.statusOverride || 'available',
      equipments: [
        'Máy chiếu Sony 4K Laser siêu nét',
        '2x Điều hòa Inverter Daikin 18.000 BTU',
        'Hệ thống micro không dây Shure',
        'Bảng kính từ chống lóa cao cấp',
        'Camera giám sát AI & Điểm danh'
      ],
      todaySlots: [
        { time: '07:30 - 09:30', title: 'Lớp Chính Khóa: Lập Trình Web', user: 'TS. Nguyễn Văn Nam', type: 'curriculum' },
        { time: '13:00 - 15:00', title: 'Tự học: Học Nhóm Đồ Án K67', user: 'SV Trần Bảo Hoàng', type: 'booked' },
        { time: '15:30 - 17:30', title: 'Trống sẵn sàng', user: 'Chưa có lịch', type: 'empty' }
      ]
    };
    setSelectedRoom(fullRoom);
    setIsDrawerOpen(true);
  }, [selectedBuilding, selectedFloor]);

  // Status counts for legend
  const availCount = useMemo(() => floorRooms.filter(r => getRoomSimulatedStatus(r).status === 'available').length, [floorRooms, getRoomSimulatedStatus]);
  const occCount = useMemo(() => floorRooms.filter(r => getRoomSimulatedStatus(r).status === 'occupied').length, [floorRooms, getRoomSimulatedStatus]);
  const maintCount = useMemo(() => floorRooms.filter(r => getRoomSimulatedStatus(r).status === 'maintenance').length, [floorRooms, getRoomSimulatedStatus]);

  return (
    <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '16px 20px 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ====================================================================
          MASTER SPLIT LAYOUT: CAD BLUEPRINT (LEFT) & CONTROL DECK (RIGHT)
          ==================================================================== */}
      <div className="ruo-split-layout">
        {/* LEFT COLUMN: SƠ ĐỒ MẶT BẰNG CAD 2.5D (HÌNH THỨ NHẤT) */}
        <div className="ruo-blueprint-container">
          {/* Blueprint Framing Canvas Header */}
          <div
            style={{
              padding: '12px 18px',
              background: 'var(--surface-panel)',
              borderBottom: '1px solid var(--hairline-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(37, 99, 235, 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--laser-cyan)'
                }}
              >
                <Icons.Building size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.01em' }}>
                    Sơ Đồ Mặt Bằng Không Gian • {selectedBuilding} (Tầng {selectedFloor})
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--hairline-medium)' }}>|</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    Hành lang rộng 3.2m • Sức chứa 275 chỗ
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--laser-cyan)',
                  background: 'rgba(37, 99, 235, 0.08)',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  border: '1px solid rgba(37, 99, 235, 0.20)'
                }}
              >
                ● BẢN ĐỒ SỐ CAD 2.5D
              </span>
            </div>
          </div>

          {/* Blueprint Interactive Floor Surface */}
          <div className="ruo-blueprint-canvas">
            {/* Architectural Crop Marks at corners */}
            <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTop: '2px solid var(--hairline-medium)', borderLeft: '2px solid var(--hairline-medium)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '2px solid var(--hairline-medium)', borderRight: '2px solid var(--hairline-medium)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: '2px solid var(--hairline-medium)', borderLeft: '2px solid var(--hairline-medium)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderBottom: '2px solid var(--hairline-medium)', borderRight: '2px solid var(--hairline-medium)', pointerEvents: 'none' }} />

            {/* UPPER WING ROOMS (Rooms 1, 2, 3 - Matching Photo Top Row) */}
            <div className="ruo-rooms-wing">
              {floorRooms.slice(0, 3).map((room) => {
                const sim = getRoomSimulatedStatus(room);
                const isSelected = selectedRoom?.code === room.code && isDrawerOpen;

                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className={`ruo-room-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      borderColor: isSelected ? '#2563EB' : sim.stroke,
                      backgroundColor: 'var(--spatial-room-card-bg)'
                    }}
                    title="Nhấn để xem thông số chi tiết & đặt phòng"
                  >
                    {/* Architectural Ingress Door Swing Arc (Bottom-Right Corner for Upper Rooms) */}
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 38 38"
                      className="ruo-door-swing"
                      style={{ bottom: 0, right: 0 }}
                    >
                      <path
                        d="M 0,38 A 38 38 0 0 0 38,0"
                        fill="none"
                        stroke={sim.color}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.85"
                      />
                      <line x1="0" y1="38" x2="38" y2="0" stroke={sim.color} strokeWidth="1.6" opacity="0.8" />
                    </svg>

                    {/* Top Bar: Dot + Room Code (Left) & Status Badge Pill (Right) */}
                    <div className="ruo-room-top">
                      <div className="ruo-room-code-wrap">
                        <span className="ruo-room-dot" style={{ background: sim.color }} />
                        <span className="ruo-room-code">{room.code}</span>
                      </div>

                      <span
                        className="ruo-room-badge"
                        style={{
                          borderColor: sim.innerStroke,
                          backgroundColor: sim.innerFill,
                          color: sim.color
                        }}
                      >
                        {sim.label}
                      </span>
                    </div>

                    {/* Room Official Title */}
                    <div className="ruo-room-title" title={room.name}>
                      {room.name}
                    </div>

                    {/* Inner Details Box */}
                    <div
                      className="ruo-room-inner-box"
                      style={{
                        backgroundColor: sim.innerFill,
                        borderColor: sim.innerStroke
                      }}
                    >
                      {sim.status === 'occupied' && sim.slot ? (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-occupied">
                            {sim.slot.title}
                          </div>
                          <div className="ruo-room-inner-line2">
                            {sim.slot.user}
                          </div>
                        </>
                      ) : sim.status === 'maintenance' ? (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-maint">
                            Bảo Trì Kỹ Thuật
                          </div>
                          <div className="ruo-room-inner-line2">
                            Kiểm định thiết bị mạng & IoT
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-avail">
                            ✓ Đang trống lúc {currentTimeString}
                          </div>
                          <div className="ruo-room-inner-line2">
                            Nhấn để kiểm tra và đặt phòng
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hardware Telemetry Specs Line */}
                    <div className="ruo-room-specs">
                      <span>Sức chứa: <strong>{room.capacity}</strong></span>
                      <span>|</span>
                      <span>{room.temp}°C</span>
                      <span>|</span>
                      <span>{room.powerKw}kW</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CENTRAL ARTERIAL CORRIDOR */}
            <div className="ruo-corridor-strip">
              {/* West Emergency Stairs */}
              <div className="ruo-corridor-stairs" title="Lối thoát hiểm và thang bộ phía Tây">
                <div className="ruo-stairs-lines">
                  {[1, 2, 3, 4, 5, 6].map((k) => (
                    <span key={k} />
                  ))}
                </div>
                <span className="ruo-stairs-label">THANG TÂY</span>
              </div>

              {/* Center Utilities & Arterial Navigation Axis */}
              <div className="ruo-corridor-center">
                {/* Elevator Bank */}
                <div className="ruo-elev-bank" title="Khu vực cụm thang máy trục A1">
                  <div>ELEV 1</div>
                  <div style={{ height: '1px', background: 'var(--hairline-medium)', margin: '1px 0' }} />
                  <div>ELEV 2</div>
                </div>

                {/* Corridor Axis Spine Label */}
                <div className="ruo-corridor-axis-title">
                  HÀNH LANG TRỤC TRUNG TÂM TẦNG {selectedFloor} • RỘNG 3.2M
                </div>

                {/* Restroom Utility Core */}
                <div className="ruo-wc-block" title="Khu vực vệ sinh nam & nữ">
                  <div>WC NAM</div>
                  <div style={{ height: '1px', background: 'var(--hairline-medium)', margin: '1px 0' }} />
                  <div>WC NỮ</div>
                </div>
              </div>

              {/* East Emergency Stairs */}
              <div className="ruo-corridor-stairs" title="Lối thoát hiểm và thang bộ phía Đông">
                <div className="ruo-stairs-lines">
                  {[1, 2, 3, 4, 5, 6].map((k) => (
                    <span key={k} />
                  ))}
                </div>
                <span className="ruo-stairs-label">THANG ĐÔNG</span>
              </div>
            </div>

            {/* LOWER WING ROOMS (Rooms 4, 5, 6 - Matching Photo Bottom Row) */}
            <div className="ruo-rooms-wing">
              {floorRooms.slice(3, 6).map((room) => {
                const sim = getRoomSimulatedStatus(room);
                const isSelected = selectedRoom?.code === room.code && isDrawerOpen;

                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className={`ruo-room-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      borderColor: isSelected ? '#2563EB' : sim.stroke,
                      backgroundColor: 'var(--spatial-room-card-bg)'
                    }}
                    title="Nhấn để xem thông số chi tiết & đặt phòng"
                  >
                    {/* Stepped Seating Curves for Amphitheater Lecture Hall (Room 6) */}
                    {room.type === 'lecture' && (
                      <svg
                        width="200"
                        height="60"
                        viewBox="0 0 200 60"
                        style={{
                          position: 'absolute',
                          bottom: '24px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          pointerEvents: 'none',
                          opacity: 0.16
                        }}
                      >
                        <path d="M 10 50 Q 100 15 190 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M 25 38 Q 100 8 175 38" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M 40 26 Q 100 2 160 26" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}

                    {/* Architectural Ingress Door Swing Arc (Top-Right Corner for Lower Rooms) */}
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 38 38"
                      className="ruo-door-swing"
                      style={{ top: 0, right: 0 }}
                    >
                      <path
                        d="M 0,0 A 38 38 0 0 1 38,38"
                        fill="none"
                        stroke={sim.color}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.85"
                      />
                      <line x1="0" y1="38" x2="38" y2="38" stroke={sim.color} strokeWidth="1.6" opacity="0.8" />
                    </svg>

                    {/* Top Bar: Dot + Room Code (Left) & Status Badge Pill (Right) */}
                    <div className="ruo-room-top">
                      <div className="ruo-room-code-wrap">
                        <span className="ruo-room-dot" style={{ background: sim.color }} />
                        <span className="ruo-room-code">{room.code}</span>
                      </div>

                      <span
                        className="ruo-room-badge"
                        style={{
                          borderColor: sim.innerStroke,
                          backgroundColor: sim.innerFill,
                          color: sim.color
                        }}
                      >
                        {sim.label}
                      </span>
                    </div>

                    {/* Room Official Title */}
                    <div className="ruo-room-title" title={room.name}>
                      {room.name}
                    </div>

                    {/* Inner Details Box */}
                    <div
                      className="ruo-room-inner-box"
                      style={{
                        backgroundColor: sim.innerFill,
                        borderColor: sim.innerStroke
                      }}
                    >
                      {sim.status === 'occupied' && sim.slot ? (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-occupied">
                            {sim.slot.title}
                          </div>
                          <div className="ruo-room-inner-line2">
                            {sim.slot.user}
                          </div>
                        </>
                      ) : sim.status === 'maintenance' ? (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-maint">
                            Bảo Trì Kỹ Thuật
                          </div>
                          <div className="ruo-room-inner-line2">
                            Kiểm định thiết bị mạng & IoT
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ruo-room-inner-line1 ruo-text-avail">
                            ✓ Đang trống lúc {currentTimeString}
                          </div>
                          <div className="ruo-room-inner-line2">
                            Nhấn để kiểm tra và đặt phòng
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hardware Telemetry Specs Line */}
                    <div className="ruo-room-specs">
                      <span>Sức chứa: <strong>{room.capacity}</strong></span>
                      <span>|</span>
                      <span>{room.temp}°C</span>
                      <span>|</span>
                      <span>{room.powerKw}kW</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Integrated Architectural Timeline Scrubber Bar */}
          <div className="ruo-cad-timeline-bar" style={{ padding: '10px 18px' }}>
            {/* Left: Playback Controls & Digital Clock Readout */}
            <div className="ruo-timeline-left">
              <button
                onClick={() => setIsPlayingTime(!isPlayingTime)}
                className={`ruo-play-btn ${isPlayingTime ? 'playing' : ''}`}
                title={isPlayingTime ? 'Tạm dừng mô phỏng thời gian' : 'Tự động chạy giả lập 24h'}
              >
                {isPlayingTime ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
                <span>{isPlayingTime ? 'Tạm Dừng' : 'Giả Lập'}</span>
              </button>

              <div className="ruo-time-readout">
                <span className="ruo-time-label">GIỜ CAD:</span>
                <span className="ruo-time-val">{currentTimeString}</span>
              </div>
            </div>

            {/* Middle: Range Slider Scrubber */}
            <div className="ruo-timeline-slider-wrap">
              <input
                type="range"
                min="420"
                max="1260"
                step="15"
                value={timeValue}
                onChange={(e) => setTimeValue(Number(e.target.value))}
                className="ruo-timeline-slider"
                aria-label="Thanh trượt thời gian"
              />
              <div className="ruo-timeline-ticks">
                <span>07:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>21:00</span>
              </div>
            </div>

            {/* Right: Quick Jump Presets */}
            <div className="ruo-timeline-presets">
              {[
                { label: '08:30', val: 510 },
                { label: '11:15', val: 675 },
                { label: '14:30', val: 870 },
                { label: '18:30', val: 1110 }
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => setTimeValue(preset.val)}
                  className={`ruo-preset-btn ${Math.abs(timeValue - preset.val) < 15 ? 'active' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHỨC NĂNG ĐIỀU KHIỂN (HÌNH THỨ HAI) */}
        <div className="ruo-control-deck">
          {/* Deck Header */}
          <div className="ruo-deck-header">
            <div className="ruo-deck-title">
              <Icons.Building size={16} color="var(--laser-cyan)" />
              <span>Bàn Điều Khiển Không Gian</span>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontWeight: 700 }}>
              {selectedBuilding} • TẦNG {selectedFloor}
            </span>
          </div>

          {/* 1. Không Gian Kiến Trúc Tòa Nhà A1 (5 Tầng) */}
          <div className="ruo-deck-section">
            <div className="ruo-deck-label">
              <span>KHÔNG GIAN KIẾN TRÚC</span>
              <span style={{ fontSize: '10px', color: 'var(--laser-cyan)' }}>Tòa Nhà A1 (5 Tầng)</span>
            </div>
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--hairline-medium)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  color: 'var(--laser-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icons.Building size={20} color="var(--laser-cyan)" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink-pure)', letterSpacing: '-0.02em' }}>
                  TÒA NHÀ A1 • GIẢNG ĐƯỜNG TRUNG TÂM
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  5 Tầng Học Vụ • 108 Phòng học & Lab • Cảm biến IoT
                </div>
              </div>
            </div>
          </div>

          {/* 2. Chọn Tầng (Floor Level Selector from Image 2) */}
          <div className="ruo-deck-section">
            <div className="ruo-deck-label">
              <span>CHỌN TẦNG MẶT BẰNG</span>
              <span style={{ fontSize: '10px', color: 'var(--laser-cyan)' }}>Đang chọn: Tầng {selectedFloor}</span>
            </div>
            <div className="ruo-deck-floors">
              {[1, 2, 3, 4, 5].map((fl) => (
                <button
                  key={fl}
                  onClick={() => setSelectedFloor(fl)}
                  className={`ruo-deck-floor-btn ${selectedFloor === fl ? 'active' : ''}`}
                >
                  Tầng {fl}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tình Trạng Khả Dụng & Chú Thích (Status Pills from Image 2) */}
          <div className="ruo-deck-section">
            <div className="ruo-deck-label">
              <span>TÌNH TRẠNG PHÒNG TẦNG {selectedFloor}</span>
              <span style={{ fontSize: '10px', color: '#059669' }}>6 Phòng Học</span>
            </div>
            <div className="ruo-deck-status-grid">
              <div className="ruo-deck-status-pill emerald" title="Phòng trống sẵn sàng đặt">
                <span className="ruo-deck-pill-count">{availCount}</span>
                <span className="ruo-deck-pill-label">Trống</span>
              </div>
              <div className="ruo-deck-status-pill blue" title="Phòng đang có lớp giảng dạy">
                <span className="ruo-deck-pill-count">{occCount}</span>
                <span className="ruo-deck-pill-label">Đang Học</span>
              </div>
              <div className="ruo-deck-status-pill amber" title="Phòng đang bảo trì thiết bị">
                <span className="ruo-deck-pill-count">{maintCount}</span>
                <span className="ruo-deck-pill-label">Bảo Trì</span>
              </div>
            </div>
          </div>

          {/* 4. Các Nút Tác Vụ Nhanh (Action Buttons from Image 2) */}
          <div className="ruo-deck-section" style={{ gap: '10px', marginTop: '2px' }}>
            <button
              onClick={() => onOpenBookingModal(selectedRoom)}
              className="ruo-action-btn ruo-action-btn-primary"
              style={{ width: '100%', minHeight: '40px', padding: '10px 16px', fontSize: '13px' }}
              title="Mở biểu mẫu đặt phòng nhanh 30 giây"
            >
              <Icons.Calendar size={16} />
              <span>Đặt Phòng Nhanh (30s)</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => (onOpenQRModal ? onOpenQRModal() : null)}
                className="ruo-action-btn ruo-action-btn-emerald"
                style={{ width: '100%', minHeight: '38px', padding: '8px 10px', fontSize: '11.5px' }}
                title="Quét mã QR cửa phòng xác nhận có mặt"
              >
                <Icons.CheckCircle size={14} />
                <span>Quét QR Cửa</span>
              </button>

              <button
                onClick={() => onNavigateTab('rooms')}
                className="ruo-action-btn ruo-action-btn-subtle"
                style={{ width: '100%', minHeight: '38px', padding: '8px 10px', fontSize: '11.5px' }}
                title="Xem danh sách bảng toàn bộ 108 phòng"
              >
                <Icons.Search size={14} />
                <span>Tra Cứu 108 Phòng</span>
              </button>
            </div>
          </div>

          {/* 5. Xem Nhanh Phòng Đang Chọn (Quick Active Room Preview) */}
          {selectedRoom && (
            <div className="ruo-deck-room-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getRoomSimulatedStatus(selectedRoom).color
                    }}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink-pure)' }}>
                    {selectedRoom.code}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: getRoomSimulatedStatus(selectedRoom).innerFill,
                    border: `1px solid ${getRoomSimulatedStatus(selectedRoom).innerStroke}`,
                    color: getRoomSimulatedStatus(selectedRoom).color
                  }}
                >
                  {getRoomSimulatedStatus(selectedRoom).label}
                </span>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                {selectedRoom.name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Sức chứa: <strong style={{ color: 'var(--ink-pure)' }}>{selectedRoom.capacity}</strong></span>
                <span>{selectedRoom.temp || 24.2}°C</span>
                <span>{selectedRoom.powerKw || 2.1}kW</span>
              </div>

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="laser-btn laser-btn-ghost"
                style={{ fontSize: '11.5px', padding: '6px 8px', width: '100%', justifyContent: 'center', marginTop: '2px', color: 'var(--laser-cyan)' }}
              >
                <span>Xem Chi Tiết & Trang Thiết Bị</span>
                <Icons.ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          3. CALM, PROFESSIONAL OPERATIONAL SUITE (BALANCED 2-COLUMN)
          ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '16px' }}>
        {/* Left Column: Lịch Học & Hoạt Động Giảng Dạy Tiếp Theo */}
        <div
          style={{
            background: 'var(--surface-panel)',
            border: '1px solid var(--hairline-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="ruo-pulse-dot" style={{ background: 'var(--laser-cyan)' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)', textTransform: 'uppercase' }}>
                Lịch Học & Giảng Dạy Sắp Diễn Ra (Hôm Nay)
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="laser-btn laser-btn-ghost"
              style={{ fontSize: '11.5px', padding: '2px 8px', color: 'var(--laser-cyan)' }}
            >
              <span>Xem Lịch Toàn Trường</span>
              <Icons.ChevronRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 14px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)' }}>
                    13:00 – 15:00
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.10)', color: 'var(--laser-cyan)', fontWeight: 700 }}>
                    Phòng A1-102
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                  Học Nhóm Đồ Án Kỹ Thuật Phần Mềm K67
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Chủ trì: SV Trần Bảo Hoàng • Sĩ số: 6 bạn
                </div>
              </div>

              <button
                onClick={() => onOpenBookingModal(floorRooms[1])}
                className="laser-btn laser-btn-ghost"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Chi Tiết
              </button>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--laser-indigo)', fontFamily: 'var(--font-mono)' }}>
                    13:30 – 16:30
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.10)', color: 'var(--laser-indigo)', fontWeight: 700 }}>
                    Phòng A1-104
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                  Thực Hành Trí Tuệ Nhân Tạo & Học Máy
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Giảng viên: PGS. TS. Lê Minh • Sĩ số: 45 SV
                </div>
              </div>

              <button
                onClick={() => onOpenBookingModal(floorRooms[3])}
                className="laser-btn laser-btn-ghost"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Chi Tiết
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Giám Sát Vận Hành Kỹ Thuật & Môi Trường IoT */}
        <div
          style={{
            background: 'var(--surface-panel)',
            border: '1px solid var(--hairline-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="ruo-pulse-dot" style={{ background: '#10B981' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)', textTransform: 'uppercase' }}>
                Giám Sát Vận Hành & Hỗ Trợ Kỹ Thuật
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              TRỰC BAN: KT PHẠM HÙNG
            </span>
          </div>

          {/* 4 Clean IoT Telemetry Mini-Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>NHIỆT ĐỘ KHÔNG GIAN</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                24.2°C <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>Tối ưu</span>
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>TỔNG CÔNG SUẤT ĐIỆN</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                14.6 kW <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>Tiết kiệm</span>
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>TỶ LỆ LẤP ĐẦY TẦNG</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                33.3% <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>2/6 phòng</span>
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>SLA CAM KẾT XỬ LÝ</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                100% <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>&lt;15 phút</span>
              </div>
            </div>
          </div>

          {/* Active Maintenance Snippet */}
          <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.20)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', padding: '1px 6px', background: 'rgba(245,158,11,0.15)', color: '#D97706', borderRadius: '3px', fontWeight: 800 }}>
                  #TCK-0042
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ink-primary)', fontWeight: 700 }}>Phòng A1-105 • Bảo Trì Định Kỳ</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Kiểm định thiết bị mạng & IoT, hoàn tất trước 15:30.
              </div>
            </div>

            <button
              className="laser-btn laser-btn-ghost"
              onClick={() => onNavigateTab('tickets_kanban')}
              style={{ fontSize: '11px', padding: '4px 8px', color: '#D97706' }}
            >
              <span>Xem Kanban</span>
              <Icons.ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          5. SLIDE-OUT ROOM INSPECTION DRAWER (ACCESSIBLE & SPACIOUS)
          ==================================================================== */}
      {isDrawerOpen && selectedRoom && (
        <div className="spatial-drawer">
          {/* Drawer Header */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--hairline-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--canvas-subtle)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--laser-cyan)',
                    background: 'rgba(37, 99, 235, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}
                >
                  {selectedRoom.building || selectedBuilding} • TẦNG {selectedRoom.floor || selectedFloor}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: getRoomSimulatedStatus(selectedRoom).color,
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  ● {getRoomSimulatedStatus(selectedRoom).label}
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {selectedRoom.code} • {selectedRoom.name}
              </h2>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="ruo-icon-button"
              title="Đóng ngăn kéo"
            >
              <Icons.X size={16} />
            </button>
          </div>

          {/* Drawer Body Content */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Quick Room Banner Image */}
            <div
              style={{
                height: '140px',
                borderRadius: 'var(--radius-sm)',
                backgroundImage: `url(${selectedRoom.image || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--hairline-soft)'
              }}
            />

            {/* Environmental & IoT Telemetry Specs Grid */}
            <div>
              <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: '10px', fontWeight: 800 }}>
                THÔNG SỐ MÔI TRƯỜNG & IOT THỜI GIAN THỰC
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--canvas-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>SỨC CHỨA GHẾ NGỒI</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedRoom.capacity} Chỗ
                  </div>
                </div>

                <div style={{ background: 'var(--canvas-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>DIỆN TÍCH SÀN</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedRoom.area || 60} m²
                  </div>
                </div>

                <div style={{ background: 'var(--canvas-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>CẢM BIẾN NHIỆT ĐỘ</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedRoom.temp || 24.0} °C (Tối ưu)
                  </div>
                </div>

                <div style={{ background: 'var(--canvas-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>CÔNG SUẤT TIÊU THỤ</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedRoom.powerKw || 2.5} kW (Tiêu chuẩn)
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment Inventory */}
            <div>
              <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: '10px', fontWeight: 800 }}>
                TRANG THIẾT BỊ SẴN CÓ TRONG PHÒNG
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.equipments || [
                  'Máy chiếu Sony 4K Laser siêu nét',
                  '2x Điều hòa Inverter Daikin 18.000 BTU',
                  'Hệ thống micro không dây Shure',
                  'Bảng kính từ chống lóa cao cấp'
                ]).map((eq, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      background: 'var(--canvas-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      border: '1px solid var(--hairline-soft)'
                    }}
                  >
                    <Icons.CheckCircle size={15} color="#10B981" />
                    <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{eq}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Schedule Slots */}
            <div>
              <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: '10px', fontWeight: 800 }}>
                LỊCH PHÒNG HỌC TRONG NGÀY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.todaySlots || [
                  { time: '07:30 - 09:30', title: 'Lớp Chính Khóa: Lập Trình Web', user: 'TS. Nguyễn Văn Nam' },
                  { time: '13:00 - 15:00', title: 'Tự Học: SV K67', user: 'SV Trần Bảo Hoàng' }
                ]).map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '9px 12px',
                      background: 'var(--canvas-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--hairline-soft)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)' }}>{slot.time}</span>
                      <span style={{ color: 'var(--ink-muted)' }}>{slot.user}</span>
                    </div>
                    <div style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{slot.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div
            style={{
              padding: '18px 24px',
              borderTop: '1px solid var(--hairline-medium)',
              display: 'flex',
              gap: '12px',
              background: 'var(--canvas-subtle)'
            }}
          >
            <button
              className="ruo-action-btn ruo-action-btn-primary"
              style={{ flex: 1, minHeight: '44px' }}
              onClick={() => {
                setIsDrawerOpen(false);
                onOpenBookingModal(selectedRoom);
              }}
            >
              <Icons.Calendar size={16} />
              <span>Đặt Phòng Này Ngay (30s)</span>
            </button>

            <button
              className="ruo-action-btn ruo-action-btn-amber"
              style={{ width: '48px', height: '48px', padding: 0, minHeight: 'unset' }}
              onClick={() => {
                setIsDrawerOpen(false);
                onNavigateTab('tickets_kanban');
              }}
              title="Báo sự cố thiết bị tại phòng này"
            >
              <Icons.Wrench size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};