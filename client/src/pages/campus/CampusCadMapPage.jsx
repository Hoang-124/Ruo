import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { Building2DIso } from '../../components/common/Building2DIso';
import { facilityApi } from '../../lib/api';
import { Button, Card, StatusBadge, Drawer } from '../../components/ui/Primitives';

export const CampusCadMapPage = () => {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const fetchFloorRooms = async (floorNum) => {
    setLoading(true);
    try {
      const res = await facilityApi.getCadCanvas('A1', floorNum);
      if (res.success && res.rooms) {
        setRooms(res.rooms);
      }
    } catch (err) {
      console.warn('CAD canvas fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorRooms(selectedFloor);
  }, [selectedFloor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Bản Đồ Không Gian Tòa Nhà A1 (Campus CAD Digital Twin)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Mô hình trực quan 2.5D mặt bằng 5 tầng giảng đường thông minh, tích hợp trạng thái thiết bị thời gian thực
          </p>
        </div>

        {/* Floor Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-1)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
          {[1, 2, 3, 4, 5].map(floorNum => (
            <Button
              key={floorNum}
              size="sm"
              variant={selectedFloor === floorNum ? 'primary' : 'ghost'}
              onClick={() => setSelectedFloor(floorNum)}
            >
              Tầng {floorNum}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid: Isometric Elevation (Left) & Room Grid (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '20px' }}>
        {/* Left: Building 2D Isometric Elevation */}
        <Card title="Khối Kiến Trúc Tòa Nhà A1" subtitle="Chọn tầng để xem phân bố phòng học">
          <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
            <Building2DIso
              activeFloor={selectedFloor}
              onSelectFloor={(fl) => setSelectedFloor(fl)}
            />
          </div>
        </Card>

        {/* Right: Rooms on Selected Floor */}
        <Card
          title={`Mặt Bằng Tầng ${selectedFloor} • Dãy Phòng Học`}
          subtitle={`Hiển thị ${rooms.length} phòng học & vị trí thiết bị`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
            {rooms.map(room => (
              <div
                key={room._id}
                onClick={() => setSelectedRoom(room)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'border-color var(--duration-fast), transform var(--duration-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)', fontSize: '13px' }}>
                    {room.code}
                  </span>
                  <StatusBadge status={room.effectiveStatus || room.status || 'available'} />
                </div>

                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                  {room.name}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                  {room.department?.name || 'Khoa CNTT'} • {room.capacity || 60} chỗ ngồi
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                  <span>Thiết bị: <strong>{room.equipmentCount || (room.equipments ? room.equipments.length : 0)}</strong></span>
                  <span style={{ color: 'var(--blueprint-400)', fontWeight: 600 }}>Chi tiết →</span>
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
                Đang nạp dữ liệu không gian tầng {selectedFloor}...
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Room Detail Drawer */}
      {selectedRoom && (
        <Drawer
          isOpen={Boolean(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          title={`Phòng ${selectedRoom.code} • ${selectedRoom.name}`}
          subtitle={`${selectedRoom.capacity || 60} chỗ ngồi • Tầng ${selectedRoom.floorNumber || selectedFloor}`}
          width="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
              <div>Trạng thái: <StatusBadge status={selectedRoom.effectiveStatus || selectedRoom.status} /></div>
              <div style={{ marginTop: '6px' }}>Diện tích: <strong>{selectedRoom.area || 80} m²</strong></div>
              <div>Đơn vị phụ trách: <strong>{selectedRoom.department?.name || 'Khoa CNTT'}</strong></div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                Danh Sách Trang Thiết Bị Trong Phòng ({selectedRoom.equipments ? selectedRoom.equipments.length : 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.equipments || []).map((eq, i) => (
                  <div
                    key={eq._id || i}
                    style={{
                      background: 'var(--surface-2)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)', fontSize: '12px' }}>
                        {eq.code}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink-primary)' }}>{eq.name}</div>
                    </div>
                    <StatusBadge status={eq.status} />
                  </div>
                ))}

                {(!selectedRoom.equipments || selectedRoom.equipments.length === 0) && (
                  <div style={{ color: 'var(--ink-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
                    Chưa có thiết bị đăng ký trong phòng này
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
