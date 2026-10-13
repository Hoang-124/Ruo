import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { facilityApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { EquipmentBlockerList } from './RoomDeactivateModal';
import {
  DEACTIVATION_REASON_MAX,
  buildStatusPayload,
  getRoomStatusMeta,
  getRoomStatusTargets,
  validateDeactivationReason
} from './roomDomain';

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' };
const errorStyle = { margin: '6px 0 0', fontSize: '12px', color: 'var(--crimson-500)' };

/**
 * UC-2.6 Update Room Status — admin-only dialog.
 * Toggles a room between AVAILABLE, MAINTENANCE and INACTIVE. Moving to INACTIVE is refused by the
 * server (HTTP 409) while equipment is still stationed in the room; the blockers are then listed.
 */
export const RoomStatusModal = ({ room, onClose, onDone }) => {
  const { toast } = useToast();
  const targets = getRoomStatusTargets(room.status);
  const [status, setStatus] = useState(targets[0]?.value || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [blockers, setBlockers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const current = getRoomStatusMeta(room.status);

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
      const res = await facilityApi.updateRoomStatus(room._id, buildStatusPayload(status, reason));
      toast.success(res.message || `Đã cập nhật trạng thái phòng ${room.code}.`);
      onDone?.(res.room);
      onClose();
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.data?.equipments) && err.data.equipments.length > 0) {
        setBlockers(err.data.equipments);
      }
      setError(err.data?.errors?.status || err.data?.errors?.reason || err.message || 'Không thể cập nhật trạng thái phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ruo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="ruo-drawer-panel" style={{ width: '480px', maxWidth: '100%' }} role="dialog" aria-modal="true" aria-labelledby="room-status-title">
        <div className="ruo-drawer-header">
          <div>
            <h2 id="room-status-title" className="ruo-drawer-title">Đổi Trạng Thái Phòng {room.code}</h2>
            <p className="ruo-drawer-subtitle">UC-2.6 • Sẵn sàng ⇄ Đang bảo trì ⇄ Ngừng sử dụng</p>
          </div>
          <button type="button" onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng"><Icons.Close size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-secondary)' }}>
              <strong>{room.code} • {room.name}</strong> hiện đang{' '}
              <span style={{ color: current.tone, fontWeight: 700 }}>{current.label}</span>.
            </p>

            <div>
              <label htmlFor="room-status-target" style={labelStyle}>Trạng thái mới *</label>
              <select
                id="room-status-target"
                className="ruo-portal-input"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setError(''); setBlockers([]); }}
              >
                {targets.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {status === 'inactive' && (
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Cần điều chuyển toàn bộ thiết bị ra khỏi phòng trước khi ngừng sử dụng.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="room-status-reason" style={labelStyle}>Lý do (không bắt buộc)</label>
              <textarea
                id="room-status-reason"
                className="ruo-portal-input"
                rows={3}
                value={reason}
                maxLength={DEACTIVATION_REASON_MAX}
                placeholder="Ví dụ: Bảo trì hệ thống điều hòa"
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                style={{ resize: 'vertical' }}
              />
            </div>

            {error && <p style={errorStyle} role="alert">{error}</p>}
            {blockers.length > 0 && <EquipmentBlockerList items={blockers} />}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={submitting} className="ruo-btn ruo-btn-secondary ruo-btn-md">Hủy Bỏ</button>
            <button id="room-status-submit" type="submit" disabled={submitting || !status} className="ruo-btn ruo-btn-primary ruo-btn-md">
              {submitting ? 'Đang lưu...' : 'Cập Nhật Trạng Thái'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomStatusModal;
