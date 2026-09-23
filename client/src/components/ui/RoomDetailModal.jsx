import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/facilities';

const STATUS_CONFIG = {
  available: { label: 'Sẵn sàng', color: 'var(--laser-emerald)', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  maintenance: { label: 'Bảo trì', color: 'var(--laser-amber)', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  inactive: { label: 'Ngừng hoạt động', color: 'var(--laser-rose)', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' },
  occupied: { label: 'Đang sử dụng', color: 'var(--laser-cyan)', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
  locked: { label: 'Khóa', color: 'var(--ink-muted)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
};

const ROOM_TYPE_LABELS = {
  theory: 'Phòng Lý Thuyết',
  lab: 'Lab Máy Tính',
  hall: 'Hội Trường',
  smart: 'Phòng Thông Minh',
  meeting: 'Phòng Họp'
};

const DEFAULT_IMAGES = {
  theory: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
  lab: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  hall: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  smart: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=800&q=80',
  meeting: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
};

export const RoomDetailModal = ({ isOpen, onClose, roomCode, onOpenBookingModal }) => {
  const { token } = useAuth();
  const [room, setRoom] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [stats, setStats] = useState({ monthlyBookings: 0, totalCompletedBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !roomCode) return;
    setLoading(true);
    setError(null);

    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_BASE}/rooms/${roomCode}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Không tìm thấy phòng học.');
        const data = await res.json();
        if (data.success) {
          setRoom(data.room);
          setUpcomingBookings(data.upcomingBookings || []);
          setStats(data.stats || { monthlyBookings: 0, totalCompletedBookings: 0 });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [isOpen, roomCode, token]);

  if (!isOpen) return null;

  const statusCfg = STATUS_CONFIG[room?.status] || STATUS_CONFIG.available;
  const imgUrl = room?.imageUrl || DEFAULT_IMAGES[room?.type] || DEFAULT_IMAGES.theory;
  const typeName = ROOM_TYPE_LABELS[room?.type] || room?.type;

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
      ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        className="bento-card"
        style={{
          width: '720px', maxHeight: '85vh', overflow: 'auto',
          padding: '0', animation: 'modalSlideIn 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes modalSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid var(--hairline-medium)', borderTopColor: 'var(--laser-cyan)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
            }} />
            <p style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Đang tải thông tin phòng học...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--laser-rose)', fontSize: '14px' }}>{error}</p>
            <button className="laser-btn laser-btn-ghost" onClick={onClose} style={{ marginTop: '12px' }}>Đóng</button>
          </div>
        ) : room && (
          <>
            {/* Header Banner */}
            <div style={{
              height: '180px', backgroundImage: `url(${imgUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,14,23,0.95) 0%, rgba(11,14,23,0.3) 60%)' }} />

              {/* Close Button */}
              <button onClick={onClose} style={{
                position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px',
                borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)', color: 'var(--ink-pure)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
              }}>×</button>

              {/* Room Code & Status */}
              <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 900, color: 'var(--ink-pure)', letterSpacing: '-0.02em' }}>
                    {room.code}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginTop: '2px' }}>{room.name}</div>
                </div>
                <span style={{
                  fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                  background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`,
                  display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color, boxShadow: `0 0 8px ${statusCfg.color}` }} />
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* Body Content */}
            <div style={{ padding: '24px' }}>
              {/* Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Loại phòng', value: typeName, icon: '🏫' },
                  { label: 'Sức chứa', value: `${room.capacity} chỗ`, icon: '👥' },
                  { label: 'Diện tích', value: `${room.areaSqm || 60} m²`, icon: '📐' },
                  { label: 'Công suất điện', value: `${room.powerKw || 0} kW`, icon: '⚡' }
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--hairline-soft)',
                    borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-pure)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Location Info */}
              <div style={{
                display: 'flex', gap: '16px', marginBottom: '24px', padding: '14px 16px',
                background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>TÒA NHÀ</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)' }}>{room.building?.name || room.building?.code || 'N/A'}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--hairline-soft)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>TẦNG</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)' }}>Tầng {room.floorNumber}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--hairline-soft)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>BOOKING THÁNG NÀY</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--laser-cyan)' }}>{stats.monthlyBookings}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--hairline-soft)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>TỔNG HOÀN THÀNH</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--laser-emerald)' }}>{stats.totalCompletedBookings}</div>
                </div>
              </div>

              {/* IoT Sensors */}
              {room.sensors && room.sensors.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                    📡 CẢM BIẾN IoT THỜI GIAN THỰC
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {room.sensors.map((sensor, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--hairline-soft)',
                        borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}>
                        <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                          {sensor.sensorType === 'temperature' ? '🌡️' :
                           sensor.sensorType === 'humidity' ? '💧' :
                           sensor.sensorType === 'power_meter' ? '⚡' : '👁️'}
                        </span>
                        <span style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>
                          {sensor.currentValue}{sensor.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Bookings */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                  📅 LỊCH SẮP TỚI ({upcomingBookings.length} đơn)
                </div>
                {upcomingBookings.length === 0 ? (
                  <div style={{
                    padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--ink-muted)',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--hairline-soft)', borderRadius: 'var(--radius-sm)'
                  }}>
                    Không có đơn mượn sắp tới
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {upcomingBookings.map((b, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--hairline-soft)', borderRadius: 'var(--radius-sm)', fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 6px',
                            borderRadius: '3px',
                            background: b.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            color: b.status === 'approved' ? 'var(--laser-emerald)' : 'var(--laser-amber)',
                            border: `1px solid ${b.status === 'approved' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                          }}>
                            {b.status === 'approved' ? 'DUYỆT' : 'CHỜ'}
                          </span>
                          <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{b.purpose}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            {formatDate(b.startTime)}
                          </span>
                          <span style={{ color: 'var(--ink-secondary)', fontSize: '11px' }}>
                            {b.user?.fullName || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="laser-btn laser-btn-ghost" onClick={onClose} style={{ fontSize: '12px' }}>
                  Đóng
                </button>
                {room.status === 'available' && onOpenBookingModal && (
                  <button
                    className="laser-btn laser-btn-cyan"
                    style={{ fontSize: '12px' }}
                    onClick={() => {
                      onOpenBookingModal(room);
                      onClose();
                    }}
                  >
                    <Icons.Calendar size={14} /> Đặt Phòng Ngay
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
