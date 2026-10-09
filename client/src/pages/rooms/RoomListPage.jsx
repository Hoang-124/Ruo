import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { facilityApi } from '../../lib/api';
import { RoomFormModal } from './RoomFormModal';
import { getRoomStatusMeta, getRoomTypeLabel } from './roomDomain';

const thStyle = { padding: '12px 18px', color: 'var(--ink-primary)', fontWeight: 700, textAlign: 'left' };
const tdStyle = { padding: '12px 18px' };

/**
 * Room directory (Module 2: Room & Facility).
 * UC-2.1 adds the admin "create room" entry point; later use cases extend this page.
 */
export const RoomListPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facilityApi.getAllRooms();
      setRooms(res.rooms || []);
    } catch (err) {
      toast.error('Không thể tải danh sách phòng: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 02 • PHÒNG HỌC & CƠ SỞ VẬT CHẤT</span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.02em', margin: '4px 0 0' }}>
            Danh Mục Phòng Học
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Quản lý các phòng thuộc tòa nhà A1 (mã phòng P101 - P508).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={fetchRooms} className="ruo-btn ruo-btn-secondary ruo-btn-md" title="Làm mới danh sách">
            <Icons.RefreshCw size={14} /> Làm Mới
          </button>
          {isAdmin && (
            <button id="room-create-btn" type="button" onClick={() => setIsCreateOpen(true)} className="ruo-btn ruo-btn-primary ruo-btn-md">
              <Icons.Plus size={14} /> Thêm Phòng
            </button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>Đang tải danh sách phòng...</div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.Room size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-primary)' }}>Chưa có phòng nào trong hệ thống.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={thStyle}>Mã Phòng</th>
                <th style={thStyle}>Tên Phòng</th>
                <th style={thStyle}>Vị Trí</th>
                <th style={thStyle}>Loại Phòng</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sức Chứa</th>
                <th style={thStyle}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const status = getRoomStatusMeta(room.status);
                return (
                  <tr key={room._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)' }}>{room.code}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--ink-primary)' }}>{room.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--ink-secondary)' }}>Tòa {room.building} • Tầng {room.floor}</td>
                    <td style={{ ...tdStyle, color: 'var(--ink-secondary)' }}>{getRoomTypeLabel(room.room_type)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--ink-primary)' }}>{room.capacity}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: status.tone, background: `${status.tone}22` }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isCreateOpen && (
        <RoomFormModal onClose={() => setIsCreateOpen(false)} onSaved={fetchRooms} />
      )}
    </div>
  );
};

export default RoomListPage;
