import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { facilityApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  FLOOR_OPTIONS,
  ROOM_RULES,
  ROOM_TYPE_OPTIONS,
  buildCreateRoomPayload,
  buildUpdateRoomPayload,
  createEmptyRoomForm,
  getFloorFromCode,
  roomToForm,
  validateRoomForm
} from './roomDomain';

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-secondary)' };
const errorStyle = { margin: '6px 0 0', fontSize: '12px', color: 'var(--crimson-500)' };

const Field = ({ label, error, hint, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
    {error ? <p style={errorStyle} role="alert">{error}</p> : hint ? <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--ink-muted)' }}>{hint}</p> : null}
  </div>
);

/**
 * UC-2.1 Create Room / UC-2.4 Update Room Info — admin-only drawer form.
 * - Without `room`: POST /api/facilities/rooms.
 * - With `room`: PUT /api/facilities/rooms/:id. Code, building and floor are read-only because
 *   equipment, bookings and audit history reference them; only the changed fields are sent.
 * Field-level errors returned by the server are shown next to the matching input.
 */
export const RoomFormModal = ({ room = null, onClose, onSaved }) => {
  const { toast } = useToast();
  const isEdit = Boolean(room);
  const [form, setForm] = useState(() => (room ? roomToForm(room) : createEmptyRoomForm()));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Typing a valid room code (P307) automatically selects its floor.
  const handleCodeChange = (value) => {
    const codeFloor = getFloorFromCode(value);
    setForm((prev) => ({ ...prev, code: value.toUpperCase(), ...(codeFloor ? { floor: String(codeFloor) } : {}) }));
    setErrors((prev) => ({ ...prev, code: undefined, floor: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateRoomForm(form, isEdit ? 'edit' : 'create');
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        const payload = buildUpdateRoomPayload(form, room);
        if (Object.keys(payload).length === 0) {
          toast.info?.('Không có thay đổi nào để lưu.');
          onClose();
          return;
        }
        const res = await facilityApi.updateRoom(room._id, payload);
        toast.success(res.message || 'Đã cập nhật thông tin phòng.');
        onSaved?.(res.room);
      } else {
        const res = await facilityApi.createRoom(buildCreateRoomPayload(form));
        toast.success(res.message || 'Đã thêm phòng mới thành công.');
        onSaved?.(res.room);
      }
      onClose();
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors);
      toast.error(err.message || (isEdit ? 'Không thể cập nhật phòng.' : 'Không thể thêm phòng.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ruo-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="ruo-drawer-panel" style={{ width: '480px', maxWidth: '100%' }} role="dialog" aria-modal="true" aria-labelledby="room-form-title">
        <div className="ruo-drawer-header">
          <div>
            <h2 id="room-form-title" className="ruo-drawer-title">{isEdit ? `Chỉnh Sửa Phòng ${room.code}` : 'Thêm Phòng Mới'}</h2>
            <p className="ruo-drawer-subtitle">
              {isEdit
                ? 'UC-2.4 • Mã phòng, tòa nhà và tầng không thể thay đổi'
                : `UC-2.1 • Tòa nhà ${ROOM_RULES.building} • Mã phòng ${ROOM_RULES.codeRangeLabel}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ruo-drawer-close-btn" aria-label="Đóng"><Icons.Close size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Mã phòng *" error={errors.code} hint={isEdit ? undefined : 'Dạng P + tầng + số phòng, ví dụ P101, P307, P508.'}>
              <input
                id="room-code"
                className="ruo-portal-input"
                value={form.code}
                maxLength={isEdit ? 20 : 4}
                autoFocus={!isEdit}
                disabled={isEdit}
                placeholder="P101"
                onChange={(e) => handleCodeChange(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.04em' }}
              />
            </Field>

            <Field label="Tên phòng *" error={errors.name}>
              <input
                id="room-name"
                className="ruo-portal-input"
                value={form.name}
                maxLength={ROOM_RULES.maxName}
                autoFocus={isEdit}
                placeholder="Phòng học lý thuyết 101"
                onChange={(e) => setField('name', e.target.value)}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Tòa nhà">
                <input className="ruo-portal-input" value={room?.building || ROOM_RULES.building} disabled readOnly aria-label="Tòa nhà" />
              </Field>
              <Field label="Tầng *" error={errors.floor}>
                <select id="room-floor" className="ruo-portal-input" value={form.floor} disabled={isEdit} onChange={(e) => setField('floor', e.target.value)}>
                  {FLOOR_OPTIONS.map((floor) => <option key={floor} value={floor}>Tầng {floor}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Loại phòng *" error={errors.room_type}>
                <select id="room-type" className="ruo-portal-input" value={form.room_type} onChange={(e) => setField('room_type', e.target.value)}>
                  {ROOM_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Sức chứa *" error={errors.capacity}>
                <input
                  id="room-capacity"
                  className="ruo-portal-input"
                  type="number"
                  min={ROOM_RULES.minCapacity}
                  max={ROOM_RULES.maxCapacity}
                  value={form.capacity}
                  placeholder="60"
                  onChange={(e) => setField('capacity', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Chức năng phòng" error={errors.description}>
              <textarea
                id="room-description"
                className="ruo-portal-input"
                rows={3}
                value={form.description}
                maxLength={ROOM_RULES.maxDescription}
                placeholder="Mô tả ngắn về mục đích sử dụng của phòng"
                onChange={(e) => setField('description', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </Field>

            {errors.body && <p style={errorStyle} role="alert">{errors.body}</p>}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={submitting} className="ruo-btn ruo-btn-secondary ruo-btn-md">Hủy Bỏ</button>
            <button id="room-form-submit" type="submit" disabled={submitting} className="ruo-btn ruo-btn-primary ruo-btn-md">
              {submitting ? 'Đang lưu...' : isEdit ? 'Lưu Thay Đổi' : 'Thêm Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomFormModal;
