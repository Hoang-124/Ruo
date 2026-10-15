import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { facilityApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  DEACTIVATION_REASON_MAX,
  buildDeactivatePayload,
  getEquipmentStatusLabel,
  validateDeactivationReason
} from './roomDomain';
import { EquipmentTransferModal } from './EquipmentTransferModal';

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' };
const errorStyle = { margin: '6px 0 0', fontSize: '12px', color: 'var(--crimson-500)' };

/**
 * Equipment that must be transferred out before a room can become INACTIVE (HTTP 409 payload).
 * When `room` is given each item can be ordered out directly from here (Admin can issue transfer orders).
 */
export const EquipmentBlockerList = ({ items, room = null }) => {
  const [transferItem, setTransferItem] = useState(null);
  const [orderedIds, setOrderedIds] = useState(() => new Set());

  const markOrdered = (equipment) => setOrderedIds((prev) => new Set(prev).add(equipment._id));

  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: 'var(--surface-2)', fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Thiết bị cần điều chuyển ({items.length})
      </div>
      <ul id="room-deactivate-blockers" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '220px', overflowY: 'auto' }}>
        {items.map((item) => {
          const ordered = orderedIds.has(item._id);
          return (
            <li key={item._id || item.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12.5px' }}>
              <span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>{item.code}</span>
                {' '}<span style={{ color: 'var(--ink-primary)' }}>{item.name}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--ink-muted)' }}>{getEquipmentStatusLabel(item.status)}</span>
                {room && (ordered ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#E5A33B' }}>Chờ KTV</span>
                ) : (
                  <button
                    type="button"
                    id={`room-transfer-${item.code}`}
                    className="ruo-btn ruo-btn-secondary ruo-btn-sm"
                    onClick={() => setTransferItem(item)}
                  >
                    <Icons.RefreshCw size={12} /> Điều chuyển
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {room && orderedIds.size > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)', fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Thiết bị chỉ rời khỏi phòng sau khi Kỹ thuật viên xác nhận lệnh. Khi đã chuyển hết, hãy thực hiện lại thao tác này.
        </div>
      )}
      {transferItem && (
        <EquipmentTransferModal
          equipment={transferItem}
          room={room}
          onClose={() => setTransferItem(null)}
          onOrdered={markOrdered}
        />
      )}
    </div>
  );
};

/**
 * UC-2.5 Deactivate Room — admin-only confirmation dialog.
 * The server refuses to deactivate a room that still holds equipment (HTTP 409); the blocking
 * equipment is then listed so the admin knows what to transfer out first.
 */
export const RoomDeactivateModal = ({ room, onClose, onDone }) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [blockers, setBlockers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateDeactivationReason(reason);
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setBlockers([]);
      const res = await facilityApi.deactivateRoom(room._id, buildDeactivatePayload(reason));
      toast.success(res.message || `Đã ngừng sử dụng phòng ${room.code}.`);
      onDone?.(res.room);
      onClose();
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.data?.equipments) && err.data.equipments.length > 0) {
        setBlockers(err.data.equipments);
      }
      setError(err.data?.errors?.reason || err.message || 'Không thể ngừng sử dụng phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ruo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="ruo-drawer-panel" style={{ width: '480px', maxWidth: '100%' }} role="dialog" aria-modal="true" aria-labelledby="room-deactivate-title">
        <div className="ruo-drawer-header">
          <div>
            <h2 id="room-deactivate-title" className="ruo-drawer-title">Ngừng Sử Dụng Phòng {room.code}</h2>
            <p className="ruo-drawer-subtitle">UC-2.5 • Phòng chuyển sang INACTIVE, dữ liệu vẫn được lưu giữ</p>
          </div>
          <button type="button" onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng"><Icons.Close size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
              Bạn sắp ngừng sử dụng <strong>{room.code} • {room.name}</strong>. Toàn bộ thiết bị trong phòng phải được
              điều chuyển ra ngoài trước khi thực hiện.
            </p>

            <div>
              <label htmlFor="room-deactivate-reason" style={labelStyle}>Lý do ngừng sử dụng (không bắt buộc)</label>
              <textarea
                id="room-deactivate-reason"
                className="ruo-portal-input"
                rows={3}
                value={reason}
                maxLength={DEACTIVATION_REASON_MAX}
                autoFocus
                placeholder="Ví dụ: Sửa chữa cải tạo phòng"
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                style={{ resize: 'vertical' }}
              />
            </div>

            {error && <p style={errorStyle} role="alert">{error}</p>}

            {blockers.length > 0 && <EquipmentBlockerList items={blockers} room={room} />}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={submitting} className="ruo-btn ruo-btn-secondary ruo-btn-md">Hủy Bỏ</button>
            <button id="room-deactivate-submit" type="submit" disabled={submitting} className="ruo-btn ruo-btn-primary ruo-btn-md">
              {submitting ? 'Đang xử lý...' : 'Ngừng Sử Dụng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomDeactivateModal;
