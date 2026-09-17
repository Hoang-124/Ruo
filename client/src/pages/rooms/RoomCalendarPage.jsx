import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { ROOMS } from '../../mock/mockData';

export const RoomCalendarPage = ({ onOpenBookingModal }) => {
  const [selectedWeek, setSelectedWeek] = useState('Tuần 3 (15/09 - 21/09/2026)');

  const timeSlots = [
    { label: 'Ca 1 (07:30 - 09:30)', time: '07:30' },
    { label: 'Ca 2 (09:45 - 11:45)', time: '09:45' },
    { label: 'Ca 3 (13:00 - 15:00)', time: '13:00' },
    { label: 'Ca 4 (15:15 - 17:15)', time: '15:15' },
    { label: 'Ca Tối (18:00 - 20:30)', time: '18:00' }
  ];

  // Schedule mock grid
  const scheduleMatrix = {
    'A1-302': [
      { type: 'curriculum', title: 'Lập Trình Web (K67)', lecturer: 'TS. Nam' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'booked', title: 'Học nhóm đồ án', user: 'SV Hoàng' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' }
    ],
    'B2-105': [
      { type: 'maintenance', title: 'Bảo trì điều hòa' },
      { type: 'maintenance', title: 'Bảo trì điều hòa' },
      { type: 'maintenance', title: 'Bảo trì điều hòa' },
      { type: 'maintenance', title: 'Bảo trì điều hòa' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' }
    ],
    'A1-405': [
      { type: 'booked', title: 'Hội thảo SV', user: 'Đoàn TN' },
      { type: 'booked', title: 'Hội thảo SV', user: 'Đoàn TN' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'curriculum', title: 'Đại số tuyến tính', lecturer: 'GS. Bách' },
      { type: 'pending', title: 'Chờ duyệt sự kiện', user: 'CLB Guitar' }
    ],
    'B1-201': [
      { type: 'curriculum', title: 'Vi mạch số', lecturer: 'TS. Hưng' },
      { type: 'curriculum', title: 'Vi mạch số', lecturer: 'TS. Hưng' },
      { type: 'booked', title: 'Nghiên cứu Lab IoT', user: 'TS. Anh' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' }
    ],
    'C1-304': [
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'curriculum', title: 'AI & Data Mining', lecturer: 'ThS. Ngọc' },
      { type: 'booked', title: 'Họp trực tuyến quốc tế', user: 'Khoa CNTT' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' },
      { type: 'available', title: 'Slot trống (Nhấp để đặt)' }
    ]
  };

  const getSlotStyle = (type) => {
    switch (type) {
      case 'curriculum':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: 'var(--color-primary-800)'
        };
      case 'booked':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: 'var(--color-warning-700)'
        };
      case 'maintenance':
        return {
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-danger-700)'
        };
      case 'pending':
        return {
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          color: 'var(--color-purple-700)'
        };
      default:
        return {
          background: 'var(--bg-card)',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)',
          cursor: 'pointer'
        };
    }
  };

  const handleCellClick = (roomCode, slot, idx) => {
    if (slot.type === 'available') {
      const room = ROOMS.find(r => r.code === roomCode);
      if (room) {
        onOpenBookingModal(room);
      }
    } else {
      alert(`[Thông tin lịch] Phòng ${roomCode} (${timeSlots[idx].label}): ${slot.title}`);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch Biểu Phòng Học Trực Quan (Grid Calendar)</h1>
          <div className="page-subtitle">
            Phân biệt trạng thái thời gian thực bằng mã màu chuẩn Smart Campus. Nhấp vào ô trống để đặt phòng tức thì.
          </div>
        </div>

        <div className="header-actions">
          <select
            className="form-control"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ width: '260px', fontWeight: 600 }}
          >
            <option>Tuần 3 (15/09 - 21/09/2026)</option>
            <option>Tuần 4 (22/09 - 28/09/2026)</option>
            <option>Tuần 5 (29/09 - 05/10/2026)</option>
          </select>
        </div>
      </div>

      {/* Color Code Legend */}
      <div
        className="card"
        style={{
          padding: '12px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: '13px'
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Mã màu trạng thái:</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(59, 130, 246, 0.25)', border: '1px solid #3B82F6', borderRadius: '3px' }} />
          <span>Lịch chính khóa (Khóa cứng)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #F59E0B', borderRadius: '3px' }} />
          <span>Đã duyệt & Đang mượn</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(139, 92, 246, 0.25)', border: '1px solid #8B5CF6', borderRadius: '3px' }} />
          <span>Chờ phê duyệt</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', borderRadius: '3px' }} />
          <span>Đang bảo trì / Sửa chữa</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '3px' }} />
          <span style={{ fontWeight: 600, color: 'var(--color-green-600)' }}>Slot trống (Click để đặt)</span>
        </div>
      </div>

      {/* Interactive Calendar Matrix */}
      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-subtle)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '14px 16px', width: '180px', textAlign: 'left', fontWeight: 700 }}>
                Phòng / Vị trí
              </th>
              {timeSlots.map((slot, i) => (
                <th key={i} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: 700 }}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROOMS.slice(0, 5).map((room) => {
              const rowSlots = scheduleMatrix[room.code] || [];
              return (
                <tr key={room.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', verticalAlign: 'top', background: 'var(--bg-card)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-700)', fontSize: '15px' }}>
                      {room.code}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {room.capacity} chỗ • {room.typeName}
                    </div>
                  </td>

                  {rowSlots.map((slot, idx) => (
                    <td
                      key={idx}
                      style={{
                        padding: '10px',
                        verticalAlign: 'top',
                        width: '18%'
                      }}
                      onClick={() => handleCellClick(room.code, slot, idx)}
                    >
                      <div
                        style={{
                          height: '90px',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          transition: 'all var(--transition-fast)',
                          ...getSlotStyle(slot.type)
                        }}
                      >
                        <div style={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {slot.title}
                        </div>
                        {slot.lecturer && (
                          <div style={{ fontSize: '11px', opacity: 0.9 }}>
                            GV: {slot.lecturer}
                          </div>
                        )}
                        {slot.user && (
                          <div style={{ fontSize: '11px', opacity: 0.9 }}>
                            Người đặt: {slot.user}
                          </div>
                        )}
                        {slot.type === 'available' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-primary-600)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Icons.Plus size={12} /> Đặt phòng
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
