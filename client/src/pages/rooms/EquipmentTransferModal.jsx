import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../../components/common/SvgIcons';
import { facilityApi, movementApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  TRANSFER_REASON_MAX,
  buildTransferPayload,
  getEquipmentStatusLabel,
  getTransferDestinations,
  validateTransferForm
} from './roomDomain';

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' };
const errorStyle = { margin: '6px 0 0', fontSize: '12px', color: 'var(--crimson-500)' };

/**
 * Admin dialog to order one piece of equipment out of a room that is being closed (UC-2.5 / UC-2.6).
 * It creates a pending movement order (POST /movements); the equipment only leaves the room once a
 * Technician confirms the order on site.
 */
export const EquipmentTransferModal = ({ equipment, room, onClose, onOrdered }) => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [destinationId, setDestinationId] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    facilityApi.getAllRooms({ limit: 100 })
      .then((res) => {
        if (ignore) return;
        const options = getTransferDestinations(res.rooms || [], room._id);
        setRooms(options);
        setDestinationId(options[0]?._id || '');
      })
      .catch((err) => !ignore && setSubmitError(err.message || 'Không tải được danh sách phòng nhận.'))
      .finally(() => !ignore && setLoadingRooms(false));
    return () => { ignore = true; };
  }, [room._id]);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && !submitting && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  const destination = useMemo(() => rooms.find((item) => item._id === destinationId), [rooms, destinationId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // This dialog is portaled out of the deactivate/status <form>, but React still bubbles the
    // synthetic submit event to it. Stop it so ordering a transfer never submits the parent form.
    event.stopPropagation();
    const validation = validateTransferForm({ destinationId, reason });
    setErrors(validation);
    if (Object.keys(validation).length > 0 || !destination) return;

    try {
      setSubmitting(true);
      setSubmitError('');
      const res = await movementApi.order(buildTransferPayload({
        equipmentId: equipment._id,
        destination,
        reason,
        roomCode: room.code
      }));
      toast.success(res.message || `Đã lập lệnh điều chuyển ${equipment.code}.`);
      onOrdered?.(equipment, res.movement);
      onClose();
    } catch (err) {
      setSubmitError(err.data?.message || err.message || 'Không thể lập lệnh điều chuyển.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="ruo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="ruo-drawer-panel" style={{ width: '460px', maxWidth: '100%' }} role="dialog" aria-modal="true" aria-labelledby="equipment-transfer-title">
        <div className="ruo-drawer-header">
          <div>
            <h2 id="equipment-transfer-title" className="ruo-drawer-title">Điều Chuyển Thiết Bị</h2>
            <p className="ruo-drawer-subtitle">Chuyển khỏi phòng {room.code} • cần KTV xác nhận thực địa</p>
          </div>
          <button type="button" onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng"><Icons.Close size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '13px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>{equipment.code}</span>
              {' '}<span style={{ color: 'var(--ink-primary)' }}>{equipment.name}</span>
              <div style={{ marginTop: '2px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>{getEquipmentStatusLabel(equipment.status)}</div>
            </div>

            <div>
              <label htmlFor="equipment-transfer-destination" style={labelStyle}>Phòng / kho nhận *</label>
              <select
                id="equipment-transfer-destination"
                className="ruo-portal-input"
                value={destinationId}
                disabled={loadingRooms || rooms.length === 0}
                onChange={(e) => { setDestinationId(e.target.value); setErrors({}); }}
              >
                {loadingRooms && <option value="">Đang tải danh sách phòng...</option>}
                {!loadingRooms && rooms.length === 0 && <option value="">Không có phòng nhận phù hợp</option>}
                {rooms.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.room_type === 'warehouse' ? `[KHO] ${item.code} - ${item.name}` : `${item.code} - ${item.name}`}
                  </option>
                ))}
              </select>
              {destination?.room_type === 'warehouse' && (
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--ink-muted)' }}>Thiết bị sẽ được thu hồi về kho dự phòng.</p>
              )}
              {errors.destination && <p style={errorStyle} role="alert">{errors.destination}</p>}
            </div>

            <div>
              <label htmlFor="equipment-transfer-reason" style={labelStyle}>Lý do (không bắt buộc)</label>
              <textarea
                id="equipment-transfer-reason"
                className="ruo-portal-input"
                rows={3}
                value={reason}
                maxLength={TRANSFER_REASON_MAX}
                placeholder={`Ví dụ: Ngừng sử dụng phòng ${room.code} để cải tạo`}
                onChange={(e) => { setReason(e.target.value); setErrors({}); }}
                style={{ resize: 'vertical' }}
              />
              {errors.reason && <p style={errorStyle} role="alert">{errors.reason}</p>}
            </div>

            {submitError && <p style={errorStyle} role="alert">{submitError}</p>}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={submitting} className="ruo-btn ruo-btn-secondary ruo-btn-md">Hủy Bỏ</button>
            <button id="equipment-transfer-submit" type="submit" disabled={submitting || loadingRooms || !destinationId} className="ruo-btn ruo-btn-primary ruo-btn-md">
              {submitting ? 'Đang lập lệnh...' : 'Lập Lệnh Điều Chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EquipmentTransferModal;
