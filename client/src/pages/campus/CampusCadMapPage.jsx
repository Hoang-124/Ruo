import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { FloorPlan2D } from '../../components/common/FloorPlan2D';
import { Building2DIso } from '../../components/common/Building2DIso';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';
import { equipmentApi, facilityApi } from '../../lib/api';
import { Button, Card, StatusBadge, Drawer } from '../../components/ui/Primitives';

/**
 * CampusCadMapPage - Module 02: Digital Twin & Spatial Asset Map
 * 
 * Interactive CAD map of Tòa Nhà A1 (5 Floors) featuring:
 * 1. 2D Architectural SVG Floor Plan (FloorPlan2D) with North & South classrooms, 3.5m corridor, smart doors & exits
 * 2. 2.5D Isometric Architectural Building Stack (Building2DIso)
 * 3. Interactive Room Inspector Drawer with live equipment list & quick operational workflows
 * 4. Dual View Modes: Sơ Đồ Mặt Bằng (2D), Phối Cảnh (2.5D Isometric), hoặc Ghép Tầng (Split)
 */
export const CampusCadMapPage = () => {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'plan' | 'iso' | 'split'
  const [liveEquipments, setLiveEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);

  // Fetch real equipments from backend to match with rooms
  useEffect(() => {
    const loadEquipments = async () => {
      try {
        setLoadingEquipments(true);
        const res = await equipmentApi.list({ limit: 100 });
        if (res.items || res.equipments) {
          setLiveEquipments(res.items || res.equipments || []);
        }
      } catch (err) {
        console.warn('[CampusCadMapPage] Equipment sync notice:', err.message);
      } finally {
        setLoadingEquipments(false);
      }
    };
    loadEquipments();
  }, []);

  // Current floor data from CAMPUS_FLOORS
  const currentFloorConfig = CAMPUS_FLOORS[selectedFloor] || CAMPUS_FLOORS[1];
  const allFloorRooms = [...(currentFloorConfig.topRooms || []), ...(currentFloorConfig.bottomRooms || [])];

  // Map simulated status based on equipment health
  const getRoomSimulatedStatus = useCallback((room) => {
    // Check if any real equipment in this room has repairing or maintenance status
    const matchingEquipments = liveEquipments.filter(e => {
      const roomCode = e.room_id?.code || e.room_code || '';
      return roomCode.toLowerCase().includes(room.code.toLowerCase()) || 
             room.name.toLowerCase().includes(e.room_id?.name?.toLowerCase() || '___');
    });

    const hasRepairing = matchingEquipments.some(e => e.status === 'repairing');
    if (hasRepairing || room.statusOverride === 'maintenance') {
      return {
        status: 'maintenance',
        label: 'Có Thiết Bị Hỏng',
        color: '#E5A33B',
        bg: 'rgba(229, 163, 59, 0.12)',
        border: 'rgba(229, 163, 59, 0.35)',
        equipments: matchingEquipments
      };
    }

    return {
      status: 'available',
      label: 'Vận Hành Ổn Định',
      color: '#2FB37A',
      bg: 'rgba(47, 179, 122, 0.12)',
      border: 'rgba(47, 179, 122, 0.35)',
      equipments: matchingEquipments
    };
  }, [liveEquipments]);

  // When room is selected in FloorPlan2D
  const handleSelectRoom = (room) => {
    const statusInfo = getRoomSimulatedStatus(room);
    setSelectedRoom({
      ...room,
      statusInfo,
      floorNumber: selectedFloor,
      matchedEquipments: statusInfo.equipments && statusInfo.equipments.length > 0 
        ? statusInfo.equipments 
        : (room.equipments || []).map((name, idx) => ({
            _id: `mock-eq-${idx}`,
            code: `${room.code}-EQ-${101 + idx}`,
            name,
            status: idx === 1 && statusInfo.status === 'maintenance' ? 'repairing' : 'active',
            price: 15000000 + idx * 5000000,
            rRatio: idx === 1 ? 45 : 15
          }))
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ==============================================================
          1. HEADER & VIEW CONTROLS
          ============================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--surface-card)',
          padding: '18px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--blueprint-400)',
                background: 'rgba(62, 123, 250, 0.12)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(62, 123, 250, 0.25)'
              }}
            >
              MODULE 02 • DIGITAL TWIN
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--ink-primary)' }}>
              Sơ Đồ Phòng Học & Không Gian Tòa Nhà A1
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Mặt bằng số hóa 5 tầng kiến trúc • Tích hợp phân bố phòng học Bắc/Nam & trạng thái thiết bị thực địa
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--surface-base)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'split' ? 'var(--blueprint-500)' : 'transparent',
                color: viewMode === 'split' ? '#FFFFFF' : 'var(--ink-muted)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icons.Layout size={14} />
              <span>Ghép Tầng (Split)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('plan')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'plan' ? 'var(--blueprint-500)' : 'transparent',
                color: viewMode === 'plan' ? '#FFFFFF' : 'var(--ink-muted)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icons.Map size={14} />
              <span>Sơ Đồ Mặt Bằng (2D)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('iso')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'iso' ? 'var(--blueprint-500)' : 'transparent',
                color: viewMode === 'iso' ? '#FFFFFF' : 'var(--ink-muted)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icons.Building size={14} />
              <span>Khối 2.5D Isometric</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==============================================================
          2. MAIN CAD WORKSPACE VIEWPORT
          ============================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'split' ? 'minmax(300px, 380px) 1fr' : '1fr',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left: 2.5D Isometric Building Stack (Visible in 'split' or 'iso') */}
        {(viewMode === 'split' || viewMode === 'iso') && (
          <div
            style={{
              background: 'var(--surface-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: '20px',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                  Khối Kiến Trúc Tòa A1
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Bấm vào từng tầng để đồng bộ mặt bằng
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--blueprint-400)',
                  background: 'rgba(62,123,250,0.12)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}
              >
                Đang chọn: Tầng {selectedFloor}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <Building2DIso
                activeFloor={selectedFloor}
                onSelectFloor={(fl) => setSelectedFloor(fl)}
              />
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--ink-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tổng diện tích sàn: <strong>1.450 m²</strong></span>
              <span>Lõi thang: <strong>2 thang máy • 2 thang bộ</strong></span>
            </div>
          </div>
        )}

        {/* Right / Center: Architectural SVG 2D Floor Plan (FloorPlan2D) */}
        {(viewMode === 'split' || viewMode === 'plan') && (
          <div
            style={{
              background: 'var(--surface-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: '20px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Center FloorPlan2D Canvas */}
            <FloorPlan2D
              selectedFloor={selectedFloor}
              onChangeFloor={(fl) => {
                setSelectedFloor(fl);
                setSelectedRoom(null);
              }}
              selectedRoom={selectedRoom}
              onSelectRoom={handleSelectRoom}
              getRoomSimulatedStatus={getRoomSimulatedStatus}
              currentTimeString="11:15"
            />
          </div>
        )}
      </div>

      {/* ==============================================================
          3. ROOM SUMMARY & LIVE METRICS FOR SELECTED FLOOR
          ============================================================== */}
      <div
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink-primary)' }}>
              Danh Sách Phòng Học & Phân Bổ Mặt Bằng — Tầng {selectedFloor}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
              Có {allFloorRooms.length} không gian chức năng trên tầng {selectedFloor}. Nhấp vào thẻ hoặc trực tiếp trên sơ đồ SVG để mở chi tiết.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', alignSelf: 'center' }}>
              Trạng thái:
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(47,179,122,0.12)', color: '#2FB37A' }}>
              ● Bình thường
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(229,163,59,0.12)', color: '#E5A33B' }}>
              ● Cần xử lý thiết bị
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {allFloorRooms.map((room) => {
            const status = getRoomSimulatedStatus(room);
            const isSelected = selectedRoom?.code === room.code;
            const categoryMeta = ROOM_CATEGORIES[room.category] || {};

            return (
              <div
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                style={{
                  background: isSelected ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: isSelected ? '1.5px solid var(--blueprint-400)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(62,123,250,0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)', fontSize: '13px' }}>
                    {room.code}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  {room.name}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '10px' }}>
                  {categoryMeta.name || 'Học tập'} • {room.capacity ? `${room.capacity} chỗ` : `${room.area || 60} m²`}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--ink-muted)' }}>
                  <span>Thiết bị: <strong>{room.equipments ? room.equipments.length : 0}</strong></span>
                  <span style={{ color: 'var(--blueprint-400)', fontWeight: 600 }}>Xem phòng →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==============================================================
          4. ROOM DETAIL & EQUIPMENT INSPECTION DRAWER
          ============================================================== */}
      {selectedRoom && (
        <Drawer
          isOpen={Boolean(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          title={`Phòng ${selectedRoom.code} • ${selectedRoom.name}`}
          subtitle={`Tòa A1 • Tầng ${selectedRoom.floorNumber || selectedFloor} • ${selectedRoom.capacity ? `${selectedRoom.capacity} chỗ ngồi` : `${selectedRoom.area || 60} m²`}`}
          width="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Room Basic Meta */}
            <div
              style={{
                background: 'var(--surface-2)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '12.5px'
              }}
            >
              <div>
                <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Phân loại không gian</span>
                <strong style={{ color: 'var(--ink-primary)' }}>{ROOM_CATEGORIES[selectedRoom.category]?.name || 'Học tập'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Vị trí hành lang</span>
                <strong style={{ color: 'var(--ink-primary)' }}>Dãy phòng mép ngoài đón sáng</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Trạng thái vận hành</span>
                <strong style={{ color: selectedRoom.statusInfo?.color || '#2FB37A' }}>
                  {selectedRoom.statusInfo?.label || 'Bình thường'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px' }}>Diện tích xây dựng</span>
                <strong style={{ color: 'var(--ink-primary)' }}>{selectedRoom.area || 60} m²</strong>
              </div>
            </div>

            {/* Quick Operational Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={Icons.Wrench}
                onClick={() => {
                  window.location.hash = '#/tickets_kanban';
                }}
              >
                Báo Hỏng Tại Phòng
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Icons.Repeat}
                onClick={() => {
                  window.location.hash = '#/transfers';
                }}
              >
                Điều Chuyển Đến
              </Button>
            </div>

            {/* Equipment List in This Room */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
                  Trang Thiết Bị Tại Phòng ({selectedRoom.matchedEquipments?.length || 0})
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}>Đồng bộ thời gian thực</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.matchedEquipments || []).map((eq, i) => (
                  <div
                    key={eq._id || i}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)', fontSize: '12px' }}>
                          {eq.code}
                        </span>
                        <StatusBadge status={eq.status} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                        {eq.name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Khấu hao (R)</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: eq.rRatio >= 60 ? '#E5484D' : 'var(--ink-primary)' }}>
                        {eq.rRatio || 0}%
                      </div>
                    </div>
                  </div>
                ))}

                {(!selectedRoom.matchedEquipments || selectedRoom.matchedEquipments.length === 0) && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-muted)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    Không có thiết bị ghi nhận tại phòng này.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default CampusCadMapPage;
