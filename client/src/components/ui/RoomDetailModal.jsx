import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../common/SvgIcons';
import { facilityApi } from '../../lib/api';
import {
  formatDateTime,
  getEquipmentStatusLabel,
  getMovementStatusLabel,
  getMovementTypeLabel,
  getRepairStatusLabel,
  getRoomStatusMeta,
  getRoomTypeLabel
} from '../../pages/rooms/roomDomain';

const TABS = [
  { id: 'overview', label: 'Thông Số' },
  { id: 'equipment', label: 'Thiết Bị' },
  { id: 'maintenance', label: 'Bảo Trì' },
  { id: 'movements', label: 'Di Chuyển' }
];

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ink-primary)', fontSize: '12px', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: '12.5px', color: 'var(--ink-secondary)', verticalAlign: 'top' };

const Pill = ({ children, tone = '#8A93A3' }) => (
  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: tone, background: `${tone}22`, whiteSpace: 'nowrap' }}>{children}</span>
);

const EMPTY_TONE = '#8A93A3';
const EQUIPMENT_TONES = { in_use: '#2FB37A', in_stock: '#3E7BFA', broken: '#E5484D', repairing: '#E5A33B', pending_disposal: '#E5A33B', disposed: EMPTY_TONE, lost: '#E5484D' };
const REPAIR_TONES = { reported: '#E5A33B', assigned: '#3E7BFA', in_progress: '#3E7BFA', resolved: '#2FB37A', closed: EMPTY_TONE, unrepairable: '#E5484D' };
const MOVEMENT_TONES = { pending: '#E5A33B', completed: '#2FB37A', cancelled: EMPTY_TONE };

const Stat = ({ label, value, tone }) => (
  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: tone || 'var(--ink-primary)' }}>{value}</div>
  </div>
);

const Spec = ({ label, children }) => (
  <div>
    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    <div style={{ fontSize: '14px', color: 'var(--ink-primary)', marginTop: '3px' }}>{children}</div>
  </div>
);

const EmptyState = ({ text }) => (
  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink-muted)', fontSize: '13px' }}>{text}</div>
);

const TableShell = ({ children }) => (
  <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
  </div>
);

/**
 * UC-2.3 Room Detail View — read-only drawer for every role.
 * Shows room specs, equipment (serial number + QR code), maintenance history and movement history.
 */
export const RoomDetailModal = ({ roomCode, onClose, onEdit }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setDetail(await facilityApi.getRoomByCode(roomCode));
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin phòng.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const room = detail?.room;
  const status = room ? getRoomStatusMeta(room.status) : null;
  const summary = detail?.summary;

  return (
    <div className="ruo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ruo-drawer-panel" style={{ width: '820px', maxWidth: '100%' }} role="dialog" aria-modal="true" aria-labelledby="room-detail-title">
        <div className="ruo-drawer-header">
          <div>
            <h2 id="room-detail-title" className="ruo-drawer-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blueprint-400)' }}>{roomCode}</span>
              {room && <span>{room.name}</span>}
              {status && <Pill tone={status.tone}>{status.label}</Pill>}
            </h2>
            <p className="ruo-drawer-subtitle">UC-2.3 • Chi tiết phòng và thiết bị</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onEdit && room && (
              <button id="room-detail-edit-btn" type="button" onClick={() => onEdit(room)} className="ruo-btn ruo-btn-primary ruo-btn-sm">
                <Icons.Edit size={13} /> Chỉnh Sửa
              </button>
            )}
            <button type="button" onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng"><Icons.Close size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '0 20px', borderBottom: '1px solid var(--border-default)' }} role="tablist">
          {TABS.map((item) => {
            const count = item.id === 'equipment' ? detail?.equipments?.length : item.id === 'maintenance' ? detail?.maintenanceHistory?.length : item.id === 'movements' ? detail?.movementHistory?.length : null;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                style={{
                  padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                  fontWeight: tab === item.id ? 700 : 500,
                  color: tab === item.id ? 'var(--blueprint-400)' : 'var(--ink-muted)',
                  borderBottom: tab === item.id ? '2px solid var(--blueprint-500)' : '2px solid transparent'
                }}
              >
                {item.label}{count != null ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        <div className="ruo-drawer-body">
          {loading ? (
            <EmptyState text="Đang tải thông tin phòng..." />
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <p style={{ color: 'var(--crimson-500)', fontSize: '13px' }} role="alert">{error}</p>
              <button type="button" onClick={load} className="ruo-btn ruo-btn-secondary ruo-btn-md">Thử Lại</button>
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <Stat label="Thiết bị trong phòng" value={summary.equipmentCount} />
                    <Stat label="Đang sử dụng" value={summary.byStatus.in_use} tone="#2FB37A" />
                    <Stat label="Cần xử lý (hỏng/đang sửa)" value={summary.needsAttention} tone={summary.needsAttention ? '#E5484D' : undefined} />
                    <Stat label="Phiếu sửa chữa đang mở" value={summary.openRepairs} tone={summary.openRepairs ? '#E5A33B' : undefined} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '18px' }}>
                    <Spec label="Mã phòng"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{room.code}</span></Spec>
                    <Spec label="Tên phòng">{room.name}</Spec>
                    <Spec label="Tòa nhà / Tầng">Tòa {room.building} • Tầng {room.floor}</Spec>
                    <Spec label="Loại phòng">{getRoomTypeLabel(room.room_type)}</Spec>
                    <Spec label="Sức chứa">{room.capacity} chỗ</Spec>
                    <Spec label="Diện tích">{room.area ? `${room.area} m²` : '—'}</Spec>
                    <Spec label="Đơn vị quản lý">{room.department || '—'}</Spec>
                    <Spec label="Cập nhật lần cuối">{formatDateTime(room.updated_at)}</Spec>
                  </div>

                  <Spec label="Chức năng phòng">{room.description || <span style={{ color: 'var(--ink-muted)' }}>Chưa có mô tả.</span>}</Spec>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Định mức thiết bị</div>
                    {room.required_equipment?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {room.required_equipment.map((item, index) => (
                          <Pill key={item._id || index} tone="#3E7BFA">{item.category_id?.name || 'Chủng loại'} × {item.quantity}</Pill>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Phòng chưa khai báo định mức.</span>
                    )}
                  </div>
                </div>
              )}

              {tab === 'equipment' && (
                detail.equipments.length === 0 ? <EmptyState text="Phòng này chưa có thiết bị nào." /> : (
                  <TableShell>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={th}>Mã TB</th><th style={th}>Tên thiết bị</th><th style={th}>Số serial</th><th style={th}>Mã QR</th><th style={th}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.equipments.map((eq) => (
                        <tr key={eq._id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ ...td, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>{eq.code}</td>
                          <td style={td}>
                            <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{eq.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{eq.category_id?.name || 'Chung'}{eq.brand ? ` • ${eq.brand}` : ''}</div>
                          </td>
                          <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{eq.serial_number || '—'}</td>
                          <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{eq.qr_code || '—'}</td>
                          <td style={td}><Pill tone={EQUIPMENT_TONES[eq.status]}>{getEquipmentStatusLabel(eq.status)}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                )
              )}

              {tab === 'maintenance' && (
                detail.maintenanceHistory.length === 0 ? <EmptyState text="Chưa có lịch sử bảo trì / sửa chữa cho thiết bị trong phòng." /> : (
                  <TableShell>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={th}>Phiếu</th><th style={th}>Thiết bị</th><th style={th}>Sự cố</th><th style={th}>Kỹ thuật viên</th><th style={th}>Báo lúc</th><th style={th}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.maintenanceHistory.map((repair) => (
                        <tr key={repair._id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ ...td, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{repair.ticket_code}</td>
                          <td style={td}>{repair.equipment_id?.code}<div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{repair.equipment_id?.name}</div></td>
                          <td style={{ ...td, maxWidth: '220px' }}>{repair.incident_description}</td>
                          <td style={td}>{repair.assigned_to?.full_name || '—'}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatDateTime(repair.reported_at)}</td>
                          <td style={td}><Pill tone={REPAIR_TONES[repair.status]}>{getRepairStatusLabel(repair.status)}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                )
              )}

              {tab === 'movements' && (
                detail.movementHistory.length === 0 ? <EmptyState text="Chưa có lệnh di chuyển thiết bị nào liên quan đến phòng này." /> : (
                  <TableShell>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={th}>Loại</th><th style={th}>Thiết bị</th><th style={th}>Từ → Đến</th><th style={th}>Người lập lệnh</th><th style={th}>Lập lúc</th><th style={th}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.movementHistory.map((move) => (
                        <tr key={move._id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={td}>{getMovementTypeLabel(move.type)}</td>
                          <td style={td}>{move.equipment_id?.code}<div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{move.equipment_id?.name}</div></td>
                          <td style={{ ...td, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{move.from_room_id?.code || '—'} → {move.to_room_id?.code || '—'}</td>
                          <td style={td}>{move.ordered_by?.full_name || '—'}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatDateTime(move.created_at)}</td>
                          <td style={td}><Pill tone={MOVEMENT_TONES[move.status]}>{getMovementStatusLabel(move.status)}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
