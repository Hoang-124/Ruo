import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { ROOMS } from '../../mock/mockData';

export const RoomListPage = ({ onOpenBookingModal, onSelectRoomDetail, onOpenCalendar }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState(20);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredRooms = ROOMS.filter((room) => {
    if (selectedBuilding !== 'all' && !room.building.includes(selectedBuilding)) return false;
    if (selectedType !== 'all' && room.type !== selectedType) return false;
    if (room.capacity < capacityFilter) return false;
    if (searchFilter && !room.code.toLowerCase().includes(searchFilter.toLowerCase()) && !room.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSelectedBuilding('all');
    setSelectedType('all');
    setCapacityFilter(20);
    setSearchFilter('');
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
              108 PHÒNG HỌC & GIẢNG ĐƯỜNG
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.03em' }}>
            Tra Cứu & Giữ Chỗ Không Gian Học Tập
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
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Building Select */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              TÒA NHÀ CAMPUS
            </label>
            <select
              className="form-control"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--hairline-medium)',
                color: 'var(--ink-primary)',
                fontSize: '13px'
              }}
            >
              <option value="all">Tất cả các tòa nhà (Toàn trường)</option>
              <option value="A1">Tòa A1 (Khu giảng đường chính)</option>
              <option value="A2">Tòa A2 (Khu chuyên đề)</option>
              <option value="B1">Tòa B1 (Viện Điện tử - IoT)</option>
              <option value="B2">Tòa B2 (Viện CNTT & Lab máy tính)</option>
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
              onChange={(e) => setSelectedType(e.target.value)}
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
              min="15"
              max="200"
              step="5"
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(Number(e.target.value))}
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
              HIỂN THỊ <strong style={{ color: 'var(--laser-cyan)' }}>{filteredRooms.length}</strong> PHÒNG HỌC KHẢ DỤNG
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'available';
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
                      {isAvailable ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: 'var(--laser-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            backdropFilter: 'blur(6px)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--laser-emerald)', boxShadow: '0 0 6px var(--laser-emerald)' }} />
                          <span>SẴN SÀNG</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: 'var(--laser-amber)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            backdropFilter: 'blur(6px)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--laser-amber)' }} />
                          <span>BẢO TRÌ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink-pure)', marginBottom: '4px' }}>
                      {room.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icons.Building size={13} color="var(--laser-cyan)" /> {room.building}, Tầng {room.floor}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icons.Users size={13} color="var(--laser-cyan)" /> {room.capacity} Chỗ
                      </span>
                    </div>

                    {/* Equipment Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {room.equipments.map((eq, i) => (
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

                    {/* Today Slots */}
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

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
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
                        <Icons.Calendar size={14} /> {isAvailable ? 'Đặt phòng' : 'Bảo trì'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
