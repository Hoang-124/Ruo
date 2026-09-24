import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/common/SvgIcons';
import { FloorPlan2D } from '../../components/common/FloorPlan2D';
import { CAMPUS_FLOORS } from '../../mock/campusBuildingData';

// Architecture Scope: Tòa Nhà A1 (5 Tầng)
const BUILDING_INFO = {
  id: 'Tòa A1',
  name: 'Tòa Nhà A1 • Giảng Đường & Trung Tâm Đào Tạo',
  totalFloors: 5,
  rooms: 108,
  zone: 'Khuôn Viên Trung Tâm'
};

export const Dashboard = ({ onNavigateTab, onOpenBookingModal, onOpenQRModal }) => {
  const { theme, currentUser } = useAuth();

  // Navigation & Floor State
  const [selectedBuilding, setSelectedBuilding] = useState('Tòa A1');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(CAMPUS_FLOORS[1]?.rooms[0] || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentTimeString = '11:15';
  const timeValue = 675; // 11:15 standard morning/noon view slot

  // 6 university functional rooms on current selected floor
  const currentFloorConfig = CAMPUS_FLOORS[selectedFloor] || CAMPUS_FLOORS[1];
  const floorRooms = currentFloorConfig.rooms;

  // Determine room status dynamically based on time scrubber
  const getRoomSimulatedStatus = useCallback((room) => {
    const isLight = theme === 'light';

    if (room.statusOverride === 'maintenance') {
      return {
        status: 'maintenance',
        label: 'Bảo Trì',
        color: '#D97706',
        bg: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
        border: isLight ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
        textBadge: '#D97706'
      };
    }
    const activeSlot = room.occupiedAt?.find((slot) => timeValue >= slot.start && timeValue <= slot.end);
    if (activeSlot) {
      return {
        status: 'occupied',
        label: 'Đang Học',
        color: '#2563EB',
        bg: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.08)',
        border: isLight ? 'rgba(37, 99, 235, 0.35)' : 'rgba(37, 99, 235, 0.25)',
        textBadge: '#2563EB',
        slot: activeSlot
      };
    }
    return {
      status: 'available',
      label: 'Trống Khả Dụng',
      color: '#059669',
      bg: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.08)',
      border: isLight ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
      textBadge: '#059669'
    };
  }, [timeValue, theme]);

  // Handle clicking a room pod to select and optionally inspect
  const handleRoomClick = useCallback((room) => {
    const fullRoom = {
      ...room,
      building: selectedBuilding,
      floor: room.floor || selectedFloor,
      status: room.statusOverride || 'available',
      equipments: room.equipments && room.equipments.length > 0 ? room.equipments : [
        'Máy chiếu Sony 4K Laser siêu nét',
        '2x Điều hòa Inverter Daikin 18.000 BTU',
        'Hệ thống micro không dây Shure',
        'Bảng kính từ chống lóa cao cấp',
        'Camera AI hỗ trợ điểm danh & ghi hình'
      ],
      todaySlots: [
        { time: '07:30 - 09:30', title: 'Lớp Chính Khóa: Lập Trình Web', user: 'TS. Nguyễn Văn Nam' },
        { time: '13:00 - 15:00', title: 'Tự học: Học Nhóm Đồ Án K67', user: 'SV Trần Bảo Hoàng' },
        { time: '15:30 - 17:30', title: 'Trống sẵn sàng', user: 'Chưa có lịch' }
      ]
    };
    setSelectedRoom(fullRoom);
  }, [selectedBuilding, selectedFloor]);


  return (
    <div className="ruo-dashboard-wrapper">
      {/* ====================================================================
          1. COMPACT SLIM HEADER (TIẾT KIỆM KHÔNG GIAN, TRÁNH LẶP LẠI THỐNG KÊ)
          ==================================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0, letterSpacing: '-0.02em' }}>
            Xin chào, {currentUser?.fullName || 'Thầy/Cô và Bạn'} 👋
          </h1>
          <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
            Sơ đồ không gian học tập &amp; điều phối tài nguyên • {BUILDING_INFO.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenBookingModal(selectedRoom || floorRooms[0])}
          className="ruo-portal-btn-primary"
          style={{ width: 'auto', padding: '9px 18px', fontSize: '12.5px', borderRadius: '10px', whiteSpace: 'nowrap' }}
        >
          <Icons.Calendar size={15} />
          <span>+ Đặt Phòng Nhanh</span>
        </button>
      </div>

      {/* ====================================================================
          2. MAIN SPLIT: ROOMS MANAGEMENT (LEFT) & QUICK INSPECTOR (RIGHT)
          ==================================================================== */}
      <div className="ruo-main-grid-layout">
        {/* LEFT COLUMN: THE CLEAN ROOM CANVAS */}
        <div className="ruo-rooms-container">



            <FloorPlan2D
              selectedFloor={selectedFloor}
              onChangeFloor={(fl) => {
                setSelectedFloor(fl);
                setSelectedRoom(CAMPUS_FLOORS[fl]?.rooms[0]);
              }}
              rooms={floorRooms}
              selectedRoom={selectedRoom}
              onSelectRoom={(room) => handleRoomClick(room)}
              onOpenBookingModal={onOpenBookingModal}
              getRoomSimulatedStatus={getRoomSimulatedStatus}
              currentTimeString={currentTimeString}
            />
        </div>

        {/* RIGHT COLUMN: QUICK INSPECTOR & CONVENIENT SHORTCUTS */}
        <div className="ruo-clean-sidebar">
          {/* 1. Quick Room Inspector Card */}
          {selectedRoom && (
            <div
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-soft)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  CHI TIẾT PHÒNG ĐANG CHỌN
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: getRoomSimulatedStatus(selectedRoom).bg,
                    color: getRoomSimulatedStatus(selectedRoom).textBadge,
                    border: `1px solid ${getRoomSimulatedStatus(selectedRoom).border}`
                  }}
                >
                  {getRoomSimulatedStatus(selectedRoom).label}
                </span>
              </div>

              {/* Room Banner Photo */}
              <div
                style={{
                  height: '110px',
                  borderRadius: '10px',
                  backgroundImage: `url(${selectedRoom.image || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid var(--hairline-soft)'
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>
                    {selectedRoom.code}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                    Tòa A1 • Tầng {selectedRoom.floor || selectedFloor}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)', marginTop: '2px', wordBreak: 'break-word' }}>
                  {selectedRoom.name}
                </div>
              </div>

              {/* Room Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px 10px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Quy mô</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                    {selectedRoom.capacity ? `${selectedRoom.capacity} Chỗ` : 'Tiêu Chuẩn'}
                  </div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Diện tích</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)' }}>{selectedRoom.area || 55} m²</div>
                </div>
              </div>

              {/* Equipment Highlight List */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  TRANG THIẾT BỊ NỔI BẬT:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(selectedRoom.equipments || [
                    'Máy chiếu Sony 4K Laser siêu nét',
                    '2x Điều hòa Inverter Daikin',
                    'Micro không dây Shure'
                  ]).slice(0, 3).map((eq, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--ink-primary)', overflow: 'hidden' }}>
                      <Icons.CheckCircle size={13} color="#10B981" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => onOpenBookingModal(selectedRoom)}
                  className="ruo-portal-btn-primary"
                  style={{ width: '100%', padding: '9px 14px', fontSize: '12.5px' }}
                >
                  <Icons.Calendar size={14} />
                  <span>Đặt Phòng Này (30s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--canvas-subtle)',
                    border: '1px solid var(--hairline-medium)',
                    color: 'var(--ink-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Xem Chi Tiết Đầy Đủ</span>
                  <Icons.ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* 2. Quick Campus Shortcuts */}
          <div
            style={{
              background: 'var(--surface-panel)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              LỐI TẮT NHANH
            </div>

            <button
              type="button"
              onClick={() => (onOpenQRModal ? onOpenQRModal() : null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--canvas-subtle)',
                border: '1px solid var(--hairline-soft)',
                color: 'var(--ink-pure)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.CheckCircle size={15} color="#10B981" />
                <span>Quét QR Cửa Vào Phòng</span>
              </div>
              <Icons.ChevronRight size={13} color="var(--ink-muted)" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('rooms')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--canvas-subtle)',
                border: '1px solid var(--hairline-soft)',
                color: 'var(--ink-pure)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Search size={15} color="#2563EB" />
                <span>Tra Cứu Toàn Bộ 108 Phòng</span>
              </div>
              <Icons.ChevronRight size={13} color="var(--ink-muted)" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--canvas-subtle)',
                border: '1px solid var(--hairline-soft)',
                color: 'var(--ink-pure)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Calendar size={15} color="#6366F1" />
                <span>Xem Thời Khóa Biểu Toàn Trường</span>
              </div>
              <Icons.ChevronRight size={13} color="var(--ink-muted)" />
            </button>
          </div>

          {/* 3. Support & Hotline */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Hỗ trợ kỹ thuật giảng đường:</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>
                Hotline 1900 6868
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>Trực ban 24/7</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. CALM OPERATIONAL INSIGHTS (SCHEDULE & MAINTENANCE)
          ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Left Card: Lịch Học Sắp Diễn Ra */}
        <div
          style={{
            background: 'var(--surface-panel)',
            border: '1px solid var(--hairline-soft)',
            borderRadius: '16px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                LỊCH HỌC & GIẢNG DẠY SẮP DIỄN RA
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Xem tất cả →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 14px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                    13:00 – 15:00
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.10)', color: '#2563EB', fontWeight: 700 }}>
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
                type="button"
                onClick={() => onOpenBookingModal(floorRooms[1])}
                style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Chi Tiết
              </button>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#6366F1', fontFamily: 'var(--font-mono)' }}>
                    13:30 – 16:30
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.10)', color: '#6366F1', fontWeight: 700 }}>
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
                type="button"
                onClick={() => onOpenBookingModal(floorRooms[3])}
                style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Chi Tiết
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Giám Sát Vận Hành & Kỹ Thuật */}
        <div
          style={{
            background: 'var(--surface-panel)',
            border: '1px solid var(--hairline-soft)',
            borderRadius: '16px',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                GIÁM SÁT VẬN HÀNH & KỸ THUẬT
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              TRỰC BAN: KT PHẠM HÙNG
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>NHIỆT ĐỘ TRUNG BÌNH</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                24.2°C <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>Tối ưu</span>
              </div>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--canvas-subtle)', borderRadius: '8px', border: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>TỶ LỆ LẤP ĐẦY TẦNG</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                33.3% <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>2/6 phòng</span>
              </div>
            </div>
          </div>

          {/* Active Maintenance Ticket */}
          <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.20)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              type="button"
              onClick={() => onNavigateTab('tickets_kanban')}
              style={{ background: 'none', border: 'none', color: '#D97706', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Chi tiết →
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. SLIDE-OUT ROOM INSPECTION DRAWER (ACCESSIBLE & SPACIOUS)
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
                    color: '#2563EB',
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
              type="button"
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
                THÔNG SỐ PHÒNG HỌC
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
                      <span style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>{slot.time}</span>
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
              type="button"
              className="ruo-portal-btn-primary"
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
              type="button"
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