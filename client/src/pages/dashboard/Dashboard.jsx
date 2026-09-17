import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { ROOMS } from '../../mock/mockData';

// Static campus buildings metadata
const BUILDINGS = [
  { id: 'Tòa A1', name: 'Tòa A1 • Giảng Đường Chính', totalFloors: 5, rooms: 28 },
  { id: 'Tòa B1', name: 'Tòa B1 • Viện Điện & IoT', totalFloors: 4, rooms: 24 },
  { id: 'Tòa B2', name: 'Tòa B2 • Viện CNTT & Lab', totalFloors: 4, rooms: 32 },
  { id: 'Hội Trường', name: 'Hội Trường Đa Năng A1', totalFloors: 2, rooms: 4 }
];

// Isolated SLA Reactor Widget with its own 1-second timer to avoid re-rendering CAD canvas
const SlaReactorWidget = React.memo(({ onNavigateTab }) => {
  const [slaSecondsRemaining, setSlaSecondsRemaining] = useState(6134);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlaSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const h = String(Math.floor(slaSecondsRemaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((slaSecondsRemaining % 3600) / 60)).padStart(2, '0');

  return (
    <div
      className="spatial-tactical-card"
      style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}
    >
      {/* SVG Reactor Gauge */}
      <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="36" fill="none" stroke="var(--spatial-gauge-track)" strokeWidth="6" />
          <circle
            cx="45"
            cy="45"
            r="36"
            fill="none"
            stroke="var(--laser-crimson)"
            strokeWidth="6"
            strokeDasharray="226"
            strokeDashoffset="70"
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: 'drop-shadow(0 0 6px var(--laser-crimson))' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '13px', color: 'var(--laser-crimson)' }}>
          {h}:{m}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--laser-crimson)', fontWeight: 800, marginBottom: '2px' }}>
          SLA REACTOR • TRỤ CỘT 2
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)' }}>
          Ticket TCK-0042 (Máy Chiếu)
        </div>
        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
          Đang đếm ngược theo giờ hành chính (07:30 - 17:00)
        </div>
        <button
          className="laser-btn laser-btn-primary"
          onClick={() => onNavigateTab('tickets_kanban')}
          style={{ padding: '4px 10px', fontSize: '11px', marginTop: '8px' }}
        >
          Mở Kanban Xử Lý →
        </button>
      </div>
    </div>
  );
});

export const Dashboard = ({ onNavigateTab, onOpenBookingModal }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('Tòa A1');
  const [selectedFloor, setSelectedFloor] = useState(3);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [timeValue, setTimeValue] = useState(540); // 540 mins = 09:00 AM
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
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlayingTime]);

  const formatMinutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const currentTimeString = formatMinutesToTime(timeValue);
  const buildings = BUILDINGS;

  // Simulated floor rooms
  const floorRooms = React.useMemo(() => [
    {
      id: 'R_301',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}01`,
      name: 'Phòng Giảng Chuyên Đề A',
      capacity: 40,
      area: 55,
      type: 'theory',
      powerKw: 2.1,
      temp: 24.2,
      occupiedAt: [
        { start: 450, end: 570, title: 'Cơ Sở Dữ Liệu Nâng Cao', user: 'TS. Phạm Hùng' },
        { start: 780, end: 900, title: 'Học nhóm đồ án', user: 'SV Nhóm 4' }
      ]
    },
    {
      id: 'R_302',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}02`,
      name: 'Phòng Học Lý Thuyết Đa Phương Tiện',
      capacity: 45,
      area: 60,
      type: 'theory',
      powerKw: 2.8,
      temp: 23.8,
      occupiedAt: [
        { start: 450, end: 690, title: 'Lập Trình Web Nâng Cao', user: 'TS. Nguyễn Văn Nam' },
        { start: 780, end: 900, title: 'Học Nhóm Đồ Án K67', user: 'SV Trần Bảo Hoàng' }
      ]
    },
    {
      id: 'R_303',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}03`,
      name: 'Phòng Thảo Luận Nhóm & Seminar',
      capacity: 25,
      area: 38,
      type: 'seminar',
      powerKw: 1.4,
      temp: 25.1,
      occupiedAt: [
        { start: 540, end: 660, title: 'Bảo vệ bài tập lớn', user: 'Khoa CNTT' }
      ]
    },
    {
      id: 'R_304',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}04`,
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
      id: 'R_305',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}05`,
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
      id: 'R_306',
      code: `${selectedBuilding.replace('Tòa ', '')}-${selectedFloor}06`,
      name: 'Phòng Giảng Đường Bậc Thang',
      capacity: 80,
      area: 110,
      type: 'lecture',
      powerKw: 4.5,
      temp: 23.5,
      occupiedAt: [
        { start: 450, end: 690, title: 'Toán Rời Rạc & Giải Thuật', user: 'TS. Trần Vân' }
      ]
    }
  ], [selectedBuilding, selectedFloor]);

  // Helper to determine status based on Time-Travel scrubber
  const getRoomSimulatedStatus = React.useCallback((room) => {
    if (room.statusOverride === 'maintenance') return { status: 'maintenance', label: 'BẢO TRÌ', color: 'var(--laser-amber)' };
    const activeSlot = room.occupiedAt?.find(slot => timeValue >= slot.start && timeValue <= slot.end);
    if (activeSlot) {
      return { status: 'occupied', label: 'ĐANG HỌC', color: 'var(--laser-cyan)', slot: activeSlot };
    }
    return { status: 'available', label: 'TRỐNG KHẢ DỤNG', color: 'var(--laser-emerald)' };
  }, [timeValue]);

  const handleRoomClick = React.useCallback((room) => {
    const fullRoom = ROOMS.find(r => r.code === room.code) || {
      ...room,
      building: selectedBuilding,
      floor: selectedFloor,
      status: room.statusOverride || 'available',
      equipments: ['Máy chiếu Sony 4K Laser', '2x Điều hòa Inverter 18000BTU', 'Hệ thống âm thanh Shure', 'Bảng kính từ chống lóa'],
      todaySlots: [
        { time: '07:30 - 09:30', title: 'Lớp Chính Khóa', user: 'Giảng viên khoa', type: 'curriculum' },
        { time: '13:00 - 15:00', title: 'Slot đã đặt', user: 'SV Nhóm', type: 'booked' }
      ]
    };
    setSelectedRoom(fullRoom);
    setIsDrawerOpen(true);
  }, [selectedBuilding, selectedFloor]);

  return (
    <div style={{ paddingBottom: '24px', width: '100%' }}>
      {/* MAIN BLUEPRINT CANVAS VIEWPORT */}
      <main style={{ padding: '24px 310px 24px 36px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
        {/* Building & Floor Selector Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Building Pills */}
          <div className="building-switch-bar">
            {buildings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBuilding(b.id)}
                className={`building-switch-btn ${selectedBuilding === b.id ? 'active' : ''}`}
              >
                <Icons.Building size={14} />
                <span>{b.name}</span>
              </button>
            ))}
          </div>

          {/* Floor Selector Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--spatial-bar-bg)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-soft)' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', padding: '0 8px' }}>
              TẦNG:
            </span>
            {[1, 2, 3, 4].map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: selectedFloor === fl ? 800 : 500,
                  background: selectedFloor === fl ? 'var(--laser-indigo)' : 'transparent',
                  color: selectedFloor === fl ? '#FFFFFF' : 'var(--ink-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 120ms ease, color 120ms ease'
                }}
              >
                F{fl}
              </button>
            ))}
          </div>
        </div>

        {/* Blueprint CAD Architectural Grid Floorplan */}
        <div className="spatial-blueprint-card">
          {/* Architectural Compass & Grid Coordinate Stamps */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--hairline-soft)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '3px 9px',
                  borderRadius: '4px',
                  background: 'rgba(161, 101, 38, 0.14)',
                  color: 'var(--laser-indigo)',
                  border: '1px solid rgba(161, 101, 38, 0.30)'
                }}
              >
                CAD MẶT BẰNG TẦNG {selectedFloor}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                {selectedBuilding} — Không gian Kiến Trúc Trực Quan
              </span>
            </div>

            {/* Spatial Status Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--laser-emerald)', boxShadow: '0 0 8px var(--laser-emerald)' }} />
                Trống ({floorRooms.filter(r => getRoomSimulatedStatus(r).status === 'available').length})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--laser-cyan)', boxShadow: '0 0 8px var(--laser-cyan)' }} />
                Đang có lớp ({floorRooms.filter(r => getRoomSimulatedStatus(r).status === 'occupied').length})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--laser-amber)' }} />
                Bảo trì (1)
              </span>
            </div>
          </div>

          {/* Floorplan Vector Schematic: Hallway + Room Pods */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Upper Wing Rooms */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {floorRooms.slice(0, 3).map((room) => {
                const sim = getRoomSimulatedStatus(room);
                const isSelected = selectedRoom?.code === room.code && isDrawerOpen;
                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className={`spatial-room-node ${isSelected ? 'selected' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: sim.color,
                            boxShadow: `0 0 10px ${sim.color}`
                          }}
                        />
                        <span style={{ fontWeight: 800, fontSize: '17px', color: 'var(--ink-pure)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                          {room.code}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-display)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${sim.color}15`,
                          color: sim.color,
                          border: `1px solid ${sim.color}40`,
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {sim.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                      {room.name}
                    </div>

                    {/* Active slot highlight or available prompt */}
                    {sim.status === 'occupied' && sim.slot ? (
                      <div
                        style={{
                          background: 'rgba(161, 101, 38, 0.10)',
                          border: '1px solid rgba(161, 101, 38, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          fontSize: '11px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>
                          {sim.slot.title}
                        </div>
                        <div style={{ color: 'var(--ink-muted)', fontSize: '10px' }}>
                          {sim.slot.user} • {formatMinutesToTime(sim.slot.start)} - {formatMinutesToTime(sim.slot.end)}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(94, 98, 73, 0.12)',
                          border: '1px solid rgba(94, 98, 73, 0.30)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          fontSize: '11px',
                          color: 'var(--laser-emerald)',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icons.Check size={12} color="var(--laser-emerald)" />
                        <span>Đang trống lúc {currentTimeString} • Đặt ngay</span>
                      </div>
                    )}

                    {/* Sensor Telemetry Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--ink-muted)',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--hairline-soft)'
                      }}
                    >
                      <span>Sức chứa: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.capacity}</strong></span>
                      <span>Nhiệt độ: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.temp}°C</strong></span>
                      <span>Điện: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.powerKw}kW</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Central Corridor / Walkway Visual Marker */}
            <div className="spatial-corridor-marker" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em' }}>
              <span>LỐI ĐI HÀNH LANG TRUNG TÂM TẦNG {selectedFloor}</span>
              <span style={{ color: 'var(--laser-indigo)' }}>• LỐI THOÁT HIỂM TÂY</span>
              <span style={{ color: 'var(--laser-indigo)' }}>• THANG MÁY KHU BẮC</span>
            </div>

            {/* Lower Wing Rooms */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {floorRooms.slice(3, 6).map((room) => {
                const sim = getRoomSimulatedStatus(room);
                const isSelected = selectedRoom?.code === room.code && isDrawerOpen;
                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className={`spatial-room-node ${isSelected ? 'selected' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: sim.color,
                            boxShadow: `0 0 10px ${sim.color}`
                          }}
                        />
                        <span style={{ fontWeight: 800, fontSize: '17px', color: 'var(--ink-pure)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                          {room.code}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-display)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${sim.color}15`,
                          color: sim.color,
                          border: `1px solid ${sim.color}40`,
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {sim.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                      {room.name}
                    </div>

                    {sim.status === 'occupied' && sim.slot ? (
                      <div
                        style={{
                          background: 'rgba(161, 101, 38, 0.10)',
                          border: '1px solid rgba(161, 101, 38, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          fontSize: '11px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>
                          {sim.slot.title}
                        </div>
                        <div style={{ color: 'var(--ink-muted)', fontSize: '10px' }}>
                          {sim.slot.user} • {formatMinutesToTime(sim.slot.start)} - {formatMinutesToTime(sim.slot.end)}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(94, 98, 73, 0.12)',
                          border: '1px solid rgba(94, 98, 73, 0.30)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          fontSize: '11px',
                          color: 'var(--laser-emerald)',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icons.Check size={12} color="var(--laser-emerald)" />
                        <span>Đang trống lúc {currentTimeString} • Đặt ngay</span>
                      </div>
                    )}

                    {/* Sensor Telemetry Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--ink-muted)',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--hairline-soft)'
                      }}
                    >
                      <span>Sức chứa: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.capacity}</strong></span>
                      <span>Nhiệt độ: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.temp}°C</strong></span>
                      <span>Điện: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{room.powerKw}kW</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tactical Status Lower Bar: SLA Reactor Dial + Realtime Event Ticker */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
          {/* Aerospace SLA Reactor Gauge (Isolated memoized countdown) */}
          <SlaReactorWidget onNavigateTab={onNavigateTab} />

          {/* Realtime Telemetry Stream Ticker */}
          <div
            className="spatial-tactical-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="telemetry-live-dot" style={{ width: '6px', height: '6px' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontWeight: 700 }}>
                  REALTIME TELEMETRY LOG (CAMPUS FEED)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)' }}>
                LATENCY: 18ms
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: '11px' }}>09:02:15</span>
                <span style={{ color: 'var(--laser-emerald)', fontWeight: 600 }}>[CHECK-IN QR]</span>
                <span style={{ color: 'var(--ink-primary)' }}>TS. Nguyễn Văn Nam quét QR thành công tại phòng A1-302 (+5 Uy tín)</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: '11px' }}>08:58:40</span>
                <span style={{ color: 'var(--laser-indigo)', fontWeight: 600 }}>[CSP ENGINE]</span>
                <span style={{ color: 'var(--ink-primary)' }}>Tối ưu hóa xếp 450 môn học vào 108 phòng học với 0 xung đột</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. TIME-TRAVEL CONTROLLER (Compact Middle-Right Floating HUD) */}
      <div className={`time-travel-dock ${isDrawerOpen ? 'drawer-open' : ''}`}>
        {/* Header: Title + Play/Pause */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="telemetry-live-dot" style={{ width: '6px', height: '6px' }} />
            <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontWeight: 800, letterSpacing: '0.04em' }}>
              MÔ PHỎNG DÒNG GIỜ
            </span>
          </div>

          <button
            onClick={() => setIsPlayingTime(!isPlayingTime)}
            className="laser-btn laser-btn-ghost"
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: isPlayingTime ? 'var(--laser-amber)' : 'var(--laser-cyan)',
              border: '1px solid var(--hairline-soft)'
            }}
            title={isPlayingTime ? 'Tạm dừng mô phỏng thời gian' : 'Tự động chạy giả lập 24h'}
          >
            {isPlayingTime ? <Icons.Pause size={10} /> : <Icons.Play size={10} />}
            <span>{isPlayingTime ? 'Dừng' : 'Chạy'}</span>
          </button>
        </div>

        {/* Digital Time Readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--spatial-tile-bg)',
            border: '1px solid var(--hairline-soft)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icons.Clock size={13} color="var(--laser-cyan)" />
            <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>MỐC GIỜ:</span>
          </div>
          <span style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)', letterSpacing: '0.04em' }}>
            {currentTimeString}
          </span>
        </div>

        {/* Scrubber slider */}
        <div className="time-scrubber-track">
          <input
            type="range"
            min="420"
            max="1260"
            step="15"
            value={timeValue}
            onChange={(e) => setTimeValue(Number(e.target.value))}
            className="time-scrubber-input"
            aria-label="Thanh trượt dòng thời gian"
          />
          <div className="time-notches">
            <span>07:00</span>
            <span>12:00</span>
            <span>17:00</span>
            <span>21:00</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="time-presets-grid">
          {[
            { label: '09:00', val: 540, tip: 'Sáng' },
            { label: '12:00', val: 720, tip: 'Trưa' },
            { label: '15:00', val: 900, tip: 'Chiều' },
            { label: '18:30', val: 1110, tip: 'Tối' }
          ].map((preset) => (
            <button
              key={preset.val}
              onClick={() => setTimeValue(preset.val)}
              className={`time-preset-btn ${Math.abs(timeValue - preset.val) < 15 ? 'active' : ''}`}
              title={`Chuyển nhanh tới mốc ${preset.label} (${preset.tip})`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Quick Action Button */}
        <button
          className="laser-btn laser-btn-cyan"
          onClick={() => onNavigateTab('rooms')}
          style={{ width: '100%', justifyContent: 'center', padding: '6px 12px', fontSize: '11.5px', borderRadius: 'var(--radius-sm)' }}
        >
          <Icons.Search size={13} />
          <span>Tra Cứu 108 Phòng</span>
        </button>
      </div>

      {/* 4. SPATIAL ROOM INSPECTION SLIDE DRAWER (Right Side) */}
      {isDrawerOpen && selectedRoom && (
        <div className="spatial-drawer">
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--hairline-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--laser-cyan)',
                    background: 'rgba(161, 101, 38, 0.16)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {selectedRoom.building} • TẦNG {selectedRoom.floor || selectedFloor}
                </span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {selectedRoom.code} • {selectedRoom.name}
              </h2>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="icon-btn"
              style={{ width: '32px', height: '32px' }}
            >
              <Icons.X size={16} />
            </button>
          </div>

          {/* Drawer Body Content */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick Room Image Banner */}
            <div
              style={{
                height: '140px',
                borderRadius: 'var(--radius-md)',
                backgroundImage: `url(${selectedRoom.image || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--hairline-soft)'
              }}
            />

            {/* Hardware & IoT Telemetry Specs */}
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                THÔNG SỐ MÔI TRƯỜNG & IOT THỜI GIAN THỰC
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--spatial-tile-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>SỨC CHỨA THỰC</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>
                    {selectedRoom.capacity} Chỗ
                  </div>
                </div>
                <div style={{ background: 'var(--spatial-tile-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>DIỆN TÍCH SÀN</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>
                    {selectedRoom.area || 60} m²
                  </div>
                </div>
                <div style={{ background: 'var(--spatial-tile-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>CẢM BIẾN NHIỆT ĐỘ</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--laser-emerald)', fontFamily: 'var(--font-mono)' }}>
                    24.2 °C (Tối ưu)
                  </div>
                </div>
                <div style={{ background: 'var(--spatial-tile-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>CÔNG SUẤT TẢI ĐIỆN</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)' }}>
                    2.8 kW (Bình thường)
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment Inventory */}
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                TRANG THIẾT BỊ SẴN CÓ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(selectedRoom.equipments || ['Máy chiếu Sony 4K', 'Điều hòa Inverter', 'Hệ thống âm thanh']).map((eq, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'var(--spatial-tile-bg)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      border: '1px solid var(--hairline-soft)'
                    }}
                  >
                    <Icons.CheckCircle size={14} color="var(--laser-emerald)" />
                    <span style={{ color: 'var(--ink-primary)' }}>{eq}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--hairline-medium)',
              display: 'flex',
              gap: '12px',
              background: 'var(--spatial-bar-bg)'
            }}
          >
            <button
              className="laser-btn laser-btn-cyan"
              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
              onClick={() => {
                setIsDrawerOpen(false);
                onOpenBookingModal(selectedRoom);
              }}
            >
              <Icons.Calendar size={15} />
              <span>Giữ Phòng Nhanh 30s</span>
            </button>
            <button
              className="laser-btn laser-btn-ghost"
              style={{ padding: '10px 14px', color: 'var(--laser-crimson)' }}
              onClick={() => {
                setIsDrawerOpen(false);
                onNavigateTab('tickets_kanban');
              }}
              title="Báo sự cố tại phòng này"
            >
              <Icons.Wrench size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};