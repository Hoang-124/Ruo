import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { ROOMS as MOCK_ROOMS } from '../../mock/mockData';

const API_BASE = 'http://localhost:5000/api/facilities';

// Map room type enum to Vietnamese label
const ROOM_TYPE_LABELS = {
  theory: 'Phòng Lý Thuyết',
  lab: 'Lab Máy Tính',
  hall: 'Hội Trường',
  smart: 'Phòng Thông Minh',
  meeting: 'Phòng Họp'
};

// Map status to display config
const STATUS_CONFIG = {
  available: { label: 'SẴN SÀNG', color: 'var(--laser-emerald)', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' },
  maintenance: { label: 'BẢO TRÌ', color: 'var(--laser-amber)', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)' },
  inactive: { label: 'NGỪNG HOẠT ĐỘNG', color: 'var(--laser-rose)', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' },
  occupied: { label: 'ĐANG SỬ DỤNG', color: 'var(--laser-cyan)', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)' },
  locked: { label: 'KHÓA', color: 'var(--ink-muted)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
};

// Default room images by type
const DEFAULT_IMAGES = {
  theory: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
  lab: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
  hall: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
  smart: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=600&q=80',
  meeting: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80'
};

export const RoomListPage = ({ onOpenBookingModal, onSelectRoomDetail, onOpenCalendar }) => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('buildingCode', 'A1');
      params.set('page', currentPage);
      params.set('limit', '20');

      if (selectedFloor !== 'all') params.set('floorNumber', selectedFloor);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (capacityFilter > 0) params.set('minCapacity', capacityFilter);
      if (searchFilter.trim()) params.set('search', searchFilter.trim());

      const res = await fetch(`${API_BASE}/rooms?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.warn('[RoomListPage] API unavailable, falling back to mock data:', err.message);
      // Fallback to mock data
      let filtered = [...MOCK_ROOMS];
      if (selectedFloor !== 'all') filtered = filtered.filter(r => Number(r.floor) === Number(selectedFloor));
      if (selectedType !== 'all') filtered = filtered.filter(r => r.type === selectedType);
      if (capacityFilter > 0) filtered = filtered.filter(r => r.capacity >= capacityFilter);
      if (searchFilter) {
        const s = searchFilter.toLowerCase();
        filtered = filtered.filter(r => r.code.toLowerCase().includes(s) || r.name.toLowerCase().includes(s));
      }
      setRooms(filtered);
      setTotal(filtered.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, selectedFloor, selectedType, selectedStatus, capacityFilter, searchFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchRooms();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchRooms]);

  const clearFilters = () => {
    setSelectedFloor('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setCapacityFilter(0);
    setSearchFilter('');
    setCurrentPage(1);
  };

  // Normalize room data (API returns different shape than mock)
  const normalizeRoom = (room) => {
    // If it's already mock data format (has .id field), return as-is
    if (room.id && !room._id) return room;

    return {
      ...room,
      id: room._id,
      code: room.code,
      name: room.name,
      building: room.building?.name || room.building?.code || 'Tòa A1',
      floor: room.floorNumber,
      capacity: room.capacity,
      type: room.type,
      typeName: ROOM_TYPE_LABELS[room.type] || room.type,
      status: room.status,
      equipments: room.sensors?.map(s => `${s.sensorType}: ${s.currentValue}${s.unit}`) || [],
      image: room.imageUrl || DEFAULT_IMAGES[room.type] || DEFAULT_IMAGES.theory,
      area: room.areaSqm || 60,
      todaySlots: []
    };
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--laser-cyan)',
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.25)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              MODULE 01
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              TÒA NHÀ A1 • 5 TẦNG HỌC VỤ • {total} PHÒNG
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.03em' }}>
            Tra Cứu & Giữ Chỗ Phòng Học Tòa A1
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Tìm kiếm phòng học đa chiều theo sức chứa, phân loại trang thiết bị IoT và lịch biểu khả dụng tức thời.
          </p>
        </div>

        <button className="laser-btn laser-btn-cyan" onClick={onOpenCalendar}>
          <Icons.Calendar size={15} />
          <span>Xem Biểu Lịch Tuần →</span>
        </button>
      </div>

      {/* Main Layout: Precision Filter Dock (280px) + Interactive Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Filter Dock */}
        <div
          className="bento-card"
          style={{
            padding: '22px',
            position: 'sticky',
            top: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink-pure)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Filter size={16} color="var(--laser-cyan)" />
              <span>BỘ LỌC ĐA CHIỀU</span>
            </div>
            <button
              onClick={clearFilters}
              style={{
                fontSize: '11px',
                color: 'var(--laser-cyan)',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              [ĐẶT LẠI]
            </button>
          </div>

          {/* Search Input */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              MÃ / TÊN PHÒNG
            </label>
            <input
              type="text"
              placeholder="VD: A1-302, Lab 1..."
              className="form-control"
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Floor Select in Building A1 */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              PHÂN TẦNG HỌC VỤ (TÒA A1)
            </label>
            <select
              className="form-control"
              value={selectedFloor}
              onChange={(e) => { setSelectedFloor(e.target.value); setCurrentPage(1); }}
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            >
              <option value="all">Tất cả 5 tầng (Toàn Tòa A1)</option>
              <option value="1">Tầng 1 (Hội trường & Phòng học thực nghiệm)</option>
              <option value="2">Tầng 2 (Giảng đường lý thuyết)</option>
              <option value="3">Tầng 3 (Phòng học thông minh & Seminar)</option>
              <option value="4">Tầng 4 (Hội trường đa năng & Lab máy tính)</option>
              <option value="5">Tầng 5 (Phòng hội thảo chuyên đề)</option>
            </select>
          </div>

          {/* Room Type */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              CHỦNG LOẠI PHÒNG
            </label>
            <select
              className="form-control"
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            >
              <option value="all">Tất cả các loại</option>
              <option value="theory">Phòng Lý Thuyết</option>
              <option value="lab">Lab Máy Tính Chuyên Dụng</option>
              <option value="hall">Hội Trường Đa Năng</option>
              <option value="smart">Phòng Thông Minh</option>
              <option value="meeting">Phòng Họp</option>
            </select>
          </div>

          {/* Room Status */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              TRẠNG THÁI
            </label>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="available">Sẵn sàng</option>
              <option value="maintenance">Đang bảo trì</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>

          {/* Capacity Slider */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', margin: 0 }}>
                SỨC CHỨA TỐI THIỂU
              </label>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                ≥ {capacityFilter} chỗ
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={capacityFilter}
              onChange={(e) => { setCapacityFilter(Number(e.target.value)); setCurrentPage(1); }}
              style={{ width: '100%', accentColor: 'var(--laser-cyan)' }}
            />
          </div>

          {/* Equipment Toggles */}
          <div>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
              THIẾT BỊ TÍCH HỢP
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--laser-cyan)' }} />
                <span>Máy chiếu 4K / Màn LED</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--laser-cyan)' }} />
                <span>Điều hòa không khí Inverter</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--laser-cyan)' }} />
                <span>Mic không dây & Dàn loa JBL</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--laser-cyan)' }} />
                <span>Dàn PC sinh viên chuyên dụng</span>
              </label>
            </div>
          </div>
        </div>

        {/* Room Grid Cards */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
              {loading ? (
                <span>ĐANG TẢI DỮ LIỆU...</span>
              ) : (
                <>HIỂN THỊ <strong style={{ color: 'var(--laser-cyan)' }}>{rooms.length}</strong> / {total} PHÒNG HỌC</>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="laser-btn laser-btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="laser-btn laser-btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Sau →
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid var(--hairline-medium)', borderTopColor: 'var(--laser-cyan)',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Đang tải danh sách phòng học...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bento-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Icons.Search size={32} color="var(--ink-muted)" />
              <p style={{ color: 'var(--ink-secondary)', fontSize: '14px', marginTop: '12px' }}>
                Không tìm thấy phòng học nào phù hợp với bộ lọc hiện tại.
              </p>
              <button className="laser-btn laser-btn-ghost" onClick={clearFilters} style={{ marginTop: '12px', fontSize: '12px' }}>
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {rooms.map((rawRoom) => {
                const room = normalizeRoom(rawRoom);
                const isAvailable = room.status === 'available';
                const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;

                return (
                  <div
                    key={room.id}
                    className="bento-card"
                    style={{
                      padding: '0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all var(--transition-smooth)'
                    }}
                  >
                    {/* Banner Image with HUD badges */}
                    <div
                      style={{
                        height: '140px',
                        backgroundImage: `url(${room.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(11, 14, 23, 0.9) 0%, rgba(11, 14, 23, 0.2) 60%)'
                        }}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: 'rgba(6, 8, 14, 0.85)',
                          border: '1px solid var(--hairline-medium)',
                          color: 'var(--ink-pure)',
                          backdropFilter: 'blur(8px)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '13px'
                        }}
                      >
                        {room.code}
                      </div>

                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.border}`,
                            backdropFilter: 'blur(6px)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.color, boxShadow: `0 0 6px ${statusCfg.color}` }} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink-pure)', marginBottom: '4px' }}>
                        {room.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icons.Building size={13} color="var(--laser-cyan)" /> {room.building}, Tầng {room.floor}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icons.Users size={13} color="var(--laser-cyan)" /> {room.capacity} Chỗ
                        </span>
                      </div>

                      {/* Room Type Badge */}
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '10px', fontFamily: 'var(--font-mono)',
                          padding: '2px 8px', borderRadius: '4px',
                          background: 'rgba(6,182,212,0.08)', color: 'var(--laser-cyan)',
                          border: '1px solid rgba(6,182,212,0.2)'
                        }}>
                          {room.typeName}
                        </span>
                        {room.area > 0 && (
                          <span style={{
                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                            padding: '2px 8px', borderRadius: '4px', marginLeft: '6px',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--ink-muted)',
                            border: '1px solid var(--hairline-soft)'
                          }}>
                            {room.area} m²
                          </span>
                        )}
                      </div>

                      {/* Equipment Tags */}
                      {room.equipments && room.equipments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                          {room.equipments.slice(0, 4).map((eq, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--hairline-soft)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                color: 'var(--ink-secondary)'
                              }}
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Today Slots (from mock) */}
                      {room.todaySlots && room.todaySlots.length > 0 && (
                        <div
                          style={{
                            marginTop: 'auto',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--hairline-soft)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            marginBottom: '16px'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                            LỊCH HÔM NAY:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {room.todaySlots.slice(0, 2).map((slot, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{slot.time}</span>
                                <span style={{ fontWeight: 600, color: slot.type === 'available' ? 'var(--laser-emerald)' : 'var(--laser-cyan)' }}>
                                  {slot.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: room.todaySlots?.length > 0 ? '0' : 'auto' }}>
                        <button
                          className="laser-btn laser-btn-ghost"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                          onClick={() => onSelectRoomDetail && onSelectRoomDetail(room)}
                        >
                          <Icons.Eye size={14} /> Chi tiết
                        </button>

                        <button
                          className="laser-btn laser-btn-cyan"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                          disabled={!isAvailable}
                          onClick={() => onOpenBookingModal(room)}
                        >
                          <Icons.Calendar size={14} /> {isAvailable ? 'Đặt phòng' : statusCfg.label}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
