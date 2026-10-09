import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { facilityApi } from '../../lib/api';
import { RoomDetailModal } from '../../components/ui/RoomDetailModal';
import { RoomFormModal } from './RoomFormModal';
import {
  EMPTY_ROOM_FILTERS,
  FLOOR_OPTIONS,
  ROOM_LIST_PAGE_SIZE,
  ROOM_STATUS_OPTIONS,
  ROOM_TYPE_OPTIONS,
  buildRoomListParams,
  getPageWindow,
  getRoomStatusMeta,
  getRoomTypeLabel,
  hasActiveRoomFilters
} from './roomDomain';

const thStyle = { padding: '12px 18px', color: 'var(--ink-primary)', fontWeight: 700, textAlign: 'left' };
const tdStyle = { padding: '12px 18px' };
const filterLabel = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' };

/**
 * Room directory (Module 2: Room & Facility).
 * UC-2.1 admin create entry point, UC-2.2 browse with floor / type / status filters,
 * name-or-code search and server-side pagination.
 */
export const RoomListPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  const [filters, setFilters] = useState(EMPTY_ROOM_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rooms: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailCode, setDetailCode] = useState(null);
  const [editRoom, setEditRoom] = useState(null);

  // Debounce the free-text search so every keystroke does not hit the API.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildRoomListParams({ ...filters, q: debouncedQuery }, page, ROOM_LIST_PAGE_SIZE);
      const res = await facilityApi.getAllRooms(params);
      setData({ rooms: res.rooms || [], total: res.total ?? 0, totalPages: res.totalPages || 1 });
    } catch (err) {
      toast.error('Không thể tải danh sách phòng: ' + err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.floor, filters.room_type, filters.status, debouncedQuery, page, toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_ROOM_FILTERS);
    setDebouncedQuery('');
    setPage(1);
  };

  const { rooms, total, totalPages } = data;
  const filtered = hasActiveRoomFilters(filters);
  const from = total === 0 ? 0 : (page - 1) * ROOM_LIST_PAGE_SIZE + 1;
  const to = Math.min(page * ROOM_LIST_PAGE_SIZE, total);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 02 • PHÒNG HỌC & CƠ SỞ VẬT CHẤT</span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.02em', margin: '4px 0 0' }}>
            Danh Mục Phòng Học
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Tra cứu các phòng thuộc tòa nhà A1 (mã phòng P101 - P508) theo tầng, loại phòng và trạng thái.
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

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(140px, 1fr)) auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
        <div>
          <label htmlFor="room-search" style={filterLabel}>Tìm kiếm</label>
          <div style={{ position: 'relative' }}>
            <Icons.Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
            <input
              id="room-search"
              className="ruo-portal-input"
              style={{ paddingLeft: '34px' }}
              placeholder="Mã phòng hoặc tên phòng..."
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="room-filter-floor" style={filterLabel}>Tầng</label>
          <select id="room-filter-floor" className="ruo-portal-input" value={filters.floor} onChange={(e) => updateFilter('floor', e.target.value)}>
            <option value="">Tất cả tầng</option>
            {FLOOR_OPTIONS.map((floor) => <option key={floor} value={floor}>Tầng {floor}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="room-filter-type" style={filterLabel}>Loại phòng</label>
          <select id="room-filter-type" className="ruo-portal-input" value={filters.room_type} onChange={(e) => updateFilter('room_type', e.target.value)}>
            <option value="">Tất cả loại</option>
            {ROOM_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="room-filter-status" style={filterLabel}>Trạng thái</label>
          <select id="room-filter-status" className="ruo-portal-input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {ROOM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <button id="room-filter-clear" type="button" onClick={clearFilters} disabled={!filtered} className="ruo-btn ruo-btn-ghost ruo-btn-md" style={{ height: '40px' }}>
          Xóa Bộ Lọc
        </button>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>Đang tải danh sách phòng...</div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.Room size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-primary)' }}>
              {filtered ? 'Không tìm thấy phòng phù hợp với bộ lọc.' : 'Chưa có phòng nào trong hệ thống.'}
            </div>
            {filtered && <div style={{ fontSize: '13px', marginTop: '4px' }}>Hãy thử thay đổi từ khóa hoặc xóa bộ lọc.</div>}
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
                <th style={{ ...thStyle, textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const status = getRoomStatusMeta(room.status);
                return (
                  <tr
                    key={room._id}
                    onClick={() => setDetailCode(room.code)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    title={`Xem chi tiết phòng ${room.code}`}
                  >
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
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                          onClick={(e) => { e.stopPropagation(); setDetailCode(room.code); }}
                        >
                          <Icons.Eye size={13} /> Chi Tiết
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            id={`room-edit-${room.code}`}
                            className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                            onClick={(e) => { e.stopPropagation(); setEditRoom(room); }}
                          >
                            <Icons.Edit size={13} /> Sửa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '12px 18px', borderTop: '1px solid var(--border-default)', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
          <span id="room-list-summary">
            {total === 0 ? 'Không có phòng nào' : `Hiển thị ${from}–${to} / ${total} phòng`}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" className="ruo-btn ruo-btn-secondary ruo-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
                <Icons.ChevronLeft size={14} />
              </button>
              {getPageWindow(page, totalPages).map((p, index) =>
                p === null ? (
                  <span key={`gap-${index}`} style={{ padding: '0 4px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`ruo-btn ruo-btn-sm ${p === page ? 'ruo-btn-primary' : 'ruo-btn-secondary'}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}
              <button type="button" className="ruo-btn ruo-btn-secondary ruo-btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
                <Icons.ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <RoomFormModal onClose={() => setIsCreateOpen(false)} onSaved={() => { setPage(1); fetchRooms(); }} />
      )}

      {editRoom && (
        <RoomFormModal room={editRoom} onClose={() => setEditRoom(null)} onSaved={fetchRooms} />
      )}

      {detailCode && (
        <RoomDetailModal
          roomCode={detailCode}
          onClose={() => setDetailCode(null)}
          onEdit={isAdmin ? (room) => { setDetailCode(null); setEditRoom(room); } : undefined}
        />
      )}
    </div>
  );
};

export default RoomListPage;
